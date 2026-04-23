import { db } from './firebase.js';
import { getAuth, confirmPasswordReset } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { getFunctions, httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";
import { doc, deleteDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

// View Initialization
const newPass = document.getElementById('newPassword');
const confirmPass = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('resetBtn');

// Containers
const passwordCriteriaDiv = document.getElementById('passwordCriteria');
const matchCriteriaDiv = document.getElementById('matchCriteria');

const userEmail = localStorage.getItem('resetEmail');

if (!userEmail) {
    window.location.href = "Leader-ForgotPassword.html";
}

// --- 👁️ PASSWORD VISIBILITY TOGGLE ---
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function () {
        const input = this.parentElement.querySelector('input');
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        this.classList.toggle('text-[#0098E0]');
    });
});

// --- ✅ HELPER: UPDATE CRITERIA COLOR ---
function updateCriteria(id, isValid) {
    const el = document.getElementById(id);
    if (!el) return;
    const bullet = el.querySelector('span');
    
    if (isValid) {
        el.className = "text-xs valid-text"; 
        if (bullet) bullet.textContent = "✓";
    } else {
        el.className = "text-xs invalid-text"; 
        if (bullet) bullet.textContent = "•";
    }
}

// --- 🛡️ NEW PASSWORD LOGIC ---
newPass.addEventListener('input', () => {
    const val = newPass.value;
    if (val !== "") passwordCriteriaDiv.classList.remove('hidden');

    const isLengthValid = val.length >= 8;
    const isMixedCase = /[a-z]/.test(val) && /[A-Z]/.test(val);
    const isSpecial = /[!@#$%^&*(),.?":{}|<>]/.test(val);
    const isNumber = /[0-9]/.test(val);

    updateCriteria('length', isLengthValid);
    updateCriteria('case', isMixedCase);
    updateCriteria('special', isSpecial);
    updateCriteria('number', isNumber);

    checkForm();
});

// --- 🔗 CONFIRM PASSWORD LOGIC ---
confirmPass.addEventListener('input', () => {
    const val = confirmPass.value;
    const matchEl = document.getElementById('match');
    const bullet = matchEl?.querySelector('span');
    
    if (val === "") {
        matchCriteriaDiv.classList.add('hidden');
    } else {
        matchCriteriaDiv.classList.remove('hidden');
        if (val === newPass.value) {
            matchEl.className = "text-xs valid-text";
            if (bullet) bullet.textContent = "✓";
        } else {
            matchEl.className = "text-xs invalid-text";
            if (bullet) bullet.textContent = "•";
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

// --- 🚀 THE RESET ACTION ---
resetBtn.addEventListener('click', async () => {
    resetBtn.disabled = true;
    resetBtn.innerText = "Updating...";

    try {
        const auth = getAuth();
        const functions = getFunctions(undefined, "us-central1");

        // 1. CALL CLOUD FUNCTION (Fixed variable naming here)
        const resetAction = httpsCallable(functions, 'generatePasswordResetCode');
        const result = await resetAction({ email: userEmail }); // Using the correct variable name
        const actionCode = result.data.actionCode;

        if (!actionCode) throw new Error("Verification failed.");

        // 2. UPDATE THE HIDDEN AUTH PASSWORD
        await confirmPasswordReset(auth, actionCode, newPass.value);
        console.log("Auth Password updated.");

        // 3. CLEANUP 
        try {
            await deleteDoc(doc(db, "passwordResetCodes", userEmail));
        } catch (e) {
            console.warn("Cleanup failed, but password was changed.");
        }

        // 4. SUCCESS UI
        localStorage.removeItem('resetEmail');
        document.getElementById('dimOverlay').classList.remove('hidden');
        document.getElementById('successDialog').classList.remove('hidden');

    } catch (error) {
        console.error("Reset Error:", error);
        alert("Update failed: " + error.message);
        resetBtn.disabled = false;
        resetBtn.innerText = "Update Password";
    }
});