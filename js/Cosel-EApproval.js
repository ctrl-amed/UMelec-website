import { db, auth } from './firebase.js'; 
import { 
    collection, 
    query, 
    onSnapshot, 
    doc, 
    getDoc, 
    updateDoc, 
    getDocs, 
    where,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    let allElections = [];
    let userCache = {}; 
    let currentFilter = 'pending'; 
    let activeElectionId = null;
    let isInitialLoad = true;
    let modalPie = null; 
    let modalBar = null;

    // --- 1. Loading UI ---
    const showInitialLoading = () => {
        const tableBody = document.getElementById('election-table-body');
        tableBody.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-20 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p class="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-xs">
                            Fetching Election Records...
                        </p>
                    </div>
                </td>
            </tr>
        `;
    };

    showInitialLoading();

    // --- 2. Helper Functions ---
    async function getCreatorName(uid) {
        if (!uid) return 'System/Unknown';
        if (userCache[uid]) return userCache[uid];
        try {
            const userSnap = await getDoc(doc(db, "users", uid));
            if (userSnap.exists()) {
                const data = userSnap.data();
                const fName = data.firstName || data.firstname || data.first_name || data.fname || "";
                const lName = data.lastName || data.lastname || data.last_name || data.lname || "";
                const fullName = `${fName} ${lName}`.trim();
                userCache[uid] = fullName || "Unnamed User";
                return userCache[uid];
            }
            return "User Not Found";
        } catch (err) {
            return "Error Loading Name";
        }
    }

    function formatFirestoreDate(timestamp) {
        if (!timestamp) return 'N/A';
        const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }

    function getStatusClass(s) {
        if (s === 'pending') return 'bg-yellow-100 text-yellow-700';
        if (s === 'approved') return 'bg-green-100 text-green-700';
        if (s === 'rejected') return 'bg-red-100 text-red-700';
        if (s === 'OFFICIAL') return 'bg-blue-100 text-blue-700'; 
        return 'bg-gray-100 text-gray-700';
    }

    function capitalizeFirstLetter(string) {
        if (string === 'OFFICIAL') return 'Completed';
        return string.charAt(0).toUpperCase() + string.slice(1);
    }

    // --- 3. Real-time Election Listener ---
    const q = collection(db, "elections");
    onSnapshot(q, async (snapshot) => {
        allElections = await Promise.all(snapshot.docs.map(async (electionDoc) => {
            const data = electionDoc.data();
            const fullName = await getCreatorName(data.createdBy); 
            return { 
                id: electionDoc.id, 
                ...data, 
                submittedByName: fullName 
            }; 
        }));
        isInitialLoad = false;
        filterByStatus(capitalizeFirstLetter(currentFilter));
    });

    // --- 4. Main Table Logic ---
    window.filterByStatus = (tabName) => {
        const statusMap = { 'Pending': 'pending', 'Approved': 'approved', 'Rejected': 'rejected', 'Completed': 'OFFICIAL' };
        currentFilter = statusMap[tabName] || tabName;

        document.querySelectorAll('.status-tab').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`btn-${tabName}`);
        if (activeBtn) activeBtn.classList.add('active');

        const tableBody = document.getElementById('election-table-body');
        if (isInitialLoad) return;

        const filteredData = allElections.filter(e => e.status === currentFilter);

        tableBody.innerHTML = filteredData.length === 0 ? 
            `<tr><td colspan="6" class="px-6 py-10 text-center text-gray-400 italic">No ${tabName} elections found.</td></tr>` :
            filteredData.map(e => `
                <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                    <td class="px-6 py-5 text-gray-800 font-black">${e.title || 'Untitled'}</td>
                    <td class="px-6 py-5 text-gray-500 text-sm">${e.college || 'No College'}</td>
                    <td class="px-6 py-5 text-blue-600 font-bold">${e.submittedByName}</td> 
                    <td class="px-6 py-5 text-gray-500">${e.createdAt ? formatFirestoreDate(e.createdAt) : 'N/A'}</td>
                    <td class="px-6 py-5">
                        <span class="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${getStatusClass(e.status)}">
                            ${e.status}
                        </span>
                    </td>
                    <td class="px-6 py-5 text-center">
                        <button onclick="openElectionModal('${e.id}')" class="bg-blue-gradient text-white text-[10px] font-black uppercase px-6 py-2 rounded-lg hover:brightness-110 shadow-md transition">
                            ${e.status === 'OFFICIAL' ? 'View Results' : 'Preview'}
                        </button>
                    </td>
                </tr>
            `).join('');
    };

    // --- 5. Modal Logic ---
    window.openElectionModal = async (id) => {
        activeElectionId = id;
        const election = allElections.find(e => e.id === id);
        const area = document.getElementById('modal-content-area');
        
        area.innerHTML = `<div class="p-20 text-center"><div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div></div>`;
        document.getElementById('detailsModal').classList.remove('hidden');

        try {
            const posSnap = await getDocs(query(collection(db, "positions"), where("electionId", "==", id)));
            election.positions = [];

            for (const posDoc of posSnap.docs) {
                const posData = posDoc.data();
                const candSnap = await getDocs(query(collection(db, "candidates"), where("positionId", "==", posDoc.id)));
                election.positions.push({
                    id: posDoc.id,
                    name: posData.positionName || posData.name || "Unnamed Position",
                    voters: posData.eligibleVoters || "All Year Level",
                    candidates: candSnap.docs.map(d => d.data())
                });
            }

            if (election.status === 'OFFICIAL') {
                area.innerHTML = renderCompletedModal(election);
                initCompletedCharts(election); 
            } else {
                area.innerHTML = renderApprovalModal(election);
            }
        } catch (err) {
            area.innerHTML = `<div class="p-20 text-center text-red-500 font-bold">Error loading details.</div>`;
        }
    };

    // --- 6. View Rendering (OG Structure) ---
    function renderApprovalModal(e) {
        let headerStatus = '';
        if(e.status === 'approved') {
            headerStatus = `<div class="bg-green-50 border border-green-200 p-6 rounded-2xl mb-6">
                <h4 class="text-green-700 font-black uppercase text-xs mb-1">APPROVED</h4>
                <p class="text-green-600 text-sm font-bold">Approved by: ${e.approvedBy || 'Admin'} on ${formatFirestoreDate(e.approvedAt)}</p>
            </div>`;
        } else if(e.status === 'rejected') {
            headerStatus = `<div class="bg-red-50 border border-red-200 p-6 rounded-2xl mb-6">
                <h4 class="text-red-700 font-black uppercase text-xs mb-1">REJECTED</h4>
                <p class="text-red-600 text-sm font-bold">Reason: ${e.rejectionReason || 'No reason provided'}</p>
            </div>`;
        }

        return `
            ${headerStatus}
            <div class="mb-8">
                <h2 class="text-3xl font-black text-gray-800 leading-tight">${e.title}</h2>
                <p class="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">${e.college}</p>
                <p class="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">Submitted by: ${e.submittedByName}</p>
            </div>

            <div class="space-y-6">
                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 class="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest">General Details</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><p class="text-[10px] uppercase text-gray-400 font-bold">Voting Duration</p><p class="font-bold text-gray-700 text-sm">${formatFirestoreDate(e.startDate)} - ${formatFirestoreDate(e.endDate)}</p></div>
                        <div><p class="text-[10px] uppercase text-gray-400 font-bold">Eligible Voters</p><p class="font-bold text-gray-700 text-sm">${e.eligibleVoters || 'N/A'} Students</p></div>
                    </div>
                </div>

                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 class="text-xs font-black uppercase text-gray-400 mb-6 tracking-widest">Position Details</h3>
                    <table class="w-full text-left">
                        <thead class="text-[10px] uppercase text-gray-400 border-b border-gray-200"><tr class="pb-3"><th class="pb-3">Position</th><th class="pb-3">Who Can Vote</th><th class="pb-3">Candidates</th></tr></thead>
                        <tbody class="text-sm font-bold text-gray-700 divide-y divide-gray-100">
                            ${e.positions.map(pos => `
                                <tr>
                                    <td class="py-4 align-top">${pos.name}</td>
                                    <td class="py-4 align-top font-medium text-gray-500">${pos.voters}</td>
                                    <td class="py-4">
                                        <ul class="space-y-1">${pos.candidates.map(c => `<li>• ${c.name || 'Unknown'}</li>`).join('')}</ul>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 class="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest">Settings</h3>
                    <div><p class="text-[10px] uppercase text-gray-400 font-bold">Abstain Option</p><p class="font-bold text-gray-700 text-sm">${e.abstainEnabled ? 'Enabled' : 'Disabled'}</p></div>
                </div>
            </div>

            ${e.status === 'pending' ? `
                <div class="flex justify-end gap-4 mt-10">
                    <button onclick="closeModal('detailsModal')" class="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-gray-50 transition">Cancel</button>
                    <button onclick="processApproval()" class="px-8 py-3 bg-blue-gradient text-white rounded-full font-bold shadow-lg">Approve Election</button>
                </div>
            ` : `<div class="flex justify-center mt-10"><button onclick="closeModal('detailsModal')" class="px-8 py-3 bg-gray-800 text-white rounded-full font-bold">Close Preview</button></div>`}
        `;
    }

    function renderCompletedModal(e) {
        const turnout = e.turnout || { voted: 0, notVoted: 1, years: [0, 0, 0, 0] };
        return `
            <div class="mb-8">
                <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 mb-2 inline-block">COMPLETED ON ${formatFirestoreDate(e.endDate)}</span>
                <h2 class="text-3xl font-black text-gray-800 leading-tight">${e.title}</h2>
                <p class="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">${e.college}</p>
            </div>

            <div class="space-y-6">
                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h4 class="text-[11px] font-black uppercase text-gray-400 mb-4 tracking-widest">Audit & Setup Details</h4>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Approved By</p><p class="font-bold text-gray-800 mt-1">${e.approvedBy || 'Admin'}</p></div>
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Submitted By</p><p class="font-bold text-gray-800 mt-1">${e.submittedByName}</p></div>
                    </div>
                </div>

                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h4 class="text-[10px] font-black uppercase text-gray-400 mb-4 text-center">Voter Engagement</h4>
                        <div class="h-40 relative"><canvas id="modalPieChart"></canvas></div>
                    </div>
                    <div class="bg-white p-6 rounded-3xl border border-gray-100 shadow-sm">
                        <h4 class="text-[10px] font-black uppercase text-gray-400 mb-4 text-center">Demographics</h4>
                        <div class="h-40"><canvas id="modalBarChart"></canvas></div>
                    </div>
                </div>

                <div class="space-y-4">
                    <h3 class="text-xs font-black uppercase text-gray-400 tracking-widest">Winners</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        ${e.positions.map(p => {
                            const winner = [...p.candidates].sort((a,b) => (b.votes || 0) - (a.votes || 0))[0];
                            return `
                                <div class="bg-blue-50 p-4 rounded-2xl border border-blue-100">
                                    <p class="text-[9px] font-black text-blue-400 uppercase">${p.name}</p>
                                    <p class="text-lg font-black text-gray-800">👑 ${winner ? winner.name : 'N/A'}</p>
                                    <p class="text-sm font-bold text-blue-600">${winner ? winner.votes : 0} Votes</p>
                                </div>
                            `;
                        }).join('')}
                    </div>
                </div>
            </div>
            
            <div class="flex justify-center mt-10">
                <button onclick="closeModal('detailsModal')" class="px-10 py-3 bg-gray-800 text-white rounded-full font-black text-[10px] uppercase tracking-widest">Close Archives</button>
            </div>
        `;
    }

    // --- 7. Chart Initialization ---
    function initCompletedCharts(e) {
        const turnout = e.turnout || { voted: 0, notVoted: 1, years: [0, 0, 0, 0] };
        if (modalPie) modalPie.destroy();
        if (modalBar) modalBar.destroy();

        const ctxPie = document.getElementById('modalPieChart').getContext('2d');
        modalPie = new Chart(ctxPie, {
            type: 'doughnut',
            data: {
                labels: ['Voted', 'Absence'],
                datasets: [{
                    data: [turnout.voted, turnout.notVoted],
                    backgroundColor: ['#2563eb', '#f1f5f9'],
                    borderWidth: 0,
                    cutout: '80%'
                }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        const ctxBar = document.getElementById('modalBarChart').getContext('2d');
        modalBar = new Chart(ctxBar, {
            type: 'bar',
            data: {
                labels: ['1st', '2nd', '3rd', '4th'],
                datasets: [{
                    data: turnout.years || [0,0,0,0],
                    backgroundColor: '#3b82f6',
                    borderRadius: 5
                }]
            },
            options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    // --- 8. Global UI Controllers ---
    window.processApproval = async () => {
        try {
            await updateDoc(doc(db, "elections", activeElectionId), {
                status: 'approved',
                approvedBy: auth.currentUser?.email || "Admin",
                approvedAt: serverTimestamp()
            });
            showToast("Success", "Election Approved!", "#27A688", "fa-check");
            closeModal('detailsModal');
        } catch (err) {
            showToast("Error", "Failed to approve.", "#ef4444", "fa-times");
        }
    };

    window.confirmLogout = async () => { await signOut(auth); window.location.href = "index.html"; };
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

    window.showToast = (title, msg, color, icon) => {
        const overlay = document.getElementById('toast-overlay');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerText = msg;
        document.getElementById('toast-icon-bg').style.backgroundColor = color;
        document.getElementById('toast-icon').className = `fas ${icon}`;
        overlay.classList.remove('hidden');
        setTimeout(() => overlay.classList.add('hidden'), 3000);
    };

    filterByStatus('Pending');
});