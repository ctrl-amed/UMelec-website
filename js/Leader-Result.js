import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, query, where, getDocs, doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import { createLeaderAudit } from './Leader-audit.js'; 
import { getStorage, ref, getDownloadURL } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

document.addEventListener('DOMContentLoaded', () => {
    let currentElectionId = null;
    let leaderCollege = null;
    let currentLeaderData = null; 
    let toastTimer;

    const container = document.getElementById('talliesContainer');
    const approveBtn = document.getElementById('approveResultsBtn');
    const confirmDialog = document.getElementById('confirmDialog');
    const toastOverlay = document.getElementById('toastOverlay');
    const successToast = document.getElementById('successToast');

    // --- 1. Loading UI ---
    function showDefaultLoading() {
        if (!container) return;
        container.innerHTML = `
            <div class="flex flex-col items-center justify-center py-20">
                <div class="w-12 h-12 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                <p class="text-gray-500 font-bold animate-pulse">Retrieving Election Data...</p>
            </div>
        `;
    }

    showDefaultLoading();

    // --- 2. Auth & Data Initialization ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const leaderDoc = await getDoc(doc(db, "users", user.uid));
                if (leaderDoc.exists()) {
                    const data = leaderDoc.data();
                    leaderCollege = data.college;
                    
                    // Display Profile Info
                    const nameDisplay = document.getElementById('userName');
                    const roleDisplay = document.getElementById('userRole');
                    if (nameDisplay) nameDisplay.textContent = `${data.firstname || ''} ${data.lastname || ''}`;
                    if (roleDisplay) roleDisplay.textContent = `${data.college} - LEADER`;

                    currentLeaderData = {
                        name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || user.email,
                        college: data.college,
                        role: "LEADER"
                    };
                    
                    fetchElectionAndResults();
                }
            } catch (err) {
                console.error("Auth initialization error:", err);
            }
        } else {
            window.location.href = "index.html";
        }
    });

    // --- 3. Fetch Real-time Data ---
    async function fetchElectionAndResults() {
        try {
            const q = query(
                collection(db, "elections"), 
                where("isActive", "==", true), 
                where("college", "==", leaderCollege)
            );
            
            const querySnapshot = await getDocs(q);
            if (querySnapshot.empty) {
                container.innerHTML = `<p class="text-center text-gray-500 py-10">No active election found for ${leaderCollege}.</p>`;
                return;
            }

            const electionDoc = querySnapshot.docs[0];
            currentElectionId = electionDoc.id;
            const electionData = electionDoc.data();

            const nameEl = document.getElementById('electionName');
            if (nameEl) nameEl.innerText = electionData.title || "Election Results";
            
            if (electionData.endDate) {
                const endDate = electionData.endDate.toDate();
                const formattedDate = endDate.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
                const formattedTime = endDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
                const tsEl = document.getElementById('verifiedTimestamp');
                if (tsEl) tsEl.innerText = `As of ${formattedDate}, ${formattedTime}`;
            }

            if (electionData.status === 'OFFICIAL') {
                updateToOfficial(electionData.verifiedAt);
            }

            const [candSnap, voteSnap] = await Promise.all([
                getDocs(query(collection(db, "candidates"), where("electionId", "==", currentElectionId))),
                getDocs(query(collection(db, "votes"), where("electionId", "==", currentElectionId)))
            ]);

            const allVotes = voteSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            const countEl = document.getElementById('totalVotesCount');
            if (countEl) countEl.innerText = allVotes.length.toLocaleString();

            const candidateDocs = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            
            const groupedResults = {};
            candidateDocs.forEach(cData => {
                const posName = cData.positionName || "Unknown Position"; 
                if (!groupedResults[posName]) groupedResults[posName] = [];

                const voteCount = allVotes.filter(v => {
                    if (v.selections && typeof v.selections === 'object') {
                        return Object.values(v.selections).some(sel => 
                            sel.candidateId?.toString() === cData.id?.toString()
                        );
                    }
                    return v.candidateId?.toString() === cData.id?.toString();
                }).length;

                groupedResults[posName].push({
                    name: cData.name || "Unknown Candidate",
                    votes: voteCount,
                    img: cData.photoUrl || "images/default-avatar.png"
                });
            });

            const results = Object.keys(groupedResults).map(posTitle => {
                const candidates = groupedResults[posTitle].sort((a, b) => b.votes - a.votes);
                return {
                    title: posTitle,
                    candidates: candidates
                };
            }).sort((a, b) => a.title.localeCompare(b.title));

            renderTallies(results);

        } catch (error) {
            console.error("Error fetching results:", error);
            container.innerHTML = `<p class="text-center text-red-500 py-10 font-bold">Failed to load live data.</p>`;
        }
    }

    function renderTallies(positions) {
        if (positions.length === 0) {
            container.innerHTML = `<p class="text-center text-gray-500 py-10">No voting data available yet.</p>`;
            return;
        }

        container.innerHTML = positions.map(pos => `
            <div class="bg-gray-50 rounded-2xl overflow-hidden shadow-sm border border-gray-100 mb-6">
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
                            ${pos.candidates.map((can, index) => `
                                <tr>
                                    <td class="py-4 px-2 text-gray-500 font-medium">#${index + 1}</td>
                                    <td class="py-4 px-2 flex items-center gap-4">
                                        <img src="${can.img}" class="w-12 h-12 rounded-full border border-gray-200 object-cover shadow-sm" onerror="this.src='images/default-avatar.png'">
                                        <span class="font-bold text-gray-700 font-sans">${can.name}</span>
                                    </td>
                                    <td class="py-4 px-2 text-right text-gray-600 font-bold">${can.votes.toLocaleString()} votes</td>
                                </tr>
                            `).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `).join('');
    }

    // --- 4. Approval Workflow ---
    if (approveBtn) {
        approveBtn.addEventListener('click', () => confirmDialog.classList.remove('hidden'));
    }

    const cancelBtn = document.getElementById('cancelApprove');
    if (cancelBtn) cancelBtn.addEventListener('click', () => confirmDialog.classList.add('hidden'));

    const confirmBtn = document.getElementById('confirmApprove');
    if (confirmBtn) {
        confirmBtn.addEventListener('click', async (e) => {
            if (!currentElectionId || !currentLeaderData) return;
            const originalText = e.target.innerText;
            e.target.innerText = "Processing...";
            e.target.disabled = true;

            try {
                const now = new Date();
                await updateDoc(doc(db, "elections", currentElectionId), {
                    status: 'OFFICIAL',
                    verifiedAt: now,
                    endDate: now, 
                    resultsPublished: true
                });

                await createLeaderAudit(
                    currentLeaderData, 
                    "Approved Results", 
                    `Marked election as OFFICIAL.`
                );

                confirmDialog.classList.add('hidden');
                showToast();
            } catch (error) {
                console.error("Approval failed:", error);
            } finally {
                e.target.innerText = originalText;
                e.target.disabled = false;
            }
        });
    }

    function showToast() {
        if (toastOverlay) toastOverlay.classList.remove('hidden');
        if (successToast) successToast.classList.add('toast-animate-center');
        toastTimer = setTimeout(() => closeToast(), 3000);
    }

    window.closeToast = () => {
        clearTimeout(toastTimer);
        if (toastOverlay) toastOverlay.classList.add('hidden');
        if (successToast) successToast.classList.remove('toast-animate-center');
        updateToOfficial();
    };

    function updateToOfficial(timestamp) {
        const currentApproveBtn = document.getElementById('approveResultsBtn');
        if (currentApproveBtn) currentApproveBtn.remove();
        
        const titleElement = document.getElementById('tallyHeader');
        const nameEl = document.getElementById('electionName');
        const currentTitle = nameEl ? nameEl.innerText : "Election";

        if (titleElement) {
            titleElement.innerHTML = `Official Election Results - <span id="electionName">${currentTitle}</span>`;
        }
        
        const subEl = document.getElementById('tallySubtext');
        if (subEl) subEl.innerText = "Results have been verified";
        
        const date = timestamp?.toDate ? timestamp.toDate() : new Date();
        const formattedDate = date.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
        const formattedTime = date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
        const tsEl = document.getElementById('verifiedTimestamp');
        if (tsEl) tsEl.innerText = `Verified on ${formattedDate}, ${formattedTime}`;
    }

    // --- 5. Logout ---
    const logoutModal = document.getElementById('logoutModal');
    const sidebarLogoutBtn = document.getElementById('logoutSidebarBtn');
    
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.addEventListener('click', () => {
            if (logoutModal) logoutModal.classList.remove('hidden');
        });
    }
    
    const closeLogout = document.getElementById('closeLogout');
    if (closeLogout) closeLogout.addEventListener('click', () => logoutModal.classList.add('hidden'));

    const confirmLogoutBtn = document.getElementById('confirmLogout');
    if (confirmLogoutBtn) {
        confirmLogoutBtn.addEventListener('click', async () => {
            if (currentLeaderData) {
                await createLeaderAudit(currentLeaderData, "System Logout", "Leader manually signed out.");
            }
            await signOut(auth);
            window.location.href = "index.html";
        });
    }
});