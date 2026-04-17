document.addEventListener('DOMContentLoaded', () => {
    // ---------------------------------------------------------
    // DATA MANAGEMENT
    // ---------------------------------------------------------
    let announcements = [
        { id: 1, title: "Mock Election Schedule", audience: "All Students", date: "2026-04-10", status: "Published" },
        { id: 2, title: "Voter Registration Deadline", audience: "All Students", date: "2026-04-12", status: "Published" },
        { id: 3, title: "CS Seminar: Modern Voting", audience: "3rd Year", date: "2026-04-15", status: "Published" }
    ];

    let faqs = [
        { id: 1, question: "How to register as a voter?", category: "Registration", updated: "2026-04-01", status: "Live", answer: "Visit the registration portal and upload your ID." },
        { id: 2, question: "Where to see candidate profiles?", category: "General", updated: "2026-04-05", status: "Live", answer: "Go to the Election Monitoring tab and select 'Profiles'." },
        { id: 3, question: "What if I forgot my password?", category: "Support", updated: "2026-04-06", status: "Live", answer: "Click 'Forgot Password' on the login screen." }
    ];

    let categories = ["General", "Registration", "Voting Process", "Support"];
    let annDrafts = [{ title: "Draft: Holiday Notice", content: "School will be closed...", audience: "All Students" }];
    let faqDrafts = [{ question: "Draft FAQ", answer: "Draft Answer", category: "General" }];

    let currentEditingFAQId = null;

    // ---------------------------------------------------------
    // RENDER FUNCTIONS
    // ---------------------------------------------------------
    function renderAnnouncements() {
        const list = document.getElementById('announcement-list');
        list.innerHTML = announcements.slice(0, 3).map(item => `
            <tr>
                <td class="px-8 py-5">${item.title}</td>
                <td class="px-8 py-5"><span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] uppercase">${item.audience}</span></td>
                <td class="px-8 py-5 text-gray-400 font-mono">${item.date}</td>
                <td class="px-8 py-5 text-green-500 font-bold">Published</td>
                <td class="px-8 py-5"><button onclick="confirmDelete('announcement', ${item.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    }

    function renderFAQs() {
        const list = document.getElementById('faq-list');
        list.innerHTML = faqs.slice(0, 3).map(item => `
            <tr>
                <td class="px-8 py-5">${item.question}</td>
                <td class="px-8 py-5 text-gray-500">${item.category}</td>
                <td class="px-8 py-5 text-gray-400 font-mono">${item.updated}</td>
                <td class="px-8 py-5 text-green-500 font-bold">Live</td>
                <td class="px-8 py-5 flex gap-4">
                    <button onclick="editFAQ(${item.id})" class="text-blue-400"><i class="fas fa-edit"></i></button>
                    <button onclick="confirmDelete('faq', ${item.id})" class="text-red-400 hover:text-red-600"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    function renderCategoryDropdown() {
        const sel = document.getElementById('faq-category');
        if(sel) sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    // ---------------------------------------------------------
    // MODAL & ALERT LOGIC
    // ---------------------------------------------------------
    window.openModal = (id) => {
        // Fix: Reset fields when opening a brand new announcement modal
        if (id === 'announcementModal') {
            document.getElementById('ann-title').value = '';
            document.getElementById('ann-content').value = '';
            document.getElementById('ann-audience').selectedIndex = 0;
        }
        
        if (id === 'faqModal') {
            currentEditingFAQId = null;
            document.getElementById('faq-modal-title').innerText = "Add New FAQ";
            document.getElementById('faq-submit-btn').innerText = "Add";
            ['faq-question', 'faq-answer'].forEach(f => document.getElementById(f).value = '');
        }

        document.getElementById(id).classList.remove('hidden');
        document.getElementById('faq-options').classList.remove('show');
        updateDraftCounts();
    };

    window.closeModal = (id) => document.getElementById(id).classList.add('hidden');

    window.handleCancel = (type) => {
        const titleVal = type === 'announcement' ? document.getElementById('ann-title').value : document.getElementById('faq-question').value;
        const bodyVal = type === 'announcement' ? document.getElementById('ann-content').value : document.getElementById('faq-answer').value;

        if (titleVal.trim() || bodyVal.trim()) {
            document.getElementById('alert-title').innerText = `Save this ${type} as a draft?`;
            document.getElementById('alert-msg').innerText = `If you discard now, you’ll lose the ${type} you made.`;
            
            const actions = document.getElementById('alert-actions');
            // REVISED LAYOUT: Keep Editing and Save Draft side-by-side, Discard text below
            actions.innerHTML = `
                <div class="flex gap-3">
                    <button onclick="closeAlert()" class="flex-1 py-3 bg-gray-100 text-black rounded-full font-bold text-sm">Keep Editing</button>
                    <button onclick="saveToDrafts('${type}')" class="flex-1 py-3 bg-blue-gradient text-white rounded-full font-bold shadow-md text-sm">Save Draft</button>
                </div>
                <button onclick="discardAndClose('${type}')" class="text-red-500 font-bold hover:underline text-sm mx-auto">Discard</button>
            `;
            document.getElementById('alertDialog').classList.remove('hidden');
        } else {
            closeModal(`${type}Modal`);
        }
    };

    window.confirmDelete = (type, id) => {
        const title = type === 'announcement' ? "Are you sure you want to delete this announcement?" : "Are you sure you want to delete this FAQ?";
        document.getElementById('alert-title').innerText = title;
        document.getElementById('alert-msg').innerText = "This action will permanently remove the item from the list.";
        
        const actions = document.getElementById('alert-actions');
        actions.innerHTML = `
            <div class="flex gap-4">
                <button onclick="closeAlert()" class="flex-1 py-3 bg-gray-100 text-black rounded-full font-bold">Cancel</button>
                <button onclick="executeDelete('${type}', ${id})" class="flex-1 py-3 bg-blue-gradient text-white rounded-full font-bold shadow-md">Remove</button>
            </div>
        `;
        document.getElementById('alertDialog').classList.remove('hidden');
    };

    window.executeDelete = (type, id) => {
        if (type === 'announcement') {
            announcements = announcements.filter(a => a.id !== id);
            renderAnnouncements();
        } else {
            faqs = faqs.filter(f => f.id !== id);
            renderFAQs();
        }
        closeAlert();
        showToast("Success", "Item removed successfully");
    };

    window.saveToDrafts = (type) => {
        if (type === 'announcement') {
            annDrafts.push({
                title: document.getElementById('ann-title').value,
                content: document.getElementById('ann-content').value,
                audience: document.getElementById('ann-audience').value
            });
        } else {
            faqDrafts.push({
                question: document.getElementById('faq-question').value,
                answer: document.getElementById('faq-answer').value,
                category: document.getElementById('faq-category').value
            });
        }
        closeAlert();
        closeModal(`${type}Modal`);
        updateDraftCounts();
        showToast("Success", "Draft saved");
    };

    window.discardAndClose = (type) => {
        closeAlert();
        closeModal(`${type}Modal`);
    };

    window.closeAlert = () => document.getElementById('alertDialog').classList.add('hidden');

    // ---------------------------------------------------------
    // CRUD OPERATIONS
    // ---------------------------------------------------------
    window.createAnnouncement = () => {
        const title = document.getElementById('ann-title').value;
        const audience = document.getElementById('ann-audience').value;
        if (!title.trim()) return;

        announcements.unshift({ 
            id: Date.now(), 
            title, 
            audience, 
            date: new Date().toISOString().split('T')[0], 
            status: 'Published' 
        });

        closeModal('announcementModal');
        showToast("Success", "Announcement published!");
        renderAnnouncements();
    };

    window.submitFAQ = () => {
        const q = document.getElementById('faq-question').value;
        const a = document.getElementById('faq-answer').value;
        const c = document.getElementById('faq-category').value;
        if (!q.trim()) return;

        if (currentEditingFAQId) {
            const idx = faqs.findIndex(f => f.id === currentEditingFAQId);
            faqs[idx] = { ...faqs[idx], question: q, answer: a, category: c, updated: new Date().toISOString().split('T')[0] };
        } else {
            faqs.unshift({ id: Date.now(), question: q, category: c, updated: new Date().toISOString().split('T')[0], status: 'Live', answer: a });
        }

        closeModal('faqModal');
        showToast("Success", "FAQ Updated!");
        renderFAQs();
    };

    window.editFAQ = (id) => {
        const item = faqs.find(f => f.id === id);
        currentEditingFAQId = id;
        document.getElementById('faq-modal-title').innerText = "Edit FAQ";
        document.getElementById('faq-submit-btn').innerText = "Save";
        document.getElementById('faq-question').value = item.question;
        document.getElementById('faq-answer').value = item.answer || "";
        document.getElementById('faq-category').value = item.category;
        document.getElementById('faqModal').classList.remove('hidden');
    };

    window.saveCategory = () => {
        const val = document.getElementById('new-cat-name').value;
        if (val.trim()) {
            categories.push(val);
            renderCategoryDropdown();
            closeModal('categoryModal');
            showToast("Success", "Category created!");
            document.getElementById('new-cat-name').value = '';
        }
    };

    // ---------------------------------------------------------
    // DRAFTS & SEE ALL
    // ---------------------------------------------------------
    function updateDraftCounts() {
        document.getElementById('ann-draft-count').innerText = annDrafts.length;
        document.getElementById('faq-draft-count').innerText = faqDrafts.length;
    }

    window.openDrafts = (type) => {
        const container = document.getElementById('drafts-container');
        const data = type === 'announcement' ? annDrafts : faqDrafts;
        document.getElementById('drafts-title').innerText = `${type} Drafts`;
        container.innerHTML = data.length ? data.map((d, i) => `
            <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                <p class="font-black text-xs">${type === 'announcement' ? d.title : d.question}</p>
                <button onclick="loadDraft('${type}', ${i})" class="text-blue-600 font-black text-[10px] uppercase">Load</button>
            </div>`).join('') : '<p class="text-center py-4 text-gray-400">No drafts found.</p>';
        openModal('draftsModal');
    };

    window.loadDraft = (type, index) => {
        const d = (type === 'announcement' ? annDrafts : faqDrafts).splice(index, 1)[0];
        if (type === 'announcement') {
            document.getElementById('ann-title').value = d.title;
            document.getElementById('ann-content').value = d.content;
            document.getElementById('ann-audience').value = d.audience;
        } else {
            document.getElementById('faq-question').value = d.question;
            document.getElementById('faq-answer').value = d.answer;
            document.getElementById('faq-category').value = d.category;
        }
        closeModal('draftsModal');
        updateDraftCounts();
    };

    window.openSeeAll = (type) => {
        const head = document.getElementById('see-all-head');
        const body = document.getElementById('see-all-body');
        document.getElementById('see-all-title').innerText = type === 'announcement' ? "All Announcements" : "All FAQs";
        
        if (type === 'announcement') {
            head.innerHTML = `<tr><th class="px-8 py-5">Title</th><th class="px-8 py-5">Audience</th><th class="px-8 py-5">Date</th><th class="px-8 py-5">Status</th></tr>`;
            body.innerHTML = announcements.map(a => `<tr><td class="px-8 py-5">${a.title}</td><td class="px-8 py-5">${a.audience}</td><td class="px-8 py-5 font-mono">${a.date}</td><td class="px-8 py-5 text-green-500 font-bold">Published</td></tr>`).join('');
        } else {
            head.innerHTML = `<tr><th class="px-8 py-5">Question</th><th class="px-8 py-5">Category</th><th class="px-8 py-5">Updated</th><th class="px-8 py-5">Status</th></tr>`;
            body.innerHTML = faqs.map(f => `<tr><td class="px-8 py-5">${f.question}</td><td class="px-8 py-5">${f.category}</td><td class="px-8 py-5 font-mono">${f.updated}</td><td class="px-8 py-5 text-green-500 font-bold">Live</td></tr>`).join('');
        }
        document.getElementById('seeAllModal').classList.remove('hidden');
    };

    // ---------------------------------------------------------
    // UTILITIES
    // ---------------------------------------------------------
    window.showToast = (title, msg) => {
        const overlay = document.getElementById('toast-overlay');
        document.getElementById('toast-title').innerText = title || "Success";
        document.getElementById('toast-msg').innerText = msg || "Operation completed.";
        overlay.classList.remove('hidden');
        setTimeout(() => document.getElementById('toast-container').classList.remove('scale-95', 'opacity-0'), 10);
        setTimeout(hideToast, 2500);
    };

    window.hideToast = () => {
        const container = document.getElementById('toast-container');
        if(container) container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => document.getElementById('toast-overlay')?.classList.add('hidden'), 300);
    };

    window.toggleDropdown = (id) => document.getElementById(id).classList.toggle('show');
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');
    window.handleOutsideClose = (modalId) => handleCancel(modalId === 'announcementModal' ? 'announcement' : 'faq');

    window.addEventListener('click', (e) => {
        if (!e.target.closest('.relative')) {
            document.querySelectorAll('.dropdown-menu').forEach(d => d.classList.remove('show'));
        }
    });

    // INITIAL RENDER
    renderAnnouncements();
    renderFAQs();
    renderCategoryDropdown();
    updateDraftCounts();
});