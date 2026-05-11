import { auth, db } from './firebase.js';
import {
    EmailAuthProvider,
    reauthenticateWithCredential,
    updatePassword
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById('updatePasswordForm');
const oldInput = document.getElementById('oldPassword');
const newInput = document.getElementById('newPassword');
const confirmInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const validationBox = document.getElementById('newPasswordValidations');
const matchText = document.getElementById('v-match');
const errorToast = document.getElementById('errorToast');
const dimOverlay = document.getElementById('dimOverlay');
const successToast = document.getElementById('successToast');

const checks = {
    length: (val) => val.length >= 8,
    case: (val) => /[a-z]/.test(val) && /[A-Z]/.test(val),
    special: (val) => /[!@#$%^&*(),.?":{}|<>]/.test(val),
    number: (val) => /[0-9]/.test(val)
};

function updateUI(id, isValid) {
    const el = document.getElementById(id);
    const bullet = el.querySelector('span');
    if (isValid) {
        el.className = "valid-text";
        bullet.innerText = "✓";
    } else {
        el.className = "invalid-text";
        bullet.innerText = "•";
    }
}

function showError(message, highlightInput = null) {
    errorToast.querySelector('p').innerText = message;
    errorToast.classList.remove('hidden');

    [oldInput, newInput, confirmInput].forEach(input => input.classList.remove('input-error'));
    if (highlightInput) highlightInput.classList.add('input-error');
}

function clearError() {
    errorToast.classList.add('hidden');
    [oldInput, newInput, confirmInput].forEach(input => input.classList.remove('input-error'));
}

function checkAllValid() {
    const oldVal = oldInput.value;
    const newVal = newInput.value;
    const confirmVal = confirmInput.value;

    const isAllNewValid = checks.length(newVal) && checks.case(newVal) && checks.special(newVal) && checks.number(newVal);
    const isMatch = newVal === confirmVal && confirmVal !== "";
    const isOldFilled = oldVal !== "";
    const isDifferentFromOld = oldVal !== "" && newVal !== "" && oldVal !== newVal;

    if (newVal !== "" && oldVal !== "" && oldVal === newVal) {
        showError("New password must be different from old password.", newInput);
    } else {
        clearError();
    }

    if (isAllNewValid && isMatch && isOldFilled && isDifferentFromOld) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.add('btn-active', 'cursor-pointer');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.remove('btn-active', 'cursor-pointer');
    }
}

// --- Event Listeners for UI ---

newInput.addEventListener('focus', () => {
    validationBox.classList.remove('hidden');
});

newInput.addEventListener('input', () => {
    const val = newInput.value;
    updateUI('v-length', checks.length(val));
    updateUI('v-case', checks.case(val));
    updateUI('v-special', checks.special(val));
    updateUI('v-number', checks.number(val));
    checkAllValid();
});

newInput.addEventListener('blur', () => {
    const val = newInput.value;
    const isAllValid = checks.length(val) && checks.case(val) && checks.special(val) && checks.number(val);
    if (val === "" || isAllValid) {
        validationBox.classList.add('hidden');
    }
});

confirmInput.addEventListener('input', () => {
    matchText.classList.remove('hidden');
    const isMatch = confirmInput.value === newInput.value;
    const bullet = matchText.querySelector('span');
    if (isMatch) {
        matchText.className = "valid-text text-xs font-medium";
        bullet.innerText = "✓";
    } else {
        matchText.className = "error-text text-xs font-medium";
        bullet.innerText = "•";
    }
    checkAllValid();
});

oldInput.addEventListener('input', () => {
    checkAllValid();
});

// --- REAL FIREBASE SUBMISSION ---

form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const user = auth.currentUser;
    if (!user) {
        alert("Session expired. Please login again.");
        window.location.href = "index.html";
        return;
    }

    const oldPassword = oldInput.value;
    const newPassword = newInput.value;

    if (oldPassword === newPassword) {
        showError("New password must be different from old password.", newInput);
        submitBtn.disabled = false;
        submitBtn.innerText = "Set New Password";
        return;
    }

    submitBtn.disabled = true;
    submitBtn.innerText = "Updating...";

    try {
        const credential = EmailAuthProvider.credential(user.email, oldPassword);
        await reauthenticateWithCredential(user, credential);

        await updatePassword(user, newPassword);

        const userDocRef = doc(db, "users", user.uid);
        await updateDoc(userDocRef, {
            isPasswordUpdated: true
        });

        clearError();
        dimOverlay.classList.remove('hidden');
        successToast.classList.remove('hidden');

        setTimeout(() => {
            window.location.href = "Cosel-Homepage.html";
        }, 2000);

    } catch (error) {
        console.error("Update Error:", error);
        submitBtn.disabled = false;
        submitBtn.innerText = "Set New Password";

        if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
            showError("Old password mismatch.", oldInput);
        } else {
            alert("Error: " + error.message);
        }
    }
});

document.querySelectorAll('.relative span svg').forEach((icon, index) => {
    icon.parentElement.addEventListener('click', function() {
        const inputs = [oldInput, newInput, confirmInput];
        const type = inputs[index].getAttribute('type') === 'password' ? 'text' : 'password';
        inputs[index].setAttribute('type', type);
        this.classList.toggle('text-[#0098E0]');
    });
});
