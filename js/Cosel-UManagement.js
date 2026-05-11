import { auth, db, functions } from './firebase.js';
import { initializeApp, deleteApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { onAuthStateChanged, signOut, createUserWithEmailAndPassword, getAuth } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import {
    collection, updateDoc, doc, setDoc,
    onSnapshot, serverTimestamp, query, where, getDocs
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

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

const UMAK_EMAIL_REGEX = /^[a-z0-9._%+-]+@umak\.edu\.ph$/i;
const TEMP_PASSWORD = "TemporaryPass123!";

document.addEventListener('DOMContentLoaded', () => {
    let orgUsers = [];
    let voters = [];
    let currentTab = 'Org';
    let editingId = null;
    let originalData = null;
    let verificationFilter = 'all';
    let isInitialLoad = true;

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "index.html";
        }
    });

    function renderLoadingState() {
        const body = document.getElementById('user-table-body');
        if (!body) return;

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

    function syncUserDatabase() {
        renderLoadingState();

        onSnapshot(collection(db, "users"), (snapshot) => {
            const allUsers = snapshot.docs.map((docSnap) => {
                const data = docSnap.data();
                const fName = data.firstName || data.firstname || "";
                const lName = data.lastName || data.lastname || "";
                const combinedName = `${fName} ${lName}`.trim();
                const resolvedName = data.name || combinedName || fName || "Unnamed User";
                const fullCollege = data.college || "N/A";

                return {
                    id: docSnap.id,
                    ...data,
                    name: resolvedName,
                    firstName: fName || resolvedName.split(' ')[0] || "",
                    lastName: lName || resolvedName.split(' ').slice(1).join(' ') || "",
                    studentId: data.studentId || data.studentid || "N/A",
                    college: fullCollege,
                    displayCollege: collegeMap[fullCollege] || fullCollege,
                    verification: (data.isVerified || data.verification === "Verified") ? "Verified" : "Unverified",
                    status: data.status || "Active"
                };
            });

            orgUsers = allUsers.filter((u) => String(u.role || "").toUpperCase() === "LEADER");
            voters = allUsers.filter((u) => String(u.role || "").toUpperCase() !== "LEADER");

            isInitialLoad = false;
            renderTable();
        }, (error) => {
            console.error("Sync Error:", error);
            showToast("Sync Error", "Access Denied. Check Security Rules.", null, "fa-exclamation-triangle", "bg-red-600");
        });
    }

    window.switchTab = (tab) => {
        currentTab = tab;
        verificationFilter = 'all';

        document.querySelectorAll('.status-tab').forEach((b) => b.classList.remove('active'));
        document.getElementById(`tab-${tab}`).classList.add('active');

        const searchInput = document.getElementById('user-search');
        searchInput.value = '';
        searchInput.placeholder = tab === 'Org'
            ? "Search by Name or College"
            : "Search by Name, ID, or College";

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

            body.innerHTML = data.length === 0
                ? `<tr><td colspan="5" class="py-10 text-center text-gray-400 italic">No organizations found.</td></tr>`
                : data.map((u) => `
                    <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                        <td class="px-6 py-5 text-gray-800 font-bold">${u.name}</td>
                        <td class="px-6 py-5 text-gray-500">${u.email || '---'}</td>
                        <td class="px-6 py-5 text-gray-500">${u.displayCollege}</td>
                        <td class="px-6 py-5">
                            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
                                ${u.status}
                            </span>
                        </td>
                        <td class="px-6 py-5 text-center">
                            <button onclick="openOrgModal('${u.id}')" class="text-blue-500 mr-4 hover:scale-110 transition"><i class="fas fa-edit"></i></button>
                            <button onclick="confirmDelete('${u.id}')" class="text-red-400 hover:scale-110 transition"><i class="fas fa-trash"></i></button>
                        </td>
                    </tr>`).join('');
        } else {
            head.innerHTML = `<tr><th class="px-6 py-5">Student ID</th><th class="px-6 py-5">Name</th><th class="px-6 py-5">College</th><th class="px-6 py-5">Verification</th><th class="px-6 py-5">Status</th><th class="px-6 py-5 text-center">Action</th></tr>`;
            const data = filteredData || voters;

            body.innerHTML = data.length === 0
                ? `<tr><td colspan="6" class="py-10 text-center text-gray-400 italic">No voters found.</td></tr>`
                : data.map((v) => `
                    <tr class="hover:bg-gray-50 transition border-b border-gray-100">
                        <td class="px-6 py-5 text-gray-800 font-bold">${v.studentId}</td>
                        <td class="px-6 py-5 text-gray-500">${v.name}</td>
                        <td class="px-6 py-5 text-gray-500">${v.displayCollege}</td>
                        <td class="px-6 py-5">
                            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.verification === "Verified" ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}">
                                ${v.verification}
                            </span>
                        </td>
                        <td class="px-6 py-5">
                            <span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">
                                ${v.status}
                            </span>
                        </td>
                        <td class="px-6 py-5 text-center">
                            <button onclick="openVoterModal('${v.id}')" class="text-blue-500 hover:scale-110 transition"><i class="fas fa-edit"></i></button>
                        </td>
                    </tr>`).join('');
        }
    };

    window.openVoterModal = (id) => {
        const voter = voters.find((v) => v.id === id);
        if (!voter) return;

        editingId = id;
        document.getElementById('v-id').innerText = voter.studentId;
        document.getElementById('v-name').innerText = voter.name;
        document.getElementById('v-college').innerText = voter.displayCollege;
        document.getElementById('v-verify').innerText = voter.verification;
        document.getElementById('v-status').value = voter.status;

        originalData = voter.status;
        document.getElementById('voterModal').classList.remove('hidden');
        validateVoterInput();
    };

    window.validateVoterInput = () => {
        const hasChanged = document.getElementById('v-status').value !== originalData;
        const btn = document.getElementById('voterSaveBtn');

        btn.disabled = !hasChanged;
        btn.classList.toggle('opacity-50', !hasChanged);
        btn.classList.toggle('cursor-not-allowed', !hasChanged);
    };

    window.saveVoterStatus = async () => {
        const btn = document.getElementById('voterSaveBtn');
        const newStatus = document.getElementById('v-status').value;

        btn.innerText = "Updating...";
        btn.disabled = true;

        try {
            await updateDoc(doc(db, "users", editingId), { status: newStatus });
            showToast("Success", "Voter status updated");
            closeModal('voterModal');
        } catch (err) {
            console.error("Update Voter Error:", err);
            showToast("Error", "Failed to update voter", err.code || err.message, "fa-times", "bg-red-500");
        } finally {
            btn.innerText = "Save Changes";
        }
    };

    window.openOrgModal = (id = null) => {
        editingId = id;
        const modal = document.getElementById('userModal');
        const collegeSel = document.getElementById('college');

        if (collegeSel.options.length === 0) {
            colleges.forEach((c) => collegeSel.add(new Option(c, c)));
        }

        if (id) {
            const u = orgUsers.find((item) => item.id === id);
            if (!u) return;

            document.getElementById('modal-title').innerText = "Update Leader";
            document.getElementById('submitUserBtn').innerText = "Save Changes";
            document.getElementById('f-name').value = u.firstName;
            document.getElementById('l-name').value = u.lastName;
            document.getElementById('email').value = u.email || '';
            document.getElementById('email').disabled = true;
            document.getElementById('college').value = u.college;
            document.getElementById('status').value = u.status;

            originalData = JSON.stringify(getCurrentOrgInputs());
        } else {
            document.getElementById('modal-title').innerText = "Register Leader";
            document.getElementById('submitUserBtn').innerText = "Create User";
            document.getElementById('email').disabled = false;

            ['f-name', 'l-name', 'email'].forEach((fid) => {
                document.getElementById(fid).value = '';
            });

            document.getElementById('college').selectedIndex = 0;
            document.getElementById('status').value = 'Active';
            originalData = null;
        }

        modal.classList.remove('hidden');
        validateOrgInputs();
    };

    function buildLeaderStudentId(email) {
        return email.split('@')[0];
    }

    window.saveUser = async () => {
        const inputs = getCurrentOrgInputs();
        const fullCollegeName = inputs.c;
        const btn = document.getElementById('submitUserBtn');
        const normalizedEmail = inputs.e.trim().toLowerCase();
        const fullName = `${inputs.f} ${inputs.l}`.trim();

        btn.innerText = "Processing...";
        btn.disabled = true;

        let secondaryApp = null;

        try {
            if (!UMAK_EMAIL_REGEX.test(normalizedEmail)) {
                throw { code: 'auth/invalid-email' };
            }

            if (editingId) {
                await updateDoc(doc(db, "users", editingId), {
                    name: fullName,
                    firstName: inputs.f,
                    lastName: inputs.l,
                    firstname: inputs.f,
                    lastname: inputs.l,
                    email: normalizedEmail,
                    college: fullCollegeName,
                    status: inputs.s,
                    role: "LEADER",
                    registrationCompleted: true,
                    isVerified: true,
                    verification: "Verified",
                    termsAgreed: true,
                    profilePhotoUrl: ""
                });

                showToast("Success", "User updated successfully");
            } else {
                const q = query(collection(db, "users"), where("email", "==", normalizedEmail));
                const querySnapshot = await getDocs(q);

                if (!querySnapshot.empty) {
                    throw { code: 'auth/email-already-in-use' };
                }

                const secondaryAppName = `leaderCreator-${Date.now()}`;
                secondaryApp = initializeApp(auth.app.options, secondaryAppName);
                const secondaryAuth = getAuth(secondaryApp);

                const userCredential = await createUserWithEmailAndPassword(
                    secondaryAuth,
                    normalizedEmail,
                    TEMP_PASSWORD
                );

                const newUser = userCredential.user;
                const leaderStudentId = buildLeaderStudentId(normalizedEmail);

                await setDoc(doc(db, "users", newUser.uid), {
                    uid: newUser.uid,
                    authUid: newUser.uid,
                    studentId: leaderStudentId,
                    name: fullName,
                    firstName: inputs.f,
                    lastName: inputs.l,
                    firstname: inputs.f,
                    lastname: inputs.l,
                    registrationCompleted: true,
                    email: normalizedEmail,
                    role: "LEADER",
                    college: fullCollegeName,
                    isVerified: true,
                    verification: "Verified",
                    termsAgreed: true,
                    profilePhotoUrl: "",
                    status: inputs.s,
                    createdAt: serverTimestamp()
                });

                await signOut(secondaryAuth);
                await deleteApp(secondaryApp);
                secondaryApp = null;

                showToast(
                    "Success",
                    `User ${inputs.f} ${inputs.l} Created!`,
                    `Temp Password: ${TEMP_PASSWORD}`
                );
            }

            closeModal('userModal');
        } catch (err) {
            console.error("Save User Error:", err);

            if (secondaryApp) {
                try {
                    await deleteApp(secondaryApp);
                } catch (_) {}
            }

            let msg = "Failed to save user";
            if (err.code === 'auth/email-already-in-use') msg = "Email already exists in Firebase Auth.";
            else if (err.code === 'auth/invalid-email') msg = "Use a valid @umak.edu.ph email.";
            else if (err.code === 'permission-denied') msg = "Missing or insufficient Firestore permissions.";

            showToast("Error", msg, null, "fa-times", "bg-red-500");
        } finally {
            btn.innerText = editingId ? "Save Changes" : "Create User";
            btn.disabled = false;
            validateOrgInputs();
        }
    };

    window.confirmDelete = (id) => {
        const user = orgUsers.find((u) => u.id === id);
        if (!user) return;

        document.getElementById('delete-msg').innerText = `Are you sure you want to delete ${user.firstName}?`;

        document.getElementById('confirmDeleteBtn').onclick = async () => {
            try {
                const deleteLeaderAccount = httpsCallable(functions, "deleteLeaderAccount");
                await deleteLeaderAccount({ uid: id });

                closeModal('deleteModal');
                showToast("Success", "User deleted from Authentication and Firestore");
            } catch (err) {
                console.error("Delete Error:", err);
                showToast("Error", "Delete failed", err.message || err.code, "fa-times", "bg-red-500");
            }
        };

        document.getElementById('deleteModal').classList.remove('hidden');
    };

    window.toggleFilter = () => {
        document.getElementById('filterDropdown').classList.toggle('show');
    };

    window.setFilter = (type) => {
        verificationFilter = type;
        document.getElementById('filterDropdown').classList.remove('show');
        handleSearch(document.getElementById('user-search').value);
    };

    window.handleSearch = (val) => {
        const queryText = val.toLowerCase();

        if (currentTab === 'Org') {
            const filtered = orgUsers.filter((u) =>
                u.name.toLowerCase().includes(queryText) ||
                u.college.toLowerCase().includes(queryText)
            );
            renderTable(filtered);
        } else {
            let filtered = voters.filter((v) =>
                String(v.name || "").toLowerCase().includes(queryText) ||
                String(v.studentId || "").toLowerCase().includes(queryText) ||
                String(v.college || "").toLowerCase().includes(queryText)
            );

            if (verificationFilter !== 'all') {
                filtered = filtered.filter((v) => v.verification === verificationFilter);
            }

            renderTable(filtered);
        }
    };

    window.validateOrgInputs = () => {
        const inputs = getCurrentOrgInputs();
        const btn = document.getElementById('submitUserBtn');
        const allFilled = inputs.f && inputs.l && inputs.e && inputs.c && inputs.s;

        let shouldEnable = editingId
            ? (allFilled && JSON.stringify(inputs) !== originalData)
            : allFilled;

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

    window.closeModal = (id) => {
        document.getElementById(id).classList.add('hidden');
    };

    window.showToast = (title, msg, subMsg = null, icon = "fa-check", iconBg = "bg-green-500") => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');

        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerHTML = msg + (subMsg ? `<br><span class='text-[10px]'>${subMsg}</span>` : '');
        document.getElementById('toast-icon').className = `fas ${icon}`;
        document.getElementById('toast-icon-bg').className = `w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl ${iconBg}`;

        overlay.classList.remove('hidden');
        setTimeout(() => container.classList.remove('scale-95', 'opacity-0'), 10);

        setTimeout(() => {
            container.classList.add('scale-95', 'opacity-0');
            setTimeout(() => overlay.classList.add('hidden'), 300);
        }, 3500);
    };

    window.hideToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');

        if (container) container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            if (overlay) overlay.classList.add('hidden');
        }, 300);
    };

    document.querySelectorAll('#userModal input, #userModal select').forEach((el) => {
        el.addEventListener('input', validateOrgInputs);
        el.addEventListener('change', validateOrgInputs);
    });

    document.getElementById('v-status').addEventListener('change', validateVoterInput);

    window.confirmLogout = async () => {
        await signOut(auth);
        window.location.href = "index.html";
    };

    window.showLogoutModal = () => {
        document.getElementById('logoutModalOverlay').classList.remove('hidden');
    };

    window.closeLogoutModal = () => {
        document.getElementById('logoutModalOverlay').classList.add('hidden');
    };

    syncUserDatabase();
    switchTab('Org');
});
