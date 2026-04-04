document.addEventListener('DOMContentLoaded', () => {
    // 1. Database (Fake elections & Simulation context)
    let electionsData = [
        { 
            id: 1, title: "CCIS Student Council", college: "College of Computing and Information Sciences (CCIS)", user: "John Doe", date: "March 15, 2026", status: "Pending",
            votingDuration: "March 25, 2026 8:00 AM - March 27, 2026 5:00 PM", eligibleVoters: 1250,
            submittedDate: "March 10, 2026 10:00 AM", abstain: "Enabled",
            positions: [
                { name: "President", voters: "All Year Level", candidates: ["Alice Wonderland", "Bob Builder", "Charlie Day"] },
                { name: "Secretary", voters: "2nd Year", candidates: ["Daisy Duck", "Ethan Hunt"] }
            ],
            approvalData: null, rejectionData: null
        },
        { 
            id: 2, title: "IT Society Election", college: "College of Computing and Information Sciences (CCIS)", user: "Jane Foster", date: "March 11, 2026", status: "Pending",
            votingDuration: "March 22, 2026 8:00 AM - March 24, 2026 5:00 PM", eligibleVoters: 850,
            submittedDate: "March 09, 2026 11:30 AM", abstain: "Disabled",
            positions: [
                { name: "President", voters: "All Year Level", candidates: ["Arthur Pendragon", "Guinevere DuLac"] },
                { name: "Treasurer", voters: "3rd Year", candidates: ["Morgana Pendragon", "Merlin Myrddin"] }
            ],
            approvalData: null, rejectionData: null
        },
        { 
            id: 3, title: "Freshmen Representative Council", college: "College of Innovative Teacher Education (CITE)", user: "Mark Evans", date: "March 14, 2026", status: "Pending",
            votingDuration: "March 28, 2026 8:00 AM - March 29, 2026 5:00 PM", eligibleVoters: 300,
            submittedDate: "March 10, 2026 10:00 AM", abstain: "Enabled",
            positions: [{ name: "Representative", voters: "1st Year", candidates: ["Kid Flash", "Super Boy"] }],
            approvalData: null, rejectionData: null
        },
        { 
            id: 4, title: "CET Engineering Board", college: "College of Engineering and Technology (CET)", user: "Jane Smith", date: "March 12, 2026", status: "Approved",
            votingDuration: "April 01, 2026 9:00 AM - April 02, 2026 6:00 PM", eligibleVoters: 2100,
            submittedDate: "March 08, 2026 09:15 AM", abstain: "Disabled",
            positions: [{ name: "Governor", voters: "3rd Year", candidates: ["Tony Stark", "Steve Rogers"] }],
            approvalData: { approvedBy: "Admin Maria", date: "March 14, 2026" }
        },
        {
            id: 5, title: "Nursing Society", college: "Institute of Nursing (ION)", user: "Clara Oswald", date: "Feb 28, 2026", status: "Completed",
            votingDuration: "Feb 10, 2026 8:00 AM - Feb 12, 2026 5:00 PM", eligibleVoters: 800,
            completedDate: "Feb 12, 2026",
            submittedBy: "Clara Oswald", submittedDate: "Feb 01, 2026 10:00 AM",
            setupStart: "Feb 01, 2026 09:00 AM", setupEnd: "Feb 01, 2026 11:30 AM",
            abstain: "Enabled",
            approvalData: { approvedBy: "Director Smith", date: "Feb 05, 2026" },
            positions: [
                { name: "President", voters: "All Year Level", candidates: [{name: "Nurse Joy", votes: 450, photo: "https://i.pravatar.cc/150?u=joy"}, {name: "Nurse Ratched", votes: 200, photo: "https://i.pravatar.cc/150?u=ratched"}]},
                { name: "Vice President", voters: "3rd Year", candidates: [{name: "John Watson", votes: 400, photo: "https://i.pravatar.cc/150?u=john"}, {name: "Sherlock Holmes", votes: 250, photo: "https://i.pravatar.cc/150?u=sherlock"}]}
            ],
            turnout: { voted: 650, notVoted: 150, years: [200, 180, 150, 120] }
        }
    ];

    let currentFilter = 'Pending';
    let activeElectionId = null;
    let modalPie, modalBar;

    // 2. Tab Navigation logic
    window.filterByStatus = (status) => {
        currentFilter = status;
        document.querySelectorAll('.status-tab').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn-${status}`).classList.add('active');

        const tableBody = document.getElementById('election-table-body');
        const filteredData = electionsData.filter(e => e.status === status);

        tableBody.innerHTML = filteredData.length === 0 ? 
            `<tr><td colspan="6" class="px-6 py-10 text-center text-gray-400 italic">No ${status} elections found.</td></tr>` :
            filteredData.map(e => `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-5 text-gray-800 font-black">${e.title}</td>
                    <td class="px-6 py-5 text-gray-500">${e.college}</td>
                    <td class="px-6 py-5 text-gray-500">${e.user}</td>
                    <td class="px-6 py-5 text-gray-500">${e.date}</td>
                    <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${getStatusClass(e.status)}">${e.status}</span></td>
                    <td class="px-6 py-5 text-center">
                        <button onclick="openElectionModal(${e.id})" class="bg-blue-gradient text-white text-[10px] font-black uppercase px-6 py-2 rounded-lg hover:brightness-110 shadow-md transition">
                            ${e.status === 'Completed' ? 'View Results' : 'Preview'}
                        </button>
                    </td>
                </tr>
            `).join('');
    };

    // Status classes
    function getStatusClass(s) {
        return s === 'Pending' ? 'bg-yellow-100 text-yellow-700' : s === 'Approved' ? 'bg-green-100 text-green-700' : s === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-gray-100 text-gray-700';
    }

    // 3. Opening Modal Trigger
    window.openElectionModal = (id) => {
        activeElectionId = id;
        const election = electionsData.find(e => e.id === id);
        const area = document.getElementById('modal-content-area');
        
        if (election.status === 'Completed') {
            area.innerHTML = renderCompletedModal(election);
            initCompletedCharts(election);
        } else {
            area.innerHTML = renderApprovalModal(election);
        }
        document.getElementById('detailsModal').classList.remove('hidden');
    };

    // 4. Pending / Approved / Rejected Structure (Vertical Stack for General, Positions, Settings)
    function renderApprovalModal(e) {
        let headerStatus = '';
        if(e.status === 'Approved') {
            headerStatus = `<div class="bg-green-50 border border-green-200 p-6 rounded-2xl mb-6">
                <h4 class="text-green-700 font-black uppercase text-xs mb-1">APPROVED</h4>
                <p class="text-green-600 text-sm font-bold">Approved by: ${e.approvalData.approvedBy} on ${e.approvalData.date}</p>
            </div>`;
        } else if(e.status === 'Rejected') {
            headerStatus = `<div class="bg-red-50 border border-red-200 p-6 rounded-2xl mb-6">
                <h4 class="text-red-700 font-black uppercase text-xs mb-1">REJECTED</h4>
                <p class="text-red-600 text-sm font-bold">Reason: ${e.rejectionData.reasons.join(', ')}</p>
                ${e.rejectionData.others ? `<p class="text-red-500 text-xs mt-1 italic">"${e.rejectionData.others}"</p>` : ''}
            </div>`;
        }

        return `
            ${headerStatus}
            <div class="mb-8">
                <h2 class="text-3xl font-black text-gray-800 leading-tight">${e.title}</h2>
                <p class="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">${e.college}</p>
                <p class="text-gray-500 font-bold mt-1 uppercase text-xs tracking-widest">Submitted by: ${e.user}</p>
            </div>

            <div class="space-y-6">
                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 class="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest">General Details</h3>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div><p class="text-[10px] uppercase text-gray-400 font-bold">Voting Duration</p><p class="font-bold text-gray-700 text-sm">${e.votingDuration}</p></div>
                        <div><p class="text-[10px] uppercase text-gray-400 font-bold">Eligible Voters</p><p class="font-bold text-gray-700 text-sm">${e.eligibleVoters} Students</p></div>
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
                                        <ul class="space-y-1">${pos.candidates.map(c => `<li>• ${typeof c === 'string' ? c : c.name}</li>`).join('')}</ul>
                                    </td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>

                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 class="text-xs font-black uppercase text-gray-400 mb-4 tracking-widest">Settings</h3>
                    <div><p class="text-[10px] uppercase text-gray-400 font-bold">Abstain Option</p><p class="font-bold text-gray-700 text-sm">${e.abstain}</p></div>
                </div>
            </div>

            ${e.status === 'Pending' ? `
                <div class="flex justify-end gap-4 mt-10">
                    <button onclick="document.getElementById('rejectionModal').classList.remove('hidden')" class="px-8 py-3 bg-white border border-gray-200 text-gray-600 rounded-full font-bold hover:bg-gray-50 transition">Reject and Send back</button>
                    <button onclick="processApproval()" class="px-8 py-3 bg-blue-gradient text-white rounded-full font-bold shadow-lg">Approve Election</button>
                </div>
            ` : ''}
        `;
    }

    // 5. Completed Structure (Applied with sideways bar graph matching simulation)
    function renderCompletedModal(e) {
        const totalV = e.turnout.voted + e.turnout.notVoted;
        const percentVoted = Math.round((e.turnout.voted / totalV) * 100);
        const percentNotVoted = Math.round((e.turnout.notVoted / totalV) * 100);

        return `
            <div class="mb-8">
                <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 mb-2 inline-block">COMPLETED ON ${e.completedDate}</span>
                <h2 class="text-3xl font-black text-gray-800 leading-tight">${e.title}</h2>
                <p class="text-blue-500 font-bold text-xs uppercase tracking-widest mt-1">${e.college}</p>
            </div>

            <div class="space-y-6">

                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h4 class="text-[11px] font-black uppercase text-gray-400 mb-4 tracking-widest">Audit & Setup Details</h4>
                    <div class="grid grid-cols-1 md:grid-cols-3 gap-6 text-sm">
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Election Approved By</p><p class="font-bold text-gray-800 mt-1">${e.approvalData.approvedBy}</p></div>
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Election Submitted By</p><p class="font-bold text-gray-800 mt-1">${e.submittedBy}</p></div>
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Submission Time</p><p class="font-bold text-gray-800 mt-1">${e.submittedDate}</p></div>
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Abstain Option</p><p class="font-bold text-gray-800 mt-1">${e.abstain}</p></div>
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Setup Duration Started</p><p class="font-bold text-gray-800 mt-1">${e.setupStart}</p></div>
                        <div class="bg-white p-4 rounded-xl shadow-sm"><p class="text-[10px] uppercase text-gray-400 font-bold">Setup Duration Ended</p><p class="font-bold text-gray-800 mt-1">${e.setupEnd}</p></div>
                    </div>
                </div>

                <div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <h4 class="text-[11px] font-black uppercase text-gray-400 mb-4 tracking-widest">Voter Turnout</h4>
                        <div class="h-48 mb-4 flex justify-center"><canvas id="modalPieChart"></canvas></div>
                        <div class="flex justify-around items-center pt-2 border-t border-gray-100">
                            <div class="text-center">
                                <p class="text-xl font-black text-[#27A688]">${percentVoted}%</p>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Voted</p>
                            </div>
                            <div class="text-center">
                                <p class="text-xl font-black text-[#515167]">${percentNotVoted}%</p>
                                <p class="text-[10px] font-bold text-gray-400 uppercase tracking-tighter">Not Voted</p>
                            </div>
                        </div>
                    </div>

                    <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                        <h4 class="text-[11px] font-black uppercase text-gray-400 mb-4 tracking-widest">Year Level Count</h4>
                        <div class="h-48 mb-4 flex justify-center"><canvas id="modalBarChart"></canvas></div>
                        <div class="pt-2 border-t border-gray-100 text-center">
                            <p class="text-xs font-black text-gray-400 uppercase tracking-widest">Total Students: <span class="text-gray-800">${e.turnout.years.reduce((a, b) => a+b, 0)}</span></p>
                        </div>
                    </div>
                </div>

                <div class="bg-gray-50 p-6 rounded-3xl border border-gray-100">
                    <h3 class="text-lg font-black text-blue-600 mb-4 uppercase tracking-tight flex items-center gap-2"><i class="fas fa-trophy"></i> Final Tallies</h3>
                    <table class="w-full text-left">
                        <thead class="bg-gray-100 text-[10px] font-bold uppercase text-gray-500"><tr><th class="px-6 py-3">Candidate / Position</th><th class="px-6 py-3 text-right">Votes</th></tr></thead>
                        <tbody class="divide-y divide-gray-100 text-sm font-bold text-gray-700">
                            ${e.positions.map(pos => `
                                <tr class="bg-gray-100/50"><td colspan="2" class="px-6 py-2 text-blue-600 uppercase text-[10px] tracking-widest font-black">${pos.name} (${pos.voters})</td></tr>
                                ${pos.candidates.map(c => `
                                    <tr>
                                        <td class="px-6 py-4 flex items-center gap-3">
                                            <img src="${c.photo}" class="w-10 h-10 rounded-full border-2 border-blue-50">
                                            <span>${c.name}</span>
                                        </td>
                                        <td class="px-6 py-4 text-right font-black">${c.votes}</td>
                                    </tr>
                                `).join('')}
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;
    }

    // Chart initializations for Completed election view
    function initCompletedCharts(e) {
        const ctxPie = document.getElementById('modalPieChart').getContext('2d');
        const ctxBar = document.getElementById('modalBarChart').getContext('2d');

        if (modalPie) modalPie.destroy();
        if (modalBar) modalBar.destroy();

        modalPie = new Chart(ctxPie, {
            type: 'doughnut',
            data: { labels: ['Voted', 'Not'], datasets: [{ data: [e.turnout.voted, e.turnout.notVoted], backgroundColor: ['#27A688', '#515167'], borderWidth: 0, cutout: '75%' }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        modalBar = new Chart(ctxBar, {
            type: 'bar',
            data: { 
                labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'], 
                datasets: [{ data: e.turnout.years, backgroundColor: '#27A688', borderRadius: 4, barThickness: 15 }] 
            },
            options: { 
                indexAxis: 'y', maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { grid: { display: false }, border: { display: false } } }
            }
        });
    }

    // 6. Approval & Rejection Logic
    window.processApproval = () => {
        const e = electionsData.find(el => el.id === activeElectionId);
        e.status = 'Approved';
        e.approvalData = { approvedBy: "Admin Maria (Frontend Simulator)", date: new Date().toLocaleString() };

        showToast("Success", "Election approved successfully!", "#27A688", "fa-check");
        openElectionModal(activeElectionId);
        filterByStatus(currentFilter);
    };

    window.processRejection = () => {
        const checks = document.querySelectorAll('.rejection-reason:checked');
        if (checks.length === 0) return alert("Select a reason.");

        const e = electionsData.find(el => el.id === activeElectionId);
        e.status = 'Rejected';
        e.rejectionData = { 
            reasons: Array.from(checks).map(c => c.value), 
            others: document.getElementById('other-reason-text').value 
        };

        closeModal('rejectionModal');
        showToast("Rejected", "Election has been sent back to the submitter.", "#515167", "fa-times");
        openElectionModal(activeElectionId);
        filterByStatus(currentFilter);
    };

    // 7. Dynamic Utilities: Dim backgrounds, and custom modals
    window.showToast = (title, msg, color, icon) => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerText = msg;
        document.getElementById('toast-icon-bg').style.backgroundColor = color;
        document.getElementById('toast-icon').className = `fas ${icon}`;

        overlay.classList.remove('hidden');
        setTimeout(() => { container.classList.remove('scale-95', 'opacity-0'); }, 10);
        setTimeout(hideToast, 2500);
    };

    window.hideToast = () => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => { document.getElementById('toast-overlay').classList.add('hidden'); }, 300);
    };

    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

    window.handleModalOutsideClick = (e, id) => {
        if (e.target.id === id) closeModal(id);
    };

    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');

    document.getElementById('other-check').addEventListener('change', (e) => {
        document.getElementById('other-reason-text').classList.toggle('hidden', !e.target.checked);
    });

    filterByStatus('Pending');
});