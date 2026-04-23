import { db } from './firebase.js';
import { doc, getDoc, updateDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-firestore.js";

const inputs = document.querySelectorAll('.otp-input');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const errorToast = document.getElementById('errorToast');
const resendToast = document.getElementById('resendToast');

// --- CONFIGURATION ---
const userEmail = localStorage.getItem('resetEmail'); 
if (!userEmail) {
    window.location.href = "Leader-ForgotPassword.html";
}

let timeLeft = 60;
let countdown;

// --- TIMER & RESEND LOGIC (Matching Mobile Behavior) ---
function startTimer() {
    timeLeft = 60;
    resendBtn.disabled = true;
    resendBtn.style.textDecoration = "none";
    resendBtn.innerHTML = `Resend code in <span id="timer">60</span> seconds`;
    
    if (countdown) clearInterval(countdown);

    countdown = setInterval(() => {
        timeLeft--;
        const currentTimerSpan = document.getElementById('timer');
        if (currentTimerSpan) currentTimerSpan.textContent = timeLeft;

        if (timeLeft <= 0) {
            clearInterval(countdown);
            resendBtn.disabled = false;
            resendBtn.innerHTML = `<span class="underline">Resend Code</span>`;
        }
    }, 1000);
}

resendBtn.onclick = async () => {
    try {
        const newCode = Math.floor(100000 + Math.random() * 900000).toString();
        const now = new Date();
        const expiresAt = new Date(now.getTime() + 10 * 60000); // 10 mins

        // 1. Overwrite the old code in Firestore (Kotlin: resendCode)
        await setDoc(doc(db, "passwordResetCodes", userEmail), {
            email: userEmail,
            code: newCode,
            createdAt: now,
            expiresAt: expiresAt,
            used: false
        });

        // 2. Trigger new Email
        await setDoc(doc(db, "mail", `${userEmail}_resend_${now.getTime()}`), {
            to: userEmail,
            message: {
                subject: "UMelec Resend: Verification Code",
                html: `Your new verification code is <b>${newCode}</b>.`
            }
        });

        resendToast.classList.remove('hidden');
        startTimer();
        setTimeout(() => resendToast.classList.add('hidden'), 3000);
    } catch (err) {
        console.error("Resend failed:", err);
    }
};

// --- OTP INPUT LOGIC ---
inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        errorToast.classList.add('hidden');
        inputs.forEach(i => i.classList.remove('input-error'));
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length > 1) e.target.value = e.target.value.slice(0, 1);
        if (e.target.value !== "" && index < inputs.length - 1) inputs[index + 1].focus();
        checkInputs();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === "Backspace" && e.target.value === "" && index > 0) inputs[index - 1].focus();
    });
});

function checkInputs() {
    const allFilled = Array.from(inputs).every(i => i.value !== "");
    verifyBtn.disabled = !allFilled;
    if (allFilled) {
        verifyBtn.classList.add('btn-active', 'cursor-pointer');
        verifyBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
    } else {
        verifyBtn.classList.remove('btn-active', 'cursor-pointer');
        verifyBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    }
}

// --- VERIFICATION ACTION (Mirroring VerificationCodeHelper.verifyCode) ---
verifyBtn.addEventListener('click', async () => {
    const otpCode = Array.from(inputs).map(i => i.value).join("");
    const docRef = doc(db, "passwordResetCodes", userEmail);
    
    verifyBtn.disabled = true;
    verifyBtn.innerText = "Verifying...";

    try {
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            throw new Error("No code found. Please resend.");
        }

        const data = docSnap.data();
        const now = new Date();
        const expiresAt = data.expiresAt.toDate();

        // VALIDATION CHECKS
        if (data.used) {
            throw new Error("This code has already been used.");
        }
        if (now > expiresAt) {
            throw new Error("This code has expired.");
        }
        if (data.code !== otpCode) {
            throw new Error("Invalid verification code.");
        }

        // IF VALID: Mark as used (Kotlin: document.reference.update("used", true))
        await updateDoc(docRef, { used: true });

        // Show Success UI
        document.getElementById('dimOverlay').classList.remove('hidden');
        document.getElementById('successDialog').classList.remove('hidden');

    } catch (error) {
        console.error("Verification failed:", error);
        
        // Show specific error message in your toast
        const errorMsg = errorToast.querySelector('.text-\\[10px\\]');
        if (errorMsg) errorMsg.textContent = error.message;

        errorToast.classList.remove('hidden');
        inputs.forEach(i => {
            i.classList.add('input-error');
            i.value = "";
        });
        inputs[0].focus();
        verifyBtn.innerText = "Verify";
        checkInputs();
    }
});

startTimer();