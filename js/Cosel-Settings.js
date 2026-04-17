document.addEventListener('DOMContentLoaded', () => {
    // FAKE INITIAL DATA
    let lastBackupDate = "2026-03-26 11:02:15";
    let lastStatus = "Successful";

    // FREQUENCY CHANGE HANDLER
    window.handleFrequencyChange = (val) => {
        showToast("Policy Updated", `Archive frequency set to: ${val}`);
    };

    // BACKUP MODAL LOGIC
    window.openBackupModal = () => {
        document.getElementById('backup-step-1').classList.remove('hidden');
        document.getElementById('backup-step-2').classList.add('hidden');
        document.getElementById('backupModal').classList.remove('hidden');
    };

    window.closeBackupModal = () => {
        document.getElementById('backupModal').classList.add('hidden');
    };

    // MANUAL BACKUP PROCESS SIMULATION
    window.startBackupProcess = () => {
        document.getElementById('backup-step-1').classList.add('hidden');
        const loadingStep = document.getElementById('backup-step-2');
        loadingStep.classList.remove('hidden');

        let progress = 0;
        const progressEl = document.getElementById('backup-progress');
        
        const interval = setInterval(() => {
            progress += Math.floor(Math.random() * 15) + 5;
            if (progress >= 100) {
                progress = 100;
                progressEl.innerText = `${progress}%`;
                clearInterval(interval);
                
                setTimeout(() => {
                    completeBackup();
                }, 500);
            } else {
                progressEl.innerText = `${progress}%`;
            }
        }, 300);
    };

    function completeBackup() {
        // Update the UI with current date/time
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        const day = String(now.getDate()).padStart(2, '0');
        const hours = String(now.getHours()).padStart(2, '0');
        const minutes = String(now.getMinutes()).padStart(2, '0');
        const seconds = String(now.getSeconds()).padStart(2, '0');
        
        const formattedDate = `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
        
        // Update DOM
        document.getElementById('last-backup-time').innerText = formattedDate;
        const badge = document.getElementById('backup-status-badge');
        badge.innerText = "Successful";
        badge.className = "px-3 py-1 bg-green-100 text-green-600 rounded-full uppercase tracking-widest text-[10px]";

        closeBackupModal();
        showToast("Backup Success", "System data has been securely archived.");
    }

    // TOAST NOTIFICATION LOGIC
    window.showToast = (title, msg) => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        
        document.getElementById('toast-title').innerText = title;
        document.getElementById('toast-msg').innerText = msg;
        
        overlay.classList.remove('hidden');
        setTimeout(() => container.classList.remove('scale-95', 'opacity-0'), 10);
        
        // Auto-hide after 3 seconds
        window.toastTimer = setTimeout(hideToast, 3000);
    };

    window.hideToast = () => {
        const overlay = document.getElementById('toast-overlay');
        const container = document.getElementById('toast-container');
        if (!container) return;
        
        container.classList.add('scale-95', 'opacity-0');
        setTimeout(() => {
            overlay.classList.add('hidden');
            clearTimeout(window.toastTimer);
        }, 300);
    };

    // LOGOUT LOGIC
    window.showLogoutModal = () => document.getElementById('logoutModalOverlay').classList.remove('hidden');
    window.closeLogoutModal = () => document.getElementById('logoutModalOverlay').classList.add('hidden');

    // Click outside to close toast
    window.addEventListener('click', (e) => {
        const overlay = document.getElementById('toast-overlay');
        if (e.target === overlay) hideToast();
    });
});