document.addEventListener('DOMContentLoaded', () => {
    // FAKE DATA
    const auditData = [
        { name: "Juan Dela Cruz", role: "Student", action: "Registration", details: "New Account Created", timestamp: "2025-11-18 09:42:15" },
        { name: "Maria Clara", role: "Leader", action: "Election Setup", details: "Election Created: SC Election 2026", timestamp: "2025-11-18 14:20:00" },
        { name: "Mark Anthony", role: "Student", action: "Voting", details: "Submitted Vote for CCIS Council", timestamp: "2025-11-19 10:15:30" },
        { name: "Sarah Lee", role: "Leader", action: "Registration", details: "New Account Created", timestamp: "2025-11-20 08:00:12" },
        { name: "James Wilson", role: "Student", action: "Voting", details: "Submitted Vote for CET Council", timestamp: "2025-11-20 16:45:10" },
        { name: "Diana Prince", role: "Leader", action: "Election Setup", details: "Election Updated: Timeline Change", timestamp: "2026-01-15 11:30:00" },
        { name: "Alice Wonderland", role: "Student", action: "Registration", details: "New Account Created", timestamp: "2026-03-27 09:00:00" },
        { name: "Bob Builder", role: "Student", action: "Voting", details: "Submitted Vote for CHK Council", timestamp: "2026-03-27 10:30:00" }
    ];

    // RENDERING LOGIC
    window.renderAuditTable = (data) => {
        const tbody = document.getElementById('audit-table-body');
        if (data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="5" class="px-8 py-10 text-center text-black font-medium">No activities found matching your criteria.</td></tr>`;
            return;
        }

        tbody.innerHTML = data.map(log => `
            <tr class="hover:bg-blue-50/30 transition">
                <td class="px-8 py-5 font-bold">${log.name}</td>
                <td class="px-8 py-5">
                    <span class="px-3 py-1 rounded-full text-[10px] uppercase font-black ${log.role === 'Leader' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'}">
                        ${log.role}
                    </span>
                </td>
                <td class="px-8 py-5 text-black">${log.action}</td>
                <td class="px-8 py-5 text-black italic font-medium">${log.details}</td>
                <td class="px-8 py-5 text-right font-mono text-black">${log.timestamp}</td>
            </tr>
        `).join('');
    };

    // SEARCH LOGIC
    window.handleSearch = (query) => {
        const val = query.toLowerCase();
        const results = auditData.filter(item => 
            item.name.toLowerCase().includes(val) || 
            item.details.toLowerCase().includes(val)
        );
        renderAuditTable(results);
    };

    // VALIDATION LOGIC
    window.validateDateRange = () => {
        const from = document.getElementById('date-from').value;
        const to = document.getElementById('date-to');
        if (from && to.value && to.value < from) {
            to.value = from; // Date 2 cannot be earlier than Date 1
        }
    };

    window.validateTimeRange = () => {
        const from = document.getElementById('time-from').value;
        const to = document.getElementById('time-to');
        if (from && to.value && to.value < from) {
            to.value = from; // Time 2 cannot be earlier than Time 1
        }
    };

    // FILTER LOGIC
    window.applyFilters = () => {
        const role = document.getElementById('filter-role').value;
        const action = document.getElementById('filter-action').value;
        const dateFrom = document.getElementById('date-from').value;
        const dateTo = document.getElementById('date-to').value;
        const timeFrom = document.getElementById('time-from').value;
        const timeTo = document.getElementById('time-to').value;

        let results = auditData.filter(item => {
            const [itemDate, itemTimeFull] = item.timestamp.split(' ');
            const itemTime = itemTimeFull.substring(0, 5);

            const matchesRole = role === 'all' || item.role === role;
            const matchesAction = action === 'all' || item.action === action;
            
            const matchesDate = (!dateFrom || itemDate >= dateFrom) && (!dateTo || itemDate <= dateTo);
            const matchesTime = (!timeFrom || itemTime >= timeFrom) && (!timeTo || itemTime <= timeTo);

            return matchesRole && matchesAction && matchesDate && matchesTime;
        });

        renderAuditTable(results);
    };

    // RESET LOGIC
    window.resetFilters = () => {
        document.getElementById('filter-role').value = 'all';
        document.getElementById('filter-action').value = 'all';
        document.getElementById('date-from').value = '';
        document.getElementById('date-to').value = '';
        document.getElementById('time-from').value = '';
        document.getElementById('time-to').value = '';
        document.getElementById('audit-search').value = '';
        renderAuditTable(auditData);
    };

    // TOAST LOGIC
    window.showDownloadToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        overlay.classList.remove('hidden');
        setTimeout(() => container.classList.remove('scale-95', 'opacity-0'), 10);
        
        // Auto-hide after 3 seconds
        setTimeout(hideToast, 3000);
    };

    window.hideToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    };

    // LOGOUT LOGIC
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    // INITIAL RENDER
    renderAuditTable(auditData);
});