// --- Authenticated User Data (Fake Data) ---
const authenticatedUser = {
    name: "Maria Leonora Theresa",
    college: "CCIS",
    position: "Chairperson"
};

// --- Data Source (Program and Year separated) ---
let voters = [
    { id: "A12345678", name: "Monde Garcia", program: "BS Info Tech", year: "1st Year", date: "Nov. 20, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A13345678", name: "John Dela Cruz", program: "BS Computer Science", year: "3rd Year", date: "Nov. 20, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "B55667788", name: "Sarah Miller", program: "BS Computer Science", year: "2nd Year", date: "Nov. 21, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "C99001122", name: "Kevin Hart", program: "BS Psychology", year: "4th Year", date: "Nov. 22, 2025", status: "Pending", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345678", name: "Athisa Delmundo", program: "BS Interior Design", year: "2nd Year", date: "Nov. 20, 2025", status: "Approved", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345679", name: "Lisa Mandalo", program: "BS Psychology", year: "4th Year", date: "Nov. 20, 2025", status: "Approved", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345680", name: "Joshua Lani", program: "BS Civil Eng", year: "3rd Year", date: "Nov. 20, 2025", status: "Rejected", reason: "Expired COR", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" },
    { id: "A14345681", name: "Daryl Dixon", program: "BS Tourism Management", year: "3rd Year", date: "Nov. 20, 2025", status: "Rejected", reason: "Wrong Document", pdf: "https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf" }
];

let selectedVoter = null;
let currentFilter = 'All';

document.addEventListener('DOMContentLoaded', () => {
    displayProfile();
    setupEventListeners();
    handleIncomingFilters(); // New: Handles "View All" redirection from Homepage
    renderTable(voters); 
});

// --- Profile Initialization ---
function displayProfile() {
    const nameDisplay = document.getElementById('userName');
    const roleDisplay = document.getElementById('userRole');
    
    if (nameDisplay && roleDisplay) {
        nameDisplay.textContent = authenticatedUser.name;
        roleDisplay.textContent = `${authenticatedUser.college} - ${authenticatedUser.position}`;
    }
}

// --- URL Parameter Handling (For Homepage "View All" buttons) ---
function handleIncomingFilters() {
    const urlParams = new URLSearchParams(window.location.search);
    const filterParam = urlParams.get('filter'); // Looks for ?filter=Pending or ?filter=Approved
    
    if (filterParam) {
        currentFilter = filterParam;
        // Update the UI tabs to show which is active
        const targetTab = document.querySelector(`[data-status="${filterParam}"]`);
        if (targetTab) {
            updateTabStyles(targetTab);
        }
        applyFilters();
    }
}

function setupEventListeners() {
    const searchInput = document.getElementById('searchInput');
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    const tabButtons = document.querySelectorAll('.tab-btn');
    tabButtons.forEach(button => {
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
}

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
            voter.program.toLowerCase().includes(searchTerm)
        );
        return matchesStatus && matchesSearch;
    });
    renderTable(filtered);
}

// --- Table Rendering (Updated with separate Program and Year columns) ---
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
        `;
        tableBody.insertAdjacentHTML('beforeend', row);
    });
}

function openReview(id) {
    selectedVoter = voters.find(v => v.id === id);
    if (!selectedVoter) return;

    const viewer = document.getElementById('pdfViewer');
    if (viewer) viewer.src = selectedVoter.pdf;
    
    let infoHtml = `
        <h4 class="text-lg font-bold text-gray-800 mb-6 font-sans">Student Provided Information</h4>
        <div class="space-y-4 text-gray-600 font-normal text-sm">
            <p><strong class="font-semibold text-gray-700">Name:</strong> ${selectedVoter.name}</p>
            <p><strong class="font-semibold text-gray-700">Student ID:</strong> ${selectedVoter.id}</p>
            <p><strong class="font-semibold text-gray-700">Program:</strong> ${selectedVoter.program}</p>
            <p><strong class="font-semibold text-gray-700">Year Level:</strong> ${selectedVoter.year}</p>
        </div>`;

    if (selectedVoter.status === 'Approved') {
        infoHtml += `<div class="mt-4 p-3 bg-green-50 text-green-700 rounded-lg text-sm font-medium border border-green-100">Status: Approved</div>`;
    } else if (selectedVoter.status === 'Rejected') {
        infoHtml += `<div class="mt-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm font-medium border border-red-100">
                        <p>Status: Rejected</p>
                        <p class="mt-1 font-normal italic">Reason: ${selectedVoter.reason || 'Not specified'}</p>
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

// --- Modal Handlers ---
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

// --- Actions ---
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