import { auth, db } from './firebase.js';
import {
    collection,
    getDocs,
    onSnapshot,
    query,
    where
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    onAuthStateChanged,
    signOut
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

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

    let electionsDB = [];
    let usersDB = [];
    let votesDB = [];

    let electionsLoaded = false;
    let usersLoaded = false;
    let votesLoaded = false;

    let currentTab = 'ongoing';
    let selectedColleges = new Set();
    let barChart, pieChart, modalPie, modalBar;
    let timerInterval;
    let activeVoteListener = null;

    function init() {
        setupStaticFilters();
        populateFilters();
        setupEventListeners();
        showPageLoading();

        onAuthStateChanged(auth, (user) => {
            if (!user) {
                window.location.href = "index.html";
                return;
            }
            startRealtimeListeners();
        });
    }

    function setupStaticFilters() {
        const timeFilter = document.getElementById('time-filter');
        if (!timeFilter) return;

        timeFilter.innerHTML = `
            <option value="30">Last 30 Days</option>
            <option value="90">Last 90 Days</option>
            <option value="365">Last 12 Months</option>
            <option value="all">All Elections</option>
        `;
        timeFilter.value = '30';
    }

    function setupEventListeners() {
        ['time-filter', 'college-filter', 'election-filter'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.addEventListener('change', updateUI);
        });
    }

    function startRealtimeListeners() {
        onSnapshot(collection(db, "elections"), (snapshot) => {
            electionsDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            electionsLoaded = true;
            populateFilters();
            updateUI();
        });

        onSnapshot(collection(db, "users"), (snapshot) => {
            usersDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            usersLoaded = true;
            populateFilters();
            updateUI();
        });

        onSnapshot(collection(db, "votes"), (snapshot) => {
            votesDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            votesLoaded = true;
            updateUI();
        });
    }

    function isPageReady() {
        return electionsLoaded && usersLoaded && votesLoaded;
    }

    function showPageLoading() {
        setMetricLoading('stat-total-elections');
        setMetricLoading('stat-turnout');
        setMetricLoading('stat-eligible');
        setMetricLoading('main-total-students');

        const tableBody = document.getElementById('election-table-body');
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-10 text-center">
                        <div class="flex flex-col items-center justify-center gap-3 text-gray-400">
                            <div class="w-8 h-8 border-4 border-[#0098E0] border-t-transparent rounded-full animate-spin"></div>
                            <p class="italic font-semibold">Loading election monitoring data...</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        const legend = document.getElementById('pie-legend');
        if (legend) {
            legend.innerHTML = `
                <div class="space-y-3">
                    <div class="h-4 bg-gray-100 rounded animate-pulse"></div>
                    <div class="h-4 bg-gray-100 rounded animate-pulse"></div>
                    <div class="h-4 bg-gray-100 rounded animate-pulse"></div>
                </div>
            `;
        }
    }

    function setMetricLoading(id) {
        const el = document.getElementById(id);
        if (!el) return;
        el.innerHTML = `<span class="inline-block w-12 h-8 bg-gray-100 rounded animate-pulse"></span>`;
    }

    function showModalLoading(title, isCompleted) {
        const modal = document.getElementById('detailsModal');
        document.getElementById('modal-election-title').innerText = title;
        document.getElementById('modal-status-badge').innerText = isCompleted ? 'completed' : 'ongoing';
        document.getElementById('modal-status-badge').className = isCompleted
            ? "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-gray-100 text-gray-500 mb-2 inline-block"
            : "px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest bg-green-100 text-green-600 mb-2 inline-block";
        document.getElementById('timer-card').classList.toggle('hidden', isCompleted);
        document.getElementById('winners-section').classList.toggle('hidden', !isCompleted);
        document.getElementById('tally-title').innerText = isCompleted ? "Final Tallies" : "Live Tallies";

        document.getElementById('percent-voted').innerText = '--';
        document.getElementById('percent-not-voted').innerText = '--';
        document.getElementById('modal-total-students').innerText = '--';

        document.getElementById('tally-table-body').innerHTML = `
            <tr>
                <td colspan="2" class="px-6 py-10 text-center">
                    <div class="flex flex-col items-center justify-center gap-3 text-gray-400">
                        <div class="w-8 h-8 border-4 border-[#0098E0] border-t-transparent rounded-full animate-spin"></div>
                        <p class="italic font-semibold">Loading live election details...</p>
                    </div>
                </td>
            </tr>
        `;
        document.getElementById('candidate-profiles').innerHTML = `
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                <div class="h-28 bg-gray-100 rounded-2xl animate-pulse"></div>
                <div class="h-28 bg-gray-100 rounded-2xl animate-pulse"></div>
                <div class="h-28 bg-gray-100 rounded-2xl animate-pulse"></div>
            </div>
        `;
        document.getElementById('winners-container').innerHTML = isCompleted
            ? `<div class="h-24 bg-gray-100 rounded-2xl animate-pulse"></div>`
            : '';

        modal.classList.remove('hidden');
    }

    function populateFilters() {
        const colFilter = document.getElementById('college-filter');
        const elecFilter = document.getElementById('election-filter');
        const modalSelect = document.getElementById('modal-college-select');

        const currentCollege = colFilter?.value || 'all';
        const currentElection = elecFilter?.value || 'all';

        const allColleges = new Map();
        colleges.forEach(col => allColleges.set(collegeKey(col), col));

        [...electionsDB, ...usersDB].forEach(record => {
            if (!record.college) return;
            const key = collegeKey(record.college);
            if (!allColleges.has(key)) allColleges.set(key, record.college);
        });

        if (colFilter) {
            colFilter.innerHTML = '<option value="all">All Colleges</option>';
            [...allColleges.values()]
                .sort((a, b) => a.localeCompare(b))
                .forEach(c => colFilter.add(new Option(c, collegeKey(c))));
            colFilter.value = [...colFilter.options].some(opt => opt.value === currentCollege) ? currentCollege : 'all';
        }

        if (modalSelect) {
            modalSelect.innerHTML = '<option value="" disabled selected>Select a college...</option>';
            [...allColleges.values()]
                .sort((a, b) => a.localeCompare(b))
                .forEach(c => modalSelect.add(new Option(c, c)));
        }

        if (elecFilter) {
            elecFilter.innerHTML = '<option value="all">All Elections</option>';

            const selectedCollegeKey = document.getElementById('college-filter')?.value || 'all';
            const filteredElections = electionsDB.filter(e => {
                return selectedCollegeKey === 'all' || collegeKey(e.college) === selectedCollegeKey;
            });

            filteredElections
                .sort((a, b) => getElectionSortDate(b) - getElectionSortDate(a))
                .forEach(e => {
                    elecFilter.add(new Option(e.title || e.electionName || 'Untitled Election', e.id));
                });

            elecFilter.value = [...elecFilter.options].some(opt => opt.value === currentElection) ? currentElection : 'all';
        }
    }

    function updateUI() {
        if (!isPageReady()) {
            showPageLoading();
            return;
        }

        const filtered = getFilteredData();
        updateStats(filtered);
        renderCharts(filtered);
        renderTable(filtered);
    }

    function getFilteredData() {
        const colVal = document.getElementById('college-filter')?.value || 'all';
        const elecVal = document.getElementById('election-filter')?.value || 'all';
        const timeVal = document.getElementById('time-filter')?.value || '30';

        return electionsDB.filter(e => {
            const matchesCol = colVal === 'all' || collegeKey(e.college) === colVal;
            const matchesElec = elecVal === 'all' || e.id === elecVal;
            const matchesTime = matchesTimeFilter(e, timeVal);
            return matchesCol && matchesElec && matchesTime;
        });
    }

    function updateStats(data) {
        const total = data.filter(e => getMonitorStatus(e) !== 'hidden').length;
        const eligible = getEligibleUsersForElections(data).length;
        const actualVotes = getVotesForElections(data).length;
        const turnout = eligible > 0 ? Math.round((actualVotes / eligible) * 100) : 0;

        document.getElementById('stat-total-elections').innerText = total;
        document.getElementById('stat-turnout').innerText = `${turnout}%`;
        document.getElementById('stat-eligible').innerText = eligible;
        document.getElementById('main-total-students').innerText = actualVotes;
    }

    function renderCharts(data) {
        const years = { yr1: 0, yr2: 0, yr3: 0, yr4: 0 };
        const votes = getVotesForElections(data);

        votes.forEach(vote => {
            const linkedUser = findUserByVote(vote);
            const yearIndex = getYearIndex(vote.yearLevel || vote.year || linkedUser?.yearLevel || linkedUser?.year);
            if (yearIndex === 0) years.yr1++;
            if (yearIndex === 1) years.yr2++;
            if (yearIndex === 2) years.yr3++;
            if (yearIndex === 3) years.yr4++;
        });

        if (barChart) barChart.destroy();
        barChart = new Chart(document.getElementById('voterBarChart'), {
            type: 'bar',
            data: {
                labels: ['1st Year', '2nd Year', '3rd Year', '4th Year'],
                datasets: [{
                    data: Object.values(years),
                    backgroundColor: '#27A688',
                    borderRadius: 4,
                    barThickness: 15
                }]
            },
            options: {
                indexAxis: 'y',
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                maintainAspectRatio: false,
                scales: {
                    x: { display: false },
                    y: { grid: { display: false }, border: { display: false } }
                }
            }
        });

        const visibleForSummary = data.filter(e => getMonitorStatus(e) !== 'hidden');
        const statusCounts = {
            approved: visibleForSummary.filter(e => getSummaryStatus(e) === 'approved').length,
            completed: visibleForSummary.filter(e => getSummaryStatus(e) === 'completed').length,
            rejected: visibleForSummary.filter(e => getSummaryStatus(e) === 'rejected').length
        };

        const totalSummary = statusCounts.approved + statusCounts.completed + statusCounts.rejected;

        if (pieChart) pieChart.destroy();
        pieChart = new Chart(document.getElementById('electionPieChart'), {
            type: 'doughnut',
            data: {
                labels: ['Approved', 'Completed', 'Rejected'],
                datasets: [{
                    data: totalSummary > 0
                        ? [statusCounts.approved, statusCounts.completed, statusCounts.rejected]
                        : [1],
                    backgroundColor: totalSummary > 0
                        ? ['#515167', '#27A688', '#D33131']
                        : ['#E5E7EB'],
                    borderWidth: 0,
                    cutout: '75%'
                }]
            },
            options: {
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                maintainAspectRatio: false
            }
        });

        const legend = document.getElementById('pie-legend');
        const colors = ['text-[#515167]', 'text-[#27A688]', 'text-[#D33131]'];
        const labels = ['Approved', 'Completed', 'Rejected'];
        const values = [statusCounts.approved, statusCounts.completed, statusCounts.rejected];
        const totalE = totalSummary || 1;

        legend.innerHTML = labels.map((label, i) => `
            <div class="flex items-center gap-4 text-[11px] font-black uppercase tracking-tight">
                <span class="${colors[i]} w-8 text-right">${Math.round((values[i] / totalE) * 100)}%</span>
                <span class="text-gray-400 font-bold">${label}</span>
            </div>
        `).join('');
    }

    window.renderTable = (data = getFilteredData()) => {
        const body = document.getElementById('election-table-body');
        const filtered = data.filter(e => getMonitorStatus(e) === currentTab);

        body.innerHTML = filtered.length === 0
            ? `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-400 italic">No data.</td></tr>`
            : filtered.map(e => `
                <tr class="hover:bg-gray-50/50 transition">
                    <td class="px-6 py-4 font-black text-gray-800">${escapeHtml(e.title || e.electionName || 'Untitled Election')}</td>
                    <td class="px-6 py-4 text-gray-500 text-[10px] uppercase font-bold">${escapeHtml(e.college.match(/\(([^)]+)\)/)?.[1] || e.college || 'N/A')}</td>
                    <td class="px-6 py-4 text-gray-500 font-medium">${formatElectionEnd(e)}</td>
                    <td class="px-6 py-4 text-center">
                        <button onclick="openElectionDetails('${e.id}')" class="text-[#0098E0] font-black uppercase tracking-tighter action-link">
                            ${getMonitorStatus(e) === 'completed' ? 'View Results' : 'Monitoring Election'}
                        </button>
                    </td>
                </tr>
            `).join('');
    };

    window.openElectionDetails = async (electionId) => {
        const election = electionsDB.find(e => e.id === electionId);
        if (!election) return;

        const status = getMonitorStatus(election);
        const isCompleted = status === 'completed';

        showModalLoading(election.title || election.electionName || 'Election', isCompleted);

        const candidatesSnap = await getDocs(query(collection(db, "candidates"), where("electionId", "==", electionId)));
        const candidates = candidatesSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        const eligibleUsers = usersDB.filter(user =>
            isEligibleStudent(user) && collegeKey(user.college) === collegeKey(election.college)
        );

        if (activeVoteListener) {
            activeVoteListener();
            activeVoteListener = null;
        }

        activeVoteListener = onSnapshot(query(collection(db, "votes"), where("electionId", "==", electionId)), (voteSnap) => {
            const votes = voteSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            const votedCount = votes.length;
            const eligibleCount = eligibleUsers.length;
            const notVoted = Math.max(eligibleCount - votedCount, 0);

            const years = [0, 0, 0, 0];
            votes.forEach(vote => {
                const linkedUser = findUserByVote(vote);
                const yearIndex = getYearIndex(vote.yearLevel || vote.year || linkedUser?.yearLevel || linkedUser?.year);
                if (yearIndex >= 0) years[yearIndex]++;
            });

            const positionsMap = {};

            candidates.forEach(candidate => {
                const positionName = candidate.positionName || candidate.position || 'Unknown Position';
                if (!positionsMap[positionName]) positionsMap[positionName] = [];

                const voteCount = votes.reduce((count, vote) => {
                    const selectedIds = extractSelectedCandidateIds(vote);
                    return count + (selectedIds.includes(candidate.id) ? 1 : 0);
                }, 0);

                positionsMap[positionName].push({
                    name: candidate.name || candidate.fullName || 'Unknown Candidate',
                    votes: voteCount,
                    photo: candidate.photoURL || candidate.photoUrl || "images/default-avatar.png"
                });
            });

            const data = {
                voted: votedCount,
                notVoted,
                years,
                positions: Object.entries(positionsMap).map(([name, candidatesList]) => ({
                    name,
                    candidates: candidatesList.sort((a, b) => b.votes - a.votes)
                }))
            };

            renderModalCharts(data);
            renderTalliesAndProfiles(data, isCompleted);

            const totalV = data.voted + data.notVoted;
            document.getElementById('percent-voted').innerText = `${totalV > 0 ? Math.round((data.voted / totalV) * 100) : 0}%`;
            document.getElementById('percent-not-voted').innerText = `${totalV > 0 ? Math.round((data.notVoted / totalV) * 100) : 0}%`;
            document.getElementById('modal-total-students').innerText = eligibleCount;
        });

        startCountdown(election.endDate);
    };

    function startCountdown(endDateValue) {
        clearInterval(timerInterval);
        const timerDisplay = document.getElementById('countdown-timer');
        const targetDate = getDateFromField(endDateValue)?.getTime();

        if (!targetDate) {
            timerDisplay.innerText = "00:00:00:00";
            return;
        }

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

            timerDisplay.innerText =
                `${String(days).padStart(2, '0')}:${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
        }, 1000);
    }

    function renderModalCharts(data) {
        if (modalPie) modalPie.destroy();
        if (modalBar) modalBar.destroy();

        modalPie = new Chart(document.getElementById('modalPieChart'), {
            type: 'doughnut',
            data: {
                labels: ['Voted', 'Not Voted'],
                datasets: [{
                    data: [data.voted, data.notVoted],
                    backgroundColor: ['#27A688', '#515167'],
                    borderWidth: 0,
                    cutout: '70%'
                }]
            },
            options: {
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } }
            }
        });

        modalBar = new Chart(document.getElementById('modalBarChart'), {
            type: 'bar',
            data: {
                labels: ['1st Yr', '2nd Yr', '3rd Yr', '4th Yr'],
                datasets: [{
                    data: data.years,
                    backgroundColor: '#27A688',
                    borderRadius: 4,
                    barThickness: 15
                }]
            },
            options: {
                indexAxis: 'y',
                maintainAspectRatio: false,
                plugins: { legend: { display: false }, tooltip: { enabled: false } },
                scales: {
                    x: { display: false },
                    y: { grid: { display: false }, border: { display: false } }
                }
            }
        });
    }

    function renderTalliesAndProfiles(data, isCompleted) {
        const tallyBody = document.getElementById('tally-table-body');
        const profileCont = document.getElementById('candidate-profiles');
        const winnersCont = document.getElementById('winners-container');

        tallyBody.innerHTML = '';
        profileCont.innerHTML = '';
        winnersCont.innerHTML = '';

        data.positions.forEach(pos => {
            tallyBody.innerHTML += `<tr class="bg-gray-50"><td colspan="2" class="px-6 py-2 text-blue-600 uppercase text-[10px] tracking-widest font-black">${escapeHtml(pos.name)}</td></tr>`;

            let profileHTML = `<div><h4 class="text-xs font-black text-gray-400 uppercase mb-4 tracking-widest">${escapeHtml(pos.name)} Candidates</h4><div class="flex flex-wrap gap-6">`;

            let winner = pos.candidates.reduce((prev, curr) => prev.votes > curr.votes ? prev : curr, pos.candidates[0]);

            pos.candidates.forEach(can => {
                tallyBody.innerHTML += `<tr><td class="px-6 py-4 flex items-center gap-3"><div class="w-2 h-2 rounded-full bg-blue-400"></div> ${escapeHtml(can.name)}</td><td class="px-6 py-4 text-right font-black">${can.votes}</td></tr>`;

                profileHTML += `
                    <div class="flex flex-col items-center text-center bg-white p-6 rounded-2xl shadow-sm border border-gray-100 min-w-[160px]">
                        <img src="${escapeAttr(can.photo)}" class="w-20 h-20 rounded-full border-4 border-blue-50 mb-3 shadow-inner object-cover" onerror="this.src='images/default-avatar.png'">
                        <p class="text-sm font-black text-gray-800 leading-tight">${escapeHtml(can.name)}</p>
                        <p class="text-[9px] uppercase text-blue-500 font-black mt-1 tracking-widest">${escapeHtml(pos.name)}</p>
                    </div>`;
            });

            profileCont.innerHTML += profileHTML + `</div></div>`;

            if (isCompleted && winner) {
                winnersCont.innerHTML += `
                    <div class="bg-blue-50 border border-blue-100 p-4 rounded-2xl flex items-center justify-between">
                        <div>
                            <p class="text-[9px] font-black text-blue-500 uppercase tracking-widest">${escapeHtml(pos.name)} Winner</p>
                            <h4 class="text-lg font-black text-gray-800">${escapeHtml(winner.name)}</h4>
                        </div>
                        <div class="text-right">
                            <p class="text-2xl font-black text-blue-600">${winner.votes}</p>
                            <p class="text-[9px] font-bold text-gray-400 uppercase">Votes</p>
                        </div>
                    </div>`;
            }
        });
    }

    function getEligibleUsersForElections(elections) {
        if (!elections.length) return [];

        const collegeKeys = new Set(elections.map(e => collegeKey(e.college)).filter(Boolean));

        return usersDB.filter(user =>
            isEligibleStudent(user) && collegeKeys.has(collegeKey(user.college))
        );
    }

    function getVotesForElections(elections) {
        const electionIds = new Set(elections.map(e => e.id));
        return votesDB.filter(vote => vote.electionId && electionIds.has(vote.electionId));
    }

    function getSummaryStatus(election) {
        const raw = String(election.status || '').trim().toLowerCase();
        const now = Date.now();
        const endDate = getDateFromField(election.endDate);

        if (['rejected', 'declined', 'disapproved'].includes(raw)) return 'rejected';
        if (['completed', 'official', 'closed', 'finished', 'archived', 'published'].includes(raw) || election.resultsPublished === true) return 'completed';
        if (['approved', 'ongoing', 'active', 'open', 'started'].includes(raw) || election.isActive === true) {
            if (endDate && endDate.getTime() < now) return 'completed';
            return 'approved';
        }
        if (raw === 'pending') return 'pending';

        if (endDate && endDate.getTime() < now) return 'completed';
        return 'pending';
    }

    function getMonitorStatus(election) {
        const summary = getSummaryStatus(election);
        if (summary === 'approved') return 'ongoing';
        if (summary === 'completed') return 'completed';
        return 'hidden';
    }

    function matchesTimeFilter(election, filterValue) {
        if (filterValue === 'all') return true;

        const date = getElectionSortDate(election);
        if (!date) return true;

        const days = Number(filterValue);
        if (!days) return true;

        const cutoff = Date.now() - (days * 24 * 60 * 60 * 1000);
        return date.getTime() >= cutoff;
    }

    function getElectionSortDate(election) {
        return getDateFromField(election.endDate) ||
            getDateFromField(election.startDate) ||
            getDateFromField(election.createdAt) ||
            null;
    }

    function getDateFromField(value) {
        if (!value) return null;
        if (typeof value.toDate === 'function') return value.toDate();
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date;
    }

    function formatElectionEnd(election) {
        const endDate = getDateFromField(election.endDate);
        if (!endDate) return 'N/A';

        return endDate.toLocaleString('en-US', {
            month: 'long',
            day: 'numeric',
            year: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
        });
    }

    function getYearIndex(value) {
        const text = String(value || '').toLowerCase().trim();
        if (text === '1' || text.includes('1st') || text.includes('first')) return 0;
        if (text === '2' || text.includes('2nd') || text.includes('second')) return 1;
        if (text === '3' || text.includes('3rd') || text.includes('third')) return 2;
        if (text === '4' || text.includes('4th') || text.includes('fourth')) return 3;
        return -1;
    }

    function isEligibleStudent(user) {
        const role = String(user.role || '').toLowerCase();
        if (['leader', 'cosel', 'admin', 'chairperson'].includes(role)) return false;
        return role === 'student' || role === 'voter' || Boolean(user.studentId || user.year || user.yearLevel);
    }

    function collegeKey(value) {
        const text = String(value || '').trim();
        if (!text) return '';
        const match = text.match(/\(([^)]+)\)/);
        return (match?.[1] || text).replace(/\s+/g, '').toUpperCase();
    }

    function findUserByVote(vote) {
        const voterKey = vote.userId || vote.uid || vote.voterId || vote.studentId || vote.email;
        if (!voterKey) return null;

        return usersDB.find(user =>
            user.id === voterKey ||
            user.uid === voterKey ||
            user.studentId === voterKey ||
            user.email === voterKey
        ) || null;
    }

    function extractSelectedCandidateIds(vote) {
        if (vote.candidateId) return [String(vote.candidateId)];

        const selections = vote.selections;
        if (!selections) return [];

        const values = Array.isArray(selections) ? selections : Object.values(selections);

        return values.map(item => {
            if (item && typeof item === 'object') {
                return item.candidateId || item.id || null;
            }
            return item || null;
        }).filter(Boolean).map(String);
    }

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

    window.confirmLogout = async () => {
        await signOut(auth);
        window.location.href = "index.html";
    };

    const logoutOverlay = document.getElementById('logoutModalOverlay');
    if (logoutOverlay) {
        logoutOverlay.addEventListener('click', function (e) {
            if (e.target === this) closeLogoutModal();
        });
    }

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
        if (!container) return;
        container.classList.add('scale-95', 'opacity-0');
        clearTimeout(window.toastTimer);
        setTimeout(() => { if (overlay) overlay.classList.add('hidden'); }, 300);
    };

    window.handleDownloadAll = () => { toggleDropdown('download-drop'); showToast(); };
    window.confirmBulkDownload = () => {
        if (selectedColleges.size === 0) return;
        closeModal('downloadModal');
        showToast();
        selectedColleges.clear();
        renderTags();
    };

    window.addCollegeTag = (val) => {
        if (val && !selectedColleges.has(val)) {
            selectedColleges.add(val);
            renderTags();
        }
    };

    window.removeTag = (val) => {
        selectedColleges.delete(val);
        renderTags();
    };

    function renderTags() {
        document.getElementById('tags-container').innerHTML = Array.from(selectedColleges).map(col => `
            <div class="bg-blue-50 text-blue-600 px-3 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-2 tag-enter">
                ${escapeHtml(col)}
                <button onclick="removeTag('${escapeJs(col)}')"><i class="fas fa-times"></i></button>
            </div>
        `).join('');
    }

    window.resetFilters = () => {
        document.getElementById('time-filter').value = '30';
        document.getElementById('college-filter').value = 'all';
        populateFilters();
        document.getElementById('election-filter').value = 'all';
        updateUI();
    };

    window.toggleDropdown = (id) => document.getElementById(id).classList.toggle('show');
    window.openDownloadModal = () => {
        toggleDropdown('download-drop');
        document.getElementById('downloadModal').classList.remove('hidden');
    };

    window.confirmLogout = async () => { await signOut(auth); window.location.href = "index.html"; };
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
        if (id === 'detailsModal') {
            clearInterval(timerInterval);
            if (activeVoteListener) {
                activeVoteListener();
                activeVoteListener = null;
            }
        }
    };

    function escapeHtml(value) {
        return String(value)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#39;");
    }

    function escapeAttr(value) {
        return escapeHtml(value).replace(/`/g, "&#96;");
    }

    function escapeJs(value) {
        return String(value).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
    }

    init();
});
