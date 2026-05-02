import { auth, db } from './firebase.js';
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-auth.js";
import {
    doc,
    setDoc,
    collection,
    query,
    where,
    getDocs,
    limit
} from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const errorToast = document.getElementById('errorToast');

function setSubmitState(enabled, label = "Send Verification") {
    submitBtn.disabled = !enabled;
    submitBtn.innerText = label;

    if (enabled) {
        submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.add('btn-active', 'cursor-pointer');
    } else {
        submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.remove('btn-active', 'cursor-pointer');
    }
}

function showEmailNotFoundError() {
    const title = errorToast.querySelector('.text-xs');
    const message = errorToast.querySelector('.text-\\[10px\\]');

    if (title) title.textContent = "Email Error";
    if (message) message.textContent = "Email does not exist.";

    errorToast.classList.remove('hidden');
    emailInput.classList.add('input-error');
}

function showGenericError(messageText) {
    const title = errorToast.querySelector('.text-xs');
    const message = errorToast.querySelector('.text-\\[10px\\]');

    if (title) title.textContent = "Request Error";
    if (message) message.textContent = messageText;

    errorToast.classList.remove('hidden');
    emailInput.classList.add('input-error');
}

// --- 1. UI VALIDATION ---
emailInput.addEventListener('input', () => {
    const value = emailInput.value.trim().toLowerCase();
    emailInput.classList.remove('input-error');
    errorToast.classList.add('hidden');

    const isValidFormat = /^[a-z0-9.]+@umak\.edu\.ph$/.test(value);
    setSubmitState(isValidFormat);
});

// --- 2. DATABASE & EMAIL LOGIC ---
form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const emailValue = emailInput.value.trim().toLowerCase();
    const isValidFormat = /^[a-z0-9.]+@umak\.edu\.ph$/.test(emailValue);

    if (!isValidFormat) {
        setSubmitState(false);
        return;
    }

    setSubmitState(false, "Checking...");
    errorToast.classList.add('hidden');
    emailInput.classList.remove('input-error');

    try {
        // Step A: Check if the email exists and belongs to a LEADER
        const userQuery = query(
            collection(db, "users"),
            where("email", "==", emailValue),
            where("role", "==", "LEADER"),
            limit(1)
        );

        const userSnapshot = await getDocs(userQuery);

        if (userSnapshot.empty) {
            showEmailNotFoundError();
            setSubmitState(true, "Send Verification");
            return;
        }

        setSubmitState(false, "Processing...");

        // Step B: Generate 6-digit code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

        // Step C: Set expiration (10 minutes)
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60000);

        // Step D: Save to passwordResetCodes
        await setDoc(doc(db, "passwordResetCodes", emailValue), {
            email: emailValue,
            code: verificationCode,
            createdAt: now,
            expiresAt: expiresAt,
            used: false
        });

        // Step E: Trigger email via mail collection
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

        setSubmitState(true, "Send Verification");

        if (error.code === 'permission-denied') {
            showGenericError("Security Rules blocked email checking.");
        } else if (error.message && error.message.includes("fetch")) {
            showGenericError("Network blocked. Try again with a stable connection.");
        } else {
            showGenericError("Failed to send code. Please try again.");
        }
    }
});
