// --- Data Source ---
let voters = [
    { id: "A12345678", name: "Monde Garcia", college: "CBFS - 1st Year", date: "Nov. 20, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A13345678", name: "John Dela Cruz", college: "CCIS - 3rd Year", date: "Nov. 20, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "B55667788", name: "Sarah Miller", college: "CCIS - 2nd Year", date: "Nov. 21, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "C99001122", name: "Kevin Hart", college: "IOP - 4th Year", date: "Nov. 22, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345678", name: "Athisa Delmundo", college: "IAD - 2nd Year", date: "Nov. 20, 2025", status: "Approved", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345679", name: "Lisa Mandalo", college: "IOP - 4th Year", date: "Nov. 20, 2025", status: "Approved", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345680", name: "Joshua Lani", college: "CCSE - 3rd Year", date: "Nov. 20, 2025", status: "Rejected", reason: "Expired COR", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345681", name: "Daryl Dixon", college: "CTHM - 3rd Year", date: "Nov. 20, 2025", status: "Rejected", reason: "Wrong Document", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
];

let selectedVoter = null;
let currentFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
    renderTable(voters); 
    setupEventListeners();
});

function setupEventListeners() {
    // Search Filter
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    // Tab Filtering
    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            updateTabStyles(e.target);
            currentFilter = e.target.getAttribute('data-status');
            applyFilters();
        });
    });

    // Rejection Reason Checkboxes
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

    // Logout Trigger - Targeted via specific ID
    const logoutBtn = document.getElementById('logoutSidebarBtn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', openLogoutModal);
    }
}

// --- Navigation & Tabs ---

function updateTabStyles(activeElement) {
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.classList.remove('text-blue-500', 'border-blue-500', 'border-b-2');
        btn.classList.add('text-gray-400');
    });
    activeElement.classList.remove('text-gray-400');
    activeElement.classList.add('text-blue-500', 'border-blue-500', 'border-b-2');
}

function applyFilters() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase();
    const filtered = voters.filter(voter => {
        const matchesStatus = (currentFilter === 'All' || voter.status === currentFilter);
        const matchesSearch = (
            voter.name.toLowerCase().includes(searchTerm) || 
            voter.id.toLowerCase().includes(searchTerm) || 
             voter.college.toLowerCase().includes(searchTerm)
        );
        return matchesStatus && matchesSearch;
    });
    renderTable(filtered);
}

// --- Table Rendering ---

function renderTable(data) {
    const tableBody = document.getElementById('voterTableBody');
    if (!tableBody) return;
    tableBody.innerHTML = '';

    data.forEach(voter => {
        let dotColor = 'bg-yellow-500';
        if (voter.status === 'Approved') dotColor = 'bg-green-500';
        if (voter.status === 'Rejected') dotColor = 'bg-red-500';

        const row = `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50">
                <td class="px-4 py-2 text-gray-600 text-sm whitespace-nowrap font-normal">${voter.id}</td>
                <td class="px-4 py-2 text-gray-800 text-sm whitespace-nowrap font-normal">${voter.name}</td>
                <td class="px-4 py-2 text-gray-600 text-sm whitespace-nowrap font-normal">${voter.college}</td>
                <td class="px-4 py-2 text-gray-600 text-sm text-center whitespace-nowrap font-normal">${voter.date}</td>
                <td class="px-4 py-2 text-center whitespace-nowrap">
                    <span class="inline-flex items-center gap-1.5 font-normal text-black text-sm">
                        <span class="w-2 h-2 rounded-full ${dotColor}"></span>
                        ${voter.status}
                    </span>
                </td>
                <td class="px-4 py-2 text-center">
                    <button onclick="openReview('${voter.id}')" class="bg-btn-gradient text-white px-4 py-1 rounded-lg text-xs font-medium shadow-md hover:brightness-110 transition">
                        Review
                    </button>
                </td>
            </tr>
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

// --- Modal Controls ---

function openReview(id) {
    selectedVoter = voters.find(v => v.id === id);
    if (!selectedVoter) return;

    const viewer = document.getElementById('pdfViewer');
    if (viewer) viewer.src = selectedVoter.pdf;
    
    const parts = selectedVoter.college.split(' - ');
    const college = parts[0] || 'N/A';
    const year = parts[1] || 'N/A';

    let infoHtml = `
        <h4 class="text-lg font-bold text-gray-800 mb-6 font-sans">Student Provided Information</h4>
        <div class="space-y-4 text-gray-600 font-normal text-sm">
            <p>Name: ${selectedVoter.name}</p>
            <p>Student ID: ${selectedVoter.id}</p>
            <p>College: ${college}</p>
            <p>Year: ${year}</p>
        </div>`;

    if (selectedVoter.status === 'Approved') {
        infoHtml += `<div class="mt-4 text-gray-600 text-sm font-normal"><p>Status: Approved</p></div>`;
    } else if (selectedVoter.status === 'Rejected') {
        infoHtml += `<div class="mt-4 space-y-2 text-gray-600 text-sm font-normal">
                        <p>Status: Rejected</p>
                        <p class="ml-4">Reason: ${selectedVoter.reason || 'Not specified'}</p>
                     </div>`;
    }

    const detailContainer = document.getElementById('voterDetailInfo');
    const actionContainer = document.getElementById('pendingActions');
    
    if (detailContainer) detailContainer.innerHTML = infoHtml;
    if (actionContainer) actionContainer.classList.toggle('hidden', selectedVoter.status !== 'Pending');
    
    document.getElementById('reviewModal').classList.remove('hidden');
}

function closeReviewModal() {
    document.getElementById('reviewModal').classList.add('hidden');
    const viewer = document.getElementById('pdfViewer');
    if (viewer) viewer.src = "";
}

function openRejectModal() { document.getElementById('rejectModal').classList.remove('hidden'); }
function closeRejectModal() { 
    document.getElementById('rejectModal').classList.add('hidden');
    document.querySelectorAll('.rejection-check').forEach(c => c.checked = false);
    const btn = document.getElementById('submitRejectBtn');
    if (btn) {
        btn.disabled = true;
        btn.classList.add('opacity-50', 'cursor-not-allowed');
    }
}

function openApproveAlert() { document.getElementById('approveAlert').classList.remove('hidden'); }
function closeApproveAlert() { document.getElementById('approveAlert').classList.add('hidden'); }

function openLogoutModal() { document.getElementById('logoutModal').classList.remove('hidden'); }
function closeLogoutModal() { document.getElementById('logoutModal').classList.add('hidden'); }

// --- Final Actions ---

function confirmLogout() {
    window.location.href = "index.html";
}

function confirmApproval() {
    if (selectedVoter) {
        selectedVoter.status = 'Approved';
        applyFilters(); 
        closeApproveAlert();
        closeReviewModal();
    }
}

function confirmRejection() {
    if (selectedVoter) {
        const checkedReasons = Array.from(document.querySelectorAll('.rejection-check:checked')).map(c => c.value);
        selectedVoter.status = 'Rejected';
        selectedVoter.reason = checkedReasons.join(', ');
        applyFilters();
        closeRejectModal();
        closeReviewModal();
    }
}