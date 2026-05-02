import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, onSnapshot, query, orderBy 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    let auditData = []; 
    let isLoading = true; // Starts true to trigger the skeleton

    // --- REAL-TIME SYNC ENGINE ---
    function syncAuditLogs() {
        // 🔥 ADDED: Trigger initial render to show the Loading Skeleton immediately
        renderAuditTable();

        // Points to case-sensitive collection 'auditLogs'
        const q = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
        
        onSnapshot(q, (snapshot) => {
            auditData = snapshot.docs.map(doc => {
                const data = doc.data();
                
                // 1. Format Firestore Timestamp to "YYYY-MM-DD HH:MM:SS"
                const dateObj = data.timestamp?.toDate() || new Date();
                const formattedTime = dateObj.toISOString().replace('T', ' ').substring(0, 19);

                // 2. Normalize Names: Use 'userName' (Leader function) or 'name' (Voter/Mobile)
                const displayName = data.userName || data.name || "Unknown User";

                // 3. Normalize Roles: Maps "LEADER" to "Leader", everything else to "Voter"
                const displayRole = (data.role === "LEADER" || data.role === "Leader") ? "Leader" : "Voter";

                return {
                    id: doc.id,
                    ...data,
                    name: displayName,
                    role: displayRole,
                    timestamp: formattedTime
                };
            });

            isLoading = false; // Turn off loading now that data is here
            // Always render based on current filter state or full data
            applyFilters(); 
        }, (error) => {
            console.error("Sync Error (Check permissions or indices):", error);
            isLoading = false;
            renderAuditTable(); // Render to clear skeleton if error occurs
        });
    }

    // --- RENDERING LOGIC ---
    window.renderAuditTable = (filteredData = null) => {
        const tbody = document.getElementById('audit-table-body');
        const data = filteredData || auditData;

        // Loading Skeleton
        if (isLoading) {
            tbody.innerHTML = Array(6).fill(0).map(() => `
                <tr class="animate-pulse">
                    <td colspan="5" class="px-8 py-5">
                        <div class="h-4 bg-gray-100 rounded w-full"></div>
                    </td>
                </tr>
            `).join('');
            return;
        }

        // Empty State
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-10 text-center text-black font-medium">No activities found matching your criteria.</td></tr>`;
            return;
        }

        // Table Rows
        tbody.innerHTML = data.map(log => `
            <tr class="hover:bg-blue-50/30 transition border-b border-gray-50">
                <td class="px-8 py-5 font-bold text-gray-800">${log.name}</td>
                <td class="px-8 py-5">
                    <span class="px-3 py-1 rounded-full text-[10px] uppercase font-black ${log.role === 'Leader' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}">
                        ${log.role}
                    </span>
                </td>
                <td class="px-8 py-5 text-gray-700">${log.action}</td>
                <td class="px-8 py-5 text-gray-500 italic font-medium">${log.details}</td>
                <td class="px-8 py-5 text-right font-mono text-gray-600">${log.timestamp}</td>
            </tr>
        `).join('');
    };

    // --- SEARCH LOGIC ---
    window.handleSearch = (queryText) => {
        // We trigger applyFilters to combine search with dropdown filters
        applyFilters();
    };

    // --- FILTER LOGIC (Dropdowns, Dates, and Search) ---
    window.applyFilters = () => {
        const role = document.getElementById('filter-role').value;
        const action = document.getElementById('filter-action').value;
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const timeFrom = document.getElementById('time-from').value;
        const timeTo = document.getElementById('time-to').value;
        const searchVal = document.getElementById('audit-search').value.toLowerCase();

        const results = auditData.filter(item => {
            const [itemDate, itemTimeFull] = item.timestamp.split(' ');
            const itemTime = itemTimeFull.substring(0, 5);

            // Filter conditions
            const matchesRole = role === 'all' || item.role === role;
            const matchesAction = action === 'all' || item.action === action;
            const matchesDate = (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo);
            const matchesTime = (!timeFrom || itemTime >= timeFrom) && (!timeTo || itemTime <= timeTo);
            const matchesSearch = !searchVal || 
                                  item.name.toLowerCase().includes(searchVal) || 
                                  item.details.toLowerCase().includes(searchVal) || 
                                  item.action.toLowerCase().includes(searchVal);

            return matchesRole && matchesAction && matchesDate && matchesTime && matchesSearch;
        });

        renderAuditTable(results);
    };

    // --- VALIDATION LOGIC ---
    window.validateDateRange = () => {
        const from = document.getElementById('date-from').value;
        const to = document.getElementById('date-to');
        if (from && to.value && to.value < from) to.value = from;
    };

    window.validateTimeRange = () => {
        const from = document.getElementById('time-from').value;
        const to = document.getElementById('time-to');
        if (from && to.value && to.value < from) to.value = from;
    };

    // --- RESET LOGIC ---
    window.resetFilters = () => {
        document.getElementById('filter-role').value = 'all';
        document.getElementById('filter-action').value = 'all';
        ['date-from', 'date-to', 'time-from', 'time-to', 'audit-search'].forEach(id => {
            const el = document.getElementById(id);
            if(el) el.value = '';
        });
        renderAuditTable(auditData);
    };

    // --- DOWNLOAD LOGIC (CSV) ---
    window.showDownloadToast = () => {
        if (auditData.length === 0) return;

        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        overlay.classList.remove('hidden');
        setTimeout(() => container.classList.remove('scale-95', 'opacity-0'), 10);

        const headers = ["Name", "Role", "Action", "Details", "Timestamp"];
        const rows = auditData.map(log => [
            `"${log.name}"`, `"${log.role}"`, `"${log.action}"`, `"${log.details}"`, `"${log.timestamp}"`
        ]);
        const csvContent = "data:text/csv;charset=utf-8," + headers.join(",") + "\n" + rows.map(e => e.join(",")).join("\n");
        
        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", `COSEL_Audit_Log_${new Date().toISOString().split('T')[0]}.csv`);
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        setTimeout(hideToast, 3000);
    };

    window.hideToast = () => {
        const container = document.getElementById('toast-container');
        if(container) container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            const overlay = document.getElementById('toast-overlay');
            if(overlay) overlay.classList.add('hidden');
        }, 300);
    };

    // --- MODALS ---
    window.confirmLogout = async () => { await signOut(auth); window.location.href = "index.html"; };
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    // INITIALIZE
    syncAuditLogs();
});