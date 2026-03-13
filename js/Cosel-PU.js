const form = document.getElementById('updatePasswordForm');
const oldInput = document.getElementById('oldPassword');
const newInput = document.getElementById('newPassword');
const confirmInput = document.getElementById('confirmPassword');
const submitBtn = document.getElementById('submitBtn');
const validationBox = document.getElementById('newPasswordValidations');
const matchText = document.getElementById('v-match');

const CORRECT_OLD_PASSWORD = "cosel123";

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

function checkAllValid() {
    const val = newInput.value;
    const isAllNewValid = checks.length(val) && checks.case(val) && checks.special(val) && checks.number(val);
    const isMatch = val === confirmInput.value && confirmInput.value !== "";
    const isOldFilled = oldInput.value !== "";

    if (isAllNewValid && isMatch && isOldFilled) {
        submitBtn.disabled = false;
        submitBtn.classList.remove('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.add('btn-active', 'cursor-pointer');
    } else {
        submitBtn.disabled = true;
        submitBtn.classList.add('bg-gray-400', 'cursor-not-allowed');
        submitBtn.classList.remove('btn-active', 'cursor-pointer');
    }
}

newInput.addEventListener('focus', () => { validationBox.classList.remove('hidden'); });

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
    if (val === "" || isAllValid) { validationBox.classList.add('hidden'); }
});

confirmInput.addEventListener('focus', () => { if(confirmInput.value !== "") matchText.classList.remove('hidden'); });

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
    oldInput.classList.remove('input-error');
    document.getElementById('errorToast').classList.add('hidden');
    checkAllValid();
});

form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (oldInput.value !== CORRECT_OLD_PASSWORD) {
        document.getElementById('errorToast').classList.remove('hidden');
        oldInput.classList.add('input-error');
        
        // REVISION FIX: Hide validations upon error reset
        form.reset();
        matchText.classList.add('hidden'); 
        validationBox.classList.add('hidden');
        
        checkAllValid();
        return;
    }

    document.getElementById('dimOverlay').classList.remove('hidden');
    document.getElementById('successToast').classList.remove('hidden');
    setTimeout(() => { window.location.href = "Cosel-Homepage.html"; }, 2000);
});

document.querySelectorAll('.cursor-pointer').forEach((toggle, index) => {
    toggle.addEventListener('click', function() {
        const inputs = [oldInput, newInput, confirmInput];
        const type = inputs[index].getAttribute('type') === 'password' ? 'text' : 'password';
        inputs[index].setAttribute('type', type);
        this.classList.toggle('text-[#0098E0]');
    });
});