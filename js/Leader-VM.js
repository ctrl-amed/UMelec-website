import { auth, db } from './firebase.js';
// 1. IMPORT YOUR NEW AUDIT TOOL
import { createLeaderAudit } from './Leader-audit.js'; 

import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, query, where, getDocs, doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Data Source ---
let voters = [];
let selectedVoter = null;
let currentFilter = 'All';
let currentLeaderData = null; 

// --- LOADING UI (DEFAULT STATE) ---
function showInitialLoading() {
    const tableBody = document.getElementById('voterTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = `
        <tr>
            <td colspan="6" class="px-4 py-12 text-center">
                <div class="flex flex-col items-center justify-center space-y-3">
                    <div class="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                    <p class="text-gray-500 text-sm font-bold animate-pulse">Loading data. Please wait...</p>
                </div>
            </td>
        </tr>
    `;
}

// 1. FETCH DATA FROM FIREBASE
async function fetchVoters(leaderUid) {
    try {
        const leaderDoc = await getDoc(doc(db, "users", leaderUid));
        if (!leaderDoc.exists()) return;

        const leaderCollege = leaderDoc.data().college;
        const vQuery = query(collection(db, "users"), where("college", "==", leaderCollege));
        const querySnapshot = await getDocs(vQuery);
        const tempVoters = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            if (!data.role || data.role !== 'LEADER') {
                let displayDate = "Pending";
                if (data.completedAt) {
                    displayDate = data.completedAt.toDate().toLocaleDateString('en-US', {
                        month: 'short', day: 'numeric', year: 'numeric'
                    });
                }

                tempVoters.push({
                    id: data.studentId || docSnap.id,
                    dbId: docSnap.id,
                    name: `${data.firstname || ''} ${data.lastname || ''}`,
                    college: `${data.college} - ${data.year || 'N/A'}`,
                    date: displayDate,
                    status: data.isVerified === true ? "Approved" : (data.isVerified === false ? "Rejected" : "Pending"),
                    reason: data.rejectionReason || "",
                    pdf: data.corUrl || "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf"
                });
            }
        });

        voters = tempVoters;
        applyFilters();

    } catch (error) {
        console.error("Error fetching table data:", error);
        const tableBody = document.getElementById('voterTableBody');
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="6" class="py-10 text-center text-red-500">Failed to load data.</td></tr>`;
    }
}

// 2. AUTH STATUS
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const leaderDoc = await getDoc(doc(db, "users", user.uid));
            if (leaderDoc.exists()) {
                const data = leaderDoc.data();
                currentLeaderData = {
                    name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || user.email,
                    college: data.college,
                    role: "LEADER"
                };
            }
            await fetchVoters(user.uid);
        } catch (err) {
            console.error("Auth initialization error:", err);
        }
    } else {
        window.location.href = "index.html";
    }
});

// 3. EVENT LISTENERS
document.addEventListener('DOMContentLoaded', () => {
    // TRIGGER LOADING IMMEDIATELY
    showInitialLoading();
    setupEventListeners();
});

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            updateTabStyles(e.target);
            currentFilter = e.target.getAttribute('data-status');
            applyFilters();
        });
    });

    document.querySelectorAll('.rejection-check').forEach(ck => {
        ck.addEventListener('change', () => {
            const checkedCount = document.querySelectorAll('.rejection-check:checked').length;
            const btn = document.getElementById('submitRejectBtn');
            if (btn) {
                btn.disabled = checkedCount === 0;
                btn.classList.toggle('opacity-50', checkedCount === 0);
                btn.classList.toggle('cursor-not-allowed', checkedCount === 0);
            }
        });
    });

    const logoutBtn = document.getElementById('logoutSidebarBtn');
    if (logoutBtn) logoutBtn.addEventListener('click', () => window.openLogoutModal());
}

// --- CORE ACTIONS ---

window.confirmApproval = async () => {
    if (!selectedVoter || !currentLeaderData) return;
    try {
        const voterRef = doc(db, "users", selectedVoter.dbId);
        await updateDoc(voterRef, { isVerified: true, rejectionReason: "" });

        await createLeaderAudit(
            currentLeaderData, 
            "Approved Voter", 
            `Approved registration for ${selectedVoter.name} (${selectedVoter.id}).`
        );

        selectedVoter.status = "Approved";
        applyFilters();
        closeAllModals();
    } catch (e) {
        console.error("Firebase Update Error:", e);
    }
};

