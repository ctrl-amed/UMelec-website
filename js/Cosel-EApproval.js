document.addEventListener('DOMContentLoaded', () => {
    // 1. Fake Database Data
    const electionsData = [
        { title: "CCIS Student Council", college: "CCIS", user: "John Doe", date: "March 15, 2026", status: "Pending" },
        { title: "Engineering Board 2026", college: "CET", user: "Jane Smith", date: "March 12, 2026", status: "Pending" },
        { title: "Law Society Elections", college: "SOL", user: "Mike Ross", date: "March 10, 2026", status: "Approved" },
        { title: "Nursing Dept Head", college: "ION", user: "Clara Oswald", date: "Feb 28, 2026", status: "Rejected" },
        { title: "Freshmen Rep 2025", college: "CITE", user: "Amy Pond", date: "Jan 15, 2026", status: "Completed" },
        { title: "Architecture Council", college: "CCSE", user: "David Tennant", date: "March 18, 2026", status: "Pending" },
        { title: "Business Finance Head", college: "CBFS", user: "Rose Tyler", date: "March 05, 2026", status: "Approved" }
    ];

    let currentFilter = 'Pending';

    // 2. Render Table Function
    window.filterByStatus = (status) => {
        currentFilter = status;
        
        // Update Button UI
        document.querySelectorAll('.filter-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`btn-${status}`).classList.add('active');

        const tableBody = document.getElementById('election-table-body');
        const filteredData = electionsData.filter(e => e.status === status);

        if (filteredData.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="6" class="px-6 py-10 text-center text-gray-400 italic">No ${status} elections found.</td>
                </tr>
            `;
            return;
        }

        tableBody.innerHTML = filteredData.map(e => `
            <tr class="hover:bg-gray-50 transition">
                <td class="px-6 py-5 text-gray-800 font-black">${e.title}</td>
                <td class="px-6 py-5 text-gray-500">${e.college}</td>
                <td class="px-6 py-5 text-gray-500">${e.user}</td>
                <td class="px-6 py-5 text-gray-500">${e.date}</td>
                <td class="px-6 py-5">
                    <span class="px-3 py-1 rounded-full text-[10px] uppercase tracking-widest ${getStatusClass(e.status)}">
                        ${e.status}
                    </span>
                </td>
                <td class="px-6 py-5 text-center">
                    <button class="bg-blue-gradient text-white text-[10px] font-black uppercase px-6 py-2 rounded-lg hover:brightness-110 shadow-md transition">
                        Preview
                    </button>
                </td>
            </tr>
        `).join('');
    };

    // Helper for Status Pills
    function getStatusClass(status) {
        switch(status) {
            case 'Pending': return 'bg-yellow-100 text-yellow-700';
            case 'Approved': return 'bg-green-100 text-green-700';
            case 'Rejected': return 'bg-red-100 text-red-700';
            case 'Completed': return 'bg-gray-100 text-gray-700';
            default: return 'bg-gray-100 text-gray-700';
        }
    }

    // --- Logout Logic ---
    window.showLogoutModal = () => {
        document.getElementById('logoutModalOverlay').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    };

    window.closeLogoutModal = () => {
        document.getElementById('logoutModalOverlay').classList.add('hidden');
        document.body.style.overflow = '';
    };

    // Close modal if clicking outside the box
    document.getElementById('logoutModalOverlay').addEventListener('click', function(e) {
        if (e.target === this) closeLogoutModal();
    });

    // Initial Load
    filterByStatus('Pending');
});