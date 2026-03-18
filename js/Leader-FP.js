const form = document.getElementById('forgotPasswordForm');
const emailInput = document.getElementById('emailInput');
const submitBtn = document.getElementById('submitBtn');
const errorToast = document.getElementById('errorToast');

// FAKE EMAIL FOR TESTING
const VALID_EMAIL = "leader@umak.edu.ph";

emailInput.addEventListener('input', () => {
    const value = emailInput.value.trim();

    // Remove red border and hide our custom error toast when user types
    emailInput.classList.remove('input-error');
    errorToast.classList.add('hidden');

    if (value !== "") {
        submitBtn.disabled = false;
        submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.add('btn-active', 'cursor-pointer');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.remove('btn-active', 'cursor-pointer');
    }
});

form.addEventListener('submit', (e) => {
    e.preventDefault(); // This stops the page from refreshing
    const emailValue = emailInput.value.trim();

    if (emailValue === VALID_EMAIL) {
        // Redirect if successful
        window.location.href = "Leader-Verification.html";
    } else {
        // Show our custom UI error instead of browser popup
        errorToast.classList.remove('hidden');
        emailInput.classList.add('input-error');
    }
});