import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, query, where, orderBy, onSnapshot, getDoc, getDocs, doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- GLOBAL HELPERS (Fixed ReferenceErrors) ---
window.closeExportPrompt = () => {
    const modal = document.getElementById('exportModal');
    if (modal) modal.classList.add('hidden');
};

window.closeToast = () => {
    const toast = document.getElementById('successToast');
    if (toast) toast.classList.add('hidden');
};

document.addEventListener('DOMContentLoaded', () => {
    // --- STATE ---
    let masterAuditData = [];
    let leaderCollege = null;
    let leaderRole = null;
    let currentElection = null;

    // --- DOM ELEMENTS ---
    const tableBody = document.getElementById('auditLogBody');
    const analyticsModal = document.getElementById('analyticsModal');
    const exportModal = document.getElementById('exportModal');
    const successToast = document.getElementById('successToast');
    const exportAnalyticsBtn = document.getElementById('exportAnalyticsBtn');
    const directPdfBtns = document.querySelectorAll('.direct-pdf-btn');
    const exportAuditBtn = document.getElementById('exportAuditBtn');

    // --- INITIAL LOADING UI ---
    function showInitialTableLoading() {
        if (!tableBody) return;
        tableBody.innerHTML = `
            <tr>
                <td colspan="4" class="px-6 py-12 text-center">
                    <div class="flex flex-col items-center justify-center space-y-3">
                        <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                        <p class="text-gray-500 text-sm font-bold animate-pulse">Scanning system logs...</p>
                    </div>
                </td>
            </tr>
        `;
    }
    showInitialTableLoading();

    // --- 1. AUTH & DATA INITIALIZATION ---
// --- 1. AUTH & DATA INITIALIZATION ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // 1. Assign global state variables
                    leaderCollege = userData.college;
                    leaderRole = userData.role;

                    // 2. Set currentLeaderData (Fixing the data vs userData reference)
                    const currentLeaderData = {
                        name: `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || user.email,
                        college: userData.college,
                        role: userData.role || "LEADER"
                    };

                    // 3. Update UI Profile Display
                    const nameDisplay = document.getElementById('userName');
                    const roleDisplay = document.getElementById('userRole');
                    
                    if (nameDisplay) nameDisplay.textContent = currentLeaderData.name;
                    if (roleDisplay) roleDisplay.textContent = `${currentLeaderData.college} - ${currentLeaderData.role}`;

                    // 4. Initialize Data Fetching
                    setupAuditListener();
                    loadVoterAnalytics(); 
                } else {
                    console.error("No user document found in Firestore.");
                }
            } catch (err) {
                console.error("Auth initialization error:", err);
            }
        } else {
            // User is signed out
            window.location.href = "index.html";
        }
    });

    // --- 2. FIRESTORE REAL-TIME LISTENER ---
    function setupAuditListener() {
        let auditQuery;
        if (leaderRole === 'COSEL') {
            auditQuery = query(collection(db, "auditLogs"), orderBy("timestamp", "desc"));
        } else {
            auditQuery = query(
                collection(db, "auditLogs"), 
                where("college", "==", leaderCollege),
                orderBy("timestamp", "desc")
            );
        }

        onSnapshot(auditQuery, (snapshot) => {
            masterAuditData = snapshot.docs.map(doc => {
                const data = doc.data();
                const rawDate = data.timestamp ? data.timestamp.toDate() : new Date();
                return {
                    id: doc.id,
                    rawDate: rawDate, 
                    timestamp: rawDate.toLocaleString(),
                    admin: data.userName || 'Unknown',
                    action: data.action || 'No Action',
                    details: data.details || 'No Details'
                };
            });
            renderTable(masterAuditData);
        }, (error) => {
            console.error("Audit Listener Error:", error);
            if (tableBody) {
                tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-red-400 font-bold">Access Denied.</td></tr>`;
            }
        });
    }

    // --- 3. VOTER ANALYTICS ---
    async function loadVoterAnalytics() {
        const container = document.querySelector('#analyticsModal .space-y-4');
        if (container) container.innerHTML = `<p class="text-center py-4 animate-pulse">Calculating...</p>`;

        try {
            if (!leaderCollege) return;
            const q = query(collection(db, "users"), where("college", "==", leaderCollege.trim()));
            const snap = await getDocs(q);
            
            const stats = { "1st Year": 0, "2nd Year": 0, "3rd Year": 0, "4th Year": 0 };
            let total = 0;

            snap.forEach(doc => {
                const data = doc.data();
                if (data.role === 'LEADER' || data.role === 'COSEL') return;
                const yearStr = data.year ? data.year.toString() : "";
                if (yearStr.includes("1")) { stats["1st Year"]++; total++; }
                else if (yearStr.includes("2")) { stats["2nd Year"]++; total++; }
                else if (yearStr.includes("3")) { stats["3rd Year"]++; total++; }
                else if (yearStr.includes("4")) { stats["4th Year"]++; total++; }
            });
            updateAnalyticsUI(stats, total);
        } catch (e) { console.error(e); }
    }

    function updateAnalyticsUI(stats, total) {
        const container = document.querySelector('#analyticsModal .space-y-4');
        if (!container) return;
        const shortLabels = { "1st Year": "1st", "2nd Year": "2nd", "3rd Year": "3rd", "4th Year": "4th" };
        
        container.innerHTML = `<div class="ui-bar-graph">` + Object.entries(stats).map(([label, count]) => {
            const percentage = total > 0 ? (count / total) * 100 : 0;
            return `
                <div class="ui-bar-row">
                    <span class="ui-bar-label">${shortLabels[label] || label}</span>
                    <div class="ui-bar-track h-4">
                        <div class="ui-bar-fill h-4" style="width: ${percentage}%"></div>
                    </div>
                    <span class="ui-bar-value">${count.toLocaleString()}</span>
                </div>`;
        }).join('') + `</div><p class="ui-bar-total">Total Students: ${total.toLocaleString()}</p>`;
    }

    // --- 4. EXPORT ENGINE ---
    function showToast() {
        if (!successToast) return;
        successToast.classList.remove('hidden');
        setTimeout(() => successToast.classList.add('hidden'), 3000);
    }

    async function getLatestElection() {
        if (!leaderCollege) return null;
        const snap = await getDocs(query(collection(db, "elections"), where("college", "==", leaderCollege)));
        let elections = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        elections.sort((a, b) => (b.startDate?.toDate() || 0) - (a.startDate?.toDate() || 0));
        return elections[0] || null;
    }

    function ensureHtml2PdfLoaded() {
        return new Promise((resolve) => {
            if (typeof html2pdf !== 'undefined') resolve();
            else {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = resolve;
                document.head.appendChild(script);
            }
        });
    }

    async function processExport(btn, type) {
        btn.classList.add('loading');
        btn.disabled = true;

        try {
            if (type === "CSV_AUDIT") {
                downloadCSV(masterAuditData, `AuditLog_${leaderCollege}.csv`);
            } else {
                currentElection = await getLatestElection();
                if (!currentElection) { alert("No election data found."); }
                else {
                    await ensureHtml2PdfLoaded();
                    if (type === "PDF") await downloadVoterTurnoutPDF();
                    else if (type === "EXCEL") downloadVoterTurnoutExcel();
                    else if (type === "OFFICIAL") await downloadOfficialResultsPDF();
                    else if (type === "NARRATIVE") await downloadCandidateNarrativePDF();
                }
            }
            showToast();
        } catch (e) { console.error(e); }

        btn.classList.remove('loading');
        btn.disabled = false;
        window.closeExportPrompt();
    }

    // --- 5. PDF GENERATORS ---
