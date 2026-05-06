const nameField = document.getElementById('nameField');
const helperText = document.getElementById('helperText');
const signupTab = document.getElementById('signupTab');
const loginTab = document.getElementById('loginTab');
const authForm = document.getElementById('authForm');
const nameInput = document.getElementById('name');
const emailInput = document.getElementById('email');
const passwordInput = document.getElementById('password');
const confirmPasswordInput = document.getElementById('confirmPassword');
const messageBox = document.getElementById('authMessage');

let mode = 'signup';

const emailValid = (email) => /\S+@\S+\.\S+/.test(email);

const setMessage = (type, text) => {
  if (!messageBox) return;
  messageBox.textContent = text || '';
  messageBox.classList.remove('error', 'success');
  if (text) {
    messageBox.classList.add(type === 'success' ? 'success' : 'error');
  }
};

const switchMode = (next) => {
  mode = next;
  const isSignup = mode === 'signup';
  nameField.style.display = isSignup ? 'block' : 'none';
  if (confirmPasswordInput?.parentElement?.parentElement) {
    confirmPasswordInput.parentElement.parentElement.style.display = isSignup ? 'block' : 'none';
  }
  signupTab.classList.toggle('active', isSignup);
  loginTab.classList.toggle('active', !isSignup);
  setMessage(null, '');
};

signupTab.addEventListener('click', () => switchMode('signup'));
loginTab.addEventListener('click', () => switchMode('login'));

document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get('mode');
  if (initialMode === 'login' || initialMode === 'signup') {
    switchMode(initialMode);
  }
});

// ================= NORMAL LOGIN / SIGNUP =================
authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage(null, '');

  const email = (emailInput.value || "").trim().toLowerCase();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput?.value?.trim() || "";

  if (!emailValid(email)) {
    setMessage('error', 'Please enter a valid email.');
    return;
  }

  if (password.length < 6) {
    setMessage('error', 'Password must be at least 6 characters.');
    return;
  }

  try {
    if (mode === 'signup') {
      const name = nameInput.value.trim();

      if (!name) return setMessage('error', 'Enter your name.');
      if (!confirmPassword) return setMessage('error', 'Confirm password.');
      if (password !== confirmPassword) return setMessage('error', 'Passwords do not match.');

      // Sign up with Firebase Auth
      const userCredential = await firebase.auth().createUserWithEmailAndPassword(email, password);
      
      // Update display name
      await userCredential.user.updateProfile({
        displayName: name
      });
      
      // Set current user
      await StorageAPI.setCurrentUser(userCredential.user);

    } else {
      // Sign in with Firebase Auth
      const userCredential = await firebase.auth().signInWithEmailAndPassword(email, password);
      await StorageAPI.setCurrentUser(userCredential.user);
    }

    // Check if setup is completed
    const hasCompletedSetup = await StorageAPI.hasCompletedSetup();
    setMessage('success', 'Success! Redirecting...');
    window.location.href = hasCompletedSetup ? 'dashboard.html' : 'setup.html';

  } catch (err) {
    setMessage('error', err.message || 'Something went wrong.');
  }
});

// ================= AUTO REDIRECT =================
firebase.auth().onAuthStateChanged(async (user) => {
  if (user) {
    await StorageAPI.setCurrentUser(user);
    const hasCompletedSetup = await StorageAPI.hasCompletedSetup();
    window.location.href = hasCompletedSetup ? 'dashboard.html' : 'setup.html';
  }
});
