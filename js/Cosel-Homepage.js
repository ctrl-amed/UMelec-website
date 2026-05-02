import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    collection, 
    onSnapshot, 
    query, 
    where, 
    getDocs,
    doc,
    orderBy
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// --- Global State ---
let electionsDB = [];
let currentFilterStatus = 'all';

// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateElem = document.getElementById('current-date');
    if(dateElem) dateElem.innerText = new Date().toLocaleDateString('en-US', dateOptions);

    auth.onAuthStateChanged(user => {
        if (!user) {
            window.location.href = "index.html";
        } else {
            startListeners();
        }
    });

    const searchInput = document.getElementById('search-input');
    if(searchInput) {
        searchInput.addEventListener('input', (e) => {
            renderColleges(e.target.value, currentFilterStatus);
        });
    }
});

function getEffectiveStatus(election) {
    if (election.status === 'pending') return 'pending';
    const now = new Date();
    let isExpired = false;
    if (election.endDate) {
        const end = election.endDate.toDate ? election.endDate.toDate() : new Date(election.endDate);
        isExpired = now > end;
    }
    if (isExpired || election.status === 'completed' || election.status === 'OFFICIAL') return 'completed';
    return election.status; 
}

function startListeners() {
    onSnapshot(collection(db, "elections"), (snapshot) => {
        electionsDB = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        updateStats(electionsDB);
        renderImmediateAction();
        renderColleges(document.getElementById('search-input').value || '', currentFilterStatus);
    });

    onSnapshot(collection(db, "users"), (snapshot) => {
        const countDisplay = document.querySelector('div:has(i.fa-user-friends) + div');
        if (countDisplay) countDisplay.innerText = snapshot.size.toString().padStart(2, '0');
    });
}

window.openStatModal = async (type) => {
    const modal = document.getElementById('statModal');
    const title = document.getElementById('statModalTitle');
    const subtitle = document.getElementById('statModalSubtitle');
    const list = document.getElementById('statModalList');
    
    list.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i></div>`;
    modal.classList.remove('hidden');

    let displayData = [];

    if (type === 'users') {
        title.innerText = "Registered Users";
        subtitle.innerText = "System-wide user accounts";
        try {
            const snap = await getDocs(collection(db, "users"));
            displayData = snap.docs.map(doc => {
                const userData = doc.data();
                
                // CALLING THE EXACT FIREBASE FIELDS: firstname lastname
                const fname = userData.firstname || "";
                const lname = userData.lastname || "";
                const fullName = `${fname} ${lname}`.trim();
                
                // CONVERT EMAIL TO LOWERCASE
                const email = (userData.email || "no email").toLowerCase();

                return { 
                    primary: fullName || "Unknown User", 
                    secondary: email,
                    tag: (userData.role || 'USER').toUpperCase(),
                    color: 'text-blue-500'
                };
            });
        } catch (e) { console.error(e); }
    } else {
        const mapping = {
            'pending': { t: 'Pending Approvals', s: 'Awaiting review' },
            'ongoing': { t: 'Ongoing Elections', s: 'Active voting sessions' },
            'completed': { t: 'Completed Elections', s: 'Finished/Official results' }
        };
        title.innerText = mapping[type].t;
        subtitle.innerText = mapping[type].s;
        displayData = electionsDB.filter(e => getEffectiveStatus(e) === type).map(e => ({
            primary: e.title, secondary: e.college, tag: type.toUpperCase(),
            color: type === 'pending' ? 'text-red-500' : (type === 'ongoing' ? 'text-emerald-500' : 'text-gray-400')
        }));
    }

    renderStatList(displayData);
    document.getElementById('modal-search').oninput = (e) => {
        const query = e.target.value.toLowerCase();
        renderStatList(displayData.filter(item => 
            item.primary.toLowerCase().includes(query) || 
            item.secondary.toLowerCase().includes(query)
        ));
    };
};

function renderStatList(data) {
    const list = document.getElementById('statModalList');
    if (data.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-400 py-10">No records found.</p>`;
        return;
    }
    list.innerHTML = data.map(item => `
        <div class="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm hover:border-blue-200 transition-all">
            <div class="flex flex-col">
                <span class="font-bold text-gray-800 text-sm">${item.primary}</span>
                <span class="text-[10px] text-gray-400 font-medium lowercase tracking-wider">${item.secondary}</span>
            </div>
            <span class="text-[9px] font-black uppercase ${item.color}">${item.tag}</span>
        </div>
    `).join('');
}

function updateStats(data) {
    const pendingCount = data.filter(e => e.status === 'pending').length;
    const ongoingCount = data.filter(e => getEffectiveStatus(e) === 'ongoing').length;
    const completedCount = data.filter(e => getEffectiveStatus(e) === 'completed').length;
    const statBoxes = document.querySelectorAll('.inline-block.w-max.px-5.py-1\\.5');
    if(statBoxes[0]) statBoxes[0].innerText = pendingCount.toString().padStart(2, '0');
    if(statBoxes[1]) statBoxes[1].innerText = ongoingCount.toString().padStart(2, '0');
    if(statBoxes[3]) statBoxes[3].innerText = completedCount.toString().padStart(2, '0');
}

function renderImmediateAction() {
    const list = document.getElementById('immediate-action-list');
    if(!list) return;
    const pendingItems = electionsDB.filter(e => e.status === 'pending');
    if (pendingItems.length === 0) {
        list.innerHTML = `<p class="text-center text-gray-400 text-xs py-4">No pending approvals needed.</p>`;
        return;
    }
    list.innerHTML = pendingItems.map(e => `
        <div class="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
            <span class="font-bold text-gray-700 text-sm">${e.title}</span>
            <span class="text-[10px] font-black uppercase text-red-600">Pending</span>
        </div>
    `).join('');
}

