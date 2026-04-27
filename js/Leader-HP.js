import { auth, db } from './firebase.js';
import { createLeaderAudit } from './Leader-audit.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, query, where, getDocs, doc, getDoc, orderBy, limit 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

let currentLeaderData = null;

onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const leaderDoc = await getDoc(doc(db, "users", user.uid));
            if (leaderDoc.exists()) {
                const data = leaderDoc.data();
                currentLeaderData = {
                    uid: user.uid,
                    name: data.fullName || `${data.firstname || ''} ${data.lastname || ''}`.trim(),
                    college: data.college,
                    position: data.position || "Chairperson"
                };
                initProfile();
                initDate();
                fetchDashboardStats();
            }
        } catch (err) {
            console.error("Auth error:", err);
        }
    } else {
        window.location.href = "index.html";
    }
});

async function fetchDashboardStats() {
    if (!currentLeaderData) return;

    try {
        const leaderCollege = (currentLeaderData.college || "").trim();        
        
        // --- 1. GET ALL VOTES FOR THIS COLLEGE ---
        const votesQuery = query(
            collection(db, "votes"), 
            where("college", "==", leaderCollege)
        );
        const votesSnapshot = await getDocs(votesQuery);
        
        // This is your TRUE vote count. It doesn't care if the user was deleted later.
        const totalVotedCount = votesSnapshot.size; 

        const votedByYear = { 
            "1st Year": 0, "2nd Year": 0, "3rd Year": 0, "4th Year": 0 
        };

        // We extract the Year Level directly from the VOTE document
        votesSnapshot.forEach(doc => {
            const vData = doc.data();
            // Use the year stored in the vote record (e.g., vData.year from your Alexis example)
            const yearRaw = String(vData.year || vData.yearLevel || "");
            
            let yearKey = null;
            if (yearRaw.includes("1")) yearKey = "1st Year";
            else if (yearRaw.includes("2")) yearKey = "2nd Year";
            else if (yearRaw.includes("3")) yearKey = "3rd Year";
            else if (yearRaw.includes("4")) yearKey = "4th Year";

            if (yearKey) {
                votedByYear[yearKey]++;
            }
        });

        // --- 2. GET REGISTRATION STATS (FOR TOP CARDS ONLY) ---
        const usersQuery = query(
            collection(db, "users"), 
            where("college", "==", leaderCollege)
        );
        const usersSnapshot = await getDocs(usersQuery);

        let pendingCount = 0;
        let registeredCount = 0;
        usersSnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (data.role === 'LEADER' || data.role === 'COSEL' || data.role === 'ADMIN') return;

            if (data.isVerified === true) registeredCount++;
            else pendingCount++;
        });

        // Update UI
        updateElementText('pendingCount', pendingCount);
        updateElementText('registeredCount', registeredCount);
        updateElementText('totalVotedCount', totalVotedCount); // Will now show 3 if 3 votes exist

        renderVotedBars(votedByYear, totalVotedCount);

    } catch (error) {
        console.error("Dashboard calculation error:", error);
    }
}
// UI RENDERER
function renderVotedBars(votedData, totalVoted) {
    const chartContainer = document.getElementById('barChartContainer');
    if (!chartContainer) return;

    if (totalVoted === 0) {
        chartContainer.innerHTML = `<p class="text-[10px] text-gray-400 text-center py-10 italic">No votes found for ${currentLeaderData.college}.</p>`;
        return;
    }

    const colorPalette = {
        "1st Year": "#0098E0",        // UMak Blue
        "2nd Year": "#0098E0", // Orange
        "3rd Year": "#0098E0",  // Green
        "4th Year": "#0098E0"   // Red
    };

    chartContainer.innerHTML = Object.entries(votedData).map(([label, count]) => {
        const percentage = (count / totalVoted) * 100;
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

// HELPERS
function updateElementText(id, text) {
    const el = document.getElementById(id);
    if (el) el.textContent = text;
}

function initProfile() {
    updateElementText('profileName', currentLeaderData.name);
    updateElementText('welcomeName', currentLeaderData.name);
    updateElementText('profileRole', `${currentLeaderData.college} - Chairperson`);
}

function initDate() {
    const options = { month: 'long', day: 'numeric', year: 'numeric' };
    updateElementText('currentDateDisplay', `Today is ${new Date().toLocaleDateString('en-US', options)}`);
}

// WINDOW GLOBALS
window.navToVoters = (status) => { window.location.href = `Leader-VoterManagement.html?filter=${status}`; };
window.openLogoutModal = () => document.getElementById('logoutModal').classList.remove('hidden');
window.closeLogoutModal = () => document.getElementById('logoutModal').classList.add('hidden');
window.confirmLogout = async () => {
    if (currentLeaderData) await createLeaderAudit(currentLeaderData, "System Logout", "Leader manually signed out.");
    await signOut(auth);
    window.location.href = "index.html";
};