import { auth, db } from './firebase.js';
import { createLeaderAudit } from './Leader-audit.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, getDocs, doc, getDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentLeaderData = null;
let countdownInterval = null;

const EXCLUDED_ROLES = new Set(["LEADER", "COSEL", "ADMIN"]);

function normalizeCollege(value) {
    if (!value) return "";
    const raw = String(value).trim();
    const match = raw.match(/\(([^)]+)\)/);
    return (match ? match[1] : raw).trim().toUpperCase();
}

function normalizeRole(value) {
    return String(value || "").trim().toUpperCase();
}

function toDate(value) {
    if (!value) return null;
    if (typeof value.toDate === 'function') return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function buildLeaderName(data, email = "") {
    return data.fullName
        || `${data.firstname || data.firstName || ''} ${data.lastname || data.lastName || ''}`.trim()
        || email.split('@')[0]
        || "Leader";
}

function setTimerValues(days = 0, hours = 0, minutes = 0, seconds = 0) {
    updateElementText('days', String(days).padStart(2, '0'));
    updateElementText('hours', String(hours).padStart(2, '0'));
    updateElementText('minutes', String(minutes).padStart(2, '0'));
    updateElementText('seconds', String(seconds).padStart(2, '0'));
}

function resetTimerUI() {
    if (countdownInterval) clearInterval(countdownInterval);
    countdownInterval = null;
    setTimerValues(0, 0, 0, 0);
    updateElementText('electionStatus', 'No Ongoing Election');
    updateElementText('timerText', 'No current election.');
}

function startElectionCountdown(election) {
    if (countdownInterval) clearInterval(countdownInterval);

    const endDate = toDate(election.endDate);
    if (!endDate) {
        resetTimerUI();
        return;
    }

    updateElementText('electionStatus', 'Ongoing');

    const tick = () => {
        const now = new Date();
        const diff = endDate.getTime() - now.getTime();

        if (diff <= 0) {
            resetTimerUI();
            return;
        }

        const totalSeconds = Math.floor(diff / 1000);
        const days = Math.floor(totalSeconds / 86400);
        const hours = Math.floor((totalSeconds % 86400) / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        setTimerValues(days, hours, minutes, seconds);
        updateElementText('timerText', `Ends on ${endDate.toLocaleString()}`);
    };

    tick();
    countdownInterval = setInterval(tick, 1000);
}

function renderVotedBars(votedData, totalVoted, message = "") {
    const chartContainer = document.getElementById('barChartContainer');
    if (!chartContainer) return;

    if (totalVoted === 0) {
        chartContainer.innerHTML = `<p class="text-[10px] text-gray-400 text-center py-10 italic">${message || 'No votes found.'}</p>`;
        return;
    }

    const colorPalette = {
        "1st Year": "#0098E0",
        "2nd Year": "#0098E0",
        "3rd Year": "#0098E0",
        "4th Year": "#0098E0"
    };

    chartContainer.innerHTML = Object.entries(votedData).map(([label, count]) => {
        const percentage = totalVoted > 0 ? (count / totalVoted) * 100 : 0;
        return `
            <div class="space-y-1 mb-4">
                <div class="flex justify-between text-[10px] font-bold text-gray-500 uppercase tracking-wider">
                    <span>${label}</span>
                    <span class="text-gray-400 font-medium">${count} Voted</span>
                </div>
                <div class="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-50">
                    <div class="h-full transition-all duration-1000"
                         style="width: ${percentage}%; background-color: ${colorPalette[label]}">
                    </div>
                </div>
            </div>`;
    }).join('');
}

function initProfile() {
    updateElementText('profileName', currentLeaderData.name);
    updateElementText('welcomeName', currentLeaderData.name);
    updateElementText('profileRole', `${currentLeaderData.collegeRaw} - Chairperson`);
}

function initDate() {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    updateElementText('currentDateDisplay', `Today is ${new Date().toLocaleDateString('en-US', options)}`);
}

function getYearBucket(raw) {
    const yearText = String(raw || "");
    if (yearText.includes("1")) return "1st Year";
    if (yearText.includes("2")) return "2nd Year";
    if (yearText.includes("3")) return "3rd Year";
    if (yearText.includes("4")) return "4th Year";
    return null;
}

function voteBelongsToElection(voteData, election, leaderCollege) {
    const voteElectionId = String(voteData.electionId || "").trim();
    if (voteElectionId) return voteElectionId === election.id;

    const voteCollege = normalizeCollege(voteData.college);
    const voteTime = toDate(voteData.timestamp || voteData.createdAt || voteData.votedAt);

    if (voteTime) {
        const start = toDate(election.startDate);
        const end = toDate(election.endDate);
        return voteCollege === leaderCollege && voteTime >= start && voteTime <= end;
    }

    return voteCollege === leaderCollege;
}

async function fetchDashboardStats() {
    if (!currentLeaderData) return;

    try {
        const leaderCollege = currentLeaderData.college;
        const now = new Date();

        const [usersSnapshot, votesSnapshot, electionsSnapshot] = await Promise.all([
            getDocs(collection(db, "users")),
            getDocs(collection(db, "votes")),
            getDocs(collection(db, "elections"))
        ]);

        const users = usersSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const votes = votesSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
        const elections = electionsSnapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));

        const collegeUsers = users.filter(user =>
            normalizeCollege(user.college) === leaderCollege &&
            !EXCLUDED_ROLES.has(normalizeRole(user.role))
        );

        const pendingCount = collegeUsers.filter(user => user.isVerified !== true).length;
        const registeredCount = collegeUsers.filter(user => user.isVerified === true).length;

        updateElementText('pendingCount', pendingCount);
        updateElementText('registeredCount', registeredCount);

        const ongoingElection = elections
            .filter(election => {
                const status = String(election.status || "").trim().toUpperCase();
                const startDate = toDate(election.startDate);
                const endDate = toDate(election.endDate);
                const electionCollege = normalizeCollege(election.college);
                const isOngoingStatus = status === "APPROVED" || status === "ONGOING";
                return electionCollege === leaderCollege
                    && election.isActive !== false
                    && isOngoingStatus
                    && startDate
                    && endDate
                    && now >= startDate
                    && now <= endDate;
            })
            .sort((a, b) => (toDate(b.startDate)?.getTime() || 0) - (toDate(a.startDate)?.getTime() || 0))[0];

        if (!ongoingElection) {
            updateElementText('totalVotedCount', 0);
            renderVotedBars({ "1st Year": 0, "2nd Year": 0, "3rd Year": 0, "4th Year": 0 }, 0, "No current ongoing election.");
            resetTimerUI();
            return;
        }

        startElectionCountdown(ongoingElection);

        const votedByYear = {
            "1st Year": 0,
            "2nd Year": 0,
            "3rd Year": 0,
            "4th Year": 0
        };

        const userMap = new Map(users.map(user => [user.id, user]));
        const electionVotes = votes.filter(vote => voteBelongsToElection(vote, ongoingElection, leaderCollege));

        electionVotes.forEach(vote => {
            const rawYear = vote.year || vote.yearLevel || userMap.get(vote.userId || vote.uid)?.year || "";
            const bucket = getYearBucket(rawYear);
            if (bucket) votedByYear[bucket]++;
        });

        updateElementText('totalVotedCount', electionVotes.length);
        renderVotedBars(votedByYear, electionVotes.length, `No votes yet for ${currentLeaderData.collegeRaw}.`);
    } catch (error) {
        console.error("Dashboard calculation error:", error);
        updateElementText('pendingCount', 0);
        updateElementText('registeredCount', 0);
        updateElementText('totalVotedCount', 0);
        renderVotedBars({ "1st Year": 0, "2nd Year": 0, "3rd Year": 0, "4th Year": 0 }, 0, "Failed to load turnout data.");
        resetTimerUI();
    }
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "index.html";
        return;
    }

    try {
        const leaderDoc = await getDoc(doc(db, "users", user.uid));
        if (!leaderDoc.exists()) {
            window.location.href = "index.html";
            return;
        }

        const data = leaderDoc.data();
        currentLeaderData = {
            uid: user.uid,
            name: buildLeaderName(data, user.email || ""),
            college: normalizeCollege(data.college),
            collegeRaw: data.college || "Unknown College",
            position: data.position || "Chairperson"
        };

        initProfile();
        initDate();
        fetchDashboardStats();
    } catch (err) {
        console.error("Auth error:", err);
        resetTimerUI();
    }
});

window.navToVoters = (status) => {
    window.location.href = `Leader-VoterManagement.html?filter=${status}`;
};

window.openLogoutModal = () => document.getElementById('logoutModal').classList.remove('hidden');
window.closeLogoutModal = () => document.getElementById('logoutModal').classList.add('hidden');

window.confirmLogout = async () => {
    if (currentLeaderData) {
        await createLeaderAudit(currentLeaderData, "System Logout", "Leader manually signed out.");
    }
    await signOut(auth);
    window.location.href = "index.html";
};