function renderColleges(queryText, status) {
    const container = document.getElementById('college-grid');
    if(!container) return;
    container.innerHTML = '';
    const lowerQuery = (queryText || '').trim().toLowerCase(); 
    const validElections = electionsDB.filter(e => e.college && typeof e.college === 'string');
    const uniqueColleges = [...new Set(validElections.map(item => item.college))];

    uniqueColleges.forEach(college => {
        const matchingElections = validElections.filter(e => {
            const effectiveStatus = getEffectiveStatus(e);
            const titleMatches = (e.title || "").toLowerCase().includes(lowerQuery);
            const statusMatches = status === 'all' || effectiveStatus === status;
            return e.college === college && statusMatches && (titleMatches || college.toLowerCase().includes(lowerQuery));
        });

        if (matchingElections.length > 0) {
            const collegeDiv = document.createElement('div');
            collegeDiv.className = "space-y-3";
            let html = `
                <div class="bg-blue-gradient p-3 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">${college}</div>
                <div class="grid grid-cols-3 text-[9px] font-black text-gray-400 uppercase px-3">
                    <span>Election Title</span><span class="text-center">Status</span><span class="text-right">Action</span>
                </div>
                <div class="space-y-2">`;
            html += matchingElections.map(e => {
                const effectiveStatus = getEffectiveStatus(e);
                let color = effectiveStatus === 'completed' ? 'text-gray-400' : (effectiveStatus === 'pending' ? 'text-red-500' : 'text-emerald-500');
                return `
                <div class="grid grid-cols-3 items-center bg-white p-3 rounded-xl border border-gray-100">
                    <span class="text-xs font-bold text-gray-700 truncate pr-2">${e.title || 'Untitled'}</span>
                    <div class="text-center"><span class="text-[9px] font-black uppercase ${color}">${effectiveStatus === 'completed' ? 'OFFICIAL' : effectiveStatus.toUpperCase()}</span></div>
                    <div class="text-right"><button onclick="viewCandidates('${e.id}', '${college.replace(/'/g, "\\'")}', '${(e.title || 'Untitled').replace(/'/g, "\\")}')" class="text-[10px] font-black text-blue-500 hover:underline">VIEW CANDIDATES</button></div>
                </div>`;
            }).join('');
            collegeDiv.innerHTML = html + `</div>`;
            container.appendChild(collegeDiv);
        }
    });
}

window.viewCandidates = async (electionId, collegeName, electionTitle) => {
    const modal = document.getElementById('candidatesModal');
    const list = document.getElementById('candidatesList');
    document.getElementById('modalCollegeName').innerText = collegeName;
    document.getElementById('modalElectionTitle').innerText = electionTitle;
    list.innerHTML = `<div class="text-center py-10"><i class="fas fa-spinner fa-spin text-blue-500 text-2xl"></i></div>`;
    modal.classList.remove('hidden');

    try {
        const posSnap = await getDocs(query(collection(db, "positions"), where("electionId", "==", electionId), orderBy("createdAt", "asc")));
        const candSnap = await getDocs(query(collection(db, "candidates"), where("electionId", "==", electionId)));
        const orderedPositionNames = posSnap.docs.map(doc => doc.data().positionName);
        const data = candSnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));

        if (data.length === 0) {
            list.innerHTML = `<p class="text-center text-gray-500 italic py-10">No candidates registered yet.</p>`;
            return;
        }

        const grouped = data.reduce((acc, obj) => {
            const posKey = obj.positionName || obj.position || "OTHER"; 
            if (!acc[posKey]) acc[posKey] = [];
            acc[posKey].push(obj);
            return acc;
        }, {});

        list.innerHTML = orderedPositionNames.map(pos => {
            const members = grouped[pos] || [];
            if (members.length === 0) return ''; 
            return `
                <div class="mb-14 last:mb-0">
                    <h5 class="text-center text-blue-500 font-black uppercase text-[10px] tracking-[0.25em] mb-10 flex items-center justify-center">
                        <span class="h-px w-10 bg-blue-100 mr-4"></span>${pos}<span class="h-px w-10 bg-blue-100 ml-4"></span>
                    </h5>
                    <div class="flex flex-wrap justify-center gap-x-12 gap-y-10">
                        ${members.map(m => `
                            <div class="text-center w-32">
                                <div class="w-24 h-24 rounded-full border-4 border-white ring-1 ring-gray-100 overflow-hidden mx-auto mb-4 shadow-md">
                                    <img src="${m.photoURL || 'https://cdn-icons-png.flaticon.com/512/149/149071.png'}" class="w-full h-full object-cover">
                                </div>
                                <p class="font-bold text-gray-800 text-sm leading-tight">${m.name || 'Anonymous'}</p>
                            </div>`).join('')}
                    </div>
                </div>`;
        }).join('');
    } catch (err) { console.error(err); }
};

window.confirmLogout = async () => { await signOut(auth); window.location.href = "index.html"; };
window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');
window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
window.toggleFilterMenu = () => document.getElementById('filter-dropdown').classList.toggle('show');
window.applyFilter = (status) => {
    currentFilterStatus = status;
    document.getElementById('filter-dropdown').classList.remove('show');
    renderColleges(document.getElementById('search-input').value, status);
};