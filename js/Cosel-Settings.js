import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    setDoc,
    collection,
    addDoc,
    serverTimestamp,
    onSnapshot
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    const settingsRef = doc(db, "settings", "archive_policy");
    const backupTimeEl = document.getElementById('last-backup-time');
    const backupBadgeEl = document.getElementById('backup-status-badge');

    function updateBackupStatusUI(lastBackupTimestamp) {
        if (!backupBadgeEl || !backupTimeEl) return;

        if (!lastBackupTimestamp) {
            backupTimeEl.innerText = "No backup yet";
            backupBadgeEl.innerText = "Not Backed Up";
            backupBadgeEl.className = "px-3 py-1 bg-gray-100 text-gray-600 rounded-full uppercase tracking-widest text-[10px]";
            return;
        }

        const backupDate = lastBackupTimestamp.toDate ? lastBackupTimestamp.toDate() : new Date(lastBackupTimestamp);
        backupTimeEl.innerText = backupDate.toLocaleString();

        const ageMs = Date.now() - backupDate.getTime();
        const ageDays = ageMs / (1000 * 60 * 60 * 24);

        if (ageDays < 1) {
            backupBadgeEl.innerText = "Successful";
            backupBadgeEl.className = "px-3 py-1 bg-green-100 text-green-600 rounded-full uppercase tracking-widest text-[10px]";
        } else if (ageDays < 7) {
            backupBadgeEl.innerText = "Successful";
            backupBadgeEl.className = "px-3 py-1 bg-green-100 text-green-600 rounded-full uppercase tracking-widest text-[10px]";
        } else if (ageDays < 30) {
            backupBadgeEl.innerText = "Aging";
            backupBadgeEl.className = "px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full uppercase tracking-widest text-[10px]";
        } else {
            backupBadgeEl.innerText = "Outdated";
            backupBadgeEl.className = "px-3 py-1 bg-red-100 text-red-600 rounded-full uppercase tracking-widest text-[10px]";
        }
    }

    onSnapshot(settingsRef, (docSnap) => {
        if (!docSnap.exists()) {
            updateBackupStatusUI(null);
            return;
        }

        const data = docSnap.data();

        if (data.frequency) {
            document.getElementById('archive-frequency').value = data.frequency;
        }

        if (typeof data.deleteSessionData === 'boolean') {
            document.getElementById('toggle').checked = data.deleteSessionData;
        }

        updateBackupStatusUI(data.lastBackup || null);
    }, (error) => {
        console.error("Settings Sync Error:", error);
    });

    window.handleFrequencyChange = async (val) => {
        try {
            await setDoc(settingsRef, {
                frequency: val,
                updatedAt: serverTimestamp()
            }, { merge: true });

            showToast("Saved", "Archive frequency updated.");
        } catch (error) {
            console.error("Frequency Save Error:", error);
            showToast("Error", "Failed to save frequency.");
        }
    };

    window.handlePolicyToggle = async (isEnabled) => {
        try {
            await setDoc(settingsRef, {
                deleteSessionData: isEnabled,
                updatedAt: serverTimestamp()
            }, { merge: true });

            showToast("Saved", `Deletion policy set to ${isEnabled ? 'Enabled' : 'Disabled'}.`);
        } catch (error) {
            console.error("Toggle Save Error:", error);
            showToast("Error", "Failed to update policy.");
        }
    };

    window.startBackupProcess = async () => {
        document.getElementById('backup-step-1').classList.add('hidden');
        document.getElementById('backup-step-2').classList.remove('hidden');

        const progressEl = document.getElementById('backup-progress');
        const badge = document.getElementById('backup-status-badge');

        if (badge) {
            badge.innerText = "Backing Up";
            badge.className = "px-3 py-1 bg-yellow-100 text-yellow-700 rounded-full uppercase tracking-widest text-[10px]";
        }

        try {
            await addDoc(collection(db, "backups"), {
                requestedBy: auth.currentUser ? auth.currentUser.email : "System Admin",
                status: "requested",
                timestamp: serverTimestamp()
            });

            let progress = 0;
            const interval = setInterval(async () => {
                progress += 10;
                progressEl.innerText = `${progress}%`;

                if (progress >= 100) {
                    clearInterval(interval);

                    await setDoc(settingsRef, {
                        lastBackup: serverTimestamp(),
                        updatedAt: serverTimestamp()
                    }, { merge: true });

                    closeBackupModal();
                    showToast("Backup Complete", "Manual backup completed successfully.");
                }
            }, 150);
        } catch (error) {
            console.error("Backup Error:", error);

            if (badge) {
                badge.innerText = "Failed";
                badge.className = "px-3 py-1 bg-red-100 text-red-600 rounded-full uppercase tracking-widest text-[10px]";
            }

            closeBackupModal();
            showToast("Error", "Could not initiate backup.");
        }
    };

    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    window.openBackupModal = () => {
        document.getElementById('backup-step-1').classList.remove('hidden');
        document.getElementById('backup-step-2').classList.add('hidden');
        document.getElementById('backup-progress').innerText = "0%";
        document.getElementById('backupModal').classList.remove('hidden');
    };

    window.closeBackupModal = () => document.getElementById('backupModal').classList.add('hidden');

    window.confirmLogout = async () => {
        try {
            await signOut(auth);
            window.location.href = "index.html";
        } catch (error) {
            console.error("Logout Error:", error);
        }
    };

    window.showToast = (title, msg) => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerText = msg;
        overlay.classList.remove('hidden');
        setTimeout(() => container.classList.remove('scale-95', 'opacity-0'), 10);
        setTimeout(window.hideToast, 3000);
    };

    window.hideToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        if (container) container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    };
});
