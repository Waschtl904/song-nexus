// ============================================================================
// 🎨 UI.JS v8.0 - ES6 MODULE
// UI Helpers + DOM Management + Theme Toggle + Accessibility
// ============================================================================

import { Auth } from './auth.js';

export const UI = {
    init() {
        console.log('🎨 UI module initializing...');
        this.setupTheme();
        this.setupAccessibility();
        console.log('✅ UI module initialized');
    },

    setupTheme() {
        const themeToggle = document.getElementById('themeToggle');
        if (!themeToggle) return;

        themeToggle.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();

            const current = document.documentElement.getAttribute('data-theme') || 'dark';
            const next = current === 'dark' ? 'light' : 'dark';

            document.documentElement.setAttribute('data-theme', next);
            document.documentElement.setAttribute('data-color-scheme', next);
            localStorage.setItem('theme', next);

            this.updateThemeButton(next);
            console.log(`🎨 Theme switched to: ${next}`);
        });

        // Load saved theme
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
        this.updateThemeButton(savedTheme);
    },

    updateThemeButton(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
            btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        }
    },

    setupAccessibility() {
        // Tab navigation
        const tabs = document.querySelectorAll('[role="tab"]');
        if (tabs.length > 0) {
            tabs.forEach((tab, index) => {
                tab.addEventListener('keydown', (e) => {
                    let newIndex = index;

                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        newIndex = (index + 1) % tabs.length;
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        newIndex = (index - 1 + tabs.length) % tabs.length;
                    } else if (e.key === 'Home') {
                        e.preventDefault();
                        newIndex = 0;
                    } else if (e.key === 'End') {
                        e.preventDefault();
                        newIndex = tabs.length - 1;
                    } else {
                        return;
                    }

                    tabs[newIndex].focus();
                    tabs[newIndex].click();
                    console.log(`⌨️ Tab navigation: ${newIndex}`);
                });
            });
        }

        // Modal escape key
        const authModal = document.getElementById('authModal');
        if (authModal) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && authModal.style.display !== 'none') {
                    console.log('⌨️ ESC pressed - closing modal');
                    this.toggleModal(authModal);
                    const authToggle = document.getElementById('authToggle');
                    if (authToggle) authToggle.focus();
                }
            });
        }

        console.log('✅ Accessibility features enabled');
    },

    toggleModal(modal) {
        if (!modal) return;

        const isHidden = modal.style.display === 'none';
        modal.style.display = isHidden ? 'flex' : 'none';
        modal.setAttribute('aria-hidden', !isHidden);

        if (isHidden) {
            const firstFocusable = modal.querySelector('button, input, a');
            if (firstFocusable) firstFocusable.focus();
        }

        console.log(`${isHidden ? '📖 Modal opened' : '🔐 Modal closed'}`);
    },

    updateAuthUI() {
        const token = Auth.getToken();
        const user = Auth.getUser();

        const authToggle = document.getElementById('authToggle');
        const userInfo = document.getElementById('userInfo');

        if (token && user) {
            if (authToggle) authToggle.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                const userDisplay = document.getElementById('userDisplay');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${user.username || user.email}`;
                }
            }
            console.log(`👤 User logged in: ${user.email}`);
        } else {
            if (authToggle) authToggle.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
            console.log('👤 User logged out');
        }
    },

    showNotification(message, type = 'info', duration = 3000) {
        const notification = document.createElement('div');
        notification.className = `notification notification--${type}`;
        notification.setAttribute('role', 'alert');
        notification.setAttribute('aria-live', 'polite');
        notification.textContent = message;
        notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 16px 20px;
      border-radius: 8px;
      background: ${type === 'error' ? '#c01530' : '#00cc77'};
      color: white;
      z-index: 10000;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
      animation: slideIn 0.3s ease;
    `;

        document.body.appendChild(notification);

        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, duration);
    },

    showError(message, duration = 3000) {
        this.showNotification(`❌ ${message}`, 'error', duration);
    },

    showSuccess(message, duration = 3000) {
        this.showNotification(`✅ ${message}`, 'success', duration);
    },

    showLoading(message = 'Loading...') {
        this.showNotification(`⏳ ${message}`, 'info', 10000);
    },

    switchTab(tabName, event) {
        if (event) event.preventDefault();

        document.querySelectorAll('.tab-btn').forEach(b => {
            const isActive = b.getAttribute('data-tab') === tabName;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive);
        });

        document.querySelectorAll('.tab-content').forEach(t => {
            const isActive = t.id === tabName + '-tab';
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-hidden', !isActive);
        });

        console.log(`📑 Switched to tab: ${tabName}`);
    },

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    formatDate(dateStr) {
        const date = new Date(dateStr);
        return date.toLocaleDateString();
    },

    disableElement(element) {
        if (!element) return;
        element.disabled = true;
        element.style.opacity = '0.5';
        element.style.cursor = 'not-allowed';
    },

    enableElement(element) {
        if (!element) return;
        element.disabled = false;
        element.style.opacity = '1';
        element.style.cursor = 'pointer';
    },

    showSpinner(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.innerHTML = '<div class="spinner"></div>';
    },

    hideSpinner(elementId) {
        const element = document.getElementById(elementId);
        if (!element) return;
        element.innerHTML = '';
    },

    validateEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    validatePassword(password) {
        return password && password.length >= 8;
    },
};

console.log('✅ UI v8.0 loaded - ES6 Module');