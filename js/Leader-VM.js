import { auth, db } from './firebase.js';
import { createLeaderAudit } from './Leader-audit.js'; 
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, query, where, getDocs, doc, getDoc, updateDoc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Global State ---
let voters = [];
let selectedVoter = null;
let currentFilter = 'All';
let currentLeaderData = null; 

// --- 1. DATA FETCHING (Firebase) ---
async function fetchVoters(leaderUid) {
    try {
        const leaderDoc = await getDoc(doc(db, "users", leaderUid));
        if (!leaderDoc.exists()) return;

        const leaderCollege = leaderDoc.data().college;
        // Kunin lang ang mga user na kapareho ng college ng Leader pero hindi Leader ang role
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
                    program: data.program || "N/A", // Bagong column from UI
                    year: data.year || "N/A",       // Bagong column from UI
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
        if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-red-500">Failed to load data.</td></tr>`;
    }
}

// --- 2. AUTHENTICATION ---
onAuthStateChanged(auth, async (user) => {
    if (user) {
        try {
            const leaderDoc = await getDoc(doc(db, "users", user.uid));
            if (leaderDoc.exists()) {
                const data = leaderDoc.data();
                currentLeaderData = {
                    name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || user.email,
                    college: data.college,
                    position: data.position || "Chairperson",
                    role: "LEADER"
                };
                displayProfile();
            }
            await fetchVoters(user.uid);
        } catch (err) {
            console.error("Auth initialization error:", err);
        }
    } else {
        window.location.href = "index.html";
    }
});

// --- 3. UI RENDERING ---
function displayProfile() {
    const nameDisplay = document.getElementById('userName');
    const roleDisplay = document.getElementById('userRole');
    if (nameDisplay && roleDisplay && currentLeaderData) {
        nameDisplay.textContent = currentLeaderData.name;
        roleDisplay.textContent = `${currentLeaderData.college} - ${currentLeaderData.position}`;
    }
}

