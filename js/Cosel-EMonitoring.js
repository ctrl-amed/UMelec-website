document.addEventListener('DOMContentLoaded', () => {
    const colleges = [
        "College of Liberal Arts and Sciences (CLAS)", "College of Innovative Teacher Education (CITE)",
        "College of Human Kinetics (CHK)", "College of Engineering and Technology (CET)",
        "College of Tourism and Hospitality Management (CTHM)", "School of Law (SOL)",
        "College of Accountancy (IA)", "College of Business and Financial Science (CBFS)",
        "College of Governance and Public Policy (CGPP)", "College of Computing and Information Sciences (CCIS)",
        "College of Construction Sciences and Engineering (CCSE)", "Institute of Arts and Design (IAD)",
        "Institute of Nursing (ION)", "Institute of Health Sciences (IIHS)",
        "Institute for Social Development and Nation Building (ISDNB)", "Institute of Pharmacy (IOP)",
        "Institute of Psychology (IOPsy)", "Institute of Social Work (ISW)",
        "Institute of Technical Education and Skills Training (ITEST)", "Institute for Disaster and Emergency Management (IDEM)"
    ];

    const mockElections = colleges.flatMap((col, index) => {
        if (index % 3 === 0 && index !== 0) return []; 
        const shortName = col.match(/\(([^)]+)\)/)?.[1] || "GEN";
        return [{ 
            title: `${shortName} Student Council`, 
            college: col, 
            end: "March 29, 2026 - 8:00 PM",
            status: index % 2 === 0 ? "ongoing" : "completed",
            voters: { yr1: 7, yr2: 11, yr3: 10, yr4: 6 },
            eligible: 100,
            internalStatus: index % 4 === 0 ? "rejected" : (index % 2 === 0 ? "approved" : "completed")
        }];
    });

    let currentTab = 'ongoing';
    let selectedColleges = new Set();
    let barChart, pieChart, modalPie, modalBar;
    let timerInterval;

    function init() {
        populateFilters();
        setupEventListeners();
        updateUI();
    }

    function setupEventListeners() {
        ['time-filter', 'college-filter', 'election-filter'].forEach(id => {
            document.getElementById(id).addEventListener('change', updateUI);
        });
    }

    function populateFilters() {
        const colFilter = document.getElementById('college-filter');
        const elecFilter = document.getElementById('election-filter');
        const modalSelect = document.getElementById('modal-college-select');
        colleges.forEach(c => {
            colFilter.add(new Option(c, c));
            modalSelect.add(new Option(c, c));
        });
        const uniqueTitles = [...new Set(mockElections.map(e => e.title))];
        uniqueTitles.forEach(t => elecFilter.add(new Option(t, t)));
    }

    function updateUI() {
        const filtered = getFilteredData();
        updateStats(filtered);
        renderCharts(filtered);
        renderTable(filtered);
    }

    function getFilteredData() {
        const colVal = document.getElementById('college-filter').value;
        const elecVal = document.getElementById('election-filter').value;
        return mockElections.filter(e => {
            const matchesCol = colVal === 'all' || e.college === colVal;
            const matchesElec = elecVal === 'all' || e.title === elecVal;
            return matchesCol && matchesElec;
        });
    }

    function updateStats(data) {
        const total = data.length;
        const eligible = data.reduce((a, b) => a + b.eligible, 0);
        const actualVotes = data.reduce((a, b) => a + Object.values(b.voters).reduce((sum, v) => sum + v, 0), 0);
        const turnout = eligible > 0 ? Math.round((actualVotes / eligible) * 100) : 0;

        document.getElementById('stat-total-elections').innerText = total;
        document.getElementById('stat-turnout').innerText = `${turnout}%`;
        document.getElementById('stat-eligible').innerText = eligible;
        document.getElementById('main-total-students').innerText = actualVotes;
    }

    function renderCharts(data) {
        const years = { yr1: 0, yr2: 0, yr3: 0, yr4: 0 };
        data.forEach(e => {
            years.yr1 += e.voters.yr1; years.yr2 += e.voters.yr2;
            years.yr3 += e.voters.yr3; years.yr4 += e.voters.yr4;
        });
        if (barChart) barChart.destroy();
        barChart = new Chart(document.getElementById('voterBarChart'), {
            type: 'bar',
            data: {
                labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
                datasets: [{ data: Object.values(years), backgroundColor: '#27A688', borderRadius: 4, barThickness: 15 }]
            },
            options: { 
                indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                maintainAspectRatio: false,
                scales: { x: { display: false }, y: { grid: { display: false }, border: { display: false } } }
            }
        });
        const statusCounts = { 
            approved: data.filter(e => e.internalStatus === 'approved').length,
            completed: data.filter(e => e.internalStatus === 'completed').length,
            rejected: data.filter(e => e.internalStatus === 'rejected').length
        };
        if (pieChart) pieChart.destroy();
        pieChart = new Chart(document.getElementById('electionPieChart'), {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Completed', 'Rejected'],
                datasets: [{ data: [statusCounts.approved, statusCounts.completed, statusCounts.rejected], backgroundColor: ['#515167', '#27A688', '#D33131'], borderWidth: 0, cutout: '75%' }]
            },
            options: { plugins: { legend: { display: false }, tooltip: { enabled: false } }, maintainAspectRatio: false }
        });
        const legend = document.getElementById('pie-legend');
        const colors = ['text-[#515167]', 'text-[#27A688]', 'text-[#D33131]'];
        const labels = ['Approved', 'Completed', 'Rejected'];
        const values = [statusCounts.approved, statusCounts.completed, statusCounts.rejected];
        const totalE = data.length || 1;
        legend.innerHTML = labels.map((label, i) => `<div class="flex items-center gap-4 text-[11px] font-black uppercase tracking-tight"><span class="${colors[i]} w-8 text-right">${Math.round((values[i]/totalE)*100)}%</span><span class="text-gray-400 font-bold">${label}</span></div>`).join('');
    }

    window.renderTable = (data = getFilteredData()) => {
        const body = document.getElementById('election-table-body');
        const filtered = data.filter(e => e.status === currentTab);
        body.innerHTML = filtered.length === 0 ?
        `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-400 italic">No data.</td></tr>` :
        filtered.map(e => `
            <tr class="hover:bg-gray-50/50 transition">
                <td class="px-6 py-4 font-black text-gray-800">${e.title}</td>
                <td class="px-6 py-4 text-gray-500 text-[10px] uppercase font-bold">${e.college.match(/\(([^)]+)\)/)?.[1] || e.college}</td>
                <td class="px-6 py-4 text-gray-500 font-medium">${e.end}</td>
                <td class="px-6 py-4 text-center">
                    <button onclick="openElectionDetails('${e.title}', '${e.status}', '${e.end}')" class="text-[#0098E0] font-black uppercase tracking-tighter action-link">
                        ${e.status === 'completed' ? 'View Results' : 'Monitoring Election'}
                    </button>
                </td>
            </tr>
        `).join('');
    };

    window.openElectionDetails = (title, status, endTime) => {
        const isCompleted = status === 'completed';
        const modal = document.getElementById('detailsModal');
        document.getElementById('modal-election-title').innerText = title;
        document.getElementById('modal-status-badge').innerText = status;
        document.getElementById('modal-status-badge').className = isCompleted ?
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 mb-2 inline-block" :
            "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-600 mb-2 inline-block";
        document.getElementById('timer-card').classList.toggle('hidden', isCompleted);
        document.getElementById('winners-section').classList.toggle('hidden', !isCompleted);
        document.getElementById('tally-title').innerText = isCompleted ? "Final Tallies" : "Live Tallies";
        const data = {
            voted: isCompleted ? 95 : 45,
            notVoted: isCompleted ? 5 : 55,
            years: isCompleted ? [25, 30, 20, 20] : [10, 15, 10, 10],
            positions: [
                {
                    name: "President",
                    candidates: [
                        { name: "John Dominic", votes: isCompleted ? 70 : 30, photo: "https://i.pravatar.cc/150?u=1" },
                        { name: "Maria Clara", votes: isCompleted ? 25 : 15, photo: "https://i.pravatar.cc/150?u=2" }
                    ]
                },
                {
                    name: "Vice President",
                    candidates: [
                        { name: "Alex Santos", votes: isCompleted ? 60 : 25, photo: "https://i.pravatar.cc/150?u=3" },
                        { name: "Sarah Gomez", votes: isCompleted ? 35 : 20, photo: "https://i.pravatar.cc/150?u=4" }
                    ]
                }
            ]
        };
        modal.classList.remove('hidden');
        renderModalCharts(data);
        renderTalliesAndProfiles(data, isCompleted);
        startCountdown(endTime);

        const totalV = data.voted + data.notVoted;
        document.getElementById('percent-voted').innerText = `${Math.round((data.voted/totalV)*100)}%`;
        document.getElementById('percent-not-voted').innerText = `${Math.round((data.notVoted/totalV)*100)}%`;
        document.getElementById('modal-total-students').innerText = data.years.reduce((a,b) => a+b, 0);
    };

    function startCountdown(endTimeStr) {
        clearInterval(timerInterval);
        const timerDisplay = document.getElementById('countdown-timer');
        const cleanDate = endTimeStr.replace(' - ', ' ');
        const targetDate = new Date(cleanDate).getTime();

        timerInterval = setInterval(() => {
            const now = new Date().getTime();
            const distance = targetDate - now;
            if (distance < 0) {
                clearInterval(timerInterval);
                timerDisplay.innerText = "00:00:00:00";
                return;
            }
            const days = Math.floor(distance / (1000 * 60 * 60 * 24));
            const hours = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const minutes = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((distance % (1000 * 60)) / 1000);
            timerDisplay.innerText = `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    function renderModalCharts(data) {
        if (modalPie) modalPie.destroy();
        if (modalBar) modalBar.destroy();
        modalPie = new Chart(document.getElementById('modalPieChart'), {
            type: 'doughnut',
            data: { 
                labels: ['Voted', 'Not Voted'],
                datasets: [{ data: [data.voted, data.notVoted], backgroundColor: ['#27A688', '#515167'], borderWidth: 0, cutout: '70%' }]
            },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: { enabled: false } } }
        });
        modalBar = new Chart(document.getElementById('modalBarChart'), {
            type: 'bar',
            data: { 
                labels: ['1st Yr', '2nd Yr', '3rd Yr', '4th Yr'],
                datasets: [{ data: data.years, backgroundColor: '#27A688', borderRadius: 4, barThickness: 15 }]
            },
            options: { 
                indexAxis: 'y', maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: { x: { display: false }, y: { grid: { display: false }, border: { display: false } } }
            }
        });
    }

    function renderTalliesAndProfiles(data, isCompleted) {
        const tallyBody = document.getElementById('tally-table-body');
        const profileCont = document.getElementById('candidate-profiles');
        const winnersCont = document.getElementById('winners-container');
        tallyBody.innerHTML = ''; profileCont.innerHTML = ''; winnersCont.innerHTML = '';
        data.positions.forEach(pos => {
            tallyBody.innerHTML += `<tr class="bg-gray-50"><td colspan="2" class="px-6 py-2 text-blue-600 uppercase text-[10px] tracking-widest font-black">${pos.name}</td></tr>`;
            let profileHTML = `<div><h4 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">${pos.name} Candidates</h4><div class="flex flex-wrap gap-6">`;
            let winner = pos.candidates.reduce((prev, curr) => (prev.votes > curr.votes) ? prev : curr);
            pos.candidates.forEach(can => {
                tallyBody.innerHTML += `<tr><td class="px-6 py-4 flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-blue-400"></div> ${can.name}</td><td class="px-6 py-4 text-right font-black">${can.votes}</td></tr>`;
                profileHTML += `
                    <div class="flex flex-col items-center text-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-[160px]">
                        <img src="${can.photo}" class="w-20 h-20 rounded-full border-4 border-blue-50 mb-3 shadow-inner">
                        <p class="text-sm font-black text-gray-800 leading-tight">${can.name}</p>
                        <p class="text-[9px] uppercase text-blue-500 font-black mt-1 tracking-widest">${pos.name}</p>
                    </div>`;
            });
            profileCont.innerHTML += profileHTML + `</div></div>`;
            if (isCompleted) {
                winnersCont.innerHTML += `
                    <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <p class="text-[9px] font-black text-blue-500 uppercase tracking-widest">${pos.name} Winner</p>
                            <h4 class="text-lg font-black text-gray-800">${winner.name}</h4>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-black text-blue-600">${winner.votes}</p>
                            <p class="text-[9px] font-bold text-gray-400 uppercase">Votes</p>
                        </div>
                    </div>`;
            }
        });
    }

    // --- LOGOUT LOGIC ---
    window.showLogoutModal = () => {
        const overlay = document.getElementById('logoutModalOverlay');
        if (overlay) {
            overlay.classList.remove('hidden');
            overlay.classList.add('flex');
            document.body.style.overflow = 'hidden';
        }
    };

    window.closeLogoutModal = () => {
        const overlay = document.getElementById('logoutModalOverlay');
        if (overlay) {
            overlay.classList.add('hidden');
            overlay.classList.remove('flex');
            document.body.style.overflow = '';
        }
    };

    const logoutOverlay = document.getElementById('logoutModalOverlay');
    if(logoutOverlay) {
        logoutOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeLogoutModal();
        });
    }

    // --- STANDARD UI HELPERS ---
    window.switchTab = (tab) => {
        currentTab = tab;
        document.querySelectorAll('.status-tab').forEach(el => el.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');
        renderTable();
    };

    window.showToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        if (overlay && container) {
            overlay.classList.remove('hidden');
            setTimeout(() => { container.classList.remove('scale-95', 'opacity-0'); }, 10);
            window.toastTimer = setTimeout(hideToast, 3000);
        }
    };

    window.hideToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        if(!container) return;
        container.classList.add('scale-95', 'opacity-0');
        clearTimeout(window.toastTimer);
        setTimeout(() => { if (overlay) overlay.classList.add('hidden'); }, 300);
    };

    window.handleDownloadAll = () => { toggleDropdown('download-drop'); showToast(); };
    window.confirmBulkDownload = () => { if (selectedColleges.size === 0) return; closeModal('downloadModal'); showToast(); selectedColleges.clear(); renderTags(); };
    window.addCollegeTag = (val) => { if (val && !selectedColleges.has(val)) { selectedColleges.add(val); renderTags(); } };
    window.removeTag = (val) => { selectedColleges.delete(val); renderTags(); };
    function renderTags() { document.getElementById('tags-container').innerHTML = Array.from(selectedColleges).map(col => `<div class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 tag-enter">${col}<button onclick="removeTag('${col}')"><i class="fas fa-times"></i></button></div>`).join(''); }
    window.resetFilters = () => { document.getElementById('time-filter').value = '30'; document.getElementById('college-filter').value = 'all'; document.getElementById('election-filter').value = 'all'; updateUI(); };
    window.toggleDropdown = (id) => document.getElementById(id).classList.toggle('show');
    window.openDownloadModal = () => { toggleDropdown('download-drop'); document.getElementById('downloadModal').classList.remove('hidden'); };
    window.closeModal = (id) => { 
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
        if(id === 'detailsModal') clearInterval(timerInterval);
    };

    init();
});