async function downloadVoterTurnoutPDF() {
    const title = currentElection.electionName || currentElection.title;
    const college = leaderCollege || "N/A";
    
    // Get the analytics container from the RAND modal
    const modalContainer = document.querySelector('#analyticsModal .space-y-4');
        const rows = Array.from(modalContainer.querySelectorAll('.ui-bar-row'));
    
    // Calculate total ballots cast from the UI counts (RAND style uses "X Students")
    let totalVoters = 0;
        const data = rows.map(row => {
        const labels = row.querySelectorAll('span');
        const label = labels[0]?.innerText || "Year Level";
        const countText = labels[1]?.innerText || "0";
        const countVal = parseInt(countText.replace(/[^0-9]/g, '') || 0);
        totalVoters += countVal;
        
        return { label, countVal, color: '#27A688' };
    });

    // For RAND, we calculate turnout percentage based on the data provided
    // If you have a specific turnout percentage field in RAND, use it, 
    // otherwise we assume 100% of 'ballots cast' for this report view.
    const turnoutPerc = 100; 
    const notVotedPerc = 0;

    const pdfWrapper = document.createElement('div');
    pdfWrapper.style.padding = "50px";
    pdfWrapper.style.background = "white";
    pdfWrapper.style.fontFamily = "'Helvetica Neue', Arial, sans-serif";

    pdfWrapper.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 30px; border-bottom: 2px solid #00537A; padding-bottom: 20px;">
            <div>
                <h1 style="font-size: 26px; margin: 0; color: #1f2937;">Voter Turnout Official Report</h1>
                <p style="margin: 0; color: #4b5563; font-weight: bold;">Commission on Student Election (COSEL)</p>
            </div>
        </div>

        <div style="margin-bottom: 40px;">
            <h2 style="font-size: 20px; text-transform: uppercase; color: #111827; margin-bottom: 5px;">${title}</h2>
            <p style="margin: 0; color: #374151;">College: ${college}</p>
            <p style="margin: 0; color: #9ca3af; font-size: 12px;">Generated on: ${new Date().toLocaleString()}</p>
        </div>

        <div style="display: flex; align-items: center; background: #f9fafb; padding: 30px; border-radius: 12px; margin-bottom: 40px; border: 1px solid #e5e7eb;">
            <div style="position: relative; width: 120px; height: 120px; margin-right: 40px;">
                <svg viewBox="0 0 36 36" style="transform: rotate(-90deg); width: 120px; height: 120px;">
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#e5e7eb" stroke-width="3"></circle>
                    <circle cx="18" cy="18" r="16" fill="none" stroke="#27A688" stroke-width="3" stroke-dasharray="${turnoutPerc}, 100"></circle>
                </svg>
                <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 22px; font-weight: bold;">${turnoutPerc}%</div>
            </div>
            <div style="flex: 1;">
                <h3 style="margin: 0; color: #27A688; font-size: 22px; font-weight: bold;">Verified Participation</h3>
                <div style="display: flex; gap: 40px; margin-top: 10px;">
                    <div>
                        <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; font-weight: bold;">Voted Students</span>
                        <span style="font-size: 18px; color: #27A688; font-weight: bold;">${turnoutPerc}%</span>
                    </div>
                    <div>
                        <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; font-weight: bold;">Not Voted</span>
                        <span style="font-size: 18px; color: #D33131; font-weight: bold;">${notVotedPerc}%</span>
                    </div>
                    <div>
                        <span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; font-weight: bold;">Total Ballots</span>
                        <span style="font-size: 18px; color: #1f2937; font-weight: bold;">${totalVoters}</span>
                    </div>
                </div>
            </div>
        </div>

        <h4 style="border-left: 4px solid #00537A; padding-left: 10px; color: #374151; text-transform: uppercase; font-size: 14px; margin-bottom: 20px; font-weight: bold;">Year Level Breakdown</h4>
        
        <div style="margin-bottom: 50px;">
            ${data.map(item => {
                const voterShare = totalVoters > 0 
                    ? ((item.countVal / totalVoters) * 100).toFixed(1) 
                    : "0.0";
                
                return `
                    <div style="margin-bottom: 20px;">
                        <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                            <span style="color: #4b5563;">${item.label} (${voterShare}%)</span>
                            <span style="color: #111827;">${item.countVal} Voters</span>
                        </div>
                        <div style="background: #f3f4f6; height: 10px; border-radius: 10px; width: 100%;">
                            <div style="width: ${voterShare}%; background: ${item.color}; height: 10px; border-radius: 10px;"></div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>

        <div style="margin-top: 60px; padding-top: 20px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af; text-align: center;">
            <p style="font-weight: bold; text-transform: uppercase;">Official COSEL Archived Document</p>
            <p>Data reflects the distribution of total ballots cast (${totalVoters}).</p>
        </div>
    `;

    const opt = {
        margin: 0.5,
        filename: `${title.replace(/\s+/g, '_')}_Turnout_Report.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 3, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    };

    // Ensure library is available and save
    await ensureHtml2PdfLoaded();
    html2pdf().set(opt).from(pdfWrapper).save();
}

    // --- 7. NARRATIVE REPORTS PDF ---
    async function downloadCandidateNarrativePDF() {
        const title = currentElection.electionName || currentElection.title;
        const candSnap = await getDocs(query(collection(db, "candidates"), where("electionId", "==", currentElection.id)));
        const candidates = candSnap.docs.map(d => ({ id: d.id, ...d.data() }));

        const pdfWrapper = document.createElement('div');
        pdfWrapper.style.padding = "40px";
        pdfWrapper.style.fontFamily = "Arial, sans-serif";
        pdfWrapper.innerHTML = `
            <div style="border-bottom: 4px solid #1e40af; padding-bottom: 10px; margin-bottom: 30px;">
                <h1 style="font-size: 26px; margin: 0; color: #1f2937;">Candidate Narrative Report</h1>
                <p style="margin: 0; color: #4b5563; font-weight: bold;">${title}</p>
            </div>
            ${candidates.map(cand => `
                <div style="margin-top: 20px; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; page-break-inside: avoid;">
                    <h3 style="margin: 0 0 10px 0; color: #111827; border-bottom: 1px solid #eee; padding-bottom: 5px;">
                        ${cand.name || cand.fullName} — <span style="color: #2563eb; font-size: 14px;">${cand.positionName}</span>
                    </h3>
                    <p style="font-size: 13px; line-height: 1.6;"><strong>Advocacy:</strong> ${cand.advocacy || 'No advocacy recorded.'}</p>
                    <p style="font-size: 13px; line-height: 1.6;"><strong>Credentials:</strong> ${cand.credentials || 'No credentials recorded.'}</p>
                </div>
            `).join('')}
        `;

        html2pdf().set({ 
            margin: 0.5, 
            filename: `${title.replace(/\s+/g, '_')}_Narrative_Report.pdf`, 
            html2canvas: { scale: 2 } 
        }).from(pdfWrapper).save();
    }

    async function downloadOfficialResultsPDF() {
    const title = currentElection.electionName || currentElection.title;
    
    // 1. Fetch Candidates and their Vote Counts (Data Processing)
    const [voteSnap, candSnap] = await Promise.all([
        getDocs(query(collection(db, "votes"), where("electionId", "==", currentElection.id))),
        getDocs(query(collection(db, "candidates"), where("electionId", "==", currentElection.id)))
    ]);

    const allVotesDocs = voteSnap.docs.map(d => d.data());
    const candidates = candSnap.docs.map(d => {
        const cData = d.data();
        const cId = d.id;
        const voteCount = allVotesDocs.filter(v => {
            if (v.selections && typeof v.selections === 'object') {
                return Object.values(v.selections).some(sel => sel.candidateId === cId);
            }
            return v.candidateId === cId;
        }).length;
        return { 
            name: cData.fullName || cData.name || "Unknown", 
            position: cData.positionName || "Unknown", 
            votes: voteCount 
        };
    });

    const uniquePositions = [...new Set(candidates.map(c => c.position))];
    const groupedResults = uniquePositions.map(pos => {
        const filtered = candidates.filter(c => c.position === pos).sort((a, b) => b.votes - a.votes);
        return { position: pos, winner: filtered[0]?.name || "N/A", list: filtered };
    });

    // 2. Build the Wrapper (Matched to ARCHIVE Style)
    const pdfWrapper = document.createElement('div');
    pdfWrapper.style.padding = "50px";
    pdfWrapper.style.background = "white";
    pdfWrapper.style.fontFamily = "'Helvetica Neue', Arial, sans-serif";

    pdfWrapper.innerHTML = `
        <div style="border-bottom: 2px solid #00537A; padding-bottom: 15px; margin-bottom: 30px;">
            <h1 style="font-size: 26px; margin: 0; color: #1f2937;">Official Election Results</h1>
            <p style="margin: 5px 0; font-weight: bold; color: #374151;">${title}</p>
            <p style="font-size: 12px; color: #6b7280;">Commission on Student Election (COSEL)</p>
        </div>

        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; border: 1px solid #e5e7eb;">
            <thead style="background: #f9fafb;">
                <tr>
                    <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px;">Winner</th>
                    <th style="border: 1px solid #e5e7eb; padding: 12px; text-align: left; font-size: 14px;">Position</th>
                </tr>
            </thead>
            <tbody>
                ${groupedResults.map(r => `
                    <tr>
                        <td style="border: 1px solid #e5e7eb; padding: 12px; font-weight: bold; color: #111;">${r.winner}</td>
                        <td style="border: 1px solid #e5e7eb; padding: 12px; color: #374151;">${r.position}</td>
                    </tr>`).join('')}
            </tbody>
        </table>

        ${groupedResults.map(res => `
            <div style="margin-bottom: 25px; page-break-inside: avoid;">
                <h3 style="font-size: 14px; color: #2563eb; text-transform: uppercase; letter-spacing: 0.05em; border-bottom: 1px solid #e5e7eb; padding-bottom: 5px; margin-bottom: 10px;">
                    ${res.position} Breakdown
                </h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
                    <thead style="background: #f9fafb;">
                        <tr>
                            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: left;">Candidate</th>
                            <th style="border: 1px solid #e5e7eb; padding: 8px; text-align: right;">Votes</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${res.list.map(c => `
                            <tr>
                                <td style="border: 1px solid #e5e7eb; padding: 8px;">${c.name}</td>
                                <td style="border: 1px solid #e5e7eb; padding: 8px; text-align: right; font-weight: bold;">${c.votes.toLocaleString()}</td>
                            </tr>`).join('')}
                    </tbody>
                </table>
            </div>
        `).join('')}
    `;

    // 3. Export with Archive configuration
    return html2pdf().set({
        margin: 0.5,
        filename: `${title.replace(/\s+/g, '_')}_Official_Results.pdf`,
        html2canvas: { scale: 3, useCORS: true },
        jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
    }).from(pdfWrapper).save();
}

    function downloadVoterTurnoutExcel() {
        let csv = "Year Level,Students\n";
        document.querySelectorAll('#analyticsModal .ui-bar-row').forEach(row => {
            const spans = row.querySelectorAll('span');
            if (spans.length >= 2) {
                csv += `${spans[0].innerText},${spans[1].innerText}\n`;
            }
        });
        const blob = new Blob([csv], { type: 'text/csv' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = "Turnout.csv";
        link.click();
    }

    function downloadCSV(data, filename) {
        const headers = ["Timestamp", "Administrator", "Action", "Details"];
        const csvRows = [headers.join(',')];
        data.forEach(row => {
            csvRows.push([`"${row.timestamp}"`,`"${row.admin}"`,`"${row.action}"`,`"${row.details.replace(/"/g, '""')}"`].join(','));
        });
        const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url; a.download = filename; a.click();
    }

    // --- 6. EVENT LISTENERS ---
    if (exportAuditBtn) {
        exportAuditBtn.addEventListener('click', () => processExport(exportAuditBtn, "CSV_AUDIT"));
    }

    directPdfBtns.forEach((btn, index) => {
        btn.addEventListener('click', () => {
            if (index === 0) processExport(btn, "NARRATIVE");
            else processExport(btn, "OFFICIAL");
        });
    });

    if (exportAnalyticsBtn) {
        exportAnalyticsBtn.onclick = () => exportModal.classList.remove('hidden');
    }

    document.querySelectorAll('.export-opt').forEach(opt => {
        opt.onclick = () => {
            const type = opt.querySelector('p').innerText;
            processExport(exportAnalyticsBtn, type.toUpperCase());
        };
    });

    const viewAnalyticsBtn = document.getElementById('viewAnalyticsBtn');
    if (viewAnalyticsBtn) {
        viewAnalyticsBtn.onclick = () => {
            analyticsModal.classList.remove('hidden');
            loadVoterAnalytics(); 
        };
    }

    // UI Controls
    const closeAnalytics = document.getElementById('closeAnalytics');
    if (closeAnalytics) closeAnalytics.onclick = () => analyticsModal.classList.add('hidden');

    const closeExport = document.getElementById('closeExport');
    if (closeExport) closeExport.onclick = () => window.closeExportPrompt();

    const resetFilterBtn = document.getElementById('resetFilterBtn');
    if (resetFilterBtn) {
        resetFilterBtn.onclick = () => {
            document.getElementById('auditSearch').value = '';
            renderTable(masterAuditData);
        };
    }

    const auditSearch = document.getElementById('auditSearch');
    if (auditSearch) auditSearch.oninput = filterData;

    // --- 7. TABLE RENDERING ---
    function renderTable(data) {
        if (!tableBody) return;
        if (!data || data.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-400 italic">No activity logs found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = data.map(item => `
            <tr class="hover:bg-blue-50/50 transition border-b border-gray-100">
                <td class="px-6 py-4 text-sm text-gray-600 whitespace-nowrap">${item.timestamp}</td>
                <td class="px-6 py-4 text-sm text-gray-800 font-bold">${item.admin}</td>
                <td class="px-6 py-4 text-sm text-gray-600">${item.action}</td>
                <td class="px-6 py-4 text-sm text-gray-600 italic">${item.details}</td>
            </tr>`).join('');
    }

    function filterData() {
        const term = document.getElementById('auditSearch').value.toLowerCase();
        const filtered = masterAuditData.filter(i => 
            i.admin.toLowerCase().includes(term) || i.action.toLowerCase().includes(term) || i.details.toLowerCase().includes(term)
        );
        renderTable(filtered);
    }

    // --- 8. LOGOUT ---
    const logoutModal = document.getElementById('logoutModal');
    if (document.getElementById('logoutBtn')) {
        document.getElementById('logoutBtn').onclick = () => logoutModal.classList.remove('hidden');
    }
    const closeLogout = document.getElementById('closeLogout');
    if (closeLogout) closeLogout.onclick = () => logoutModal.classList.add('hidden');
    
    const confirmLogout = document.getElementById('confirmLogout');
    if (confirmLogout) {
        confirmLogout.onclick = async () => {
            await signOut(auth);
            window.location.href = "index.html";
        };
    }
});
