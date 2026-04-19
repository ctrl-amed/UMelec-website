import { functions } from './firebase.js';
import { httpsCallable } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-functions.js";

const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const errorToast = document.getElementById('errorToast');

// 1. UI Validation: Enable button for any @umak.edu.ph email
emailInput.addEventListener('input', () => {
    const value = emailInput.value.trim().toLowerCase();
    
    emailInput.classList.remove('input-error');
    errorToast.classList.add('hidden');

    // Simple regex for UMak email
    const isValidFormat = /^[a-z0-9.]+@umak\.edu\.ph$/.test(value);

    if (isValidFormat) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.add('btn-active', 'cursor-pointer');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.remove('btn-active', 'cursor-pointer');
    }
});

// 2. Database Check & Function Trigger
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailValue = emailInput.value.trim().toLowerCase();

    submitBtn.disabled = true;
    submitBtn.innerText = "Checking Database...";

    try {
        // We call the function. 
        // TIP: Your Cloud Function should perform the "exists" check internally 
        // to keep the frontend logic simple and secure.
        const generateReset = httpsCallable(functions, 'generatePasswordResetCode');
        const result = await generateReset({ email: emailValue });

        // If your function returns success
        if (result.data) {
            localStorage.setItem('resetEmail', emailValue);
            window.location.href = "Leader-Verification.html";
        }

    } catch (error) {
        console.error("Auth Error:", error);
        
        // Handle the "User Not Found" case specifically
        submitBtn.disabled = false;
        submitBtn.innerText = "Send Verification";
        
        // This triggers your red border and toast
        errorToast.classList.remove('hidden');
        emailInput.classList.add('input-error');

        const errorMsg = errorToast.querySelector('.text-\\[10px\\]');
        if (errorMsg) {
            // Check for the specific error your Cloud Function throws
            errorMsg.textContent = error.message.includes("not-found") 
                ? "This email is not registered in UMelec." 
                : "An error occurred. Please try again.";
        }
    }
});