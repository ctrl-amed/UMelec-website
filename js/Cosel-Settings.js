import { auth, db } from './firebase.js';
import { signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    addDoc, 
    serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

document.addEventListener('DOMContentLoaded', async () => {
    
    // --- 1. INITIAL LOAD: Sync UI with Database ---
    const syncSettingsWithDB = async () => {
        try {
            const settingsRef = doc(db, "settings", "archive_policy");
            const docSnap = await getDoc(settingsRef);

            if (docSnap.exists()) {
                const data = docSnap.data();
                // Update Dropdown
                if (data.frequency) document.getElementById('archive-frequency').value = data.frequency;
                // Update Toggle
                if (data.deleteSessionData !== undefined) document.getElementById('toggle').checked = data.deleteSessionData;
                // Update Last Backup Time
                if (data.lastBackup) {
                    const date = data.lastBackup.toDate();
                    document.getElementById('last-backup-time').innerText = date.toLocaleString();
                }
            }
        } catch (error) {
            console.error("Initial Sync Error:", error);
        }
    };

    await syncSettingsWithDB();

    // --- 2. ARCHIVE SETTINGS (Backend Writes) ---
    window.handleFrequencyChange = async (val) => {
        console.log("Saving frequency:", val);
        try {
            await setDoc(doc(db, "settings", "archive_policy"), {
                frequency: val,
                updatedAt: serverTimestamp()
            }, { merge: true });
            showToast('', 'Archive frequency updated in database.');
        } catch (error) {
            showToast('Error', 'Failed to save frequency.');
        }
    };

    window.handlePolicyToggle = async (isEnabled) => {
        try {
            await setDoc(doc(db, "settings", "archive_policy"), {
                deleteSessionData: isEnabled,
                updatedAt: serverTimestamp()
            }, { merge: true });
            showToast('', `Deletion policy set to ${isEnabled ? 'Enabled' : 'Disabled'}.`);
        } catch (error) {
            showToast('Error', 'Failed to update policy.');
        }
    };

    // --- 3. BACKUP PROCESS (Real Firestore Request) ---
    window.startBackupProcess = async () => {
        document.getElementById('backup-step-1').classList.add('hidden');
        document.getElementById('backup-step-2').classList.remove('hidden');

        const progressEl = document.getElementById('backup-progress');
        
        try {
            // Log the backup request to Firestore
            // A Backend Cloud Function would usually trigger upon this creation
            await addDoc(collection(db, "backups"), {
                requestedBy: auth.currentUser ? auth.currentUser.email : "System Admin",
                status: "requested",
                timestamp: serverTimestamp()
            });

            // Visual Progress (Matching the UI requirement)
            let progress = 0;
            const interval = setInterval(async () => {
                progress += 10;
                progressEl.innerText = `${progress}%`;

                if (progress >= 100) {
                    clearInterval(interval);
                    
                    // Update the "Last Backup" timestamp in the main settings doc
                    const now = new Date();
                    await setDoc(doc(db, "settings", "archive_policy"), {
                        lastBackup: serverTimestamp()
                    }, { merge: true });

                    document.getElementById('last-backup-time').innerText = now.toLocaleString();
                    closeBackupModal();
                    showToast('', 'Manual backup has been initiated and logged.');
                }
            }, 150);

        } catch (error) {
            console.error("Backup Error:", error);
            showToast('Error', 'Could not initiate backup.');
            closeBackupModal();
        }
    };

    // --- 4. LOGOUT & UI HELPERS ---
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');
    window.openBackupModal = () => {
        document.getElementById('backup-step-1').classList.remove('hidden');
        document.getElementById('backup-step-2').classList.add('hidden');
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
        setTimeout(hideToast, 3000);
    };

    window.hideToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        if (container) container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => overlay.classList.add('hidden'), 300);
    };
});