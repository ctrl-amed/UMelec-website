import { auth, db } from './firebase.js'; 
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, query, where, getDoc, getDocs, doc 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    // --- DOM ELEMENTS ---
    const tableBody = document.getElementById('archiveTableBody');
    const viewModal = document.getElementById('viewModal');
    const exportPrompt = document.getElementById('exportPrompt');
    const toastOverlay = document.getElementById('toastOverlay');
    const successToast = document.getElementById('successToast');
    const logoutModal = document.getElementById('logoutModal');
    const sidebarLogoutBtn = document.getElementById('logoutBtn');
    const closeLogout = document.getElementById('closeLogout');
    const confirmLogout = document.getElementById('confirmLogout');
    const closeModal = document.getElementById('closeModal');

    let currentElection = null;

    // --- GLOBAL UI HELPERS ---
    window.openExportPrompt = () => exportPrompt?.classList.remove('hidden');
    window.closeExportPrompt = () => exportPrompt?.classList.add('hidden');
    
    window.closeToast = () => {
        toastOverlay?.classList.add('hidden');
        successToast?.classList.remove('toast-animate-center');
    };

    // --- 1. AUTH LISTENER & PROFILE INITIALIZATION ---
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            try {
                const userDoc = await getDoc(doc(db, "users", user.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    
                    // Update Profile UI
                    const nameDisplay = document.getElementById('userName');
                    const roleDisplay = document.getElementById('userRole');
                    if (nameDisplay) nameDisplay.textContent = `${userData.firstname || ''} ${userData.lastname || ''}`.trim() || user.email;
                    if (roleDisplay) roleDisplay.textContent = `${userData.college} - ${userData.role}`;

                    // Fetch Data for this college
                    fetchArchivedElections(userData.college);
                }
            } catch (error) {
                console.error("Error fetching profile:", error);
            }
        } else {
            window.location.href = "index.html"; // Redirect to login/landing
        }
    });

    // --- 2. FETCH ELECTIONS ---
    async function fetchArchivedElections(college) {
        if (tableBody) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="4" class="px-6 py-12 text-center">
                        <div class="flex flex-col items-center justify-center space-y-3">
                            <div class="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                            <p class="text-gray-500 text-sm font-bold animate-pulse">Fetching Archived Elections...</p>
                        </div>
                    </td>
                </tr>
            `;
        }

        try {
            const electionsRef = collection(db, "elections");
            const q = query(electionsRef, where("college", "==", college));
            const querySnapshot = await getDocs(q);
            const elections = [];
            querySnapshot.forEach((doc) => {
                elections.push({ id: doc.id, ...doc.data() });
            });
            renderTable(elections);
        } catch (error) {
            console.error("Error fetching archive:", error);
        }
    }

    // --- 3. RENDER MAIN TABLE ---
    function renderTable(elections) {
        if (!tableBody) return;
        if (elections.length === 0) {
            tableBody.innerHTML = `<tr><td colspan="4" class="px-6 py-10 text-center text-gray-500 italic">No archived records found.</td></tr>`;
            return;
        }
        tableBody.innerHTML = elections.map(election => {
            const start = election.startDate?.toDate ? election.startDate.toDate().toLocaleDateString() : (election.startDate || 'N/A');
            const end = election.endDate?.toDate ? election.endDate.toDate().toLocaleDateString() : (election.endDate || 'N/A');
            return `
                <tr class="hover:bg-blue-50 transition border-b border-gray-100">
                    <td class="px-6 py-4 text-sm font-medium text-gray-700">${election.electionName || election.title}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${start}</td>
                    <td class="px-6 py-4 text-sm text-gray-600">${end}</td>
                    <td class="px-6 py-4 text-center">
                        <button class="view-btn text-blue-600 font-bold hover:underline text-sm" data-id="${election.id}">
                            View
                        </button>
                    </td>
                </tr>
            `;
        }).join('');

        document.querySelectorAll('.view-btn').forEach(btn => {
            btn.onclick = () => {
                const selected = elections.find(e => e.id === btn.dataset.id);
                openArchiveModal(selected);
            };
        });
    }

    // --- 4. OPEN MODAL & ANALYTICS ---
    window.openArchiveModal = async (election) => {
        currentElection = election;
        viewModal.classList.remove('hidden');
        document.getElementById('modalTitle').innerText = election.electionName || election.title;
        const container = document.getElementById('demographicsContent');
        container.innerHTML = `<div class="text-center py-10 font-bold text-gray-400 animate-pulse">Calculating real-time analytics...</div>`;

        try {
            const [userSnap, voteSnap, candSnap] = await Promise.all([
                getDocs(query(collection(db, "users"), where("college", "==", election.college))),
                getDocs(query(collection(db, "votes"), where("electionId", "==", election.id))),
                getDocs(query(collection(db, "candidates"), where("electionId", "==", election.id)))
            ]);

            const allVotesDocs = voteSnap.docs.map(d => ({ id: d.id, ...d.data() }));
            
            const yearData = [
                { label: "1st Year", count: 0, color: "bg-blue-500" },
                { label: "2nd Year", count: 0, color: "bg-orange-500" },
                { label: "3rd Year", count: 0, color: "bg-emerald-500" },
                { label: "4th Year", count: 0, color: "bg-red-500" }
            ];

            let totalStudents = 0;
            userSnap.forEach(doc => {
                const d = doc.data();
                if (d.role === 'LEADER' || d.role === 'COSEL') return;
                totalStudents++;
                const y = d.year ? d.year.toString() : "";
                if (y.includes("1")) yearData[0].count++;
                else if (y.includes("2")) yearData[1].count++;
                else if (y.includes("3")) yearData[2].count++;
                else if (y.includes("4")) yearData[3].count++;
            });

            const totalVoted = allVotesDocs.length;
            const turnoutPerc = totalStudents > 0 ? Math.round((totalVoted / totalStudents) * 100) : 0;

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
                    name: cData.fullName || cData.name || "Unknown Candidate", 
                    position: cData.positionName || "Unknown Position", 
                    votes: voteCount 
                };
            });

            const uniquePositions = [...new Set(candidates.map(c => c.position))];
            const groupedResults = uniquePositions.map(pos => {
                const filtered = candidates.filter(c => c.position === pos).sort((a, b) => b.votes - a.votes);
                return { position: pos, winner: filtered[0]?.name || "N/A", list: filtered };
            });

            container.innerHTML = `
                <div id="captureArea" class="bg-white p-4">
                    <div id="voterAnalyticsCapture" class="grid grid-cols-1 md:grid-cols-2 gap-8 items-start mb-8">
                        <div class="flex flex-col items-center">
                            <div class="relative w-32 h-32 mb-4">
                                <svg viewBox="0 0 36 36" class="w-full h-full transform -rotate-90">
                                    <circle cx="18" cy="18" r="16" fill="none" class="stroke-gray-100" stroke-width="4"></circle>
                                    <circle cx="18" cy="18" r="16" fill="none" class="stroke-emerald-400" stroke-width="4" stroke-dasharray="${turnoutPerc}, 100"></circle>
                                </svg>
                                <div class="absolute inset-0 flex items-center justify-center font-bold text-xl turnout-number">${turnoutPerc}%</div>
                            </div>
                            <div class="w-full space-y-2">
                                <div class="flex justify-between p-3 bg-gray-50 rounded-xl text-xs font-bold">
                                    <span class="text-gray-500">Voted</span><span class="text-emerald-500">${turnoutPerc}%</span>
                                </div>
                                <div class="flex justify-between p-3 bg-gray-50 rounded-xl text-xs font-bold text-gray-500">
                                    <span>Not Voted</span><span>${100 - turnoutPerc}%</span>
                                </div>
                            </div>
                        </div>
                        <div class="space-y-4">
                            <h5 class="text-xs font-bold text-gray-400 uppercase tracking-widest">Year Level Participation</h5>
                            ${yearData.map(item => `
                                <div class="space-y-1 year-row">
                                    <div class="flex justify-between text-xs font-bold text-gray-600">
                                        <span class="year-label">${item.label}</span><span class="year-count">${item.count} Students</span>
                                    </div>
                                    <div class="w-full bg-gray-100 rounded-full h-2">
                                        <div class="${item.color} h-2 rounded-full year-bar" style="width: ${totalStudents > 0 ? (item.count/totalStudents)*100 : 0}%"></div>
                                    </div>
                                </div>
                            `).join('')}
                            <p class="text-center text-[10px] font-bold text-gray-400 mt-2">Total Population: ${totalStudents}</p>
                        </div>
                    </div>

                    <div class="mt-8 border-t pt-8">
                        <h5 class="text-sm font-bold text-gray-800 mb-3">Verified Election Summary</h5>
                        <table class="w-full border-collapse border border-gray-200 text-sm mb-6">
                            <thead class="bg-gray-50 text-gray-600">
                                <tr><th class="border border-gray-200 px-4 py-2 text-left">Winner</th><th class="border border-gray-200 px-4 py-2 text-left">Position</th></tr>
                            </thead>
                            <tbody>
                                ${groupedResults.map(r => `<tr><td class="border border-gray-200 px-4 py-2 font-medium text-gray-700">${r.winner}</td><td class="border border-gray-200 px-4 py-2">${r.position}</td></tr>`).join('')}
                            </tbody>
                        </table>

                        ${groupedResults.map(res => `
                            <div class="mb-6">
                                <h6 class="text-xs font-bold text-blue-600 mb-2 uppercase tracking-wide">${res.position} Breakdown</h6>
                                <table class="w-full border-collapse border border-gray-200 text-sm">
                                    <thead class="bg-gray-50">
                                        <tr><th class="border border-gray-200 px-4 py-2 text-left">Candidate</th><th class="border border-gray-200 px-4 py-2 text-right">Votes</th></tr>
                                    </thead>
                                    <tbody>
                                        ${res.list.map(c => `<tr><td class="border border-gray-200 px-4 py-2">${c.name}</td><td class="border border-gray-200 px-4 py-2 text-right font-bold">${c.votes.toLocaleString()}</td></tr>`).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `).join('')}
                    </div>
                </div>
            `;
        } catch (e) {
            console.error(e);
            container.innerHTML = `<p class="text-red-500 text-center py-10">Error loading archived analytics.</p>`;
        }
    };

    // --- 5. EXPORT ROUTING ---
    window.confirmDownload = async (type) => { 
        window.closeExportPrompt(); 
        if (!currentElection) return;
        
        await ensureHtml2PdfLoaded();

        if (type === 'excel') downloadVoterTurnoutExcel();
        else if (type === 'pdf') downloadVoterTurnoutPDF();
        else if (type === 'official') downloadOfficialResultsPDF(); 
        else if (type === 'narrative') downloadCandidateNarrativePDF(); 
        
        showToast(); 
    };

    function ensureHtml2PdfLoaded() {
        return new Promise((resolve) => {
            if (typeof html2pdf !== 'undefined') resolve();
            else {
                const script = document.createElement('script');
                script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
                script.onload = () => resolve();
                document.head.appendChild(script);
            }
        });
    }

    // --- 6. OFFICIAL RESULTS PDF ---
    async function downloadOfficialResultsPDF() {
        const title = currentElection.electionName || currentElection.title;
        const captureArea = document.getElementById('captureArea');
        const resultsSection = captureArea.cloneNode(true);
        resultsSection.querySelector('#voterAnalyticsCapture')?.remove();

        const pdfWrapper = document.createElement('div');
        pdfWrapper.style.padding = "50px";
        pdfWrapper.style.fontFamily = "Arial, sans-serif";
        pdfWrapper.innerHTML = `
            <div style="text-align: center; border-bottom: 2px solid #000; padding-bottom: 10px; margin-bottom: 30px;">
                <h1 style="font-size: 26px; margin: 0; color: #1f2937;">Official Election Results</h1>
                <p style="margin: 0; color: #4b5563; font-weight: bold;">${title}</p>
                <p style="font-size: 12px; color: #666;">Commission on Student Election (COSEL)</p>
            </div>
            ${resultsSection.innerHTML}
            <div style="margin-top: 60px; display: flex; justify-content: space-between; padding: 0 20px;">
                <div style="text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">Election Chairperson</div>
                <div style="text-align: center; width: 220px; border-top: 1px solid #000; padding-top: 5px; font-weight: bold;">College Dean</div>
            </div>
        `;

        html2pdf().set({
            margin: 0.5,
            filename: `${title.replace(/\s+/g, '_')}_Official_Results.pdf`,
            html2canvas: { scale: 3 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        }).from(pdfWrapper).save();
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

    // --- 8. VOTER TURNOUT PDF ---
    async function downloadVoterTurnoutPDF() {
        const title = currentElection.electionName || currentElection.title;
        const college = currentElection.college || "N/A";
        
        const modalContainer = document.getElementById('demographicsContent');
        const yearRows = Array.from(modalContainer.querySelectorAll('.year-row'));
        
        const totalVotersFromRows = yearRows.reduce((sum, row) => {
            const countText = row.querySelector('.year-count').innerText;
            return sum + parseInt(countText.replace(/[^0-9]/g, '') || 0);
        }, 0);

        const turnoutStr = modalContainer.querySelector('.turnout-number')?.innerText.replace('%', '') || "0";
        const turnoutPerc = parseInt(turnoutStr);
        const notVotedPerc = 100 - turnoutPerc;

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
                        <circle cx="18" cy="18" r="16" fill="none" stroke="#10b981" stroke-width="3" stroke-dasharray="${turnoutPerc}, 100"></circle>
                    </svg>
                    <div style="position: absolute; top: 50%; left: 50%; transform: translate(-50%, -50%); font-size: 22px; font-weight: bold;">${turnoutPerc}%</div>
                </div>
                <div style="flex: 1;">
                    <h3 style="margin: 0; color: #10b981; font-size: 22px; font-weight: bold;">Verified Participation</h3>
                    <div style="display: flex; gap: 40px; margin-top: 10px;">
                        <div><span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; font-weight: bold;">Voted Students</span><span style="font-size: 18px; color: #10b981; font-weight: bold;">${turnoutPerc}%</span></div>
                        <div><span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; font-weight: bold;">Not Voted</span><span style="font-size: 18px; color: #9ca3af; font-weight: bold;">${notVotedPerc}%</span></div>
                        <div><span style="font-size: 11px; color: #6b7280; display: block; text-transform: uppercase; font-weight: bold;">Total Ballots</span><span style="font-size: 18px; color: #1f2937; font-weight: bold;">${totalVotersFromRows}</span></div>
                    </div>
                </div>
            </div>
            <h4 style="border-left: 4px solid #00537A; padding-left: 10px; color: #374151; text-transform: uppercase; font-size: 14px; margin-bottom: 20px; font-weight: bold;">Year Level Breakdown</h4>
            <div style="margin-bottom: 50px;">
                ${yearRows.map(row => {
                    const label = row.querySelector('.year-label').innerText;
                    const countVal = parseInt(row.querySelector('.year-count').innerText.replace(/[^0-9]/g, '') || 0);
                    const voterShare = totalVotersFromRows > 0 ? ((countVal / totalVotersFromRows) * 100).toFixed(1) : "0.0";
                    const barColor = window.getComputedStyle(row.querySelector('.year-bar')).backgroundColor;
                    return `
                        <div style="margin-bottom: 20px;">
                            <div style="display: flex; justify-content: space-between; font-weight: bold; margin-bottom: 8px; font-size: 14px;">
                                <span style="color: #4b5563;">${label} (${voterShare}%)</span>
                                <span style="color: #111827;">${countVal} Voters</span>
                            </div>
                            <div style="background: #f3f4f6; height: 10px; border-radius: 10px; width: 100%;">
                                <div style="width: ${voterShare}%; background: ${barColor}; height: 10px; border-radius: 10px;"></div>
                            </div>
                        </div>`;
                }).join('')}
            </div>
        `;

        html2pdf().set({
            margin: 0.5,
            filename: `${title.replace(/\s+/g, '_')}_Turnout_Report.pdf`,
            html2canvas: { scale: 3 },
            jsPDF: { unit: 'in', format: 'letter', orientation: 'portrait' }
        }).from(pdfWrapper).save();
    }

    // --- 9. VOTER TURNOUT EXCEL (CSV) ---
    function downloadVoterTurnoutExcel() {
        const title = currentElection.electionName || currentElection.title;
        let csv = "Category,Value\n";
        csv += "Overall Participation Rate," + document.querySelector('.turnout-number').innerText + "\n\n";
        csv += "Year Level,Voter Count\n";
        
        document.querySelectorAll('.year-row').forEach(row => {
            const label = row.querySelector('.year-label').innerText;
            const count = row.querySelector('.year-count').innerText.replace(' Students', '');
            csv += `"${label}","${count}"\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.setAttribute("href", URL.createObjectURL(blob));
        link.setAttribute("download", `${title.replace(/\s+/g, '_')}_Turnout_Data.csv`);
        link.click();
    }

    function showToast() {
        toastOverlay?.classList.remove('hidden');
        successToast?.classList.add('toast-animate-center');
        setTimeout(window.closeToast, 3000);
    }

    // --- MODAL & LOGOUT LISTENERS ---
    if (closeModal) closeModal.onclick = () => viewModal.classList.add('hidden');
    
    if (sidebarLogoutBtn) {
        sidebarLogoutBtn.onclick = () => logoutModal.classList.remove('hidden');
    }
    
    if (closeLogout) closeLogout.onclick = () => logoutModal.classList.add('hidden');
    
    if (confirmLogout) {
        confirmLogout.onclick = async () => {
            try {
                await signOut(auth);
                window.location.href = "index.html";
            } catch (err) {
                console.error("Logout error:", err);
            }
        };
    }
});