"use strict";

// ========================================================================
// 🎨 UI UTILITIES
// ========================================================================

const UI = {
    // Theme Toggle
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';
        html.setAttribute('data-theme', newTheme);
        localStorage.setItem('nexus-theme', newTheme);
        document.querySelector('.theme-toggle').textContent = newTheme === 'light' ? '☀️' : '🌙';
    },

    // Init Theme
    initTheme() {
        const savedTheme = localStorage.getItem('nexus-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.querySelector('.theme-toggle').textContent = savedTheme === 'light' ? '☀️' : '🌙';
    },

    // Show Status Message
    showStatus(elementId, message, type) {
        const el = document.getElementById(elementId);
        if (el) {
            el.textContent = message;
            el.className = `status-message ${type}`;
        }
    },

    // Escape HTML
    escapeHtml(text) {
        const map = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' };
        return text.replace(/[&<>"']/g, m => map[m]);
    },

    // Switch Tabs
    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => {
            tab.classList.remove('active');
        });
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.remove('active');
        });

        const tabEl = document.getElementById(tabName);
        if (tabEl) {
            tabEl.classList.add('active');
        }

        event.target.classList.add('active');
    },

    // Show/Hide Auth Section
    showAuthSection(show = true) {
        const el = document.getElementById('authSection');
        if (el) {
            if (show) {
                el.classList.add('active');
            } else {
                el.classList.remove('active');
            }
        }
    },

    // Show/Hide User Section
    showUserSection(show = true) {
        const el = document.getElementById('userSection');
        if (el) {
            el.classList.toggle('active', show);
        }
    },

    // Show/Hide Track Browser
    showTrackBrowser(show = true) {
        const el = document.getElementById('trackBrowserSection');
        if (el) {
            el.style.display = show ? 'block' : 'none';
        }
    },

    // Open Modal
    openModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.add('active');
        }
    },

    // Close Modal
    closeModal(modalId) {
        const el = document.getElementById(modalId);
        if (el) {
            el.classList.remove('active');
        }
    },

    // Update User Card
    updateUserCard(username, email, totalPlays, totalSpent) {
        const usernameEl = document.getElementById('displayUsername');
        const emailEl = document.getElementById('displayEmail');
        const playsEl = document.getElementById('totalPlays');
        const spentEl = document.getElementById('totalSpent');

        if (usernameEl) usernameEl.textContent = username || '-';
        if (emailEl) emailEl.textContent = email || '-';
        if (playsEl) playsEl.textContent = totalPlays || '0';
        if (spentEl) spentEl.textContent = '€' + (totalSpent || '0');
    }
};
