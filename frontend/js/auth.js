// ============================================================================
// 🔐 AUTH.JS v8.0 - ES6 MODULE
// Authentication Management + Magic Link + WebAuthn Integration
// ============================================================================

import { APIClient } from './api-client.js';
import { WebAuthn } from './webauthn.js';
import { getAuthToken, setAuthToken, clearAuthToken } from './config.js';

export const Auth = {
    user: null,
    token: null,

    init() {
        console.log('🔐 Auth module initializing...');

        this.token = getAuthToken();
        this.loadUserFromStorage();

        if (this.token) {
            console.log('✅ Token found, user may be logged in');
        }
    },

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

    // ======== PASSWORD LOGIN ========
    async login(e) {
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

            const response = await APIClient.login(email, password);

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

                return response;
            }
        } catch (err) {
            console.error('❌ Login error:', err.message);
            this.showAuthError(err.message);
        }
    },

    // ======== PASSWORD REGISTER ========
    async register(e) {
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
            const confirm = confirmEl.value;

            if (!email || !username || !password || !confirm) {
                throw new Error('All fields required');
            }

            if (password !== confirm) {
                throw new Error('Passwords do not match');
            }

            if (password.length < 8) {
                throw new Error('Password must be at least 8 characters');
            }

            const response = await APIClient.register(email, username, password);

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

                return response;
            }
        } catch (err) {
            console.error('❌ Registration error:', err.message);
            this.showAuthError(err.message);
        }
    },

    // ======== MAGIC LINK ========
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
                statusEl.innerHTML = `✅ Check your email at <strong>${email}</strong> for the magic link!`;
            }

            console.log('✅ Magic link sent!');
        } catch (err) {
            console.error('❌ Magic link error:', err.message);
            this.showAuthError(err.message);
        }
    },

    async verifyMagicLinkFromUrl() {
        try {
            const params = new URLSearchParams(window.location.search);
            const token = params.get('magic_link_token');

            if (!token) return false;

            console.log('🔐 Verifying magic link token...');

            const result = await WebAuthn.verifyMagicLink(token);

            if (result.token) {
                this.token = result.token;
                setAuthToken(result.token);
                this.user = result.user;
                this.saveUserToStorage(result.user);

                console.log(`✅ Magic link verified! Welcome ${result.user.email}`);

                window.history.replaceState({}, document.title, window.location.pathname);

                this.updateUI();
                return true;
            }
        } catch (err) {
            console.error('❌ Magic link verification error:', err.message);
        }

        return false;
    },

    // ======== WEBAUTHN BIOMETRIC ========
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

                this.closeAuthModal();
                this.updateUI();

                return result;
            }
        } catch (err) {
            console.error('❌ Biometric registration error:', err.message);
            this.showAuthError(err.message);
        }
    },

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

                return result;
            }
        } catch (err) {
            console.error('❌ Biometric authentication error:', err.message);
            this.showAuthError(err.message);
        }
    },

    // ======== LOGOUT ========
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
        } catch (err) {
            console.error('❌ Logout error:', err.message);
        }
    },

    // ======== UI HELPERS ========
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
    `;
        errorDiv.textContent = `❌ ${message}`;
        document.body.appendChild(errorDiv);

        setTimeout(() => errorDiv.remove(), 3000);
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
        } else {
            if (authToggle) authToggle.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
        }
    },
};

console.log('✅ Auth v8.0 loaded - ES6 Module');