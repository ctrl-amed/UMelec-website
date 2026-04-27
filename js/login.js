import { auth, db } from './firebase.js';
import { signInWithEmailAndPassword, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import { doc, getDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const loginForm = document.querySelector('#loginForm');
const emailInput = document.querySelector('#emailInput');
const passwordInput = document.querySelector('#password');
const loginBtn = document.querySelector('#loginBtn');
const emailErrorText = document.querySelector('#emailError');
const passwordErrorText = document.querySelector('#passwordError');
const errorToast = document.querySelector('#errorToast');
const successToast = document.querySelector('#successToast');
const dimOverlay = document.querySelector('#dimOverlay');
const togglePassword = document.querySelector('#togglePassword');

// --- 👁️ PASSWORD VISIBILITY TOGGLE ---
togglePassword.addEventListener('click', function () {
    const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
    passwordInput.setAttribute('type', type);
    this.classList.toggle('text-[#0098E0]');
});

// --- 🔘 BUTTON & UI LOGIC ---
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

// --- 🚀 LOGIN SUBMISSION WITH ROLE GATE ---
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

    loginBtn.disabled = true;
    loginBtn.innerText = "Authenticating...";

    // 2. FIREBASE AUTHENTICATION
    signInWithEmailAndPassword(auth, email, pass)
        .then(async (userCredential) => {
            const user = userCredential.user; 

            // 3. FETCH PROFILE DATA FROM FIRESTORE
            const userDocRef = doc(db, "users", user.uid); 
            const userSnap = await getDoc(userDocRef);

            if (userSnap.exists()) {
                const userData = userSnap.data();
                // Ensure role comparison is case-insensitive
                const userRole = userData.role ? userData.role.toUpperCase() : "";

                // 4. 🛑 THE ROLE GATE: Voters cannot access the Web Portal
                if (userRole !== "COSEL" && userRole !== "LEADER") {
                    await signOut(auth);
                    showError("Access Denied", "Voters can only login via the Mobile App.");
                    return;
                }

                // 5. SAVE SESSION DATA
                localStorage.setItem('userEmail', email);
                localStorage.setItem('userFirstName', userData.firstname || "User");
                localStorage.setItem('userRole', userRole);
                localStorage.setItem('userUid', user.uid);

                // 6. ROUTING LOGIC
                if (userRole === "COSEL") {
                    // Integrated COSEL Message
                    showSuccess(
                        "Temporary access granted.", 
                        "Security requires password change.", 
                        "Cosel-PasswordUpdate.html"
                    );
                } else if (userRole === "LEADER") {
                    // Integrated Leader Message
                    showSuccess(
                        "Login Success", 
                        `Welcome back, Leader ${userData.firstname}!`, 
                        "Leader-Homepage.html"
                    );
                }
            } else {
                // Auth account exists but no Firestore document
                await signOut(auth);
                showError("Database Error", "User profile not found.");
            }
        })
        .catch((error) => {
            console.error("Firebase Error:", error.message);
            // Re-enable button on failure
            loginBtn.disabled = false;
            loginBtn.innerText = "Login";
            showError("Login Failed", "Invalid email or password.");
        });
});

// --- ✨ UI ANIMATIONS & UTILS ---

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

function showError(title, message) {
    // Show the red toast/error UI
    errorToast.classList.remove('hidden');
    emailInput.classList.add('input-error');
    passwordInput.classList.add('input-error');
    
    // Update text in the Toast
    const errorTitleElem = errorToast.querySelector('.font-bold');
    const errorMsgElem = errorToast.querySelector('.text-\\[10px\\]');
    
    if (errorTitleElem) errorTitleElem.textContent = title;
    if (errorMsgElem) errorMsgElem.textContent = message;
    
    updateButtonState();
}