document.addEventListener('DOMContentLoaded', () => {
    // --- MOCK DATA ---
    const auditData = [
        { timestamp: '2025-11-01 08:30:00', admin: 'Chairman', action: 'System Login', details: 'Session Started' },
        { timestamp: '2025-11-05 14:22:15', admin: 'Leader - John Rizal', action: 'Election Setup', details: 'Candidate List Updated' },
        { timestamp: '2025-11-10 09:42:15', admin: 'Leader - Mae Dizon', action: 'Election Setup', details: 'Election Created' },
        { timestamp: '2025-11-22 16:45:30', admin: 'Chairman', action: 'Report Generation', details: 'Exported Voter Turnout' },
        { timestamp: '2025-11-28 15:20:00', admin: 'Cosel - Rave Sy', action: 'Candidate Review', details: 'Updated Bio' }
    ];

    // --- DOM ELEMENTS ---
    const tableBody = document.getElementById('auditLogBody');
    const analyticsModal = document.getElementById('analyticsModal');
    const exportModal = document.getElementById('exportModal');
    const successToast = document.getElementById('successToast');
    const exportAnalyticsBtn = document.getElementById('exportAnalyticsBtn');
    const directPdfBtns = document.querySelectorAll('.direct-pdf-btn');
    const exportAuditBtn = document.getElementById('exportAuditBtn');

    // --- CORE FUNCTIONS ---
    function showToast() {
        successToast.classList.remove('hidden');
        setTimeout(() => successToast.classList.add('hidden'), 3000);
    }

    function processExport(btn, format = "PDF") {
        btn.classList.add('loading');
        btn.disabled = true;

        // Simulate processing delay
        setTimeout(() => {
            btn.classList.remove('loading');
            btn.disabled = false;
            showToast();
            console.log(`Exported ${format} successfully with mock content.`);
        }, 1500);
    }

    // --- EVENT LISTENERS ---

    // 1. Analytics Export -> Opens Modal
    exportAnalyticsBtn.addEventListener('click', () => {
        exportModal.classList.remove('hidden');
    });

    // Modal Format Selection
    document.querySelectorAll('.export-opt').forEach(opt => {
        opt.addEventListener('click', () => {
            const format = opt.innerText;
            exportModal.classList.add('hidden');
            processExport(exportAnalyticsBtn, format);
        });
    });

    // 2. Direct PDF Exports (Narrative & Results)
    directPdfBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            processExport(btn, "PDF");
        });
    });

    // 3. Audit Log Download
    exportAuditBtn.addEventListener('click', () => {
        processExport(exportAuditBtn, "CSV");
    });

    // --- VIEW DETAILS MODAL ---
    document.getElementById('viewAnalyticsBtn').onclick = () => analyticsModal.classList.remove('hidden');
    document.getElementById('closeAnalytics').onclick = () => analyticsModal.classList.add('hidden');
    document.getElementById('closeExport').onclick = () => exportModal.classList.add('hidden');

    // --- AUDIT TABLE LOGIC ---
    function renderTable(data) {
        tableBody.innerHTML = data.map(item => `
            <tr class="hover:bg-blue-50/50 transition">
                <td class="px-6 py-4 text-sm text-gray-600">${item.timestamp}</td>
                <td class="px-6 py-4 text-sm text-gray-800 font-medium">${item.admin}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${item.action}</td>
                <td class="px-6 py-4 text-sm text-gray-600 italic font-normal">${item.details}</td>
            </tr>
        `).join('') || `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-400">No logs found.</td></tr>`;
    }

    renderTable(auditData);

    // Filtering
    document.getElementById('applyFilterBtn').addEventListener('click', filterData);
    document.getElementById('auditSearch').addEventListener('input', filterData);
    document.getElementById('resetFilterBtn').onclick = () => {
        ['auditSearch','dateFrom','timeFrom','dateTo','timeTo'].forEach(id => document.getElementById(id).value = '');
        renderTable(auditData);
    };

    function filterData() {
        const term = document.getElementById('auditSearch').value.toLowerCase();
        const filtered = auditData.filter(item => 
            item.admin.toLowerCase().includes(term) || 
            item.action.toLowerCase().includes(term) || 
            item.details.toLowerCase().includes(term)
        );
        renderTable(filtered);
    }

    // --- LOGOUT ---
    const logoutModal = document.getElementById('logoutModal');
    document.getElementById('logoutBtn').onclick = () => logoutModal.classList.remove('hidden');
    document.getElementById('closeLogout').onclick = () => logoutModal.classList.add('hidden');
    document.getElementById('confirmLogout').onclick = () => window.location.href = "index.html";
});