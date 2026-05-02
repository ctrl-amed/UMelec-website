import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    collection, addDoc, updateDoc, doc, deleteDoc,
    onSnapshot, query, where, orderBy, serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', () => {
    let announcements = [];
    let faqs = [];
    let categories = ["General", "Registration", "Voting Process", "Support"];
    let currentEditingFAQId = null;
    let annDrafts = [{ title: "Draft: Holiday Notice", content: "School will be closed...", audience: "All Students" }];
    let faqDrafts = [{ question: "Draft FAQ", answer: "Draft Answer", category: "General" }];

    function renderLoadingState(targetId) {
        const list = document.getElementById(targetId);
        if (!list) return;
        list.innerHTML = `
            <tr>
                <td colspan="5" class="px-8 py-10 text-center">
                    <div class="flex flex-col items-center justify-center gap-3">
                        <div class="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        <p class="text-gray-400 font-black text-[10px] uppercase tracking-widest">Fetching Data...</p>
                    </div>
                </td>
            </tr>`;
    }

    function closeDropdowns() {
        document.querySelectorAll('.dropdown-menu').forEach(menu => menu.classList.remove('show'));
    }

    function renderAnnouncements() {
        const list = document.getElementById('announcement-list');
        if (!list) return;

        if (announcements.length === 0) {
            list.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-gray-400 italic">No live announcements.</td></tr>`;
            return;
        }

        list.innerHTML = announcements.slice(0, 3).map(item => `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50">
                <td class="px-8 py-5 text-gray-800 font-bold">${item.title || ''}</td>
                <td class="px-8 py-5"><span class="bg-blue-50 text-blue-600 px-3 py-1 rounded-full text-[10px] uppercase font-black">${item.audience || 'All'}</span></td>
                <td class="px-8 py-5 text-gray-400 font-mono text-xs">${item.date || '---'}</td>
                <td class="px-8 py-5 text-green-500 font-bold text-xs uppercase tracking-tighter">Live Notif</td>
                <td class="px-8 py-5"><button onclick="confirmDelete('announcement', '${item.id}')" class="text-red-400 hover:scale-110 transition"><i class="fas fa-trash"></i></button></td>
            </tr>
        `).join('');
    }

    function renderFAQs() {
        const list = document.getElementById('faq-list');
        if (!list) return;

        if (faqs.length === 0) {
            list.innerHTML = `<tr><td colspan="5" class="py-10 text-center text-gray-400 italic">No FAQs available.</td></tr>`;
            return;
        }

        list.innerHTML = faqs.slice(0, 3).map(item => `
            <tr class="hover:bg-gray-50 transition border-b border-gray-50">
                <td class="px-8 py-5 text-gray-800 font-bold">${item.question || ''}</td>
                <td class="px-8 py-5 text-gray-500 text-xs">${item.category || 'General'}</td>
                <td class="px-8 py-5 text-gray-400 font-mono text-xs">${item.updated || 'Live'}</td>
                <td class="px-8 py-5 text-green-500 font-bold text-xs uppercase tracking-tighter">Live</td>
                <td class="px-8 py-5 flex gap-4">
                    <button onclick="editFAQ('${item.id}')" class="text-blue-400 hover:scale-110 transition"><i class="fas fa-edit"></i></button>
                    <button onclick="confirmDelete('faq', '${item.id}')" class="text-red-400 hover:scale-110 transition"><i class="fas fa-trash"></i></button>
                </td>
            </tr>
        `).join('');
    }

    function renderCategoryDropdown() {
        const sel = document.getElementById('faq-category');
        if (!sel) return;
        sel.innerHTML = categories.map(c => `<option value="${c}">${c}</option>`).join('');
    }

    function updateDraftCounts() {
        const annCount = document.getElementById('ann-draft-count');
        const faqCount = document.getElementById('faq-draft-count');
        if (annCount) annCount.innerText = annDrafts.length;
        if (faqCount) faqCount.innerText = faqDrafts.length;
    }

    function syncData() {
        renderLoadingState('announcement-list');
        renderLoadingState('faq-list');

        const qAnn = query(
            collection(db, "notifications"),
            where("type", "==", "REMINDER"),
            orderBy("timestamp", "desc")
        );

        onSnapshot(qAnn, (snapshot) => {
            announcements = snapshot.docs.map(docSnap => ({ id: docSnap.id, ...docSnap.data() }));
            renderAnnouncements();
            updateDraftCounts();
        }, (error) => console.error("Announcement Sync Error:", error));

        const qFaq = query(collection(db, "faqs"), where("isActive", "==", true));
        onSnapshot(qFaq, (snapshot) => {
            faqs = snapshot.docs
                .map(docSnap => ({ id: docSnap.id, ...docSnap.data() }))
                .sort((a, b) => (a.category || "").localeCompare(b.category || ""));

            const existingCats = faqs.map(f => f.category).filter(Boolean);
            if (existingCats.length) categories = [...new Set([...categories, ...existingCats])];

            renderFAQs();
            renderCategoryDropdown();
            updateDraftCounts();
        }, (error) => console.error("FAQ Sync Error:", error));

        const qCat = query(collection(db, "categories"), orderBy("name", "asc"));
        onSnapshot(qCat, (snapshot) => {
            if (!snapshot.empty) {
                const dbCats = snapshot.docs.map(docSnap => docSnap.data().name).filter(Boolean);
                categories = [...new Set([...categories, ...dbCats])];
                renderCategoryDropdown();
            }
        }, (error) => console.error("Category Sync Error:", error));
    }

    window.toggleDropdown = (id) => {
        const menu = document.getElementById(id);
        if (!menu) return;
        const shouldOpen = !menu.classList.contains('show');
        closeDropdowns();
        if (shouldOpen) menu.classList.add('show');
    };

    window.openModal = (id) => {
        closeDropdowns();

        if (id === 'announcementModal') {
            document.getElementById('ann-title').value = '';
            document.getElementById('ann-content').value = '';
            document.getElementById('ann-audience').selectedIndex = 0;
        }

        if (id === 'faqModal') {
            renderCategoryDropdown();
            if (!currentEditingFAQId) {
                document.getElementById('faq-modal-title').innerText = "Add New FAQ";
                document.getElementById('faq-submit-btn').innerText = "Add";
                document.getElementById('faq-question').value = '';
                document.getElementById('faq-answer').value = '';
            }
        }

        const modal = document.getElementById(id);
        if (modal) modal.classList.remove('hidden');
        updateDraftCounts();
    };

    window.closeModal = (id) => {
        const modal = document.getElementById(id);
        if (modal) modal.classList.add('hidden');
        if (id === 'faqModal') currentEditingFAQId = null;
        closeDropdowns();
    };

    window.handleOutsideClose = (id) => {
        if (id === 'announcementModal') {
            window.handleCancel('announcement');
            return;
        }
        if (id === 'faqModal') {
            window.handleCancel('faq');
            return;
        }
        window.closeModal(id);
    };

    window.editFAQ = (id) => {
        const faq = faqs.find(item => item.id === id);
        if (!faq) return;

        currentEditingFAQId = id;
        renderCategoryDropdown();
        document.getElementById('faq-modal-title').innerText = "Edit FAQ";
        document.getElementById('faq-submit-btn').innerText = "Save Changes";
        document.getElementById('faq-question').value = faq.question || '';
        document.getElementById('faq-answer').value = faq.answer || '';
        document.getElementById('faq-category').value = faq.category || categories[0] || 'General';

        window.openModal('faqModal');
    };

    window.createAnnouncement = async () => {
        const title = document.getElementById('ann-title').value.trim();
        const content = document.getElementById('ann-content').value.trim();
        const audience = document.getElementById('ann-audience').value;
        const btn = document.querySelector('#announcementModal button[onclick="createAnnouncement()"]');

        if (!title || !content) {
            showToast("Error", "Title and Content are required!");
            return;
        }

        btn.innerText = "Sending...";
        btn.disabled = true;

        try {
            await addDoc(collection(db, "notifications"), {
                title,
                previewText: content.length > 50 ? `${content.substring(0, 50)}...` : content,
                fullText: content,
                type: "REMINDER",
                timestamp: serverTimestamp(),
                isRead: false,
                audience,
                date: new Date().toISOString().split('T')[0]
            });
            closeModal('announcementModal');
            showToast("Sent!", "Notification is now live on mobile.");
        } catch (e) {
            console.error("Notification Error:", e);
            showToast("Error", "Check permissions or console.");
        } finally {
            btn.innerText = "Create";
            btn.disabled = false;
        }
    };

    window.submitFAQ = async () => {
        const question = document.getElementById('faq-question').value.trim();
        const answer = document.getElementById('faq-answer').value.trim();
        const category = document.getElementById('faq-category').value;
        const btn = document.getElementById('faq-submit-btn');

        if (!question || !answer) {
            showToast("Error", "Question and Answer are required.");
            return;
        }

        const originalText = btn.innerText;
        btn.innerText = "Saving...";
        btn.disabled = true;

        const data = {
            question,
            answer,
            category,
            updated: new Date().toISOString().split('T')[0]
        };

        try {
            if (currentEditingFAQId) {
                await updateDoc(doc(db, "faqs", currentEditingFAQId), data);
                showToast("Success", "FAQ updated!");
            } else {
                await addDoc(collection(db, "faqs"), {
                    ...data,
                    isActive: true,
                    timestamp: serverTimestamp()
                });
                showToast("Success", "FAQ added!");
            }

            closeModal('faqModal');
        } catch (e) {
            console.error("FAQ Save Error:", e);
            showToast("Error", "Failed to save FAQ");
        } finally {
            btn.innerText = originalText;
            btn.disabled = false;
        }
    };

    window.saveCategory = async () => {
        const input = document.getElementById('new-cat-name');
        const btn = document.querySelector('#categoryModal button[onclick="saveCategory()"]');
        const val = input.value.trim();

        if (!val) return;

        btn.innerText = "Adding...";
        btn.disabled = true;

        try {
            await addDoc(collection(db, "categories"), { name: val, timestamp: serverTimestamp() });
            input.value = '';
            closeModal('categoryModal');
            showToast("Success", "Category created!");
        } catch (e) {
            console.error("Category Save Error:", e);
            showToast("Error", "Failed to add category");
        } finally {
            btn.innerText = "Add";
            btn.disabled = false;
        }
    };

    window.confirmDelete = (type, id) => {
        document.getElementById('alert-title').innerText = "Confirm Delete";
        document.getElementById('alert-msg').innerText = "This will remove the item from the dashboard and mobile app.";
        document.getElementById('alert-actions').innerHTML = `
            <div class="flex gap-4">
                <button onclick="closeAlert()" class="flex-1 py-3 bg-gray-100 text-black rounded-full font-bold">Cancel</button>
                <button onclick="executeDelete('${type}', '${id}')" class="flex-1 py-3 bg-blue-gradient text-white rounded-full font-bold shadow-md">Remove</button>
            </div>
        `;
        document.getElementById('alertDialog').classList.remove('hidden');
    };

    window.executeDelete = async (type, id) => {
        try {
            const collectionName = type === 'announcement' ? "notifications" : "faqs";
            if (type === 'announcement') {
                await deleteDoc(doc(db, collectionName, id));
            } else {
                await updateDoc(doc(db, collectionName, id), { isActive: false });
            }
            closeAlert();
            showToast("Success", "Item removed");
        } catch (e) {
            console.error("Delete Error:", e);
            showToast("Error", "Action failed");
        }
    };

    window.saveToDrafts = (type) => {
        const draft = type === 'announcement'
            ? {
                title: document.getElementById('ann-title').value,
                content: document.getElementById('ann-content').value,
                audience: document.getElementById('ann-audience').value
            }
            : {
                question: document.getElementById('faq-question').value,
                answer: document.getElementById('faq-answer').value,
                category: document.getElementById('faq-category').value
            };

        (type === 'announcement' ? annDrafts : faqDrafts).push(draft);
        closeAlert();
        closeModal(`${type}Modal`);
        updateDraftCounts();
    };

    window.openDrafts = (type) => {
        const container = document.getElementById('drafts-container');
        const data = type === 'announcement' ? annDrafts : faqDrafts;

        document.getElementById('drafts-title').innerText = `${type} Drafts`;
        container.innerHTML = data.length
            ? data.map((d, i) => `
                <div class="p-4 bg-gray-50 rounded-2xl border border-gray-100 flex justify-between items-center">
                    <p class="font-black text-xs">${type === 'announcement' ? (d.title || 'Untitled') : (d.question || 'Untitled')}</p>
                    <button onclick="loadDraft('${type}', ${i})" class="text-blue-600 font-black text-[10px] uppercase">Load</button>
                </div>
            `).join('')
            : '<p class="text-center py-4 text-gray-400">No drafts found.</p>';

        document.getElementById('draftsModal').classList.remove('hidden');
    };

    window.loadDraft = (type, index) => {
        const draft = (type === 'announcement' ? annDrafts : faqDrafts).splice(index, 1)[0];
        if (!draft) return;

        if (type === 'announcement') {
            openModal('announcementModal');
            document.getElementById('ann-title').value = draft.title || '';
            document.getElementById('ann-content').value = draft.content || '';
            document.getElementById('ann-audience').value = draft.audience || 'All Students';
        } else {
            currentEditingFAQId = null;
            openModal('faqModal');
            document.getElementById('faq-question').value = draft.question || '';
            document.getElementById('faq-answer').value = draft.answer || '';
            document.getElementById('faq-category').value = draft.category || 'General';
        }

        closeModal('draftsModal');
        updateDraftCounts();
    };

    window.openSeeAll = (type) => {
        const head = document.getElementById('see-all-head');
        const body = document.getElementById('see-all-body');
        document.getElementById('see-all-title').innerText = type === 'announcement' ? "All Announcements" : "All FAQs";

        if (type === 'announcement') {
            head.innerHTML = `<tr><th class="px-8 py-5 text-left">Title</th><th class="px-8 py-5 text-left">Audience</th><th class="px-8 py-5 text-left">Date</th><th class="px-8 py-5 text-left">Status</th></tr>`;
            body.innerHTML = announcements.map(a => `
                <tr>
                    <td class="px-8 py-5">${a.title || ''}</td>
                    <td class="px-8 py-5">${a.audience || 'All'}</td>
                    <td class="px-8 py-5 font-mono">${a.date || ''}</td>
                    <td class="px-8 py-5 text-green-500 font-bold">Active</td>
                </tr>
            `).join('');
        } else {
            head.innerHTML = `<tr><th class="px-8 py-5 text-left">Question</th><th class="px-8 py-5 text-left">Category</th><th class="px-8 py-5 text-left">Updated</th><th class="px-8 py-5 text-left">Status</th></tr>`;
            body.innerHTML = faqs.map(f => `
                <tr>
                    <td class="px-8 py-5">${f.question || ''}</td>
                    <td class="px-8 py-5">${f.category || ''}</td>
                    <td class="px-8 py-5 font-mono">${f.updated || ''}</td>
                    <td class="px-8 py-5 text-green-500 font-bold">Live</td>
                </tr>
            `).join('');
        }

        document.getElementById('seeAllModal').classList.remove('hidden');
    };

    window.showToast = (title, msg) => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        if (!overlay || !container) return;

        document.getElementById('toast-title').innerText = title || "Success";
        document.getElementById('toast-msg').innerText = msg || "Operation completed.";

        overlay.classList.remove('hidden');
        setTimeout(() => container.classList.remove('scale-95', 'opacity-0'), 10);
        setTimeout(window.hideToast, 2500);
    };

    window.hideToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        if (container) container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => overlay?.classList.add('hidden'), 300);
    };

    window.closeAlert = () => document.getElementById('alertDialog').classList.add('hidden');
    window.discardAndClose = (type) => {
        closeAlert();
        closeModal(`${type}Modal`);
    };

    window.handleCancel = (type) => {
        const value = type === 'announcement'
            ? document.getElementById('ann-title').value
            : document.getElementById('faq-question').value;

        if (value.trim()) {
            document.getElementById('alert-title').innerText = "Save Draft?";
            document.getElementById('alert-msg').innerText = "You have unsaved changes.";
            document.getElementById('alert-actions').innerHTML = `
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

    window.confirmLogout = async () => {
        await signOut(auth);
        window.location.href = "index.html";
    };
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    document.addEventListener('click', (event) => {
        if (!event.target.closest('#faq-options') && !event.target.closest('[onclick*="toggleDropdown"]')) {
            closeDropdowns();
        }
    });

    syncData();
    updateDraftCounts();
});
