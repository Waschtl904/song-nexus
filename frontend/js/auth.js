// ============================================================================
// 🔐 AUTH MODULE - Authentication UI & Management (v7.2 FIXED)
// ✅ UPDATED: Mit Doppel-Klick Schutz + WebAuthn Debug + v7.2 Endpoints
// ✅ FIXED: Magic Link Verification mit besserer Timeout-Handling
// ============================================================================



const Auth = {
    isProcessing: false,  // ✅ NEW: Prevent double-clicks



    /**
     * Gibt die Auth API Base URL zurück (dynamisch aus config.js)
     */
    getApiBase() {
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }
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
    // 📝 REGISTRATION (PASSWORD)
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



            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.register(email, username, password);
                console.log('✅ Registration successful!', result);



                if (result.user) {
                    this.setUser(result.user);
                }
                if (result.token) {
                    this.setToken(result.token);
                }


                setTimeout(() => location.reload(), 1500);
                return;
            }



            // ✅ UPDATED: v7.2 endpoint
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/webauthn/register-password`, {
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



            setTimeout(() => location.reload(), 1500);



        } catch (error) {
            console.error('❌ Registration error:', error.message);
            alert(`❌ Registration failed: ${error.message}`);
        }
    },



    // ========================================================================
    // 🔓 LOGIN (PASSWORD)
    // ========================================================================



    async login(event) {
        event.preventDefault();
        const username = document.getElementById('loginEmail')?.value;
        const password = document.getElementById('loginPassword')?.value;



        if (!username || !password) {
            console.warn('⚠️ Missing login fields');
            return;
        }



        try {
            console.log('🔓 Logging in:', username);



            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.login(username, password);
                console.log('✅ Login successful!', result);



                if (result.user) {
                    this.setUser(result.user);
                }
                if (result.token) {
                    this.setToken(result.token);
                }


                setTimeout(() => location.reload(), 1500);
                return;
            }



            // ✅ UPDATED: v7.2 endpoint
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/webauthn/authenticate-password`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password }),
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



            setTimeout(() => location.reload(), 1500);



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



        const email = document.getElementById('magicEmail')?.value;
        if (!email) {
            console.warn('⚠️ Email field missing');
            return;
        }



        try {
            console.log('📧 Sending magic link to:', email);



            if (typeof WebAuthn !== 'undefined') {
                const result = await WebAuthn.loginWithMagicLink(email);
                console.log('✅ Magic link sent!');
                const magicStatus = document.getElementById('magicStatus');
                if (magicStatus) {
                    magicStatus.textContent = '✅ Check your email for the magic link!';
                }
                return;
            }



            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.sendMagicLink(email);
                console.log('✅ Magic link sent!');
                const magicStatus = document.getElementById('magicStatus');
                if (magicStatus) {
                    magicStatus.textContent = '✅ Check your email for the magic link!';
                }
                return;
            }



            // ✅ UPDATED: v7.2 endpoint
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/webauthn/magic-link-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include'
            });



            if (!res.ok) throw new Error('Failed to send magic link');



            console.log('✅ Magic link sent!');
            const magicStatus = document.getElementById('magicStatus');
            if (magicStatus) {
                magicStatus.textContent = '✅ Check your email for the magic link!';
            }



        } catch (error) {
            console.error('❌ Magic link error:', error.message);
            const magicStatus = document.getElementById('magicStatus');
            if (magicStatus) {
                magicStatus.textContent = `❌ ${error.message}`;
            }
        }
    },



    // ========================================================================
    // 🔗 VERIFY MAGIC LINK (from URL) - ✅ FIXED VERSION
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



            if (typeof WebAuthn !== 'undefined') {
                const result = await WebAuthn.verifyMagicLink(token);
                console.log('✅ Magic link verified!', result);



                if (result.token) {
                    this.setToken(result.token);
                    console.log('✅ Token saved to localStorage');
                }
                if (result.user) {
                    this.setUser(result.user);
                    console.log('✅ User saved to localStorage');
                }



                // ✅ Clean URL BEFORE reload
                window.history.replaceState({}, document.title, url.pathname);

                // ✅ Give storage time to sync + wait 1.5s before reload
                await new Promise(resolve => setTimeout(resolve, 1500));
                location.reload();
                return result;
            }



            if (typeof APIClient !== 'undefined') {
                const result = await APIClient.verifyMagicLink(token);
                console.log('✅ Magic link verified!', result);



                if (result.user) {
                    this.setUser(result.user);
                    console.log('✅ User saved to localStorage');
                }
                if (result.token) {
                    this.setToken(result.token);
                    console.log('✅ Token saved to localStorage');
                }


                // ✅ Clean URL BEFORE reload
                window.history.replaceState({}, document.title, url.pathname);

                // ✅ Give storage time to sync + wait 1.5s before reload
                await new Promise(resolve => setTimeout(resolve, 1500));
                location.reload();
                return result;
            }



            // ✅ UPDATED: v7.2 endpoint with improved timeout
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/webauthn/magic-link-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
                credentials: 'include'
            });



            if (!res.ok) {
                const error = await res.json();
                throw new Error(error.error || 'Magic link verification failed');
            }



            const result = await res.json();
            console.log('✅ Magic link verified!', result);



            if (result.token) {
                this.setToken(result.token);
                console.log('✅ Token saved to localStorage');
            }
            if (result.user) {
                this.setUser(result.user);
                console.log('✅ User saved to localStorage');
            }



            // ✅ Clean URL BEFORE reload
            window.history.replaceState({}, document.title, url.pathname);

            // ✅ Give storage time to sync + wait 1.5s before reload
            await new Promise(resolve => setTimeout(resolve, 1500));
            location.reload();
            return result;



        } catch (error) {
            console.error('❌ Magic link verification error:', error.message);
        }



        return null;
    },



    // ========================================================================
    // 🎚️ WEBAUTHN REGISTRATION (FIXED WITH GUARD)
    // ========================================================================



    async registerWithWebAuthn(event) {
        if (event) event.preventDefault();



        // ✅ NEW: Double-click protection
        if (this.isProcessing) {
            console.warn('⚠️ WebAuthn already processing...');
            return;
        }



        const username = document.getElementById('bioRegUsername')?.value;
        const email = document.getElementById('bioRegEmail')?.value;



        if (!username || !email) {
            console.warn('⚠️ Missing WebAuthn registration fields');
            const bioStatus = document.getElementById('bioStatus');
            if (bioStatus) {
                bioStatus.textContent = '❌ Benutzername und E-Mail erforderlich';
            }
            return;
        }



        try {
            // ✅ NEW: Check WebAuthn availability BEFORE processing
            console.log('🔍 Checking WebAuthn availability...');
            if (!navigator.credentials) {
                throw new Error('WebAuthn not supported in this browser');
            }
            if (!window.PublicKeyCredential) {
                throw new Error('PublicKeyCredential not available');
            }



            if (typeof WebAuthn === 'undefined') {
                throw new Error('WebAuthn module not loaded');
            }



            this.isProcessing = true;
            console.log('🔐 Starting WebAuthn registration...');
            const bioStatus = document.getElementById('bioStatus');
            if (bioStatus) {
                bioStatus.textContent = '⏳ Registrierung wird durchgeführt...';
            }



            const result = await WebAuthn.registerWithBiometric(username, email);
            console.log('✅ WebAuthn registration successful!', result);



            if (result.token) {
                this.setToken(result.token);
            }
            if (result.user) {
                this.setUser(result.user);
            }



            if (bioStatus) {
                bioStatus.textContent = '✅ Registrierung erfolgreich!';
            }
            setTimeout(() => location.reload(), 1500);



        } catch (error) {
            console.error('❌ WebAuthn registration error:', error.message);
            const bioStatus = document.getElementById('bioStatus');
            if (bioStatus) {
                bioStatus.textContent = `❌ ${error.message}`;
            }
        } finally {
            this.isProcessing = false;
        }
    },



    // ========================================================================
    // 🔐 WEBAUTHN AUTHENTICATION (FIXED WITH GUARD)
    // ========================================================================



    async authenticateWithWebAuthn(event) {
        if (event) event.preventDefault();



        // ✅ NEW: Double-click protection
        if (this.isProcessing) {
            console.warn('⚠️ WebAuthn already processing...');
            return;
        }



        try {
            // ✅ NEW: Check WebAuthn availability BEFORE processing
            console.log('🔍 Checking WebAuthn availability...');
            if (!navigator.credentials) {
                throw new Error('WebAuthn not supported in this browser');
            }
            if (!window.PublicKeyCredential) {
                throw new Error('PublicKeyCredential not available');
            }



            if (typeof WebAuthn === 'undefined') {
                throw new Error('WebAuthn module not loaded');
            }



            this.isProcessing = true;
            console.log('🔐 Starting WebAuthn authentication...');
            const bioStatus = document.getElementById('bioStatus');
            if (bioStatus) {
                bioStatus.textContent = '⏳ Authentifizierung wird durchgeführt...';
            }



            const result = await WebAuthn.authenticateWithBiometric();
            console.log('✅ WebAuthn authentication successful!', result);



            if (result.token) {
                this.setToken(result.token);
            }
            if (result.user) {
                this.setUser(result.user);
            }



            if (bioStatus) {
                bioStatus.textContent = '✅ Authentifizierung erfolgreich!';
            }
            setTimeout(() => location.reload(), 1500);



        } catch (error) {
            console.error('❌ WebAuthn authentication error:', error.message);
            const bioStatus = document.getElementById('bioStatus');
            if (bioStatus) {
                bioStatus.textContent = `❌ ${error.message}`;
            }
        } finally {
            this.isProcessing = false;
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
                setTimeout(() => location.reload(), 1500);
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
            setTimeout(() => location.reload(), 1500);



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



// ============================================================================
// 🔌 EVENT LISTENERS - SETUP UI HANDLERS
// ============================================================================



document.addEventListener('DOMContentLoaded', () => {
    console.log('🔌 Setting up Auth event listeners...');



    // ========================================================================
    // 📝 PASSWORD LOGIN FORM
    // ========================================================================
    const passwordForm = document.querySelector('form[data-form="password-login"]');
    if (passwordForm) {
        passwordForm.addEventListener('submit', (e) => Auth.login(e));
        console.log('✅ Password login form listener attached');
    }



    // ========================================================================
    // 👆 WEBAUTHN - LOGIN BUTTON
    // ========================================================================
    const webauthnBtn = document.getElementById('webauthnBtn');
    if (webauthnBtn) {
        webauthnBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('👆 WebAuthn Login button clicked');
            Auth.authenticateWithWebAuthn();
        });
        console.log('✅ WebAuthn login button listener attached');
    }



    // ========================================================================
    // 👆 WEBAUTHN - TOGGLE REGISTRATION FORM
    // ========================================================================
    const toggleBioRegisterBtn = document.getElementById('toggleBioRegisterBtn');
    if (toggleBioRegisterBtn) {
        toggleBioRegisterBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('📝 Toggle registration form');
            const bioRegModal = document.getElementById('bioRegisterModal');
            if (bioRegModal) {
                bioRegModal.style.display = bioRegModal.style.display === 'none' ? 'block' : 'none';
            }
        });
        console.log('✅ Toggle registration form listener attached');
    }



    // ========================================================================
    // 👆 WEBAUTHN - REGISTRATION BUTTON
    // ========================================================================
    const registerBiometricBtn = document.getElementById('registerBiometricBtn');
    if (registerBiometricBtn) {
        registerBiometricBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('📝 WebAuthn Register button clicked');
            Auth.registerWithWebAuthn();
        });
        console.log('✅ WebAuthn register button listener attached');
    }



    // ========================================================================
    // 📧 MAGIC LINK BUTTON
    // ========================================================================
    const magicLinkBtn = document.getElementById('magicLinkBtn');
    if (magicLinkBtn) {
        magicLinkBtn.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('📧 Magic link button clicked');
            Auth.loginWithMagicLink();
        });
        console.log('✅ Magic link button listener attached');
    }



    // ========================================================================
    // 🧪 DEV LOGIN (if element exists)
    // ========================================================================
    const devLoginBtn = document.getElementById('devLoginBtn');
    if (devLoginBtn) {
        devLoginBtn.addEventListener('click', (e) => Auth.devLogin(e));
        console.log('✅ Dev login button listener attached');
    }



    console.log('✅ All Auth event listeners attached!');
});



console.log('✅ Auth v7.2 loaded - Updated endpoints + APIClient support + WebAuthn Guards + Fixed Magic Link');



// Global reference
window.Auth = Auth;