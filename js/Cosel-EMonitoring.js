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
    orderBy,
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

    let electionsData = []; 
    let currentTab = 'ongoing';
    let barChart, pieChart, modalPie, modalBar;
    let timerInterval;
    let activeElectionListener = null; 

    // --- INITIALIZATION ---
    function init() {
        populateFilters();
        setupEventListeners();
        startGlobalListeners();
    }

    function setupEventListeners() {
        ['college-filter', 'election-filter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', updateUI);
        });
    }

    // --- REAL-TIME DATA HUB ---
    function startGlobalListeners() {
        // 1. Sync Elections
        onSnapshot(query(collection(db, "elections"), orderBy("endDate", "desc")), (snapshot) => {
            electionsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            updateElectionTitleFilter();
            updateUI();
        });

        // 2. Sync All Votes for Dashboard Stats
        onSnapshot(collection(db, "votes"), (snapshot) => {
            const allVotes = snapshot.docs.map(d => d.data());
            updateDashboardChartsLive(allVotes);
        });
    }

    function populateFilters() {
        const colFilter = document.getElementById('college-filter');
        colleges.forEach(c => { if (colFilter) colFilter.add(new Option(c, c)); });
    }

    function updateElectionTitleFilter() {
        const elecFilter = document.getElementById('election-filter');
        if (!elecFilter) return;
        const currentVal = elecFilter.value;
        elecFilter.innerHTML = '<option value="all">All Elections</option>';
        [...new Set(electionsData.map(e => e.title))].forEach(t => elecFilter.add(new Option(t, t)));
        elecFilter.value = currentVal;
    }

    // --- UI UPDATING LOGIC ---
    function updateUI() {
        const filtered = getFilteredData();
        renderTable(filtered);
    }

    function getFilteredData() {
        const colVal = document.getElementById('college-filter').value;
        const elecVal = document.getElementById('election-filter').value;
        return electionsData.filter(e => {
            const matchesCol = colVal === 'all' || e.college === colVal;
            const matchesElec = elecVal === 'all' || e.title === elecVal;
            return matchesCol && matchesElec;
        });
    }

    // --- DASHBOARD ANALYTICS ---
    async function updateDashboardChartsLive(allVotes) {
        const colVal = document.getElementById('college-filter').value;
        
        // Fetch Eligible Voters (Filtered by College if necessary)
        let userQuery = query(collection(db, "users"), where("role", "==", "student"));
        if (colVal !== 'all') userQuery = query(userQuery, where("college", "==", colVal));
        const usersSnap = await getDocs(userQuery);
        
        const totalEligible = usersSnap.size || 0;
        const actualVotes = allVotes.length;
        const turnout = totalEligible > 0 ? Math.round((actualVotes / totalEligible) * 100) : 0;

        document.getElementById('stat-total-elections').innerText = electionsData.length;
        document.getElementById('stat-turnout').innerText = `${turnout}%`;
        document.getElementById('stat-eligible').innerText = totalEligible;
        document.getElementById('main-total-students').innerText = actualVotes;

        // Bar Chart: Year Level Distribution
        const years = { yr1: 0, yr2: 0, yr3: 0, yr4: 0 };
        allVotes.forEach(v => {
            const y = String(v.yearLevel || v.year);
            if (y === "1") years.yr1++; else if (y === "2") years.yr2++;
            else if (y === "3") years.yr3++; else if (y === "4") years.yr4++;
        });

        if (!barChart) {
            barChart = new Chart(document.getElementById('voterBarChart'), {
                type: 'bar',
                data: {
                    labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
                    datasets: [{ data: Object.values(years), backgroundColor: '#27A688', borderRadius: 4, barThickness: 15 }]
                },
                options: { indexAxis: 'y', plugins: { legend: { display: false } }, maintainAspectRatio: false, scales: { x: { display: false }, y: { grid: { display: false }, border: { display: false } } } }
            });
        } else {
            barChart.data.datasets[0].data = Object.values(years);
            barChart.update();
        }

        // Pie Chart: Election Summary
        const statusCounts = { 
            approved: electionsData.filter(e => e.status === 'ongoing' || e.status === 'approved').length,
            completed: electionsData.filter(e => e.status === 'completed').length,
            rejected: electionsData.filter(e => e.status === 'rejected').length
        };

        if (!pieChart) {
            pieChart = new Chart(document.getElementById('electionPieChart'), {
                type: 'doughnut',
                data: {
                    labels: ['Approved', 'Completed', 'Rejected'],
                    datasets: [{ data: [statusCounts.approved, statusCounts.completed, statusCounts.rejected], backgroundColor: ['#515167', '#27A688', '#D33131'], borderWidth: 0, cutout: '75%' }]
                },
                options: { plugins: { legend: { display: false } }, maintainAspectRatio: false }
            });
        } else {
            pieChart.data.datasets[0].data = [statusCounts.approved, statusCounts.completed, statusCounts.rejected];
            pieChart.update();
        }

        const totalE = electionsData.length || 1;
        document.getElementById('pie-legend').innerHTML = [
            { label: 'Approved', val: statusCounts.approved, color: 'text-[#515167]' },
            { label: 'Completed', val: statusCounts.completed, color: 'text-[#27A688]' },
            { label: 'Rejected', val: statusCounts.rejected, color: 'text-[#D33131]' }
        ].map(item => `<div class="flex items-center gap-4 text-[11px] font-black uppercase tracking-tight"><span class="${item.color} w-8 text-right">${Math.round((item.val/totalE)*100)}%</span><span class="text-gray-400 font-bold">${item.label}</span></div>`).join('');
    }

    // --- TABLE RENDERING ---
    window.renderTable = (data = getFilteredData()) => {
        const body = document.getElementById('election-table-body');
        const filtered = data.filter(e => currentTab === 'ongoing' ? e.status !== 'completed' : e.status === 'completed');

        body.innerHTML = filtered.length === 0 ?
            `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-400 italic">No data available.</td></tr>` :
            filtered.map(e => {
                const dateStr = e.endDate?.toDate().toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) || "N/A";
                const shortCol = e.college.match(/\(([^)]+)\)/)?.[1] || e.college;
                return `
                <tr class="hover:bg-gray-50/50 transition">
                    <td class="px-6 py-4 font-black text-gray-800">${e.title}</td>
                    <td class="px-6 py-4 text-gray-500 text-[10px] uppercase font-bold">${shortCol}</td>
                    <td class="px-6 py-4 text-gray-500 font-medium">${dateStr}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="openElectionDetails('${e.id}')" class="text-[#0098E0] font-black uppercase tracking-tighter">
                            ${e.status === 'completed' ? 'View Results' : 'Monitor'}
                        </button>
                    </td>
                </tr>`;
            }).join('');
    };

    // --- MODAL: LIVE VOTE MONITORING ---
    window.openElectionDetails = async (electionId) => {
        const election = electionsData.find(e => e.id === electionId);
        if (!election) return;

        const isCompleted = election.status === 'completed';
        document.getElementById('detailsModal').classList.remove('hidden');
        document.getElementById('modal-election-title').innerText = election.title;
        
        if (election.endDate) startCountdown(election.endDate.toDate());

        // Setup Candidate Map Template
        const candSnap = await getDocs(collection(db, `elections/${electionId}/candidates`));
        const candMapTemplate = {};
        candSnap.forEach(doc => { candMapTemplate[doc.id] = { id: doc.id, ...doc.data(), votes: 0 }; });

        // Real-time Vote Listener for THIS specific election
        if (activeElectionListener) activeElectionListener(); 
        activeElectionListener = onSnapshot(query(collection(db, "votes"), where("electionId", "==", electionId)), async (votesSnap) => {
            const candMap = JSON.parse(JSON.stringify(candMapTemplate));
            const modalYears = [0, 0, 0, 0];
            
            votesSnap.forEach(vDoc => {
                const v = vDoc.data();
                const y = parseInt(v.yearLevel || v.year) - 1;
                if (y >= 0 && y < 4) modalYears[y]++;
                if (v.selections) {
                    Object.values(v.selections).forEach(sel => {
                        if (candMap[sel.candidateId]) candMap[sel.candidateId].votes++;
                    });
                }
            });

            const positions = [...new Set(Object.values(candMap).map(c => c.position))].map(pName => ({
                name: pName,
                candidates: Object.values(candMap).filter(c => c.position === pName).sort((a,b) => b.votes - a.votes)
            }));

            // Get college-specific turnout
            const collegeSnap = await getDocs(query(collection(db, "users"), where("college", "==", election.college)));
            const totalE = collegeSnap.size || 1;

            const data = { voted: votesSnap.size, notVoted: Math.max(0, totalE - votesSnap.size), years: modalYears, positions: positions };
            renderModalCharts(data);
            renderTalliesAndProfiles(data, isCompleted);
            
            document.getElementById('percent-voted').innerText = `${Math.round((data.voted/totalE)*100)}%`;
            document.getElementById('modal-total-students').innerText = data.voted;
        });
    };

    function startCountdown(targetDate) {
        clearInterval(timerInterval);
        timerInterval = setInterval(() => {
            const distance = targetDate - new Date().getTime();
            if (distance < 0) { clearInterval(timerInterval); return; }
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);
            document.getElementById('countdown-timer').innerText = `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
        }, 1000);
    }

    function renderModalCharts(data) {
        if (modalPie) modalPie.destroy();
        modalPie = new Chart(document.getElementById('modalPieChart'), {
            type: 'doughnut',
            data: { datasets: [{ data: [data.voted, data.notVoted], backgroundColor: ['#27A688', '#515167'] }] },
            options: { maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });

        if (modalBar) modalBar.destroy();
        modalBar = new Chart(document.getElementById('modalBarChart'), {
            type: 'bar',
            data: { labels: ['1st', '2nd', '3rd', '4th'], datasets: [{ data: data.years, backgroundColor: '#27A688' }] },
            options: { indexAxis: 'y', maintainAspectRatio: false, plugins: { legend: { display: false } } }
        });
    }

    function renderTalliesAndProfiles(data, isCompleted) {
        const tallyBody = document.getElementById('tally-table-body');
        const profileCont = document.getElementById('candidate-profiles');
        tallyBody.innerHTML = ''; profileCont.innerHTML = '';
        
        data.positions.forEach(pos => {
            tallyBody.innerHTML += `<tr class="bg-gray-50"><td colspan="2" class="px-6 py-2 text-blue-600 uppercase text-[10px] font-black">${pos.name}</td></tr>`;
            pos.candidates.forEach(can => {
                tallyBody.innerHTML += `<tr><td class="px-6 py-4">${can.name}</td><td class="px-6 py-4 text-right font-black">${can.votes}</td></tr>`;
                profileCont.innerHTML += `
                    <div class="flex flex-col items-center bg-white p-4 rounded-xl border border-gray-100 min-w-[140px]">
                        <img src="${can.photoUrl || 'https://via.placeholder.com/150'}" class="w-16 h-16 rounded-full mb-2">
                        <p class="text-xs font-black text-gray-800">${can.name}</p>
                        <p class="text-[8px] uppercase text-blue-500 font-bold">${pos.name}</p>
                    </div>`;
            });
        });
    }

    window.switchTab = (tab) => {
        currentTab = tab;
        document.querySelectorAll('.status-tab').forEach(el => el.classList.toggle('active', el.id === `tab-${tab}`));
        renderTable();
    };

    window.closeModal = (id) => {
        document.getElementById(id).classList.add('hidden');
        if (id === 'detailsModal') {
            clearInterval(timerInterval);
            if (activeElectionListener) activeElectionListener();
        }
    };

    window.handleLogout = async () => { await signOut(auth); window.location.href = 'index.html'; };

    init();
});