window.confirmRejection = async () => {
    if (!selectedVoter || !currentLeaderData) return;
    const reasons = Array.from(document.querySelectorAll('.rejection-check:checked')).map(c => c.value);
    const reasonStr = reasons.join(', ');

    try {
        const voterRef = doc(db, "users", selectedVoter.dbId);
        await updateDoc(voterRef, { isVerified: false, rejectionReason: reasonStr });

        await createLeaderAudit(
            currentLeaderData, 
            "Rejected Voter", 
            `Rejected registration for ${selectedVoter.name} (${selectedVoter.id}). Reason: ${reasonStr}`
        );

        selectedVoter.status = "Rejected";
        selectedVoter.reason = reasonStr;
        applyFilters();
        closeAllModals();
    } catch (e) {
        console.error("Rejection failed:", e);
    }
};

// --- MODAL CONTROLS ---

function closeAllModals() {
    document.getElementById('approveAlert').classList.add('hidden');
    document.getElementById('rejectModal').classList.add('hidden');
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('pdfViewer').src = "";
}

window.openReview = (id) => {
    selectedVoter = voters.find(v => v.id === id);
    if (!selectedVoter) return;

    document.getElementById('pdfViewer').src = selectedVoter.pdf;
    const [college, year] = selectedVoter.college.split(' - ');

    let infoHtml = `
        <h4 class="text-lg font-bold mb-4">Student Info</h4>
        <p>Name: ${selectedVoter.name}</p>
        <p>ID: ${selectedVoter.id}</p>
        <p>College: ${college}</p>
        <p>Year: ${year}</p>
    `;
    if (selectedVoter.status === "Rejected") {
        infoHtml += `<p class="text-red-500 font-bold mt-2">Reason: ${selectedVoter.reason}</p>`;
    }

    document.getElementById('voterDetailInfo').innerHTML = infoHtml;
    document.getElementById('pendingActions').classList.toggle('hidden', selectedVoter.status !== 'Pending');
    document.getElementById('reviewModal').classList.remove('hidden');
};

window.closeReviewModal = () => closeAllModals();
window.openRejectModal = () => {
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('rejectModal').classList.remove('hidden');
};
window.closeRejectModal = () => {
    document.getElementById('rejectModal').classList.add('hidden');
    document.getElementById('reviewModal').classList.remove('hidden');
};
window.openApproveAlert = () => {
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('approveAlert').classList.remove('hidden');
};
window.closeApproveAlert = () => {
    document.getElementById('approveAlert').classList.add('hidden');
    document.getElementById('reviewModal').classList.remove('hidden');
};

window.openLogoutModal = () => document.getElementById('logoutModal').classList.remove('hidden');
window.closeLogoutModal = () => document.getElementById('logoutModal').classList.add('hidden');
window.confirmLogout = async () => {
    if (currentLeaderData) await createLeaderAudit(currentLeaderData, "System Logout", "Leader manually signed out.");
    await signOut(auth);
    window.location.href = "index.html";
};

// --- UTILS ---
function updateTabStyles(activeElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-blue-500', 'border-blue-500', 'border-b-2');
        btn.classList.add('text-gray-400');
    });
    activeElement.classList.add('text-blue-500', 'border-blue-500', 'border-b-2');
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const filtered = voters.filter(voter => {
        const matchesStatus = currentFilter === 'All' || voter.status === currentFilter;
        const matchesSearch = voter.name.toLowerCase().includes(searchTerm) || voter.id.toLowerCase().includes(searchTerm);
        return matchesStatus && matchesSearch;
    });
    renderTable(filtered);
}

function renderTable(data) {
    const tableBody = document.getElementById('voterTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="6" class="px-4 py-8 text-center text-gray-400 text-sm italic">No records matching your search.</td></tr>`;
        return;
    }

    data.forEach(voter => {
        let dotColor = voter.status === 'Approved' ? 'bg-green-500' : (voter.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500');
        tableBody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50">
                <td class="px-4 py-2 text-gray-600 text-sm">${voter.id}</td>
                <td class="px-4 py-2 text-gray-800 text-sm">${voter.name}</td>
                <td class="px-4 py-2 text-gray-600 text-sm">${voter.college}</td>
                <td class="px-4 py-2 text-gray-600 text-sm text-center">${voter.date}</td>
                <td class="px-4 py-2 text-center text-sm"><span class="w-2 h-2 inline-block rounded-full ${dotColor} mr-2"></span>${voter.status}</td>
                <td class="px-4 py-2 text-center">
                    <button onclick="openReview('${voter.id}')" class="bg-btn-gradient text-white px-4 py-1 rounded-lg text-xs">Review</button>
                </td>
            </tr>
        `);
    });
}