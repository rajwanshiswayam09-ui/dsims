(function () {
  const THEMES = {
    dark: 'dark',
    light: 'light'
  };

  const STORAGE_KEY = 'theme-preference';

  function getTheme() {
    return localStorage.getItem(STORAGE_KEY) || THEMES.dark;
  }

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem(STORAGE_KEY, theme);
  }

  function initTheme() {
    const saved = getTheme();
    applyTheme(saved);
  }

  // Toggle theme
  function toggleTheme() {
    const current = getTheme();
    const newTheme = current === THEMES.dark ? THEMES.light : THEMES.dark;
    applyTheme(newTheme);
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initTheme);
  } else {
    initTheme();
  }

  // Export for global use
  window.ThemeAPI = {
    toggle: toggleTheme,
    set: applyTheme,
    get: getTheme
  };

  // Helper to update topbar profile info
  window.updateTopbarProfile = (user) => {
    if (!user) return;
    const nameEl = document.getElementById('userNameDisplay');
    const avatarImg = document.getElementById('topbarImg');
    const avatarIcon = document.getElementById('topbarIcon');

    if (nameEl) nameEl.textContent = user.name || 'Admin';
    
    if (user.profilePic && avatarImg && avatarIcon) {
      avatarImg.src = user.profilePic;
      avatarImg.style.display = 'block';
      avatarIcon.style.display = 'none';
    } else if (avatarImg && avatarIcon) {
      avatarImg.style.display = 'none';
      avatarIcon.style.display = 'block';
    }
  };

  // Global Toast Notification System
  window.showToast = (message, type = 'success') => {
    let container = document.getElementById('toastContainer');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toastContainer';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    const icon = type === 'success' ? 'check-circle' : (type === 'error' ? 'exclamation-circle' : 'info-circle');
    
    toast.innerHTML = `
      <i class="fas fa-${icon}"></i>
      <div class="toast-content">
        <p style="margin: 0; font-weight: 600; font-size: 0.875rem;">${type.charAt(0).toUpperCase() + type.slice(1)}</p>
        <p style="margin: 0; font-size: 0.8125rem; opacity: 0.9;">${message}</p>
      </div>
    `;

    container.appendChild(toast);
    
    // Trigger animation
    setTimeout(() => toast.classList.add('active'), 10);

    // Auto-remove
    const timer = setTimeout(() => {
      toast.classList.remove('active');
      setTimeout(() => toast.remove(), 300);
    }, 4000);

    // Allow manual close on click
    toast.style.cursor = 'pointer';
    toast.onclick = () => {
      clearTimeout(timer);
      toast.classList.remove('active');
      setTimeout(() => toast.remove(), 300);
    };
  };
})();