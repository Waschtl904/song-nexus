"use strict";

// ============================================================================
// 🎨 UI UTILITIES – Central UI Management
// ✅ UPDATED: Full integration with Auth + Tracks + Theme + A11y
// ============================================================================

const UI = {
    /**
     * Initialize UI module
     */
    init() {
        console.log('🎨 UI module initializing...');
        this.initTheme();
        this.setupThemeToggle();
        console.log('✅ UI module initialized');
    },

    // ========================================================================
    // 🌙 THEME MANAGEMENT
    // ========================================================================

    /**
     * Initialize theme from localStorage or system preference
     */
    initTheme() {
        const savedTheme = localStorage.getItem('nexus-theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
        this.updateThemeButton(savedTheme);
        console.log(`🎨 Theme initialized: ${savedTheme}`);
    },

    /**
     * Setup theme toggle button
     */
    setupThemeToggle() {
        const themeToggle = document.querySelector('.theme-toggle') || document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', () => this.toggleTheme());
            themeToggle.setAttribute('title', 'Toggle dark/light mode');
        }
    },

    /**
     * Toggle between dark and light theme
     */
    toggleTheme() {
        const html = document.documentElement;
        const currentTheme = html.getAttribute('data-theme') || 'dark';
        const newTheme = currentTheme === 'light' ? 'dark' : 'light';

        html.setAttribute('data-theme', newTheme);
        html.setAttribute('data-color-scheme', newTheme);
        localStorage.setItem('nexus-theme', newTheme);

        this.updateThemeButton(newTheme);
        console.log(`🎨 Theme switched to: ${newTheme}`);
    },

    /**
     * Update theme toggle button appearance
     */
    updateThemeButton(theme) {
        const btn = document.querySelector('.theme-toggle') || document.getElementById('themeToggle');
        if (btn) {
            btn.textContent = theme === 'light' ? '🌙' : '☀️';
            btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
        }
    },

    // ========================================================================
    // 📊 STATUS MESSAGES
    // ========================================================================

    /**
     * Show status message
     * @param {string} elementId - ID of status element
     * @param {string} message - Message text
     * @param {string} type - 'success', 'error', 'info', 'loading'
     */
    showStatus(elementId, message, type = 'info') {
        try {
            const el = document.getElementById(elementId);
            if (el) {
                el.textContent = message;
                el.className = `status-message ${type}`;
                el.style.display = 'block';
                el.setAttribute('role', 'alert');
                el.setAttribute('aria-live', 'polite');

                if (type !== 'loading') {
                    setTimeout(() => {
                        el.style.display = 'none';
                    }, 4000);
                }
            } else {
                console.log(`[${type.toUpperCase()}] ${message}`);
            }
        } catch (err) {
            console.warn('⚠️ Status display error:', err);
        }
    },

    /**
     * Show toast notification
     */
    showToast(message, type = 'info', duration = 3000) {
        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;
        toast.textContent = message;
        toast.setAttribute('role', 'status');
        toast.setAttribute('aria-live', 'polite');

        document.body.appendChild(toast);

        setTimeout(() => {
            toast.style.opacity = '0';
            setTimeout(() => toast.remove(), 300);
        }, duration);
    },

    // ========================================================================
    // 🗂️ TAB MANAGEMENT
    // ========================================================================

    /**
     * Switch between tabs
     * @param {string} tabName - Tab ID to activate
     */
    switchTab(tabName) {
        try {
            // Deactivate all tabs
            document.querySelectorAll('.tab-content').forEach(tab => {
                tab.classList.remove('active');
                tab.setAttribute('aria-hidden', 'true');
            });

            // Deactivate all buttons
            document.querySelectorAll('.tab-btn').forEach(btn => {
                btn.classList.remove('active');
                btn.setAttribute('aria-selected', 'false');
            });

            // Activate selected tab
            const tabEl = document.getElementById(tabName + '-tab') || document.getElementById(tabName);
            if (tabEl) {
                tabEl.classList.add('active');
                tabEl.setAttribute('aria-hidden', 'false');
            }

            // Activate selected button
            const btnEl = document.querySelector(`[data-tab="${tabName}"]`);
            if (btnEl) {
                btnEl.classList.add('active');
                btnEl.setAttribute('aria-selected', 'true');
                btnEl.focus();
            }

            console.log(`📑 Switched to tab: ${tabName}`);

        } catch (err) {
            console.warn('⚠️ Tab switch error:', err);
        }
    },

    // ========================================================================
    // 🔐 AUTH SECTION MANAGEMENT
    // ========================================================================

    /**
     * Show/hide auth section
     */
    toggleAuthSection(show) {
        const el = document.getElementById('authSection');
        if (el) {
            el.classList.toggle('active', show !== undefined ? show : !el.classList.contains('active'));
        }
    },

    /**
     * Show/hide user section
     */
    toggleUserSection(show) {
        const el = document.getElementById('userSection');
        if (el) {
            el.classList.toggle('active', show !== undefined ? show : !el.classList.contains('active'));
        }
    },

    /**
     * Update user card display
     */
    updateUserCard(username, email, totalPlays = 0, totalSpent = 0) {
        try {
            const usernameEl = document.getElementById('displayUsername');
            const emailEl = document.getElementById('displayEmail');
            const playsEl = document.getElementById('totalPlays');
            const spentEl = document.getElementById('totalSpent');

            if (usernameEl) usernameEl.textContent = username || '-';
            if (emailEl) emailEl.textContent = email || '-';
            if (playsEl) playsEl.textContent = totalPlays || '0';
            if (spentEl) spentEl.textContent = '€' + (parseFloat(totalSpent) || 0).toFixed(2);

            console.log('👤 User card updated:', { username, email, totalPlays, totalSpent });

        } catch (err) {
            console.warn('⚠️ Update user card error:', err);
        }
    },

    // ========================================================================
    // 📍 TRACK BROWSER SECTION
    // ========================================================================

    /**
     * Show/hide track browser
     */
    toggleTrackBrowser(show) {
        const el = document.getElementById('trackBrowserSection');
        if (el) {
            el.style.display = (show !== undefined ? show : !el.style.display) ? 'block' : 'none';
        }
    },

    // ========================================================================
    // 🔲 MODAL MANAGEMENT
    // ========================================================================

    /**
     * Open modal
     */
    openModal(modalId) {
        try {
            const el = document.getElementById(modalId);
            if (el) {
                el.classList.add('active');
                el.style.display = 'flex';
                el.setAttribute('aria-hidden', 'false');

                // Focus first focusable element
                const firstFocusable = el.querySelector('button, input, a');
                if (firstFocusable) {
                    setTimeout(() => firstFocusable.focus(), 100);
                }

                console.log(`🔓 Modal opened: ${modalId}`);
            }
        } catch (err) {
            console.warn('⚠️ Open modal error:', err);
        }
    },

    /**
     * Close modal
     */
    closeModal(modalId) {
        try {
            const el = document.getElementById(modalId);
            if (el) {
                el.classList.remove('active');
                el.style.display = 'none';
                el.setAttribute('aria-hidden', 'true');
                console.log(`🔒 Modal closed: ${modalId}`);
            }
        } catch (err) {
            console.warn('⚠️ Close modal error:', err);
        }
    },

    /**
     * Toggle modal visibility
     */
    toggleModal(modalId) {
        const el = document.getElementById(modalId);
        if (el && el.classList.contains('active')) {
            this.closeModal(modalId);
        } else {
            this.openModal(modalId);
        }
    },

    /**
     * Setup modal close on ESC key
     */
    setupModalKeyboard(modalId) {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal(modalId);
            }
        });
    },

    // ========================================================================
    // 🗑️ RESET PLAY HISTORY
    // ========================================================================

    /**
     * Show reset play history confirmation modal
     */
    showResetHistoryModal() {
        try {
            // Create modal
            const modal = document.createElement('div');
            modal.id = 'resetHistoryModal';
            modal.className = 'modal-overlay';
            modal.setAttribute('role', 'alertdialog');
            modal.setAttribute('aria-labelledby', 'resetHistoryTitle');
            modal.setAttribute('aria-modal', 'true');

            modal.innerHTML = `
                <div class="modal-content" style="max-width: 400px;">
                    <h2 id="resetHistoryTitle">🗑️ Delete Play History?</h2>
                    <p style="color: var(--text-secondary); margin: 16px 0;">
                        This will permanently delete <strong>ALL</strong> play history entries.
                    </p>
                    <p style="color: var(--accent-pink); font-weight: 600; margin: 16px 0;">
                        ⚠️ This action cannot be undone!
                    </p>

                    <div style="display: flex; gap: 10px; margin-top: 20px;">
                        <button id="confirmResetBtn" class="button" style="flex: 1;">
                            🗑️ Yes, Delete
                        </button>
                        <button id="cancelResetBtn" class="button button-secondary" style="flex: 1;">
                            ❌ Cancel
                        </button>
                    </div>
                </div>
            `;

            document.body.appendChild(modal);

            // Setup listeners
            const confirmBtn = document.getElementById('confirmResetBtn');
            const cancelBtn = document.getElementById('cancelResetBtn');

            confirmBtn.addEventListener('click', async () => {
                await this.resetPlayHistory();
                this.closeResetHistoryModal();
            });

            cancelBtn.addEventListener('click', () => {
                this.closeResetHistoryModal();
            });

            // Close on overlay click
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeResetHistoryModal();
                }
            });

            console.log('🗑️ Reset history modal shown');

        } catch (err) {
            console.error('❌ Show reset modal error:', err);
        }
    },

    /**
     * Close reset history modal
     */
    closeResetHistoryModal() {
        const modal = document.getElementById('resetHistoryModal');
        if (modal) {
            modal.remove();
            console.log('🗑️ Reset modal closed');
        }
    },

    /**
     * Delete play history via API
     */
    async resetPlayHistory() {
        try {
            console.log('🗑️ Deleting play history...');

            // Get token
            let token = null;
            if (typeof Auth !== 'undefined') {
                token = Auth.getToken();
            } else {
                token = localStorage.getItem('auth_token');
            }

            if (!token) {
                this.showToast('❌ Not authenticated', 'error');
                return;
            }

            // Get API base
            let apiBase = 'https://localhost:3000/api';
            if (typeof window.songNexusConfig !== 'undefined') {
                apiBase = window.songNexusConfig.getApiBaseUrl();
            }

            // Delete play history
            const response = await fetch(`${apiBase}/play-history/clear`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`Failed: ${response.status}`);
            }

            const data = await response.json();
            console.log('✅ Play history deleted:', data);

            this.showToast(`✅ ${data.deleted_count || 0} entries deleted`, 'success');

            // Reload play history UI if available
            if (typeof window.loadPlayHistory === 'function') {
                window.loadPlayHistory();
            }

        } catch (err) {
            console.error('❌ Reset play history error:', err);
            this.showToast(`❌ Error: ${err.message}`, 'error');
        }
    },

    // ========================================================================
    // 🛠️ UTILITY FUNCTIONS
    // ========================================================================

    /**
     * Escape HTML
     */
    escapeHtml(text) {
        if (!text) return '';
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return String(text).replace(/[&<>"']/g, m => map[m]);
    },

    /**
     * Format currency
     */
    formatCurrency(amount, currency = 'EUR') {
        return new Intl.NumberFormat('de-AT', {
            style: 'currency',
            currency: currency
        }).format(amount);
    },

    /**
     * Format time (seconds to MM:SS)
     */
    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    /**
     * Format number with K/M suffix
     */
    formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return num.toString();
    },

    /**
     * Get user ID from JWT token
     */
    getUserIdFromToken() {
        try {
            let token = null;
            if (typeof Auth !== 'undefined') {
                token = Auth.getToken();
            } else {
                token = localStorage.getItem('auth_token');
            }

            if (!token) {
                console.warn('⚠️ No token found');
                return null;
            }

            const payload = token.split('.')[1];
            if (!payload) {
                console.warn('⚠️ Invalid token format');
                return null;
            }

            const decoded = JSON.parse(atob(payload));
            return decoded.id || decoded.user_id || null;

        } catch (err) {
            console.warn('⚠️ Error decoding token:', err);
            return null;
        }
    }
};

// ========================================================================
// INITIALIZE ON LOAD
// ========================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM ready, initializing UI...');
        UI.init();
    });
} else {
    UI.init();
}

// Make global
window.UI = UI;