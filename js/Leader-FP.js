import { db } from './firebase.js'; 
import { doc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const errorToast = document.getElementById('errorToast');

// --- 1. UI VALIDATION ---
emailInput.addEventListener('input', () => {
    const value = emailInput.value.trim().toLowerCase();
    emailInput.classList.remove('input-error');
    errorToast.classList.add('hidden');

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

// --- 2. DATABASE & EMAIL LOGIC ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const emailValue = emailInput.value.trim().toLowerCase();

    submitBtn.disabled = true;
    submitBtn.innerText = "Processing...";

    try {
        /* NOTE: We removed the 'users' collection query. 
           This bypasses "Permission Denied" errors and School Firewall blocks 
           that target 'list/query' operations.
        */

        // Step A: Generate 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Step B: Set Expiration (10 minutes)
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60000);

        // Step C: Save to 'passwordResetCodes'
        // This is a direct 'set' which is usually allowed by your rules
        await setDoc(doc(db, "passwordResetCodes", emailValue), {
            email: emailValue,
            code: verificationCode,
            createdAt: now,
            expiresAt: expiresAt,
            used: false
        });

        // Step D: Trigger Email via 'mail' collection
        // Writing a single document is much more stable on limited networks
        await setDoc(doc(db, "mail", `${emailValue}_${now.getTime()}`), {
            to: emailValue,
            message: {
                subject: "UMelec Verification Code",
                html: `Your verification code is <b>${verificationCode}</b>. It expires in 10 minutes.`,
                text: `Your verification code is ${verificationCode}. It expires in 10 minutes.`
            }
        });

        // SUCCESS: Move to next page
        localStorage.setItem('resetEmail', emailValue);
        window.location.href = "Leader-Verification.html";

    } catch (error) {
        console.error("Reset Error:", error);
        
        submitBtn.disabled = false;
        submitBtn.innerText = "Send Verification";
        errorToast.classList.remove('hidden');
        emailInput.classList.add('input-error');

        const errorMsg = errorToast.querySelector('.text-\\[10px\\]');
        if (errorMsg) {
            // Detailed error reporting to help you debug at school
            if (error.code === 'permission-denied') {
                errorMsg.textContent = "Security Rules blocked the request. Check Firebase Rules.";
            } else if (error.message.includes("fetch")) {
                errorMsg.textContent = "Network blocked. Try using a Mobile Hotspot.";
            } else {
                errorMsg.textContent = "Failed to send code. Please check your connection.";
            }
        }
    }
});