document.addEventListener('DOMContentLoaded', () => {
    // Current Date
    const dateOptions = { year: 'numeric', month: 'long', day: 'numeric' };
    const dateElem = document.getElementById('current-date');
    if(dateElem) dateElem.innerText = new Date().toLocaleDateString('en-US', dateOptions);

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

    const electionsDB = [
        { college: "College of Computing and Information Sciences (CCIS)", title: "CCIS Student Council 2025", status: "ongoing" },
        { college: "College of Computing and Information Sciences (CCIS)", title: "IT Society Election", status: "completed" },
        { college: "College of Engineering and Technology (CET)", title: "CET Council 2025", status: "ongoing" },
        { college: "School of Law (SOL)", title: "Law Student Gov", status: "completed" },
        { college: "College of Accountancy (IA)", title: "Accountancy Board", status: "pending" },
        { college: "College of Human Kinetics (CHK)", title: "Sports Council", status: "pending" }
    ];

    const candidatesDB = {
        "CCIS Student Council 2025": [
            { position: "President", name: "Jazzelle Albaladejo", img: "https://i.pravatar.cc/150?u=1" },
            { position: "Vice President", name: "Alexis Claire", img: "https://i.pravatar.cc/150?u=3" }
        ]
    };

    let currentFilterStatus = 'all';

    function init() {
        renderImmediateAction();
        renderColleges('', 'all'); 
        
        const searchInput = document.getElementById('search-input');
        if(searchInput) {
            searchInput.addEventListener('input', (e) => {
                renderColleges(e.target.value, currentFilterStatus);
            });
        }
    }

    function renderImmediateAction() {
        const list = document.getElementById('immediate-action-list');
        if(!list) return;
        const pendingItems = electionsDB.filter(e => e.status === 'pending');
        list.innerHTML = pendingItems.map(e => `
            <div class="flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl shadow-sm">
                <span class="font-bold text-gray-700 text-sm">${e.title}</span>
                <span class="text-[10px] font-black uppercase text-red-600">Pending</span>
            </div>
        `).join('');
    }

    function renderColleges(query, status) {
        const container = document.getElementById('college-grid');
        if(!container) return;
        container.innerHTML = '';
        const lowerQuery = query.trim().toLowerCase();

        colleges.forEach(college => {
            const collegeNameMatches = college.toLowerCase().includes(lowerQuery);
            const matchingElections = electionsDB.filter(e => {
                const isNotPending = e.status !== 'pending';
                const titleMatches = e.title.toLowerCase().includes(lowerQuery);
                const statusMatches = status === 'all' || e.status === status;
                return e.college === college && isNotPending && statusMatches && (titleMatches || collegeNameMatches);
            });

            let displayCollege = false;
            if (status === 'all') {
                if (lowerQuery === '') {
                    displayCollege = true;
                } else if (collegeNameMatches || matchingElections.length > 0) {
                    displayCollege = true;
                }
            } else {
                if (matchingElections.length > 0) {
                    displayCollege = true;
                }
            }

            if (displayCollege) {
                const collegeDiv = document.createElement('div');
                collegeDiv.className = "space-y-3";
                
                let html = `
                    <div class="bg-blue-gradient p-3 rounded-xl text-white text-[10px] font-bold uppercase tracking-wider shadow-sm">
                        ${college}
                    </div>
                    <div class="grid grid-cols-3 text-[9px] font-black text-gray-400 uppercase px-3">
                        <span>Election Title</span><span class="text-center">Status</span><span class="text-right">Action</span>
                    </div>
                    <div class="space-y-2">
                `;

                if (matchingElections.length > 0) {
                    html += matchingElections.map(e => `
                        <div class="grid grid-cols-3 items-center bg-gray-50 p-3 rounded-xl border border-gray-100">
                            <span class="text-xs font-bold text-gray-700 truncate pr-2">${e.title}</span>
                            <span class="text-[9px] font-black uppercase text-center ${e.status === 'ongoing' ? 'text-emerald-500' : 'text-gray-400'}">${e.status}</span>
                            <button onclick="viewCandidates('${college.replace(/'/g, "\\'")}', '${e.title.replace(/'/g, "\\")}')" class="text-[10px] font-black text-blue-500 hover:underline text-right">VIEW CANDIDATES</button>
                        </div>`).join('');
                } else {
                    html += `<div class="text-[10px] text-gray-400 italic px-3 py-1">No available data</div>`;
                }

                html += `</div>`;
                collegeDiv.innerHTML = html;
                container.appendChild(collegeDiv);
            }
        });

        if (container.innerHTML === '') {
            container.innerHTML = `<div class="text-center py-10 text-gray-400 italic text-sm">No colleges or elections match your search/filter.</div>`;
        }
    }

    // --- Logout Functions ---
    window.showLogoutModal = () => {
        const overlay = document.getElementById('logoutModalOverlay');
        overlay.classList.remove('hidden');
        overlay.classList.add('flex');
        document.body.style.overflow = 'hidden'; 
    };

    window.closeLogoutModal = () => {
        const overlay = document.getElementById('logoutModalOverlay');
        overlay.classList.add('hidden');
        overlay.classList.remove('flex');
        document.body.style.overflow = ''; 
    };

    const logoutOverlay = document.getElementById('logoutModalOverlay');
    if(logoutOverlay) {
        logoutOverlay.addEventListener('click', function(e) {
            if (e.target === this) closeLogoutModal();
        });
    }

    // --- Other Global Functions ---
    window.toggleFilterMenu = () => document.getElementById('filter-dropdown').classList.toggle('show');

    window.applyFilter = (status) => {
        currentFilterStatus = status;
        document.querySelectorAll('.filter-option').forEach(btn => btn.classList.remove('active'));
        const activeBtn = document.getElementById(`filter-${status}`);
        if(activeBtn) activeBtn.classList.add('active');
        document.getElementById('filter-dropdown').classList.remove('show');
        renderColleges(document.getElementById('search-input').value, status);
    };

    window.viewCandidates = (collegeName, electionTitle) => {
        const modal = document.getElementById('candidatesModal');
        const list = document.getElementById('candidatesList');
        document.getElementById('modalCollegeName').innerText = collegeName;
        document.getElementById('modalElectionTitle').innerText = electionTitle;
        const data = candidatesDB[electionTitle] || [{ position: "President", name: "Candidate Placeholder", img: "https://i.pravatar.cc/150?u=placeholder" }];
        const grouped = data.reduce((acc, obj) => {
            acc[obj.position] = acc[obj.position] || [];
            acc[obj.position].push(obj);
            return acc;
        }, {});
        list.innerHTML = Object.entries(grouped).map(([pos, members]) => `
            <div class="mb-10">
                <h5 class="text-center text-blue-500 font-black uppercase text-xs tracking-widest mb-8 border-b border-gray-100 pb-2">${pos}</h5>
                <div class="flex flex-wrap justify-center gap-12">
                    ${members.map(m => `
                        <div class="text-center w-32">
                            <div class="w-24 h-24 rounded-full border-4 border-gray-50 overflow-hidden mx-auto mb-4 shadow-sm">
                                <img src="${m.img}" class="w-full h-full object-cover">
                            </div>
                            <p class="font-bold text-gray-800 text-sm leading-tight">${m.name}</p>
                        </div>
                    `).join('')}
                </div>
            </div>
        `).join('');
        modal.classList.remove('hidden');
    };

    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

    window.addEventListener('click', (e) => {
        if (!e.target.closest('button')) {
            const dropdown = document.getElementById('filter-dropdown');
            if (dropdown) dropdown.classList.remove('show');
        }
    });

    init();
});