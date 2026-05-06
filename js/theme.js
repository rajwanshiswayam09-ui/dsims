(function () {
  const THEMES = {
    dark: 'dark',
    light: 'light'
  };

  function applyTheme(theme) {
    document.documentElement.setAttribute('data-theme', theme);
  }

  function initTheme() {
    applyTheme(THEMES.dark);
  }

  function initBottomNav() {
    if (window.innerWidth > 768) return;
    
    const existing = document.querySelector('.bottom-nav');
    if (existing) return;

    const nav = document.createElement('div');
    nav.className = 'bottom-nav';
    
    const items = [
      { href: 'dashboard.html', icon: 'fas fa-th-large', label: 'Home' },
      { href: 'invoice.html', icon: 'fas fa-plus-circle', label: 'New Sale' },
      { href: 'analytics.html', icon: 'fas fa-chart-pie', label: 'Stats' },
      { href: 'shop-details.html', icon: 'fas fa-user-cog', label: 'Profile' }
    ];

    const currentPath = window.location.pathname.split('/').pop() || 'index.html';

    nav.innerHTML = items.map(item => `
      <a href="${item.href}" class="bottom-nav-item ${currentPath === item.href ? 'active' : ''}">
        <i class="${item.icon}"></i>
        <span>${item.label}</span>
      </a>
    `).join('');

    document.body.appendChild(nav);
  }

  // Sidebar Toggle logic for mobile
  function initSidebar() {
    const sidebar = document.getElementById('sidebar');
    const toggleBtn = document.querySelector('.menu-toggle');
    if (!sidebar) return;

    // Create backdrop if it doesn't exist
    let backdrop = document.querySelector('.sidebar-backdrop');
    if (!backdrop) {
      backdrop = document.createElement('div');
      backdrop.className = 'sidebar-backdrop';
      document.body.appendChild(backdrop);
    }

    const toggle = () => {
      sidebar.classList.toggle('active');
      backdrop.classList.toggle('active');
      document.body.style.overflow = sidebar.classList.contains('active') ? 'hidden' : '';
    };

    if (toggleBtn) {
      toggleBtn.addEventListener('click', toggle);
    }

    backdrop.addEventListener('click', toggle);

    // Close sidebar on navigation (for mobile)
    const navItems = sidebar.querySelectorAll('.nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', () => {
        if (window.innerWidth <= 1024) {
          sidebar.classList.remove('active');
          backdrop.classList.remove('active');
          document.body.style.overflow = '';
        }
      });
    });
  }

  // Initialize on DOM ready
  if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        initTheme();
        initSidebar();
        initBottomNav();
      });
    } else {
      initTheme();
      initSidebar();
      initBottomNav();
    }

  // Export for global use
  window.ThemeAPI = {
    set: applyTheme,
    get: () => THEMES.dark
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

    // Hide user name on mobile topbar
    if (nameEl) {
      if (window.innerWidth <= 480) {
        nameEl.style.display = 'none';
      } else {
        nameEl.style.display = 'block';
      }
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
