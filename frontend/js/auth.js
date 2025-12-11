// ============================================================================
// 🔐 AUTH MODULE - Authentication UI & Management
// ✅ UPDATED: Nutzt APIClient + config.js statt hardcoded URLs
// ============================================================================

const Auth = {
    /**
     * Gibt die Auth API Base URL zurück (dynamisch aus config.js)
     */
    getApiBase() {
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }
        // Fallback
        return 'https://localhost:3000/api';
    },

    // ========================================================================
    // 🔑 TOKEN & USER MANAGEMENT
    // ========================================================================

    setToken(token) {
        if (token) {
            localStorage.setItem('auth_token', token);
            console.log('✅ Token saved');
        } else {
            localStorage.removeItem('auth_token');
            console.log('✅ Token cleared');
        }
    },

    getToken() {
        return localStorage.getItem('auth_token');
    },

    clearToken() {
        localStorage.removeItem('auth_token');
        console.log('✅ Auth token cleared');
    },

    setUser(user) {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            console.log('✅ User saved:', user.email);
        } else {
            localStorage.removeItem('user');
            console.log('✅ User cleared');
        }
    },

    getUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    },

    // ========================================================================
    // 📝 REGISTRATION
    // ========================================================================

    async register(event) {
        event.preventDefault();
        const email = document.getElementById('regEmail')?.value;
        const username = document.getElementById('regUsername')?.value;
        const password = document.getElementById('regPassword')?.value;

        if (!email || !username || !password) {
            console.warn('⚠️ Missing registration fields');
            return;
        }

        try {
            console.log('📝 Registering:', email);

            // ✅ NEW: Nutze APIClient statt direktes fetch
            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.register(email, password);
                console.log('✅ Registration successful!', result);

                // Token wird von APIClient bereits gespeichert
                if (result.user) {
                    this.setUser(result.user);
                }

                // Reload nach Verzögerung
                setTimeout(() => location.reload(), 1000);
                return;
            }

            // Fallback: Direktes fetch
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, username, password }),
                credentials: 'include'
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Registration failed');
            }

            const result = await res.json();
            this.setToken(result.token);
            this.setUser(result.user);
            console.log('✅ Registration successful!');

            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            console.error('❌ Registration error:', error.message);
            alert(`❌ Registration failed: ${error.message}`);
        }
    },

    // ========================================================================
    // 🔓 LOGIN
    // ========================================================================

    async login(event) {
        event.preventDefault();
        const email = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            console.warn('⚠️ Missing login fields');
            return;
        }

        try {
            console.log('🔓 Logging in:', email);

            // ✅ NEW: Nutze APIClient statt direktes fetch
            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.login(email, password);
                console.log('✅ Login successful!', result);

                // Token wird von APIClient bereits gespeichert
                if (result.user) {
                    this.setUser(result.user);
                }

                // Reload nach Verzögerung
                setTimeout(() => location.reload(), 1000);
                return;
            }

            // Fallback: Direktes fetch
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password }),
                credentials: 'include'
            });

            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Login failed');
            }

            const result = await res.json();
            this.setToken(result.token);
            this.setUser(result.user);
            console.log('✅ Login successful!');

            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            console.error('❌ Login error:', error.message);
            alert(`❌ Login failed: ${error.message}`);
        }
    },

    // ========================================================================
    // 📧 MAGIC LINK LOGIN
    // ========================================================================

    async loginWithMagicLink(event) {
        if (event) event.preventDefault();

        const email = document.getElementById('magicLinkEmail')?.value;
        if (!email) {
            console.warn('⚠️ Email field missing');
            return;
        }

        try {
            console.log('📧 Sending magic link to:', email);

            // ✅ NEW: Nutze WebAuthn oder APIClient
            if (typeof WebAuthn !== 'undefined') {
                const result = await WebAuthn.loginWithMagicLink(email);
                console.log('✅ Magic link sent!');
                alert('✅ Check your email for the magic link!');
                return;
            }

            // Fallback: APIClient
            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.sendMagicLink(email);
                console.log('✅ Magic link sent!');
                alert('✅ Check your email for the magic link!');
                return;
            }

            // Letzter Fallback
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/send-magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to send magic link');

            console.log('✅ Magic link sent!');
            alert('✅ Check your email for the magic link!');

        } catch (error) {
            console.error('❌ Magic link error:', error.message);
            alert(`❌ Failed to send magic link: ${error.message}`);
        }
    },

    // ========================================================================
    // 🔗 VERIFY MAGIC LINK (from URL)
    // ========================================================================

    async verifyMagicLinkFromUrl() {
        try {
            const url = new URL(window.location.href);
            const token = url.searchParams.get('token');

            if (!token) {
                console.log('ℹ️ No magic link token in URL');
                return null;
            }

            console.log('🔐 Verifying magic link token...');

            // ✅ NEW: Nutze WebAuthn oder APIClient
            if (typeof WebAuthn !== 'undefined') {
                const result = await WebAuthn.verifyMagicLink(token);
                console.log('✅ Magic link verified!', result);

                if (result.token) {
                    this.setToken(result.token);
                }
                if (result.user) {
                    this.setUser(result.user);
                }

                // Remove token from URL
                window.history.replaceState({}, document.title, url.pathname);

                setTimeout(() => location.reload(), 1000);
                return result;
            }

            // Fallback: APIClient
            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.verifyMagicLink(token);
                console.log('✅ Magic link verified!', result);

                if (result.user) {
                    this.setUser(result.user);
                }

                // Remove token from URL
                window.history.replaceState({}, document.title, url.pathname);

                setTimeout(() => location.reload(), 1000);
                return result;
            }

        } catch (error) {
            console.error('❌ Magic link verification error:', error.message);
        }

        return null;
    },

    // ========================================================================
    // 🎚️ WEBAUTHN REGISTRATION
    // ========================================================================

    async registerWithWebAuthn(event) {
        if (event) event.preventDefault();

        const username = document.getElementById('webauthnUsername')?.value;
        const email = document.getElementById('webauthnEmail')?.value;

        if (!username || !email) {
            console.warn('⚠️ Missing WebAuthn registration fields');
            return;
        }

        try {
            if (typeof WebAuthn === 'undefined') {
                throw new Error('WebAuthn module not loaded');
            }

            console.log('🔐 Starting WebAuthn registration...');
            const result = await WebAuthn.registerWithBiometric(username, email);
            console.log('✅ WebAuthn registration successful!', result);

            if (result.token) {
                this.setToken(result.token);
            }
            if (result.user) {
                this.setUser(result.user);
            }

            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            console.error('❌ WebAuthn registration error:', error.message);
            alert(`❌ WebAuthn registration failed: ${error.message}`);
        }
    },

    // ========================================================================
    // 🔐 WEBAUTHN AUTHENTICATION
    // ========================================================================

    async authenticateWithWebAuthn(event) {
        if (event) event.preventDefault();

        const email = document.getElementById('webauthnAuthEmail')?.value;
        if (!email) {
            console.warn('⚠️ Email field missing');
            return;
        }

        try {
            if (typeof WebAuthn === 'undefined') {
                throw new Error('WebAuthn module not loaded');
            }

            console.log('🔐 Starting WebAuthn authentication...');
            const result = await WebAuthn.authenticateWithBiometric(email);
            console.log('✅ WebAuthn authentication successful!', result);

            if (result.token) {
                this.setToken(result.token);
            }
            if (result.user) {
                this.setUser(result.user);
            }

            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            console.error('❌ WebAuthn authentication error:', error.message);
            alert(`❌ WebAuthn authentication failed: ${error.message}`);
        }
    },

    // ========================================================================
    // 🧪 DEV LOGIN
    // ========================================================================

    async devLogin(event) {
        if (event) event.preventDefault();

        try {
            console.log('🧪 Dev login...');

            if (typeof WebAuthn !== 'undefined') {
                const result = await WebAuthn.devLogin();
                if (result.token) {
                    this.setToken(result.token);
                }
                if (result.user) {
                    this.setUser(result.user);
                }
                setTimeout(() => location.reload(), 1000);
                return;
            }

            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/dev-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Dev login failed');

            const result = await res.json();
            if (result.token) {
                this.setToken(result.token);
            }
            if (result.user) {
                this.setUser(result.user);
            }

            console.log('✅ Dev login successful!');
            setTimeout(() => location.reload(), 1000);

        } catch (error) {
            console.error('❌ Dev login error:', error.message);
            alert(`❌ Dev login failed: ${error.message}`);
        }
    },

    // ========================================================================
    // 🚪 LOGOUT
    // ========================================================================

    logout() {
        console.log('🚪 Logging out...');

        this.clearToken();
        this.setUser(null);

        // Stop any playback
        if (typeof AudioPlayer !== 'undefined' && AudioPlayer.stop) {
            AudioPlayer.stop();
        }

        console.log('✅ Logged out');
        location.href = '/';
    },

    // ========================================================================
    // 👤 GET CURRENT USER
    // ========================================================================

    async getCurrentUser() {
        try {
            if (typeof APIClient !== 'undefined') {
                const user = await APIClient.getCurrentUser();
                this.setUser(user);
                return user;
            }

            const apiBase = this.getApiBase();
            const token = this.getToken();
            if (!token) return null;

            const res = await fetch(`${apiBase}/auth/me`, {
                headers: { 'Authorization': `Bearer ${token}` },
                credentials: 'include'
            });

            if (!res.ok) {
                this.clearToken();
                return null;
            }

            const user = await res.json();
            this.setUser(user);
            return user;

        } catch (error) {
            console.error('❌ Get current user error:', error);
            return null;
        }
    }
};

console.log('✅ Auth loaded with ngrok + APIClient support');

// Global reference
window.Auth = Auth;