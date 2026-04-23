document.addEventListener('DOMContentLoaded', () => {
    // --- Authenticated User Data (Reference from RandD) ---
    const authenticatedUser = {
        name: "Maria Leonora Theresa",
        college: "CCIS",
        position: "Chairperson"
    };

    // 1. Mock Election Data
    const archiveData = [
        { id: 1, title: 'CCIS Student Council Elections 2025', start: '2025-11-18', end: '2025-11-18' },
        { id: 2, title: 'CCIS Student Council Elections 2024', start: '2024-11-18', end: '2024-11-18' },
        { id: 3, title: 'CCIS Student Council Elections 2023', start: '2023-11-18', end: '2023-11-18' }
    ];

    // 2. Mock Statistics
    const statsMock = {
        turnout: { voted: 55, notVoted: 45, total: 34 },
        byYear: [
            { year: '1st Year', count: 7, color: 'bg-blue-500' },
            { year: '2nd Year', count: 11, color: 'bg-orange-500' },
            { year: '3rd Year', count: 10, color: 'bg-emerald-500' },
            { year: '4th Year', count: 6, color: 'bg-red-500' }
        ],
        demographics: [
            { group: 'Female', eligible: 100, rate: '50%' },
            { group: 'Male', eligible: 100, rate: '50%' }
        ],
        winners: [
            { name: 'Jazzelle Grace Albaladejo', position: 'President' },
            { name: 'Alexis Claire Hermoso', position: 'Vice President' },
            { name: 'Eunice Garcia', position: 'Secretary' },
            { name: 'Chloe Mendoza', position: 'Treasurer' },
            { name: 'Joe Francisco', position: 'Auditor' }
        ],
        results: [
            { position: 'President', candidates: [
                { name: 'Jazzelle Grace Albaladejo', rank: 1, votes: 100 },
                { name: 'Althea Margaret Dominguez', rank: 2, votes: 75 }
            ], abstentions: 10 },
            { position: 'Vice President', candidates: [
                { name: 'Alexis Claire Hermoso', rank: 1, votes: 100 },
                { name: 'Sarah Luzada', rank: 2, votes: 75 }
            ], abstentions: 10 }
        ]
    };

    const tableBody = document.getElementById('archiveTableBody');
    const viewModal = document.getElementById('viewModal');
    const exportPrompt = document.getElementById('exportPrompt');
    const toastOverlay = document.getElementById('toastOverlay');
    const successToast = document.getElementById('successToast');
    const logoutModal = document.getElementById('logoutModal');
    const sidebarLogoutBtn = document.getElementById('logoutBtn');

    // --- PROFILE INITIALIZATION (Reference from RandD) ---
    function displayProfile() {
        const nameDisplay = document.getElementById('userName');
        const roleDisplay = document.getElementById('userRole');
        
        if (nameDisplay && roleDisplay) {
            nameDisplay.textContent = authenticatedUser.name;
            roleDisplay.textContent = `${authenticatedUser.college} - ${authenticatedUser.position}`;
        }
    }

    function renderTable() {
        tableBody.innerHTML = archiveData.map(election => `
            <tr class="hover:bg-blue-50 transition">
                <td class="px-6 py-4 text-sm font-medium text-gray-700">${election.title}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${election.start}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${election.end}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="openArchiveModal('${election.title}')" class="text-blue-600 font-bold hover:underline text-sm">View</button>
                </td>
            </tr>
        `).join('');
    }

    window.openArchiveModal = (title) => {
        document.getElementById('modalTitle').innerText = title;
        const container = document.getElementById('demographicsContent');

        container.innerHTML = `
            <div class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start">
                <div class="flex flex-col items-center">
                    <div class="relative w-32 h-32 mb-4">
                        <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                            <circle cx="18" cy="18" r="16" fill="none" class="stroke-gray-100" stroke-width="4"></circle>
                            <circle cx="18" cy="18" r="16" fill="none" class="stroke-emerald-400" stroke-width="4" stroke-dasharray="${statsMock.turnout.voted}, 100"></circle>
                        </svg>
                        <div class="absolute inset-0 flex items-center justify-center font-bold text-xl">${statsMock.turnout.voted}%</div>
                    </div>
                    <div class="w-full space-y-2">
                        <div class="flex justify-between p-3 bg-gray-50 rounded-xl text-xs font-bold">
                            <span class="text-gray-500">Voted</span><span class="text-emerald-500">${statsMock.turnout.voted}%</span>
                        </div>
                        <div class="flex justify-between p-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-500">
                            <span>Not Voted</span><span>${statsMock.turnout.notVoted}%</span>
                        </div>
                    </div>
                </div>
                <div class="space-y-4">
                    <h5 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Voted Students by Year</h5>
                    ${statsMock.byYear.map(item => `
                        <div class="space-y-1">
                            <div class="flex justify-between text-xs font-bold text-gray-600">
                                <span>${item.year}</span><span>${item.count} Students</span>
                            </div>
                            <div class="w-full bg-gray-100 rounded-full h-2">
                                <div class="${item.color} h-2 rounded-full" style="width: ${(item.count/statsMock.turnout.total)*100}%"></div>
                            </div>
                        </div>
                    `).join('')}
                    <p class="text-center text-xs font-bold text-gray-400 mt-2">Total Students: ${statsMock.turnout.total}</p>
                </div>
            </div>

            <div>
                <h5 class="text-sm font-bold text-gray-800 mb-3">Voted Demographic Turnout Rate</h5>
                <table class="w-full border-collapse border border-gray-200 text-sm">
                    <thead class="bg-gray-50 text-gray-600"><tr><th class="border border-gray-200 px-4 py-2 text-left">Demographic Group</th><th class="border border-gray-200 px-4 py-2 text-left">Total Eligible</th><th class="border border-gray-200 px-4 py-2 text-left">Turnout Rate</th></tr></thead>
                    <tbody>${statsMock.demographics.map(d => `<tr><td class="border border-gray-200 px-4 py-2">${d.group}</td><td class="border border-gray-200 px-4 py-2">${d.eligible}</td><td class="border border-gray-200 px-4 py-2">${d.rate}</td></tr>`).join('')}</tbody>
                </table>
            </div>

            <div>
                <h5 class="text-sm font-bold text-gray-800 mb-3 font-sans">Verified Vote Counts Summary</h5>
                <p class="text-xs font-semibold text-gray-400 mb-2 italic">Officially Declared Winners:</p>
                <table class="w-full border-collapse border border-gray-200 text-sm mb-6">
                    <thead class="bg-gray-50 text-gray-600"><tr><th class="border border-gray-200 px-4 py-2 text-left">Candidate Name</th><th class="border border-gray-200 px-4 py-2 text-left">Position</th></tr></thead>
                    <tbody>${statsMock.winners.map(w => `<tr><td class="border border-gray-200 px-4 py-2">${w.name}</td><td class="border border-gray-200 px-4 py-2 font-medium">${w.position}</td></tr>`).join('')}</tbody>
                </table>

                ${statsMock.results.map(res => `
                    <div class="mb-6">
                        <h6 class="text-sm font-bold text-blue-600 mb-2 font-sans">${res.position}</h6>
                        <table class="w-full border-collapse border border-gray-200 text-sm">
                            <thead class="bg-gray-50 text-gray-600"><tr><th class="border border-gray-200 px-4 py-2 text-left">Rank</th><th class="border border-gray-200 px-4 py-2 text-left">Candidate Name</th><th class="border border-gray-200 px-4 py-2 text-left">Total Votes</th></tr></thead>
                            <tbody>${res.candidates.map(c => `<tr><td class="border border-gray-200 px-4 py-2">${c.rank}</td><td class="border border-gray-200 px-4 py-2">${c.name}</td><td class="border border-gray-200 px-4 py-2 font-bold">${c.votes}</td></tr>`).join('')}</tbody>
                        </table>
                        <p class="text-[10px] text-gray-400 mt-1 uppercase font-bold">Total Abstentions Recorded: ${res.abstentions}</p>
                    </div>
                `).join('')}
            </div>
        `;
        viewModal.classList.remove('hidden');
    };

    window.openExportPrompt = () => exportPrompt.classList.remove('hidden');
    window.closeExportPrompt = () => exportPrompt.classList.add('hidden');

    window.confirmDownload = (type) => {
        console.log(`Downloading as ${type}...`);
        closeExportPrompt();
        showToast();
    };

    window.handleAutoDownload = () => {
        showToast();
    };

    function showToast() {
        toastOverlay.classList.remove('hidden');
        successToast.classList.add('toast-animate-center');
        
        setTimeout(() => {
            closeToast();
        }, 3000);
    }

    window.closeToast = () => {
        toastOverlay.classList.add('hidden');
        successToast.classList.remove('toast-animate-center');
    };

    document.getElementById('closeModal').onclick = () => viewModal.classList.add('hidden');
    
    // --- LOGOUT LOGIC (Reference from RandD) ---
    if(sidebarLogoutBtn) {
        sidebarLogoutBtn.onclick = () => logoutModal.classList.remove('hidden');
    }
    
    document.getElementById('closeLogout').onclick = () => logoutModal.classList.add('hidden');
    document.getElementById('confirmLogout').onclick = () => window.location.href = "index.html";

    // --- INITIALIZE ---
    displayProfile();
    renderTable();
});