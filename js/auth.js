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
const googleSignInBtn = document.getElementById('googleSignInBtn');

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

const hashPassword = async (password) => {
  if (!window.crypto?.subtle) {
    throw new Error('Browser does not support secure hashing.');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
};

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

      const existing = await StorageAPI.findUser(email);
      if (existing) {
        setMessage('error', 'Account exists. Please login.');
        switchMode('login');
        return;
      }

      const passwordHash = await hashPassword(password);

      const userRecord = await StorageAPI.addUser({
        name,
        email,
        passwordHash
      });

      await StorageAPI.setCurrentUser(userRecord);

    } else {
      const user = await StorageAPI.findUser(email);
      if (!user) return setMessage('error', 'Invalid credentials.');

      const passwordHash = await hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        return setMessage('error', 'Invalid credentials.');
      }

      await StorageAPI.setCurrentUser(user);
    }

    const hasShop = await StorageAPI.getShopDetails();
    setMessage('success', 'Success! Redirecting...');
    window.location.href = hasShop ? 'dashboard.html' : 'setup.html';

  } catch (err) {
    setMessage('error', err.message || 'Something went wrong.');
  }
});

// ================= GOOGLE LOGIN (FIXED 🔥) =================
const handleGoogleSignIn = async () => {
  setMessage(null, '');

  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);
    const user = result.user;

    const email = (user.email || "").toLowerCase();
    if (!email) throw new Error('Failed to get email from Google.');

    let userRecord = await StorageAPI.findUser(email);

    // Create user if not exists
    if (!userRecord) {
      userRecord = {
        name: user.displayName || "User",
        email: email,
        uid: user.uid,
        passwordHash: null,
        createdAt: new Date().toISOString()
      };

      // Save to Firebase
      if (typeof db !== "undefined") {
        await db.collection('users').doc(email).set(userRecord);
      }
    }

    await StorageAPI.setCurrentUser(userRecord);

    const hasShop = await StorageAPI.getShopDetails();

    setMessage('success', 'Google login successful!');

    setTimeout(() => {
      window.location.href = hasShop ? 'dashboard.html' : 'setup.html';
    }, 1000);

  } catch (error) {
    console.error(error);
    setMessage('error', error.message || 'Google login failed.');
  }
};

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', handleGoogleSignIn);
}

// ================= AUTO REDIRECT =================
(async () => {
  const current = await StorageAPI.getCurrentUser();
  if (current) {
    const hasShop = await StorageAPI.getShopDetails();
    window.location.href = hasShop ? 'dashboard.html' : 'setup.html';
  }
})();