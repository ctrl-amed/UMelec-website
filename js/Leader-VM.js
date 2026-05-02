import { auth, db, storage } from './firebase.js';
import { createLeaderAudit } from './Leader-audit.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, getDocs, doc, getDoc, updateDoc
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";
import {
    ref, getDownloadURL, listAll
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-storage.js";

// --- Global State ---
let voters = [];
let selectedVoter = null;
let currentFilter = 'All';
let currentLeaderData = null;

// --- Helpers ---
function normalizeCollege(value) {
    if (!value) return "";
    const raw = String(value).trim();
    const match = raw.match(/\(([^)]+)\)/);
    return (match ? match[1] : raw).trim().toUpperCase();
}

function detectFileType(name = "") {
    const lower = String(name).toLowerCase();
    if (lower.endsWith('.pdf')) return 'pdf';
    if (
        lower.endsWith('.png') ||
        lower.endsWith('.jpg') ||
        lower.endsWith('.jpeg') ||
        lower.endsWith('.webp') ||
        lower.endsWith('.gif')
    ) return 'image';
    return 'unknown';
}

function renderPreviewLoading() {
    const viewer = document.getElementById('pdfViewer');
    const host = viewer ? viewer.parentElement : null;
    if (!host) return;

    host.innerHTML = `
        <div class="w-full h-full rounded shadow-inner bg-white flex flex-col items-center justify-center gap-3">
            <div class="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600"></div>
            <p class="text-xs text-gray-400 font-bold uppercase tracking-widest">Loading COR...</p>
        </div>
    `;
}

function renderCorPreview(asset) {
    const viewer = document.getElementById('pdfViewer');
    const host = viewer ? viewer.parentElement : null;
    if (!host) return;

    if (!asset || !asset.url) {
        host.innerHTML = `
            <div class="w-full h-full rounded shadow-inner bg-white flex items-center justify-center text-center px-6">
                <p class="text-sm text-gray-400 italic">No COR file found.</p>
            </div>
        `;
        return;
    }

    if (asset.type === 'image') {
        host.innerHTML = `
            <div class="w-full h-full rounded shadow-inner bg-white flex items-center justify-center overflow-auto">
                <img src="${asset.url}" alt="Certificate of Registration" class="max-w-full max-h-full object-contain rounded">
            </div>
        `;
        return;
    }

    host.innerHTML = `
        <object data="${asset.url}" type="application/pdf" class="w-full h-full rounded shadow-inner bg-white">
            <iframe id="pdfViewer" src="${asset.url}" class="w-full h-full rounded shadow-inner bg-white"></iframe>
        </object>
    `;
}

async function resolveCorAsset(voter) {
    try {
        if (voter.corUrl) {
            return {
                url: voter.corUrl,
                type: detectFileType(voter.corUrl)
            };
        }

        if (voter.corPath) {
            const url = await getDownloadURL(ref(storage, voter.corPath));
            return {
                url,
                type: detectFileType(voter.corPath)
            };
        }

        const userFolderId = voter.authUid || voter.dbId;
        const folderRef = ref(storage, `voter_cors/${userFolderId}`);
        const result = await listAll(folderRef);

        if (!result.items.length) {
            return null;
        }

        const fileRef = result.items[0];
        const url = await getDownloadURL(fileRef);

        return {
            url,
            type: detectFileType(fileRef.name)
        };
    } catch (error) {
        console.error("COR Preview Error:", error);
        return null;
    }
}

