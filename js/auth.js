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
  if (confirmPasswordInput && confirmPasswordInput.parentElement && confirmPasswordInput.parentElement.parentElement) {
    confirmPasswordInput.parentElement.parentElement.style.display = isSignup ? 'block' : 'none';
  }
  signupTab.classList.toggle('active', isSignup);
  loginTab.classList.toggle('active', !isSignup);
  setMessage(null, '');
};

signupTab.addEventListener('click', () => switchMode('signup'));
loginTab.addEventListener('click', () => switchMode('login'));

// Handle query params for mode
document.addEventListener('DOMContentLoaded', () => {
  const params = new URLSearchParams(window.location.search);
  const initialMode = params.get('mode');
  if (initialMode === 'login' || initialMode === 'signup') {
    switchMode(initialMode);
  }
});

const hashPassword = async (password) => {
  if (!window.crypto || !window.crypto.subtle) {
    throw new Error('This browser does not support secure password hashing (SHA-256).');
  }
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
};

authForm.addEventListener('submit', async (e) => {
  e.preventDefault();
  setMessage(null, '');

  const email = emailInput.value.trim().toLowerCase();
  const password = passwordInput.value.trim();
  const confirmPassword = confirmPasswordInput ? confirmPasswordInput.value.trim() : '';

  if (!emailValid(email)) {
    setMessage('error', 'Please enter a valid email address.');
    return;
  }
  if (password.length < 6) {
    setMessage('error', 'Password must be at least 6 characters.');
    return;
  }

  try {
    if (mode === 'signup') {
      const name = nameInput.value.trim();
      if (!name) {
        setMessage('error', 'Please enter your full name.');
        return;
      }
      if (!confirmPassword) {
        setMessage('error', 'Please confirm your password.');
        return;
      }
      if (password !== confirmPassword) {
        setMessage('error', 'Passwords do not match.');
        return;
      }

      const existing = await StorageAPI.findUser(email);
      if (existing) {
        setMessage('error', 'An account with this email already exists. Please log in.');
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
      const hasShop = await StorageAPI.getShopDetails();
      setMessage('success', 'Account created successfully. Redirecting...');
      window.location.href = hasShop ? 'dashboard.html' : 'setup.html';
    } else {
      const user = await StorageAPI.findUser(email);
      if (!user) {
        setMessage('error', 'Incorrect email or password.');
        return;
      }

      const passwordHash = await hashPassword(password);
      if (user.passwordHash !== passwordHash) {
        setMessage('error', 'Incorrect email or password.');
        return;
      }

      await StorageAPI.setCurrentUser(user);
      const hasShop = await StorageAPI.getShopDetails();
      setMessage('success', 'Login successful. Redirecting...');
      window.location.href = hasShop ? 'dashboard.html' : 'setup.html';
    }
  } catch (error) {
    setMessage('error', error.message || 'Something went wrong. Please try again.');
  } finally {
    passwordInput.value = '';
    if (confirmPasswordInput) {
      confirmPasswordInput.value = '';
    }
  }
});

// Google Sign-In
const handleGoogleSignIn = async () => {
  setMessage(null, '');
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);
    const user = result.user;

    const normalizedEmail = user.email.toLowerCase();
    const existingUser = await StorageAPI.findUser(normalizedEmail);

    if (!existingUser) {
      const record = {
        name: user.displayName || 'User',
        email: normalizedEmail,
        passwordHash: null,
        uid: user.uid,
        createdAt: new Date().toISOString()
      };
      await db.collection('users').doc(normalizedEmail).set(record);
    }

    const userRecord = await StorageAPI.findUser(normalizedEmail);
    await StorageAPI.setCurrentUser(userRecord);

    setMessage('success', 'Login successful. Redirecting...');
    const hasShop = await StorageAPI.getShopDetails();
    setTimeout(() => {
      window.location.href = hasShop ? 'dashboard.html' : 'setup.html';
    }, 1000);
  } catch (error) {
    setMessage('error', error.message || 'Google sign-in failed. Please try again.');
  }
};

if (googleSignInBtn) {
  googleSignInBtn.addEventListener('click', handleGoogleSignIn);
}

// Auto redirect if already logged in
(async () => {
  const current = await StorageAPI.getCurrentUser();
  if (current) {
    const hasShop = await StorageAPI.getShopDetails();
    window.location.href = hasShop ? 'dashboard.html' : 'setup.html';
  }
})();
