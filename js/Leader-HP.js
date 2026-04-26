// --- Authenticated User Data (Matching Leader-VM.js) ---
const authenticatedUser = {
    name: "Maria Leonora Theresa",
    college: "CCIS",
    position: "Chairperson"
};

const dashboardData = {
    pendingRegistrations: 12,
    totalRegistered: 154,
    votedStats: [
        { year: "1st Year", count: 45, total: 50 },
        { year: "2nd Year", count: 32, total: 50 },
        { year: "3rd Year", count: 18, total: 50 },
        { year: "4th Year", count: 25, total: 50 }
    ],
    // Election Status can be: 'Pending', 'Ongoing', 'Ended'
    election: {
        status: "Ongoing",
        endDate: new Date(new Date().getTime() + (2 * 24 * 60 * 60 * 1000) + (5 * 60 * 60 * 1000)) 
    }
};

document.addEventListener('DOMContentLoaded', () => {
    initProfile();
    initDate();
    initStats();
    startTimer();
});

// --- Profile Initialization (Aligned with sidebar requirement) ---
function initProfile() {
    document.getElementById('profileName').textContent = authenticatedUser.name;
    document.getElementById('profileRole').textContent = `${authenticatedUser.college} - ${authenticatedUser.position}`;
    document.getElementById('welcomeName').textContent = authenticatedUser.name;
}

// --- Date Logic ---
function initDate() {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    const today = new Date().toLocaleDateString('en-US', options);
    document.getElementById('currentDateDisplay').textContent = `Today is ${today}`;
}

// --- Statistics (Cards & Bar Graph) ---
function initStats() {
    document.getElementById('pendingCount').textContent = dashboardData.pendingRegistrations;
    document.getElementById('registeredCount').textContent = dashboardData.totalRegistered;

    const chartContainer = document.getElementById('barChartContainer');
    chartContainer.innerHTML = ''; // Clear container
    let totalVotedSum = 0;

    dashboardData.votedStats.forEach(stat => {
        totalVotedSum += stat.count;
        const percentage = (stat.count / stat.total) * 100;
        
        const barRow = `
            <div class="flex items-center gap-4">
                <span class="text-xs font-bold text-gray-500 w-16">${stat.year}</span>
                <div class="flex-1 bg-gray-100 h-4 rounded-full overflow-hidden">
                    <div class="bar-color h-full rounded-full transition-all duration-1000" style="width: ${percentage}%"></div>
                </div>
            </div>
        `;
        chartContainer.insertAdjacentHTML('beforeend', barRow);
    });

    document.getElementById('totalVotedCount').textContent = totalVotedSum;
}

// --- Navigation Logic ---
function navToVoters(status) {
    window.location.href = `Leader-VoterManagement.html?filter=${status}`;
}

// --- Timer Logic ---
function startTimer() {
    const statusEl = document.getElementById('electionStatus');
    const timerTextEl = document.getElementById('timerText');
    const { status, endDate } = dashboardData.election;

    statusEl.textContent = status;

    const updateCountdown = () => {
        const now = new Date().getTime();
        const distance = endDate - now;

        if (status === 'Pending') {
            timerTextEl.textContent = "Waiting for approval";
            setTimerDisplay(0, 0, 0, 0);
            return;
        }

        if (status === 'Ended' || distance < 0) {
            statusEl.textContent = "Ended";
            timerTextEl.textContent = "Election ended";
            setTimerDisplay(0, 0, 0, 0);
            return;
        }

        if (status === 'Ongoing') {
            timerTextEl.textContent = "Remaining time before the election ends";
            
            const d = Math.floor(distance / (1000 * 60 * 60 * 24));
            const h = Math.floor((distance % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
            const m = Math.floor((distance % (1000 * 60 * 60)) / (1000 * 60));
            const s = Math.floor((distance % (1000 * 60)) / 1000);
            
            setTimerDisplay(d, h, m, s);
        }
    };

    setInterval(updateCountdown, 1000);
    updateCountdown();
}

function setTimerDisplay(d, h, m, s) {
    document.getElementById('days').textContent = d.toString().padStart(2, '0');
    document.getElementById('hours').textContent = h.toString().padStart(2, '0');
    document.getElementById('minutes').textContent = m.toString().padStart(2, '0');
    document.getElementById('seconds').textContent = s.toString().padStart(2, '0');
}

// --- Logout ---
function openLogoutModal() {
    document.getElementById('logoutModal').classList.remove('hidden');
}

function closeLogoutModal() {
    document.getElementById('logoutModal').classList.add('hidden');
}

function confirmLogout() {
    window.location.href = "index.html"; 
}