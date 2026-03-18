const newPass = document.getElementById('newPassword');
const confirmPass = document.getElementById('confirmPassword');
const resetBtn = document.getElementById('resetBtn');
const criteriaDiv = document.getElementById('passwordCriteria');
const matchDiv = document.getElementById('matchCriteria');

// --- PASSWORD VISIBILITY TOGGLE (Matches index.html logic) ---
document.querySelectorAll('.toggle-password').forEach(toggle => {
    toggle.addEventListener('click', function () {
        const input = this.parentElement.querySelector('input');
        const type = input.getAttribute('type') === 'password' ? 'text' : 'password';
        input.setAttribute('type', type);
        
        // Toggle icon color to blue like index.js
        this.classList.toggle('text-[#0098E0]');
    });
});

function updateItem(id, isValid) {
    const el = document.getElementById(id);
    const bullet = el.querySelector('span');
    if (isValid) {
        el.className = "text-xs valid-text";
        bullet.textContent = "✓";
    } else {
        el.className = "text-xs default-text";
        bullet.textContent = "•";
    }
}

// Validation Logic
newPass.addEventListener('focus', () => { if(newPass.value !== "") criteriaDiv.classList.remove('hidden'); });
newPass.addEventListener('input', () => {
    const val = newPass.value;
    val === "" ? criteriaDiv.classList.add('hidden') : criteriaDiv.classList.remove('hidden');

    updateItem('length', val.length >= 8);
    updateItem('case', /[a-z]/.test(val) && /[A-Z]/.test(val));
    updateItem('special', /[!@#$%^&*(),.?":{}|<>]/.test(val));
    updateItem('number', /[0-9]/.test(val));
    checkForm();
});

newPass.addEventListener('blur', () => {
    const val = newPass.value;
    const allValid = val.length >= 8 && /[a-z]/.test(val) && /[A-Z]/.test(val) && /[!@#$%^&*(),.?":{}|<>]/.test(val) && /[0-9]/.test(val);
    if (allValid || val === "") criteriaDiv.classList.add('hidden');
});

confirmPass.addEventListener('focus', () => { if(confirmPass.value !== "") matchDiv.classList.remove('hidden'); });
confirmPass.addEventListener('input', () => {
    const val = confirmPass.value;
    const matchEl = document.getElementById('match');
    const bullet = matchEl.querySelector('span');

    if (val === "") {
        matchDiv.classList.add('hidden');
    } else {
        matchDiv.classList.remove('hidden');
        if (val === newPass.value) {
            matchEl.className = "text-xs valid-text";
            bullet.textContent = "✓";
        } else {
            matchEl.className = "text-xs invalid-text";
            bullet.textContent = "•";
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

resetBtn.addEventListener('click', () => {
    document.getElementById('dimOverlay').classList.remove('hidden');
    document.getElementById('successDialog').classList.remove('hidden');
});