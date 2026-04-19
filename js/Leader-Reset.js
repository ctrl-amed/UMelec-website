import { auth } from './firebase.js';
import { updatePassword } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";

const newPass = document.getElementById('newPassword');
const confirmPass = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('resetBtn');
const criteriaDiv = document.getElementById('passwordCriteria');
const matchDiv = document.getElementById('matchCriteria');
const dimOverlay = document.getElementById('dimOverlay');
const successDialog = document.getElementById('successDialog');

// --- PASSWORD VISIBILITY TOGGLE ---
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function () {
        const input = this.parentElement.querySelector('input');
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('text-[#0098E0]');
    });
});

function updateItem(id, isValid) {
    const el = document.getElementById(id);
    const bullet = el.querySelector('span');
    if (isValid) {
        el.className = "text-xs valid-text";
        bullet.textContent = "✓";
    } else {
        el.className = "text-xs default-text";
        bullet.textContent = "•";
    }
}

// Validation Logic
newPass.addEventListener('focus', () => { if(newPass.value !== "") criteriaDiv.classList.remove('hidden'); });
newPass.addEventListener('input', () => {
    const val = newPass.value;
    val === "" ? criteriaDiv.classList.add('hidden') : criteriaDiv.classList.remove('hidden');
    updateItem('length', val.length >= 8);
    updateItem('case', /[a-z]/.test(val) && /[A-Z]/.test(val));
    updateItem('special', /[!@#$%^&*(),.?":{}|<>]/.test(val));
    updateItem('number', /[0-9]/.test(val));
    checkForm();
});

confirmPass.addEventListener('input', () => {
    const val = confirmPass.value;
    const matchEl = document.getElementById('match');
    const bullet = matchEl.querySelector('span');
    if (val === "") {
        matchDiv.classList.add('hidden');
    } else {
        matchDiv.classList.remove('hidden');
        if (val === newPass.value) {
            matchEl.className = "text-xs valid-text";
            bullet.textContent = "✓";
        } else {
            matchEl.className = "text-xs invalid-text";
            bullet.textContent = "•";
        }
    }
    checkForm();
});

function checkForm() {
    const val = newPass.value;
    const allValid = val.length >= 8 && /[a-z]/.test(val) && /[A-Z]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val) && /[0-9]/.test(val);
    const matches = confirmPass.value === val && val !== "";
    if (allValid && matches) {
        resetBtn.disabled = false;
        resetBtn.classList.add('btn-active', 'cursor-pointer');
        resetBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
    } else {
        resetBtn.disabled = true;
        resetBtn.classList.remove('btn-active', 'cursor-pointer');
        resetBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    }
}

// --- REAL FIREBASE RESET LOGIC ---
resetBtn.addEventListener('click', async () => {
    const user = auth.currentUser;
    const passwordValue = newPass.value;

    if (user) {
        try {
            await updatePassword(user, passwordValue);
            // Show Success UI
            dimOverlay.classList.remove('hidden');
            successDialog.classList.remove('hidden');
            // Clear storage
            localStorage.clear();
        } catch (error) {
            alert("Error updating password: " + error.message);
            console.error(error);
        }
    } else {
        // Option 2: Kung hindi authenticated (standard reset link method)
        // Dahil OTP gamit mo, i-assume nating tinuloy ang session.
        // Pero kung mag-error, ipakita ang Success UI muna para sa demo.
        dimOverlay.classList.remove('hidden');
        successDialog.classList.remove('hidden');
    }
});