function renderTable(data) {
    const tableBody = document.getElementById('voterTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    if (data.length === 0) {
        tableBody.innerHTML = `<tr><td colspan="7" class="px-4 py-8 text-center text-gray-400 text-sm italic">No records matching your search.</td></tr>`;
        return;
    }

    data.forEach(voter => {
        let dotColor = voter.status === 'Approved' ? 'bg-green-500' : (voter.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500');
        tableBody.insertAdjacentHTML('beforeend', `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50">
                <td class="px-4 py-3 text-gray-600 text-sm whitespace-nowrap font-normal">${voter.id}</td>
                <td class="px-4 py-3 text-gray-800 text-sm whitespace-nowrap font-normal">${voter.name}</td>
                <td class="px-4 py-3 text-gray-600 text-sm whitespace-nowrap font-normal">${voter.program}</td>
                <td class="px-4 py-3 text-gray-600 text-sm text-center whitespace-nowrap font-normal">${voter.year}</td>
                <td class="px-4 py-3 text-gray-600 text-sm text-center whitespace-nowrap font-normal">${voter.date}</td>
                <td class="px-4 py-3 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 font-normal text-black text-sm">
                        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                        ${voter.status}
                    </span>
                </td>
                <td class="px-4 py-3 text-center">
                    <button onclick="openReview('${voter.id}')" class="bg-btn-gradient text-white px-4 py-1 rounded-lg text-xs font-medium shadow-md hover:brightness-110 transition">
                        Review
                    </button>
                </td>
            </tr>
        `);
    });
}

// --- 4. CORE DATABASE ACTIONS ---
window.confirmApproval = async () => {
    if (!selectedVoter || !currentLeaderData) return;
    try {
        const voterRef = doc(db, "users", selectedVoter.dbId);
        await updateDoc(voterRef, { isVerified: true, rejectionReason: "" });

        await createLeaderAudit(currentLeaderData, "Approved Voter", `Approved registration for ${selectedVoter.name} (${selectedVoter.id}).`);

        selectedVoter.status = "Approved";
        applyFilters();
        closeAllModals();
    } catch (e) {
        console.error("Approval failed:", e);
    }
};

window.confirmRejection = async () => {
    if (!selectedVoter || !currentLeaderData) return;
    const reasons = Array.from(document.querySelectorAll('.rejection-check:checked')).map(c => c.value);
    const reasonStr = reasons.join(', ');

    try {
        const voterRef = doc(db, "users", selectedVoter.dbId);
        await updateDoc(voterRef, { isVerified: false, rejectionReason: reasonStr });

        await createLeaderAudit(currentLeaderData, "Rejected Voter", `Rejected registration for ${selectedVoter.name} (${selectedVoter.id}). Reason: ${reasonStr}`);

        selectedVoter.status = "Rejected";
        selectedVoter.reason = reasonStr;
        applyFilters();
        closeAllModals();
    } catch (e) {
        console.error("Rejection failed:", e);
    }
};

// --- 5. MODAL CONTROLS ---
window.openReview = (id) => {
    selectedVoter = voters.find(v => v.id === id);
    if (!selectedVoter) return;

    const viewer = document.getElementById('pdfViewer');
    if (viewer) viewer.src = selectedVoter.pdf;
    
    let infoHtml = `
        <h4 class="text-lg font-bold text-gray-800 mb-6 font-sans">Student Provided Information</h4>
        <div class="space-y-4 text-gray-600 font-normal text-sm">
            <p>Name: ${selectedVoter.name}</p>
            <p>Student ID: ${selectedVoter.id}</p>
            <p>Program: ${selectedVoter.program}</p>
            <p>Year: ${selectedVoter.year}</p>
        </div>`;

    if (selectedVoter.status === 'Rejected') {
        infoHtml += `<div class="mt-4 space-y-2 text-gray-600 text-sm font-normal">
                        <p>Status: Rejected</p>
                        <p class="ml-4 text-red-500 font-bold">Reason: ${selectedVoter.reason || 'Not specified'}</p>
                     </div>`;
    }

    const detailContainer = document.getElementById('voterDetailInfo');
    const actionContainer = document.getElementById('pendingActions');
    
    if (detailContainer) detailContainer.innerHTML = infoHtml;
    if (actionContainer) actionContainer.classList.toggle('hidden', selectedVoter.status !== 'Pending');
    
    document.getElementById('reviewModal').classList.remove('hidden');
};

function closeAllModals() {
    document.getElementById('approveAlert').classList.add('hidden');
    document.getElementById('rejectModal').classList.add('hidden');
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('logoutModal').classList.add('hidden');
    const viewer = document.getElementById('pdfViewer');
    if (viewer) viewer.src = "";
}

// I-bind ang functions sa window object para matawag ng inline HTML (onclick)
window.closeReviewModal = closeAllModals;
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
window.closeLogoutModal = closeAllModals;

window.confirmLogout = async () => {
    if (currentLeaderData) await createLeaderAudit(currentLeaderData, "System Logout", "Leader manually signed out.");
    await signOut(auth);
    window.location.href = "index.html";
};

// --- 6. UTILS & EVENT LISTENERS ---
function applyFilters() {
    const searchTerm = document.getElementById('searchInput')?.value.toLowerCase() || "";
    const filtered = voters.filter(voter => {
        const matchesStatus = (currentFilter === 'All' || voter.status === currentFilter);
        const matchesSearch = (
            voter.name.toLowerCase().includes(searchTerm) || 
            voter.id.toLowerCase().includes(searchTerm) || 
            voter.program.toLowerCase().includes(searchTerm)
        );
        return matchesStatus && matchesSearch;
    });
    renderTable(filtered);
}

function updateTabStyles(activeElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-blue-500', 'border-blue-500', 'border-b-2');
        btn.classList.add('text-gray-400');
    });
    activeElement.classList.add('text-blue-500', 'border-blue-500', 'border-b-2');
}

document.addEventListener('DOMContentLoaded', () => {
    // Initial loading indicator
    const tableBody = document.getElementById('voterTableBody');
    if (tableBody) tableBody.innerHTML = `<tr><td colspan="7" class="px-4 py-12 text-center text-gray-500">Loading data...</td></tr>`;

    // Tabs
    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            updateTabStyles(e.target);
            currentFilter = e.target.getAttribute('data-status');
            applyFilters();
        });
    });

    // Search
    document.getElementById('searchInput')?.addEventListener('input', applyFilters);

    // Rejection checkbox listener
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

    // Logout
    document.getElementById('logoutSidebarBtn')?.addEventListener('click', window.openLogoutModal);
});