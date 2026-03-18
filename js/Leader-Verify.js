const inputs = document.querySelectorAll('.otp-input');
const verifyBtn = document.getElementById('verifyBtn');
const resendBtn = document.getElementById('resendBtn');
const timerSpan = document.getElementById('timer'); // Reference the span specifically
const errorToast = document.getElementById('errorToast');
const resendToast = document.getElementById('resendToast');

const FAKE_CODE = "123456";
let timeLeft = 60;
let countdown;

function startTimer() {
    // Reset state
    timeLeft = 60;
    resendBtn.disabled = true;
    resendBtn.style.textDecoration = "none";
    resendBtn.innerHTML = `Resend code in <span id="timer">60</span> seconds`;
    
    // Clear any existing interval before starting a new one
    if (countdown) clearInterval(countdown);

    countdown = setInterval(() => {
        timeLeft--;
        
        // Target the span specifically to avoid overwriting the button structure
        const currentTimerSpan = document.getElementById('timer');
        if (currentTimerSpan) {
            currentTimerSpan.textContent = timeLeft;
        }

        if (timeLeft <= 0) {
            clearInterval(countdown);
            resendBtn.disabled = false;
            resendBtn.innerHTML = `<span class="underline">Resend Code</span>`;
            resendBtn.onclick = resendCodeAction;
        }
    }, 1000);
}

function resendCodeAction() {
    resendToast.classList.remove('hidden');
    startTimer();
    // Toast fades away after 3 seconds
    setTimeout(() => resendToast.classList.add('hidden'), 3000);
}

// Handle OTP Inputs - Numbers only
inputs.forEach((input, index) => {
    input.addEventListener('input', (e) => {
        // Clear errors when user types again
        errorToast.classList.add('hidden');
        inputs.forEach(i => i.classList.remove('input-error'));

        // Ensure numeric only
        e.target.value = e.target.value.replace(/[^0-9]/g, '');
        if (e.target.value.length > 1) e.target.value = e.target.value.slice(0, 1);
        
        // Auto-focus next box
        if (e.target.value !== "" && index < inputs.length - 1) {
            inputs[index + 1].focus();
        }
        checkInputs();
    });

    input.addEventListener('keydown', (e) => {
        if (e.key === "Backspace" && e.target.value === "" && index > 0) {
            inputs[index - 1].focus();
        }
    });
});

function checkInputs() {
    const allFilled = Array.from(inputs).every(i => i.value !== "");
    if (allFilled) {
        verifyBtn.disabled = false;
        verifyBtn.classList.add('btn-active', 'cursor-pointer');
        verifyBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
    } else {
        verifyBtn.disabled = true;
        verifyBtn.classList.remove('btn-active', 'cursor-pointer');
        verifyBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
    }
}

verifyBtn.addEventListener('click', () => {
    const code = Array.from(inputs).map(i => i.value).join("");
    if (code === FAKE_CODE) {
        // Show success dialog
        document.getElementById('dimOverlay').classList.remove('hidden');
        document.getElementById('successDialog').classList.remove('hidden');
    } else {
        // Show error toast and reset fields
        errorToast.classList.remove('hidden');
        inputs.forEach(i => {
            i.classList.add('input-error');
            i.value = "";
        });
        inputs[0].focus();
        checkInputs();
    }
});

// Initialize on page load
startTimer();