// ============================================================================
// 🔐 AUTH.JS v9.0 - COMPLETE AUTH SYSTEM
// ============================================================================
// WebAuthn (Biometric) + Password Registration/Login + Magic Link + Modal Setup

import { APIClient } from './api-client.js';
import { WebAuthn } from './webauthn.js';
import { getAuthToken, setAuthToken, clearAuthToken } from './config.js';

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
        }

        // Setup all modal and form handlers
        this.setupAuthModal();
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

        // ────────────────────────────────────────────────────────────────
        // MODAL TOGGLE
        // ────────────────────────────────────────────────────────────────

        const authToggle = document.getElementById('authToggle');
        if (authToggle) {
            authToggle.addEventListener('click', (e) => {
                e.preventDefault();
                const modal = document.getElementById('authModal');
                if (modal) {
                    this.toggleAuthModal(modal);
                }
            });
            console.log('✅ Auth toggle button setup');
        }

        // ────────────────────────────────────────────────────────────────
        // CLOSE BUTTON
        // ────────────────────────────────────────────────────────────────

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

        // ────────────────────────────────────────────────────────────────
        // TAB SWITCHING
        // ────────────────────────────────────────────────────────────────

        const tabBtns = document.querySelectorAll('.tab-btn');
        tabBtns.forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName);
            });
        });
        console.log(`✅ Tab switching setup (${tabBtns.length} tabs)`);

        // ────────────────────────────────────────────────────────────────
        // 🔑 PASSWORD LOGIN HANDLERS
        // ────────────────────────────────────────────────────────────────

        const passwordLoginForm = document.getElementById('passwordLoginForm');
        if (passwordLoginForm) {
            passwordLoginForm.addEventListener('submit', async (e) => {
                await this.loginWithPassword(e);
            });
            console.log('✅ Password login form setup');
        }

        // Toggle to Registration
        const togglePasswordRegisterBtn = document.getElementById('togglePasswordRegisterBtn');
        if (togglePasswordRegisterBtn) {
            togglePasswordRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const loginForm = document.getElementById('passwordLoginForm');
                const registerForm = document.getElementById('passwordRegisterForm');
                if (loginForm && registerForm) {
                    loginForm.style.display = 'none';
                    registerForm.style.display = 'block';
                    console.log('📝 Password registration form shown');
                }
            });
            console.log('✅ Toggle password registration button setup');
        }

        // ────────────────────────────────────────────────────────────────
        // 🔑 PASSWORD REGISTRATION HANDLERS
        // ────────────────────────────────────────────────────────────────

        const passwordRegisterForm = document.getElementById('passwordRegisterForm');
        if (passwordRegisterForm) {
            passwordRegisterForm.addEventListener('submit', async (e) => {
                await this.registerWithPassword(e);
            });
            console.log('✅ Password registration form setup');
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
                    console.log('🔐 Password registration form hidden');
                }
            });
            console.log('✅ Cancel password registration button setup');
        }

        // ────────────────────────────────────────────────────────────────
        // 👆 WEBAUTHN BIOMETRIC HANDLERS
        // ────────────────────────────────────────────────────────────────

        // WebAuthn Login Button
        const webauthnBtn = document.getElementById('webauthnBtn');
        if (webauthnBtn) {
            webauthnBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.authenticateWithBiometric();
            });
            console.log('✅ WebAuthn login button setup');
        }

        // Toggle Biometric Registration Form
        const toggleBioRegisterBtn = document.getElementById('toggleBioRegisterBtn');
        if (toggleBioRegisterBtn) {
            toggleBioRegisterBtn.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const bioRegisterModal = document.getElementById('bioRegisterModal');
                if (bioRegisterModal) {
                    const isHidden = bioRegisterModal.style.display === 'none' || bioRegisterModal.style.display === '';
                    bioRegisterModal.style.display = isHidden ? 'block' : 'none';
                    console.log(`${isHidden ? '📝 Bio registration form shown' : '🔐 Bio registration form hidden'}`);
                }
            });
            console.log('✅ Toggle biometric registration button setup');
        }

        // Biometric Registration Button
        const registerBiometricBtn = document.getElementById('registerBiometricBtn');
        if (registerBiometricBtn) {
            registerBiometricBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.registerBiometric();
            });
            console.log('✅ Biometric registration button setup');
        }

        // ────────────────────────────────────────────────────────────────
        // 📧 MAGIC LINK TAB HANDLERS
        // ────────────────────────────────────────────────────────────────

        // Magic Link Send Button
        const magicLinkBtn = document.getElementById('magicLinkBtn');
        if (magicLinkBtn) {
            magicLinkBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                const magicEmailEl = document.getElementById('magicEmail');
                if (!magicEmailEl || !magicEmailEl.value.trim()) {
                    this.showAuthError('Email erforderlich');
                    return;
                }
                await this.loginWithMagicLink();
            });
            console.log('✅ Magic link send button setup');
        }

        // Magic Link Manual Verify Button
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
            console.log('✅ Magic link verify button setup');
        }

        // ────────────────────────────────────────────────────────────────
        // 🚪 LOGOUT BUTTON
        // ────────────────────────────────────────────────────────────────

        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', async (e) => {
                e.preventDefault();
                await this.logout();
            });
            console.log('✅ Logout button setup');
        }

        console.log('✅ Auth modal handlers setup complete');
    },

    // ============================================================================
    // 🎨 MODAL HELPERS
    // ============================================================================

    toggleAuthModal(modal) {
        const isHidden = modal.style.display === 'none' || modal.style.display === '';
        modal.style.display = isHidden ? 'flex' : 'none';
        console.log(`${isHidden ? '📖 Auth modal opened' : '🔐 Auth modal closed'}`);
    },

    switchTab(tabName) {
        // Update tab buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            const isActive = btn.getAttribute('data-tab') === tabName;
            btn.classList.toggle('active', isActive);
            btn.setAttribute('aria-selected', isActive);
        });

        // Update tab content
        document.querySelectorAll('.tab-content').forEach(content => {
            const isActive = content.id === `${tabName}-tab`;
            content.classList.toggle('active', isActive);
            content.setAttribute('aria-hidden', !isActive);
        });

        console.log(`📑 Switched to tab: ${tabName}`);
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

            if (!emailEl || !passwordEl) {
                throw new Error('Form elements not found');
            }

            const email = emailEl.value.trim();
            const password = passwordEl.value;

            if (!email || !password) {
                throw new Error('Email and password required');
            }

            const response = await APIClient.post(
                '/auth/webauthn/authenticate-password',
                { email, password }
            );

            if (response.token) {
                this.token = response.token;
                setAuthToken(response.token);
                this.user = response.user;
                this.saveUserToStorage(response.user);
                console.log(`✅ Login successful! Welcome ${response.user.email}`);
                emailEl.value = '';
                passwordEl.value = '';
                this.closeAuthModal();
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${response.user.username || response.user.email}!`);
                return response;
            }

        } catch (err) {
            console.error('❌ Login error:', err.message);
            this.showAuthError(err.message);
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

            if (!emailEl || !usernameEl || !passwordEl || !confirmEl) {
                throw new Error('Form elements not found');
            }

            const email = emailEl.value.trim();
            const username = usernameEl.value.trim();
            const password = passwordEl.value;
            const passwordConfirm = confirmEl.value;

            if (!email || !username || !password || !passwordConfirm) {
                throw new Error('All fields required');
            }

            if (password !== passwordConfirm) {
                throw new Error('Passwords do not match');
            }

            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }

            const response = await APIClient.post(
                '/auth/webauthn/register-password',
                { email, username, password, passwordConfirm }
            );

            if (response.token) {
                this.token = response.token;
                setAuthToken(response.token);
                this.user = response.user;
                this.saveUserToStorage(response.user);
                console.log(`✅ Registration successful! Welcome ${response.user.email}`);
                emailEl.value = '';
                usernameEl.value = '';
                passwordEl.value = '';
                confirmEl.value = '';
                this.closeAuthModal();
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${response.user.username || response.user.email}!`);
                return response;
            }

        } catch (err) {
            console.error('❌ Registration error:', err.message);
            this.showAuthError(err.message);
        }
    },

    // ============================================================================
    // 👆 WEBAUTHN BIOMETRIC REGISTRATION
    // ============================================================================

    async registerBiometric() {
        try {
            console.log('🔐 WebAuthn registration attempt...');
            const usernameEl = document.getElementById('bioRegUsername');
            const emailEl = document.getElementById('bioRegEmail');

            if (!usernameEl || !emailEl) {
                throw new Error('Form elements not found');
            }

            const username = usernameEl.value.trim();
            const email = emailEl.value.trim();

            if (!username || !email) {
                throw new Error('Username and email required');
            }

            const result = await WebAuthn.registerWithBiometric(username, email);

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);
                console.log(`✅ Biometric registration successful!`);
                usernameEl.value = '';
                emailEl.value = '';
                this.closeAuthModal();
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${result.user.username || result.user.email}!`);
                return result;
            }

        } catch (err) {
            console.error('❌ Biometric registration error:', err.message);
            this.showAuthError(err.message);
        }
    },

    // ============================================================================
    // 👆 WEBAUTHN BIOMETRIC AUTHENTICATION
    // ============================================================================

    async authenticateWithBiometric() {
        try {
            console.log('🔐 WebAuthn authentication attempt...');
            const result = await WebAuthn.authenticateWithBiometric();

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);
                console.log(`✅ Biometric authentication successful!`);
                this.closeAuthModal();
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${result.user.username || result.user.email}!`);
                return result;
            }

        } catch (err) {
            console.error('❌ Biometric authentication error:', err.message);
            this.showAuthError(err.message);
        }
    },

    // ============================================================================
    // 📧 MAGIC LINK LOGIN
    // ============================================================================

    async loginWithMagicLink() {
        try {
            console.log('📧 Magic Link login attempt...');
            const emailEl = document.getElementById('magicEmail');
            if (!emailEl) throw new Error('Email element not found');

            const email = emailEl.value.trim();
            if (!email) throw new Error('Email required');

            const result = await WebAuthn.loginWithMagicLink(email);

            const statusEl = document.getElementById('magicStatus');
            if (statusEl) {
                statusEl.innerHTML = `✅ Check your email at ${email} for the magic link!`;
                statusEl.style.color = '#00cc77';
            }

            console.log('✅ Magic link sent!');
            emailEl.value = '';

        } catch (err) {
            console.error('❌ Magic link error:', err.message);
            this.showAuthError(err.message);
        }
    },

    // ============================================================================
    // 📧 MAGIC LINK VERIFY FROM URL
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
                console.log(`✅ Magic link verified! Welcome ${result.user.email}`);
                window.history.replaceState({}, document.title, window.location.pathname);
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${result.user.username || result.user.email}!`);
                return true;
            }

        } catch (err) {
            console.error('❌ Magic link verification error:', err.message);
        }

        return false;
    },

    // ============================================================================
    // 📧 MAGIC LINK VERIFY MANUALLY
    // ============================================================================

    async verifyMagicLinkManual(token) {
        try {
            console.log('🔗 Verifying magic link token manually...');
            const result = await WebAuthn.verifyMagicLink(token);

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);
                console.log(`✅ Magic link verified! Welcome ${result.user.email}`);
                this.updateUI();
                this.showAuthSuccess(`✅ Willkommen ${result.user.username || result.user.email}!`);
                return true;
            }

        } catch (err) {
            console.error('❌ Magic link verification error:', err.message);
            this.showAuthError(err.message);
            return false;
        }
    },

    // ============================================================================
    // 🚪 LOGOUT
    // ============================================================================

    async logout() {
        try {
            console.log('🚪 Logging out...');
            await APIClient.logout();
            this.token = null;
            this.user = null;
            clearAuthToken();
            if (typeof localStorage !== 'undefined') {
                localStorage.removeItem('user');
            }

            console.log('✅ Logged out successfully');
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
        if (modal) {
            modal.style.display = 'none';
        }
    },

    showAuthError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #c01530;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            font-weight: 500;
            max-width: 300px;
            word-wrap: break-word;
        `;
        errorDiv.textContent = `❌ ${message}`;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 4000);
    },

    showAuthSuccess(message) {
        const successDiv = document.createElement('div');
        successDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #00cc77;
            color: white;
            padding: 16px 20px;
            border-radius: 8px;
            z-index: 10000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            font-weight: 500;
        `;
        successDiv.textContent = message;
        document.body.appendChild(successDiv);
        setTimeout(() => successDiv.remove(), 3000);
    },

    updateUI() {
        const authToggle = document.getElementById('authToggle');
        const userInfo = document.getElementById('userInfo');

        if (this.isAuthenticated() && this.user) {
            if (authToggle) authToggle.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                const userDisplay = document.getElementById('userDisplay');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${this.user.username || this.user.email}`;
                }
            }
            console.log(`👤 User logged in: ${this.user.email}`);
        } else {
            if (authToggle) authToggle.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
            console.log('👤 User logged out');
        }
    },
};

console.log('✅ Auth v9.0 loaded - Complete Auth System with Password + WebAuthn + Magic Link');