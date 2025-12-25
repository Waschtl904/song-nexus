// ============================================================================
// 🔐 AUTH.JS v9.2 - FIXED BUTTON ID
// WebAuthn (Biometric) + Password Registration/Login + Magic Link + Modal Setup
// ============================================================================

import { APIClient } from './api-client.js';
import { WebAuthn } from './webauthn.js';

// HELPER FUNCTIONS
function getAuthToken() {
    return localStorage.getItem('auth_token');
}

function setAuthToken(token) {
    if (token) localStorage.setItem('auth_token', token);
}

function clearAuthToken() {
    localStorage.removeItem('auth_token');
}

export const Auth = {
    user: null,
    token: null,

    // ========================================================================
    // INIT
    // ========================================================================

    init() {
        console.log('🔐 Auth module initializing...');
        this.token = getAuthToken();
        this.loadUserFromStorage();
        if (this.token) {
            console.log('✅ Token found, user may be logged in');
            this.updateUI();
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupAuthModal());
        } else {
            this.setupAuthModal();
        }
    },

    // ========================================================================
    // STORAGE
    // ========================================================================

    loadUserFromStorage() {
        try {
            const userJson = localStorage.getItem('user');
            if (userJson) {
                this.user = JSON.parse(userJson);
                console.log(`👤 User loaded: ${this.user.email}`);
            }
        } catch (err) {
            console.warn('⚠️ Could not load user from storage:', err);
        }
    },

    saveUserToStorage(user) {
        try {
            localStorage.setItem('user', JSON.stringify(user));
            console.log('💾 User saved to storage');
        } catch (err) {
            console.warn('⚠️ Could not save user:', err);
        }
    },

    getToken() {
        return this.token || getAuthToken();
    },

    getUser() {
        return this.user;
    },

    isAuthenticated() {
        return !!(this.token || getAuthToken());
    },

    // ============================================================================
    // 🎨 MODAL + TAB SETUP
    // ============================================================================

    setupAuthModal() {
        console.log('🎨 Setting up auth modal handlers...');

        // MODAL TOGGLE (Fixed ID: authButton)
        const authBtn = document.getElementById('authButton');
        if (authBtn) {
            authBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('authModal');
                if (modal) {
                    this.toggleAuthModal(modal);
                }
            });
            console.log('✅ Auth button setup');
        } else {
            // Fallback für alte ID, falls HTML nicht aktualisiert wurde
            const oldBtn = document.getElementById('authToggle');
            if (oldBtn) {
                console.warn('⚠️ Using old ID "authToggle". Please update HTML to "authButton".');
                oldBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    const modal = document.getElementById('authModal');
                    if (modal) this.toggleAuthModal(modal);
                });
            } else {
                console.warn('❌ Auth button not found (neither authButton nor authToggle)');
            }
        }

        // CLOSE BUTTON
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('authModal');
                if (modal) {
                    modal.style.display = 'none';
                }
            });
            console.log('✅ Modal close button setup');
        }

        // TAB SWITCHING
        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });

        // PASSWORD LOGIN
        const passwordLoginForm = document.getElementById('passwordLoginFormElement');
        if (passwordLoginForm) {
            passwordLoginForm.addEventListener('submit', async (e) => {
                await this.loginWithPassword(e);
            });
        }

        // Toggle to Registration
        const togglePasswordRegisterBtn = document.getElementById('togglePasswordRegisterBtn');
        if (togglePasswordRegisterBtn) {
            togglePasswordRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const loginForm = document.getElementById('passwordLoginForm');
                const registerForm = document.getElementById('passwordRegisterForm');
                if (loginForm && registerForm) {
                    loginForm.style.display = 'none';
                    registerForm.style.display = 'block';
                }
            });
        }

        // PASSWORD REGISTRATION
        const passwordRegisterForm = document.getElementById('passwordRegisterFormElement');
        if (passwordRegisterForm) {
            passwordRegisterForm.addEventListener('submit', async (e) => {
                await this.registerWithPassword(e);
            });
        }

        // Cancel Registration
        const cancelPasswordRegisterBtn = document.getElementById('cancelPasswordRegisterBtn');
        if (cancelPasswordRegisterBtn) {
            cancelPasswordRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const loginForm = document.getElementById('passwordLoginForm');
                const registerForm = document.getElementById('passwordRegisterForm');
                if (loginForm && registerForm) {
                    loginForm.style.display = 'block';
                    registerForm.style.display = 'none';
                }
            });
        }

        // WEBAUTHN HANDLERS
        const webauthnBtn = document.getElementById('webauthnBtn');
        if (webauthnBtn) {
            webauthnBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.authenticateWithBiometric();
            });
        }

        const toggleBioRegisterBtn = document.getElementById('toggleBioRegisterBtn');
        if (toggleBioRegisterBtn) {
            toggleBioRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                const bioRegisterModal = document.getElementById('bioRegisterModal');
                if (bioRegisterModal) {
                    const isHidden = bioRegisterModal.style.display === 'none' || bioRegisterModal.style.display === '';
                    bioRegisterModal.style.display = isHidden ? 'block' : 'none';
                }
            });
        }

        const registerBiometricBtn = document.getElementById('registerBiometricBtn');
        if (registerBiometricBtn) {
            registerBiometricBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.registerBiometric();
            });
        }

        // MAGIC LINK HANDLERS
        const magicLinkBtn = document.getElementById('magicLinkBtn');
        if (magicLinkBtn) {
            magicLinkBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.loginWithMagicLink();
            });
        }

        const magicVerifyBtn = document.getElementById('magicVerifyBtn');
        if (magicVerifyBtn) {
            magicVerifyBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const tokenEl = document.getElementById('magicToken');
                if (!tokenEl || !tokenEl.value.trim()) {
                    this.showAuthError('Token erforderlich');
                    return;
                }
                const result = await this.verifyMagicLinkManual(tokenEl.value.trim());
                if (result) {
                    this.closeAuthModal();
                }
            });
        }

        // LOGOUT
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.logout();
            });
        }

        console.log('✅ Auth modal handlers setup complete');
    },

    // ============================================================================
    // 🎨 MODAL HELPERS
    // ============================================================================

    toggleAuthModal(modal) {
        const isHidden = modal.style.display === 'none' || modal.style.display === '';
        modal.style.display = isHidden ? 'flex' : 'none';
    },

    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
        });

        document.querySelectorAll('.tab-content').forEach(content => {
            const isActive = content.id === `${tabName}-tab`;
            content.classList.toggle('active', isActive);
            content.style.display = isActive ? 'block' : 'none'; // Wichtig: display togglen!
            content.setAttribute('aria-hidden', !isActive);
        });
    },

    // ============================================================================
    // 🔐 PASSWORD LOGIN
    // ============================================================================

    async loginWithPassword(e) {
        e.preventDefault();
        try {
            console.log('📝 Password login attempt...');
            const emailEl = document.getElementById('loginEmail');
            const passwordEl = document.getElementById('loginPassword');
            const statusEl = document.getElementById('passwordStatus');

            if (!emailEl || !passwordEl) throw new Error('Form elements not found');

            const email = emailEl.value.trim();
            const password = passwordEl.value;

            if (!email || !password) {
                this.showStatus(statusEl, 'Bitte E-Mail und Passwort eingeben', 'error');
                return;
            }

            this.showStatus(statusEl, 'Anmeldung läuft...', 'loading');

            const response = await APIClient.post(
                '/auth/webauthn/authenticate-password',
                { email, password }
            );

            if (response.token) {
                this.token = response.token;
                setAuthToken(response.token);
                this.user = response.user;
                this.saveUserToStorage(response.user);

                this.showStatus(statusEl, 'Erfolgreich!', 'success');
                setTimeout(() => {
                    this.closeAuthModal();
                    this.updateUI();
                    this.showAuthSuccess(`✅ Willkommen ${response.user.username || response.user.email}!`);
                }, 800);

                return response;
            }

        } catch (err) {
            console.error('❌ Login error:', err.message);
            const statusEl = document.getElementById('passwordStatus');
            this.showStatus(statusEl, err.message, 'error');
        }
    },

    // ============================================================================
    // 🔐 PASSWORD REGISTRATION
    // ============================================================================

    async registerWithPassword(e) {
        e.preventDefault();
        try {
            console.log('📝 Registration attempt...');
            const emailEl = document.getElementById('regEmail');
            const usernameEl = document.getElementById('regUsername');
            const passwordEl = document.getElementById('regPassword');
            const confirmEl = document.getElementById('regPasswordConfirm');
            const statusEl = document.getElementById('registerStatus');

            const email = emailEl.value.trim();
            const username = usernameEl.value.trim();
            const password = passwordEl.value;
            const passwordConfirm = confirmEl.value;

            if (!email || !username || !password || !passwordConfirm) {
                this.showStatus(statusEl, 'Alle Felder ausfüllen', 'error');
                return;
            }

            if (password !== passwordConfirm) {
                this.showStatus(statusEl, 'Passwörter stimmen nicht überein', 'error');
                return;
            }

            this.showStatus(statusEl, 'Registrierung läuft...', 'loading');

            const response = await APIClient.post(
                '/auth/webauthn/register-password',
                { email, username, password, passwordConfirm }
            );

            if (response.token) {
                this.token = response.token;
                setAuthToken(response.token);
                this.user = response.user;
                this.saveUserToStorage(response.user);

                this.showStatus(statusEl, 'Registriert!', 'success');
                setTimeout(() => {
                    this.closeAuthModal();
                    this.updateUI();
                    this.showAuthSuccess(`✅ Willkommen ${response.user.username}!`);
                }, 800);

                return response;
            }

        } catch (err) {
            console.error('❌ Registration error:', err.message);
            const statusEl = document.getElementById('registerStatus');
            this.showStatus(statusEl, err.message, 'error');
        }
    },

    // ============================================================================
    // 👆 WEBAUTHN BIOMETRIC REGISTRATION
    // ============================================================================

    async registerBiometric() {
        try {
            const usernameEl = document.getElementById('bioRegUsername');
            const emailEl = document.getElementById('bioRegEmail');
            const statusEl = document.getElementById('bioStatus');

            const username = usernameEl.value.trim();
            const email = emailEl.value.trim();

            if (!username || !email) {
                this.showStatus(statusEl, 'Benutzername & Email benötigt', 'error');
                return;
            }

            this.showStatus(statusEl, 'Fingerabdruck scannen...', 'loading');

            const result = await WebAuthn.registerWithBiometric(username, email);

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);

                this.closeAuthModal();
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${result.user.username}!`);
                return result;
            }

        } catch (err) {
            const statusEl = document.getElementById('bioStatus');
            this.showStatus(statusEl, err.message, 'error');
        }
    },

    // ============================================================================
    // 👆 WEBAUTHN AUTHENTICATION
    // ============================================================================

    async authenticateWithBiometric() {
        const statusEl = document.getElementById('bioStatus');
        try {
            this.showStatus(statusEl, 'Fingerabdruck scannen...', 'loading');
            const result = await WebAuthn.authenticateWithBiometric();

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);

                this.closeAuthModal();
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen zurück!`);
                return result;
            }

        } catch (err) {
            this.showStatus(statusEl, err.message, 'error');
        }
    },

    // ============================================================================
    // 📧 MAGIC LINK LOGIN
    // ============================================================================

    async loginWithMagicLink() {
        try {
            const emailEl = document.getElementById('magicEmail');
            const statusEl = document.getElementById('magicStatus');

            const email = emailEl.value.trim();
            if (!email) {
                this.showStatus(statusEl, 'Email eingeben', 'error');
                return;
            }

            this.showStatus(statusEl, 'Sende Link...', 'loading');
            await WebAuthn.loginWithMagicLink(email);

            this.showStatus(statusEl, `✅ Link gesendet an ${email}!`, 'success');
            emailEl.value = '';

        } catch (err) {
            const statusEl = document.getElementById('magicStatus');
            this.showStatus(statusEl, err.message, 'error');
        }
    },

    // ============================================================================
    // 📧 VERIFY MAGIC LINK
    // ============================================================================

    async verifyMagicLinkFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('magic_link_token');
            if (!token) return false;

            console.log('🔐 Verifying magic link token from URL...');
            const result = await WebAuthn.verifyMagicLink(token);

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);

                window.history.replaceState({}, document.title, window.location.pathname);
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${result.user.username}!`);
                return true;
            }
        } catch (err) {
            console.error('❌ Magic link verification error:', err.message);
        }
        return false;
    },

    async verifyMagicLinkManual(token) {
        try {
            const result = await WebAuthn.verifyMagicLink(token);

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${result.user.username}!`);
                return true;
            }
        } catch (err) {
            const statusEl = document.getElementById('magicVerifyStatus');
            this.showStatus(statusEl, err.message, 'error');
            return false;
        }
    },

    // ============================================================================
    // 🚪 LOGOUT
    // ============================================================================

    async logout() {
        try {
            await APIClient.logout();
            this.token = null;
            this.user = null;
            clearAuthToken();
            localStorage.removeItem('user');

            this.updateUI();
            this.showAuthSuccess('✅ Abgemeldet');
        } catch (err) {
            console.error('❌ Logout error:', err.message);
        }
    },

    // ============================================================================
    // 🎨 UI HELPERS
    // ============================================================================

    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) modal.style.display = 'none';
    },

    showStatus(element, message, type) {
        if (!element) return;
        element.textContent = message;
        element.className = `status-message ${type}`;
        element.style.display = 'block';
    },

    showAuthError(message) {
        this.showToast(`❌ ${message}`, '#c01530');
    },

    showAuthSuccess(message) {
        this.showToast(message, '#00cc77');
    },

    showToast(message, bgColor) {
        const div = document.createElement('div');
        div.style.cssText = `
            position: fixed; top: 20px; right: 20px;
            background: ${bgColor}; color: white;
            padding: 16px 20px; border-radius: 8px;
            z-index: 10000; box-shadow: 0 4px 6px rgba(0,0,0,0.2);
            font-weight: 500;
        `;
        div.textContent = message;
        document.body.appendChild(div);
        setTimeout(() => div.remove(), 4000);
    },

    updateUI() {
        // Hier ebenfalls die korrekte ID verwenden!
        const authBtn = document.getElementById('authButton');
        const userInfo = document.getElementById('userInfo');

        if (this.isAuthenticated() && this.user) {
            if (authBtn) authBtn.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                const userDisplay = document.getElementById('userDisplay');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${this.user.username || this.user.email}`;
                }
            }
        } else {
            if (authBtn) authBtn.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
        }
    },
};

console.log('✅ Auth v9.2 loaded - Complete Auth System (Fixed Button ID)');
