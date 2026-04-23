import { db } from './firebase.js';
import { 
    collection, addDoc, updateDoc, doc, deleteDoc, 
    onSnapshot, query, where, serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// 1. College Lists & Mappings
const colleges = [
    "College of Liberal Arts and Sciences (CLAS)", "College of Innovative Teacher Education (CITE)",
    "College of Human Kinetics (CHK)", "College of Engineering and Technology (CET)",
    "College of Tourism and Hospitality Management (CTHM)", "School of Law (SOL)",
    "College of Accountancy (IA)", "College of Business and Financial Science (CBFS)",
    "College of Governance and Public Policy (CGPP)", "College of Computing and Information Sciences (CCIS)",
    "College of Construction Sciences and Engineering (CCSE)", "Institute of Arts and Design (IAD)",
    "Institute of Nursing (ION)", "Institute of Health Sciences (IIHS)",
    "Institute for Social Development and Nation Building (ISDNB)", "Institute of Pharmacy (IOP)",
    "Institute of Psychology (IOPsy)", "Institute of Social Work (ISW)",
    "Institute of Technical Education and Skills Training (ITEST)", "Institute for Disaster and Emergency Management (IDEM)"
];

const collegeMap = {
    "College of Liberal Arts and Sciences (CLAS)": "CLAS",
    "College of Innovative Teacher Education (CITE)": "CITE",
    "College of Human Kinetics (CHK)": "CHK",
    "College of Engineering and Technology (CET)": "CET",
    "College of Tourism and Hospitality Management (CTHM)": "CTHM",
    "School of Law (SOL)": "SOL",
    "College of Accountancy (IA)": "IA",
    "College of Business and Financial Science (CBFS)": "CBFS",
    "College of Governance and Public Policy (CGPP)": "CGPP",
    "College of Computing and Information Sciences (CCIS)": "CCIS",
    "College of Construction Sciences and Engineering (CCSE)": "CCSE",
    "Institute of Arts and Design (IAD)": "IAD",
    "Institute of Nursing (ION)": "ION",
    "Institute of Health Sciences (IIHS)": "IIHS",
    "Institute for Social Development and Nation Building (ISDNB)": "ISDNB",
    "Institute of Pharmacy (IOP)": "IOP",
    "Institute of Psychology (IOPsy)": "IOPsy",
    "Institute of Social Work (ISW)": "ISW",
    "Institute of Technical Education and Skills Training (ITEST)": "ITEST",
    "Institute for Disaster and Emergency Management (IDEM)": "IDEM"
};

document.addEventListener('DOMContentLoaded', () => {
    let orgUsers = []; 
    let voters = [];   
    let currentTab = 'Org';
    let editingId = null;
    let originalData = null;
    let verificationFilter = 'all';
    let isInitialLoad = true; // NEW: Track first load

    // --- NEW: Loading UI Helper ---
    function renderLoadingState() {
        const body = document.getElementById('user-table-body');
        body.innerHTML = `
            <tr>
                <td colspan="6" class="px-6 py-20 text-center">
                    <div class="flex flex-col items-center justify-center space-y-4">
                        <div class="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
                        <p class="text-gray-500 font-bold animate-pulse uppercase tracking-widest text-[10px]">
                            Syncing User Database...
                        </p>
                    </div>
                </td>
            </tr>`;
    }

    // --- REAL-TIME SYNC ---
    function syncUserDatabase() {
        renderLoadingState(); // Show loader immediately
        
        onSnapshot(collection(db, "users"), (snapshot) => {
            const allUsers = snapshot.docs.map(doc => {
                const data = doc.data();
                const fName = data.firstName || data.firstname || "";
                const lName = data.lastName || data.lastname || "";
                const combinedName = (fName + " " + lName).trim();
                const resolvedName = data.name || combinedName || fName || "Unnamed User";
                const shortCollege = collegeMap[data.college] || data.college || "N/A";

                return {
                    id: doc.id,
                    ...data,
                    name: resolvedName,
                    firstName: fName || resolvedName.split(' ')[0], 
                    lastName: lName || resolvedName.split(' ')[1] || '', 
                    studentId: data.studentId || data.studentid || "N/A",
                    college: shortCollege, 
                    verification: (data.isVerified || data.verification === "Verified") ? "Verified" : "Unverified",
                    status: data.status || "Active"
                };
            });

            orgUsers = allUsers.filter(u => u.role === "LEADER");
            voters = allUsers.filter(u => u.role !== "LEADER");
            
            isInitialLoad = false; // Data has arrived
            renderTable();
        });
    }

    // --- TAB & HEADER LOGIC ---
    window.switchTab = (tab) => {
        currentTab = tab;
        verificationFilter = 'all';
        document.querySelectorAll('.status-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');
        
        const searchInput = document.getElementById('user-search');
        searchInput.value = '';
        searchInput.placeholder = tab === 'Org' ? "Search by Name or College" : "Search by Name, ID, or College";
        
        renderHeader();
        renderTable();
    };

    function renderHeader() {
        const header = document.getElementById('list-header-content');
        if (currentTab === 'Org') {
            header.innerHTML = `
                <h3 class="text-lg font-black text-gray-800 uppercase tracking-tight">Registered Organization</h3>
                <button onclick="openOrgModal()" class="w-10 h-10 bg-blue-gradient text-white rounded-xl flex items-center justify-center shadow-lg hover:scale-105 transition">
                    <i class="fas fa-plus"></i>
                </button>`;
        } else {
            header.innerHTML = `
                <h3 class="text-lg font-black text-gray-800 uppercase tracking-tight">Registered Voters</h3>
                <div class="relative">
                    <button onclick="toggleFilter()" class="flex items-center gap-2 px-4 py-2 bg-gray-50 border border-gray-100 rounded-xl text-[10px] font-black uppercase text-gray-500 hover:bg-gray-100 transition">
                        <i class="fas fa-filter"></i> Filter
                    </button>
                    <div id="filterDropdown" class="filter-dropdown">
                        <button onclick="setFilter('all')">All Voters</button>
                        <button onclick="setFilter('Verified')">Verified</button>
                        <button onclick="setFilter('Unverified')">Unverified</button>
                    </div>
                </div>`;
        }
    }

    // --- TABLE RENDERING ---
    window.renderTable = (filteredData = null) => {
        const head = document.getElementById('table-head');
        const body = document.getElementById('user-table-body');
        
        if (isInitialLoad) {
            renderLoadingState();
            return;
        }

        if (currentTab === 'Org') {
            head.innerHTML = `<tr><th class="px-6 py-5">Name</th><th class="px-6 py-5">Email</th><th class="px-6 py-5">College</th><th class="px-6 py-5">Status</th><th class="px-6 py-5 text-center">Action</th></tr>`;
            const data = filteredData || orgUsers;
            body.innerHTML = data.length === 0 ? `<tr><td colspan="5" class="py-10 text-center text-gray-400 italic">No organizations found.</td></tr>` : data.map(u => `
                <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                    <td class="px-6 py-5 text-gray-800 font-bold">${u.name}</td>
                    <td class="px-6 py-5 text-gray-500">${u.email || '---'}</td>
                    <td class="px-6 py-5 text-gray-500">${u.college}</td>
                    <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">${u.status}</span></td>
                    <td class="px-6 py-5 text-center">
                        <button onclick="openOrgModal('${u.id}')" class="text-blue-500 mr-4 hover:scale-110 transition"><i class="fas fa-edit"></i></button>
                        <button onclick="confirmDelete('${u.id}')" class="text-red-400 hover:scale-110 transition"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } else {
            head.innerHTML = `<tr><th class="px-6 py-5">Student ID</th><th class="px-6 py-5">Name</th><th class="px-6 py-5">College</th><th class="px-6 py-5">Verification</th><th class="px-6 py-5">Status</th><th class="px-6 py-5 text-center">Action</th></tr>`;
            const data = filteredData || voters;
            body.innerHTML = data.length === 0 ? `<tr><td colspan="6" class="py-10 text-center text-gray-400 italic">No voters found.</td></tr>` : data.map(v => `
                <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                    <td class="px-6 py-5 text-gray-800 font-bold">${v.studentId}</td>
                    <td class="px-6 py-5 text-gray-500">${v.name}</td>
                    <td class="px-6 py-5 text-gray-500">${v.college}</td>
                    <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.verification === 'Verified' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}">${v.verification}</span></td>
                    <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">${v.status}</span></td>
                    <td class="px-6 py-5 text-center">
                        <button onclick="openVoterModal('${v.id}')" class="text-blue-500 hover:scale-110 transition"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    };

    // --- FORM VALIDATION ---
    window.validateOrgInputs = () => {
        const inputs = getCurrentOrgInputs();
        const btn = document.getElementById('submitUserBtn');
        const allFilled = inputs.f && inputs.l && inputs.e && inputs.c;
        let shouldEnable = editingId ? (allFilled && JSON.stringify(inputs) !== originalData) : allFilled;
        
        btn.disabled = !shouldEnable;
        btn.classList.toggle('opacity-50', !shouldEnable);
        btn.classList.toggle('cursor-not-allowed', !shouldEnable);
    };

    function getCurrentOrgInputs() {
        return {
            f: document.getElementById('f-name').value.trim(),
            l: document.getElementById('l-name').value.trim(),
            e: document.getElementById('email').value.trim(),
            c: document.getElementById('college').value,
            s: document.getElementById('status').value
        };
    }

    // --- SAVE / UPDATE LOGIC ---
    window.saveUser = async () => {
        const inputs = getCurrentOrgInputs();
        const collegeShort = inputs.c.match(/\(([^)]+)\)/)?.[1] || inputs.c;
        const btn = document.getElementById('submitUserBtn');
        
        // Show loading in button
        const originalBtnText = btn.innerText;
        btn.innerText = "Processing...";
        btn.disabled = true;

        try {
            if (editingId) {
                await updateDoc(doc(db, "users", editingId), {
                    firstName: inputs.f,
                    lastName: inputs.l,
                    college: collegeShort,
                    status: inputs.s
                });
                showToast("Success", "User updated successfully");
            } else {
                await addDoc(collection(db, "users"), {
                    firstName: inputs.f,
                    lastName: inputs.l,
                    email: inputs.e,
                    college: collegeShort,
                    status: inputs.s,
                    role: "LEADER",
                    createdAt: serverTimestamp()
                });
                showToast("Success", "Leader registered successfully", `Invite sent to ${inputs.e}`);
            }
            closeModal('userModal');
        } catch (err) {
            console.error(err);
            showToast("Error", "Failed to save user", null, "fa-times", "bg-red-500");
        } finally {
            btn.innerText = originalBtnText;
            btn.disabled = false;
        }
    };

    // --- MODAL CONTROLS ---
    window.openOrgModal = (id = null) => {
        editingId = id;
        const modal = document.getElementById('userModal');
        const collegeSel = document.getElementById('college');
        
        if (collegeSel.options.length === 0) {
            colleges.forEach(c => collegeSel.add(new Option(c, c)));
        }

        if (id) {
            const u = orgUsers.find(u => u.id === id);
            document.getElementById('modal-title').innerText = "Update Leader";
            document.getElementById('submitUserBtn').innerText = "Save Changes";
            document.getElementById('f-name').value = u.firstName;
            document.getElementById('l-name').value = u.lastName;
            document.getElementById('email').value = u.email || '';
            document.getElementById('college').value = colleges.find(c => c.includes(u.college)) || u.college;
            document.getElementById('status').value = u.status;
            originalData = JSON.stringify(getCurrentOrgInputs());
        } else {
            document.getElementById('modal-title').innerText = "Register Leader";
            document.getElementById('submitUserBtn').innerText = "Create User";
            ['f-name', 'l-name', 'email'].forEach(fid => document.getElementById(fid).value = '');
            document.getElementById('status').value = 'Active';
            originalData = null;
        }
        modal.classList.remove('hidden');
        validateOrgInputs();
    };

    // --- WATCHERS & INITIALIZATION ---
    document.querySelectorAll('#userModal input, #userModal select').forEach(el => {
        el.addEventListener('input', validateOrgInputs);
    });

    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');
    
    window.showToast = (title, msg, subMsg = null, icon = "fa-check", iconBg = "bg-green-500") => {
        const overlay = document.getElementById('toast-overlay');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerHTML = msg + (subMsg ? `<br><span class='text-[10px]'>${subMsg}</span>` : '');
        document.getElementById('toast-icon').className = `fas ${icon}`;
        document.getElementById('toast-icon-bg').className = `w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl ${iconBg}`;
        overlay.classList.remove('hidden');
        setTimeout(() => document.getElementById('toast-container').classList.remove('scale-95', 'opacity-0'), 10);
        setTimeout(() => {
            document.getElementById('toast-container').classList.add('scale-95', 'opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }, 2500);
    };

    window.handleSearch = (val) => {
        const queryText = val.toLowerCase();
        if (currentTab === 'Org') {
            const filtered = orgUsers.filter(u => u.name.toLowerCase().includes(queryText) || u.college.toLowerCase().includes(queryText));
            renderTable(filtered);
        } else {
            let filtered = voters.filter(v => v.name.toLowerCase().includes(queryText) || v.studentId.toLowerCase().includes(queryText) || v.college.toLowerCase().includes(queryText));
            if (verificationFilter !== 'all') filtered = filtered.filter(v => v.verification === verificationFilter);
            renderTable(filtered);
        }
    };

    syncUserDatabase();
    switchTab('Org');
});