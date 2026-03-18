document.addEventListener('DOMContentLoaded', () => {
    // --- Mock Database Data ---
    const electionData = {
        name: "CCIS Student Council Election",
        totalVotes: 15,
        lastUpdated: "March 20, 2026, 10:00 PM",
        positions: [
            {
                title: "President",
                candidates: [
                    { rank: 1, name: "Jazzelle Grace Albaladejo", votes: 10, img: "https://i.pravatar.cc/100?u=1" },
                    { rank: 2, name: "Althea Margaret Dominguez", votes: 5, img: "https://i.pravatar.cc/100?u=2" }
                ]
            },
            {
                title: "Vice President",
                candidates: [
                    { rank: 1, name: "Alexis Claire Hermoso", votes: 10, img: "https://i.pravatar.cc/100?u=8" },
                    { rank: 2, name: "Sarah Luzada", votes: 5, img: "https://i.pravatar.cc/100?u=9" }
                ]
            },
            {
                title: "Secretary",
                candidates: [
                    { rank: 1, name: "Eunice Garcia", votes: 8, img: "https://i.pravatar.cc/100?u=3" },
                    { rank: 2, name: "John Rizal", votes: 7, img: "https://i.pravatar.cc/100?u=4" }
                ]
            }
        ]
    };

    const container = document.getElementById('talliesContainer');
    const approveBtn = document.getElementById('approveResultsBtn');
    const confirmDialog = document.getElementById('confirmDialog');
    const toastOverlay = document.getElementById('toastOverlay');
    const successToast = document.getElementById('successToast');
    let toastTimer;

    // --- Render Tallies ---
    function renderTallies() {
        container.innerHTML = electionData.positions.map(pos => `
            <div class="bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-100">
                <div class="card-header-gradient px-6 py-4 text-white font-bold text-lg">
                    ${pos.title}
                </div>
                <div class="p-6 overflow-x-auto">
                    <table class="w-full text-left">
                        <thead>
                            <tr class="text-xs uppercase text-gray-400 font-bold border-b border-gray-100">
                                <th class="pb-3 px-2 w-20">Rank</th>
                                <th class="pb-3 px-2">Candidates</th>
                                <th class="pb-3 px-2 text-right">Vote Counts</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-gray-100">
                            ${pos.candidates.map(can => `
                                <tr>
                                    <td class="py-4 px-2 text-gray-500 font-medium">${can.rank}</td>
                                    <td class="py-4 px-2 flex items-center gap-4">
                                        <img src="${can.img}" class="w-12 h-12 rounded-full border border-gray-200 object-cover shadow-sm">
                                        <span class="font-bold text-gray-700 font-sans">${can.name}</span>
                                    </td>
                                    <td class="py-4 px-2 text-right text-gray-600 font-bold">${can.votes} votes</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('');
    }

    renderTallies();

    // --- Approval Workflow ---
    if (approveBtn) {
        approveBtn.addEventListener('click', () => {
            confirmDialog.classList.remove('hidden');
        });
    }

    document.getElementById('cancelApprove').addEventListener('click', () => {
        confirmDialog.classList.add('hidden');
    });

    document.getElementById('confirmApprove').addEventListener('click', () => {
        confirmDialog.classList.add('hidden');
        showToast();
    });

    function showToast() {
        toastOverlay.classList.remove('hidden');
        successToast.classList.add('toast-animate-center');
        
        toastTimer = setTimeout(() => {
            closeToast();
        }, 3000);
    }

    window.closeToast = () => {
        clearTimeout(toastTimer);
        toastOverlay.classList.add('hidden');
        successToast.classList.remove('toast-animate-center');
        updateToOfficial();
    };

    function updateToOfficial() {
        if (approveBtn) approveBtn.remove();
        document.getElementById('tallyHeader').innerHTML = `Official Election Results - ${electionData.name}`;
        document.getElementById('tallySubtext').innerText = "Results have been verified";
        
        const now = new Date();
        const formattedDate = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const formattedTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        document.getElementById('verifiedTimestamp').innerText = `Verified on ${formattedDate}, ${formattedTime}`;
    }

    // --- Logout ---
    const logoutModal = document.getElementById('logoutModal');
    document.getElementById('logoutSidebarBtn').addEventListener('click', () => logoutModal.classList.remove('hidden'));
    document.getElementById('closeLogout').addEventListener('click', () => logoutModal.classList.add('hidden'));
    document.getElementById('confirmLogout').addEventListener('click', () => window.location.href = "index.html");
});