// --- 1. DATA FETCHING (Firebase) ---
async function fetchVoters(leaderUid) {
    try {
        const leaderDoc = await getDoc(doc(db, "users", leaderUid));
        if (!leaderDoc.exists()) return;

        const leaderCollege = normalizeCollege(leaderDoc.data().college);
        const querySnapshot = await getDocs(collection(db, "users"));
        const tempVoters = [];

        querySnapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const role = String(data.role || "").trim().toUpperCase();
            const userCollege = normalizeCollege(data.college);

            if (userCollege !== leaderCollege) return;
            if (role === 'LEADER' || role === 'COSEL' || role === 'ADMIN') return;

            let displayDate = "Pending";
            const dateField = data.completedAt || data.createdAt || data.registeredAt;
            if (dateField && typeof dateField.toDate === 'function') {
                displayDate = dateField.toDate().toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric'
                });
            }

            tempVoters.push({
                id: data.studentId || docSnap.id,
                studentIdRaw: data.studentId || "",
                dbId: docSnap.id,
                authUid: data.uid || data.authUid || docSnap.id,
                name: `${data.firstname || ''} ${data.lastname || ''}`.trim() || data.name || "Unnamed User",
                program: data.program || "N/A",
                year: data.year || "N/A",
                date: displayDate,
                status: data.isVerified === true ? "Approved" : (data.isVerified === false ? "Rejected" : "Pending"),
                reason: data.rejectionReason || "",
                corUrl: data.corUrl || "",
                corPath: data.corPath || ""
            });
        });

        voters = tempVoters;
        applyFilters();

    } catch (error) {
        console.error("Error fetching table data:", error);
        const tableBody = document.getElementById('voterTableBody');
        if (tableBody) {
            tableBody.innerHTML = `<tr><td colspan="7" class="py-10 text-center text-red-500">Failed to load data.</td></tr>`;
        }
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

// --- Updated UI RENDERING snippet ---
// Inside your renderTable function in Leader-VM.js
data.forEach(voter => {
    const dotColor = voter.status === 'Approved'
        ? 'bg-green-500'
        : (voter.status === 'Rejected' ? 'bg-red-500' : 'bg-yellow-500');

    tableBody.insertAdjacentHTML('beforeend', `
        <tr class="hover:bg-gray-50 transition border-b border-gray-50">
            <td class="px-2 py-3 text-gray-600 text-sm whitespace-nowrap font-normal">${voter.id}</td>
            <td class="px-2 py-3 text-gray-800 text-sm whitespace-nowrap font-normal">${voter.name}</td>
            
            <td class="px-2 py-3 text-gray-600 text-sm font-normal min-w-[200px]">
                <div class="break-words leading-relaxed">
                    ${voter.program}
                </div>
            </td>

            <td class="px-2 py-3 text-gray-600 text-sm text-center whitespace-nowrap font-normal">${voter.year}</td>
            <td class="px-2 py-3 text-gray-600 text-sm text-center whitespace-nowrap font-normal">${voter.date}</td>
            <td class="px-2 py-3 text-center whitespace-nowrap">
                <span class="inline-flex items-center gap-1.5 font-normal text-black text-sm">
                    <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                    ${voter.status}
                </span>
            </td>
            <td class="px-2 py-3 text-center">
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

        await createLeaderAudit(
            currentLeaderData,
            "Approved Voter",
            `Approved registration for ${selectedVoter.name} (${selectedVoter.id}).`
        );

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

// --- 5. MODAL CONTROLS ---
window.openReview = async (id) => {
    selectedVoter = voters.find(v => v.id === id);
    if (!selectedVoter) return;

    let infoHtml = `
        <h4 class="text-lg font-bold text-gray-800 mb-6 font-sans">Student Provided Information</h4>
        <div class="space-y-4 text-gray-600 font-normal text-sm">
            <p>Name: ${selectedVoter.name}</p>
            <p>Student ID: ${selectedVoter.id}</p>
            <p>Program: ${selectedVoter.program}</p>
            <p>Year: ${selectedVoter.year}</p>
        </div>`;

    if (selectedVoter.status === 'Rejected') {
        infoHtml += `
            <div class="mt-4 space-y-2 text-gray-600 text-sm font-normal">
                <p>Status: Rejected</p>
                <p class="ml-4 text-red-500 font-bold">Reason: ${selectedVoter.reason || 'Not specified'}</p>
            </div>`;
    }

    const detailContainer = document.getElementById('voterDetailInfo');
    const actionContainer = document.getElementById('pendingActions');

    if (detailContainer) detailContainer.innerHTML = infoHtml;
    if (actionContainer) actionContainer.classList.toggle('hidden', selectedVoter.status !== 'Pending');

    document.getElementById('reviewModal').classList.remove('hidden');
    renderPreviewLoading();

    const asset = await resolveCorAsset(selectedVoter);
    renderCorPreview(asset);
};

function closeAllModals() {
    document.getElementById('approveAlert').classList.add('hidden');
    document.getElementById('rejectModal').classList.add('hidden');
    document.getElementById('reviewModal').classList.add('hidden');
    document.getElementById('logoutModal').classList.add('hidden');

    const viewer = document.getElementById('pdfViewer');
    if (viewer) viewer.src = "";
}

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
    if (currentLeaderData) {
        await createLeaderAudit(currentLeaderData, "System Logout", "Leader manually signed out.");
    }
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
    const tableBody = document.getElementById('voterTableBody');
    if (tableBody) {
        tableBody.innerHTML = `<tr><td colspan="7" class="px-4 py-12 text-center text-gray-500">Loading data...</td></tr>`;
    }

    document.querySelectorAll('.tab-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            updateTabStyles(e.target);
            currentFilter = e.target.getAttribute('data-status');
            applyFilters();
        });
    });

    document.getElementById('searchInput')?.addEventListener('input', applyFilters);

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

    document.getElementById('logoutSidebarBtn')?.addEventListener('click', window.openLogoutModal);
});
