document.addEventListener('DOMContentLoaded', () => {
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

    let orgUsers = [
        { id: 1, firstName: "Mark", lastName: "Anthony", email: "mark.a@university.edu", college: "CCIS", status: "Active" },
        { id: 2, firstName: "Sarah", lastName: "Lee", email: "s.lee@university.edu", college: "CITE", status: "Inactive" },
        { id: 3, firstName: "James", lastName: "Wilson", email: "j.wilson@university.edu", college: "CET", status: "Active" }
    ];

    let voters = [
        { id: "A20245678", name: "Alice Wonderland", college: "SOL", verification: "Verified", status: "Active" },
        { id: "B99887766", name: "Bob Builder", college: "CHK", verification: "Unverified", status: "Inactive" },
        { id: "C11223344", name: "Charlie Day", college: "CLAS", verification: "Verified", status: "Active" },
        { id: "D88776655", name: "Diana Prince", college: "CCIS", verification: "Unverified", status: "Active" }
    ];

    let currentTab = 'Org';
    let editingId = null;
    let originalData = null;
    let verificationFilter = 'all';

    // LOGOUT FUNCTIONS
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

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

    window.toggleFilter = () => document.getElementById('filterDropdown').classList.toggle('show');

    window.setFilter = (type) => {
        verificationFilter = type;
        document.getElementById('filterDropdown').classList.remove('show');
        handleSearch(document.getElementById('user-search').value);
    };

    window.renderTable = (filteredData = null) => {
        const head = document.getElementById('table-head');
        const body = document.getElementById('user-table-body');
        
        if (currentTab === 'Org') {
            head.innerHTML = `<tr><th class="px-6 py-5">Name</th><th class="px-6 py-5">Email</th><th class="px-6 py-5">College</th><th class="px-6 py-5">Status</th><th class="px-6 py-5 text-center">Action</th></tr>`;
            const data = filteredData || orgUsers;
            body.innerHTML = data.map(u => `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-5 text-gray-800">${u.firstName} ${u.lastName}</td>
                    <td class="px-6 py-5 text-gray-500">${u.email}</td>
                    <td class="px-6 py-5 text-gray-500">${u.college}</td>
                    <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${u.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">${u.status}</span></td>
                    <td class="px-6 py-5 text-center">
                        <button onclick="openOrgModal(${u.id})" class="text-blue-500 mr-4"><i class="fas fa-edit"></i></button>
                        <button onclick="confirmDelete(${u.id})" class="text-red-400"><i class="fas fa-trash"></i></button>
                    </td>
                </tr>
            `).join('');
        } else {
            head.innerHTML = `<tr><th class="px-6 py-5">Student ID</th><th class="px-6 py-5">Name</th><th class="px-6 py-5">College</th><th class="px-6 py-5">Verification</th><th class="px-6 py-5">Status</th><th class="px-6 py-5 text-center">Action</th></tr>`;
            const data = filteredData || voters;
            body.innerHTML = data.map(v => `
                <tr class="hover:bg-gray-50 transition">
                    <td class="px-6 py-5 text-gray-800">${v.id}</td>
                    <td class="px-6 py-5 text-gray-500">${v.name}</td>
                    <td class="px-6 py-5 text-gray-500">${v.college}</td>
                    <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.verification === 'Verified' ? 'bg-blue-100 text-blue-600' : 'bg-orange-100 text-orange-600'}">${v.verification}</span></td>
                    <td class="px-6 py-5"><span class="px-3 py-1 rounded-full text-[10px] font-black uppercase ${v.status === 'Active' ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-400'}">${v.status}</span></td>
                    <td class="px-6 py-5 text-center">
                        <button onclick="openVoterModal('${v.id}')" class="text-blue-500"><i class="fas fa-edit"></i></button>
                    </td>
                </tr>
            `).join('');
        }
    };

    window.handleSearch = (val) => {
        const query = val.toLowerCase();
        if (currentTab === 'Org') {
            const filtered = orgUsers.filter(u => 
                `${u.firstName} ${u.lastName}`.toLowerCase().includes(query) || u.college.toLowerCase().includes(query)
            );
            renderTable(filtered);
        } else {
            let filtered = voters.filter(v => 
                v.name.toLowerCase().includes(query) || v.id.toLowerCase().includes(query) || v.college.toLowerCase().includes(query)
            );
            if (verificationFilter !== 'all') filtered = filtered.filter(v => v.verification === verificationFilter);
            renderTable(filtered);
        }
    };

    window.openOrgModal = (id = null) => {
        editingId = id;
        const modal = document.getElementById('userModal');
        const collegeSel = document.getElementById('college');
        if (collegeSel.options.length === 0) colleges.forEach(c => collegeSel.add(new Option(c, c)));

        if (id) {
            const u = orgUsers.find(u => u.id === id);
            document.getElementById('modal-title').innerText = "Update User Details";
            document.getElementById('submitUserBtn').innerText = "Save Changes";
            document.getElementById('f-name').value = u.firstName;
            document.getElementById('l-name').value = u.lastName;
            document.getElementById('email').value = u.email;
            document.getElementById('college').value = u.college.length < 10 ? (colleges.find(c => c.includes(u.college)) || u.college) : u.college;
            document.getElementById('status').value = u.status;
            originalData = JSON.stringify(getCurrentOrgInputs());
        } else {
            document.getElementById('modal-title').innerText = "Register New Leader";
            document.getElementById('submitUserBtn').innerText = "Create User";
            ['f-name', 'l-name', 'email'].forEach(id => document.getElementById(id).value = '');
            document.getElementById('status').value = 'Active';
        }
        modal.classList.remove('hidden');
        validateOrgInputs();
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

    window.validateOrgInputs = () => {
        const inputs = getCurrentOrgInputs();
        const btn = document.getElementById('submitUserBtn');
        const allFilled = inputs.f && inputs.l && inputs.e;
        let shouldEnable = editingId ? (allFilled && JSON.stringify(inputs) !== originalData) : allFilled;
        btn.disabled = !shouldEnable;
        btn.classList.toggle('opacity-50', !shouldEnable);
        btn.classList.toggle('cursor-not-allowed', !shouldEnable);
    };

    window.saveUser = () => {
        const inputs = getCurrentOrgInputs();
        const collegeShort = inputs.c.match(/\(([^)]+)\)/)?.[1] || inputs.c;
        if (editingId) {
            const idx = orgUsers.findIndex(u => u.id === editingId);
            orgUsers[idx] = { ...orgUsers[idx], firstName: inputs.f, lastName: inputs.l, email: inputs.e, college: collegeShort, status: inputs.s };
            showToast("Success", `User ${inputs.f} data updated`);
        } else {
            orgUsers.unshift({ id: Date.now(), firstName: inputs.f, lastName: inputs.l, email: inputs.e, college: collegeShort, status: inputs.s });
            showToast("Success", `User ${inputs.f} created`, `Login details sent to ${inputs.e}`);
        }
        closeModal('userModal');
        renderTable();
    };

    window.openVoterModal = (id) => {
        const voter = voters.find(v => v.id === id);
        editingId = id;
        document.getElementById('v-id').innerText = voter.id;
        document.getElementById('v-name').innerText = voter.name;
        document.getElementById('v-college').innerText = voter.college;
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

    window.saveVoterStatus = () => {
        const idx = voters.findIndex(v => v.id === editingId);
        voters[idx].status = document.getElementById('v-status').value;
        showToast("Success", `Voter ${voters[idx].name} status changed successfully`);
        closeModal('voterModal');
        renderTable();
    };

    window.confirmDelete = (id) => {
        const user = orgUsers.find(u => u.id === id);
        document.getElementById('delete-msg').innerText = `Are you sure you want to permanently remove ${user.firstName} ${user.lastName}?`;
        document.getElementById('confirmDeleteBtn').onclick = () => {
            orgUsers = orgUsers.filter(u => u.id !== id);
            closeModal('deleteModal');
            showToast("Deleted", `User ${user.firstName} data is deleted`, null, "fa-trash", "bg-red-500");
            renderTable();
        };
        document.getElementById('deleteModal').classList.remove('hidden');
    };

    window.showToast = (title, msg, subMsg = null, icon = "fa-check", iconBg = "bg-green-500") => {
        const overlay = document.getElementById('toast-overlay');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerHTML = msg + (subMsg ? `<br><span class='text-[10px]'>${subMsg}</span>` : '');
        document.getElementById('toast-icon').className = `fas ${icon}`;
        document.getElementById('toast-icon-bg').className = `w-16 h-16 rounded-full flex items-center justify-center text-white text-3xl ${iconBg}`;
        overlay.classList.remove('hidden');
        setTimeout(() => document.getElementById('toast-container').classList.remove('scale-95', 'opacity-0'), 10);
        setTimeout(hideToast, 2500);
    };

    window.hideToast = () => {
        const container = document.getElementById('toast-container');
        if (!container) return;
        container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => document.getElementById('toast-overlay').classList.add('hidden'), 300);
    };

    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

    document.querySelectorAll('#userModal input, #userModal select').forEach(el => el.addEventListener('input', validateOrgInputs));
    document.getElementById('v-status').addEventListener('change', validateVoterInput);
    
    window.addEventListener('click', (e) => {
        if (!e.target.closest('.relative')) document.getElementById('filterDropdown')?.classList.remove('show');
    });

    switchTab('Org');
});