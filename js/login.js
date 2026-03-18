/**
 * BACKEND GUIDE FOR FIREBASE:
 * 1. Initialize Firebase in your project.
 * 2. Import: import { getAuth, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.x.x/firebase-auth.js";
 * 3. Use the 'auth' instance to replace the "Fake Credentials Logic" below.
 */



const loginForm = document.querySelector('#loginForm');
const emailInput = document.querySelector('#emailInput');
const passwordInput = document.querySelector('#password');
const loginBtn = document.querySelector('#loginBtn');
const emailErrorText = document.querySelector('#emailError');
const passwordErrorText = document.querySelector('#passwordError');
const errorToast = document.querySelector('#errorToast');
const successToast = document.querySelector('#successToast');
const dimOverlay = document.querySelector('#dimOverlay');
const togglePassword = document.querySelector('#togglePassword'); // Added for the Eye Icon

// --- PASSWORD VISIBILITY TOGGLE ---

// This handles the "On and Off" functionality for the eye icon
togglePassword.addEventListener('click', function () {
    // Toggle the type attribute
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    
    // Optional: Toggle icon color to show it's active
    this.classList.toggle('text-[#0098E0]');
});

// --- BUTTON & UI LOGIC ---

function updateButtonState() {
    const isEmailFilled = emailInput.value.trim() !== "";
    const isPasswordFilled = passwordInput.value.trim() !== "";

    if (isEmailFilled && isPasswordFilled) {
        loginBtn.disabled = false;
        loginBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        loginBtn.classList.add('btn-active', 'cursor-pointer');
    } else {
        loginBtn.disabled = true;
        loginBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        loginBtn.classList.remove('btn-active', 'cursor-pointer');
    }
}

function clearAllErrors() {
    emailInput.classList.remove('input-error');
    passwordInput.classList.remove('input-error');
    emailErrorText.classList.add('hidden');
    passwordErrorText.classList.add('hidden');
    errorToast.classList.add('hidden');
    updateButtonState();
}

emailInput.addEventListener('input', clearAllErrors);
passwordInput.addEventListener('input', clearAllErrors);

// --- LOGIN SUBMISSION ---

loginForm.addEventListener('submit', function (e) {
    e.preventDefault();
    
    const email = emailInput.value.trim();
    const pass = passwordInput.value.trim();

    // 1. FRONTEND VALIDATION
    if (email === "" || pass === "") {
        if (email === "") {
            emailInput.classList.add('input-error');
            emailErrorText.classList.remove('hidden');
        }
        if (pass === "") {
            passwordInput.classList.add('input-error');
            passwordErrorText.classList.remove('hidden');
        }
        return;
    }

    /**
     * 2. BACKEND INTEGRATION POINT
     * TODO: Replace this block with Firebase Auth
     */

    // --- TEMPORARY FAKE CREDENTIALS FOR TESTING ---
    if (email === "leader@umak.edu.ph" && pass === "leader123") {
        showSuccess("Login Success", "Welcome back, Leader!", "Leader-VoterManagement.html");
    } 
    else if (email === "cosel@umak.edu.ph" && pass === "cosel123") {
        showSuccess("Temporary access granted.", "Security requires password change.", "Cosel-PasswordUpdate.html");
    } 
    else {
        // WRONG CREDENTIALS UI
        errorToast.classList.remove('hidden');
        emailInput.classList.add('input-error');
        passwordInput.classList.add('input-error');
        emailInput.value = "";
        passwordInput.value = "";
        updateButtonState();
    }
});

// --- UI ANIMATIONS ---

function showSuccess(title, sub, url) {
    document.querySelector('#successTitle').innerText = title;
    document.querySelector('#successSub').innerText = sub;
    
    dimOverlay.classList.remove('hidden');
    successToast.classList.remove('hidden');

    // Redirect delay
    setTimeout(() => {
        window.location.href = url;
    }, 1500);
}