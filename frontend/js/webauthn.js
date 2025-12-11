// ============================================================================
// 🔐 WEBAUTHN - Biometric Authentication & Registration
// ✅ UPDATED: Nutzt APIClient + config.js statt hardcoded URLs
// ============================================================================

const WebAuthn = {
    /**
     * Gibt die WebAuthn API Base URL zurück (dynamisch aus config.js)
     */
    getApiBase() {
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }
        // Fallback
        return 'https://localhost:3000/api';
    },

    // ========================================================================
    // 🔧 HELPER: Base64URL zu ArrayBuffer konvertieren
    // ========================================================================
    base64urlToBuffer(base64url) {
        const base64 = base64url.replace(/-/g, '+').replace(/_/g, '/');
        const padLen = (4 - (base64.length % 4)) % 4;
        const padded = base64 + '='.repeat(padLen);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },

    // ========================================================================
    // 🔧 HELPER: Options konvertieren (Base64URL → ArrayBuffer)
    // ========================================================================
    convertRegistrationOptions(options) {
        console.log('🔄 Converting registration options...');

        // Challenge muss ArrayBuffer sein
        if (options.challenge && typeof options.challenge === 'string') {
            console.log('   ✅ Converting challenge to ArrayBuffer');
            options.challenge = this.base64urlToBuffer(options.challenge);
        }

        // User ID muss ArrayBuffer sein
        if (options.user && options.user.id && typeof options.user.id === 'string') {
            console.log('   ✅ Converting user.id to ArrayBuffer');
            options.user.id = this.base64urlToBuffer(options.user.id);
        }

        console.log('✅ Registration options converted successfully');
        return options;
    },

    convertAuthenticationOptions(options) {
        console.log('🔄 Converting authentication options...');

        // Challenge muss ArrayBuffer sein
        if (options.challenge && typeof options.challenge === 'string') {
            console.log('   ✅ Converting challenge to ArrayBuffer');
            options.challenge = this.base64urlToBuffer(options.challenge);
        }

        // AllowCredentials müssen konvertiert werden
        if (options.allowCredentials && Array.isArray(options.allowCredentials)) {
            console.log('   ✅ Converting allowCredentials to ArrayBuffer');
            options.allowCredentials = options.allowCredentials.map(cred => ({
                ...cred,
                id: this.base64urlToBuffer(cred.id)
            }));
        }

        console.log('✅ Authentication options converted successfully');
        return options;
    },

    // ========================================================================
    // 📝 REGISTER WITH BIOMETRIC
    // ========================================================================
    async registerWithBiometric(username, email) {
        try {
            console.log('📝 Registering:', email);

            // ✅ NEW: Nutze getApiBase() statt hardcoded
            const apiBase = this.getApiBase();

            // 1️⃣ Get options from server
            console.log('1️⃣ Fetching registration options from server...');
            console.log(`   URL: ${apiBase}/auth/webauthn/register-options`);

            const optionsRes = await fetch(`${apiBase}/auth/webauthn/register-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email }),
                credentials: 'include'  // ✅ Important für Sessions!
            });

            if (!optionsRes.ok) {
                throw new Error(`Server error: ${optionsRes.status}`);
            }

            let options = await optionsRes.json();
            console.log('📋 Raw options from server:', options);

            // 2️⃣ Convert options (Base64URL → ArrayBuffer)
            console.log('2️⃣ Converting options for WebAuthn API...');
            options = this.convertRegistrationOptions(options);
            console.log('📋 Converted options ready for WebAuthn:', options);

            // 3️⃣ Call WebAuthn API
            console.log('3️⃣ Calling navigator.credentials.create()...');
            const credential = await navigator.credentials.create(options);

            if (!credential) {
                throw new Error('Registration cancelled by user or no authenticator available');
            }
            console.log('✅ Credential created:', credential);

            // 4️⃣ Send credential to server for verification
            console.log('4️⃣ Sending credential to server for verification...');
            const verifyRes = await fetch(`${apiBase}/auth/webauthn/register-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.credentialToJSON(credential)),
                credentials: 'include'  // ✅ Important für Sessions!
            });

            if (!verifyRes.ok) {
                const error = await verifyRes.json();
                throw new Error(`Verification failed: ${error.error}`);
            }

            const result = await verifyRes.json();
            console.log('✅ Registration successful!', result);

            // ✅ NEW: Speichere Token mit APIClient
            if (result.token && typeof APIClient !== 'undefined') {
                APIClient.setToken(result.token);
                console.log('✅ Token stored via APIClient');
            }

            return result;

        } catch (error) {
            console.error('❌ Registration error:', error.message);
            console.error('❌ Full error object:', error);
            throw error;
        }
    },

    // ========================================================================
    // 🔓 AUTHENTICATE WITH BIOMETRIC
    // ========================================================================
    async authenticateWithBiometric(email) {
        try {
            console.log('🔐 Starting authentication...');

            // ✅ NEW: Nutze getApiBase() statt hardcoded
            const apiBase = this.getApiBase();

            // 1️⃣ Get authentication options from server
            console.log('1️⃣ Fetching authentication options from server...');
            console.log(`   URL: ${apiBase}/auth/webauthn/authenticate-options`);

            const optionsRes = await fetch(`${apiBase}/auth/webauthn/authenticate-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include'  // ✅ Important für Sessions!
            });

            if (!optionsRes.ok) {
                throw new Error(`Server error: ${optionsRes.status}`);
            }

            let options = await optionsRes.json();
            console.log('📋 Raw auth options from server:', options);

            // 2️⃣ Convert options (Base64URL → ArrayBuffer)
            console.log('2️⃣ Converting options for WebAuthn API...');
            options = this.convertAuthenticationOptions(options);
            console.log('📋 Converted auth options ready for WebAuthn:', options);

            // 3️⃣ Call WebAuthn API
            console.log('3️⃣ Calling navigator.credentials.get()...');
            const assertion = await navigator.credentials.get(options);

            if (!assertion) {
                throw new Error('Authentication cancelled by user');
            }
            console.log('✅ Assertion received:', assertion);

            // 4️⃣ Send assertion to server for verification
            console.log('4️⃣ Sending assertion to server for verification...');
            const verifyRes = await fetch(`${apiBase}/auth/webauthn/authenticate-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.assertionToJSON(assertion)),
                credentials: 'include'  // ✅ Important für Sessions!
            });

            if (!verifyRes.ok) {
                const error = await verifyRes.json();
                throw new Error(`Verification failed: ${error.error}`);
            }

            const result = await verifyRes.json();
            console.log('✅ Authentication successful!', result);

            // ✅ NEW: Speichere Token mit APIClient
            if (result.token && typeof APIClient !== 'undefined') {
                APIClient.setToken(result.token);
                console.log('✅ Token stored via APIClient');
            }

            return result;

        } catch (error) {
            console.error('❌ Authentication error:', error.message);
            console.error('❌ Full error object:', error);
            throw error;
        }
    },

    // ========================================================================
    // 📧 MAGIC LINK LOGIN
    // ========================================================================
    async loginWithMagicLink(email) {
        try {
            console.log('📧 Sending magic link to:', email);

            // ✅ NEW: Nutze APIClient statt direktes fetch
            if (typeof APIClient !== 'undefined') {
                return await APIClient.sendMagicLink(email);
            }

            // Fallback
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/send-magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Failed to send magic link');
            const result = await res.json();
            console.log('✅ Magic link sent!');
            return result;

        } catch (error) {
            console.error('❌ Magic link error:', error.message);
            throw error;
        }
    },

    // ========================================================================
    // 🔗 VERIFY MAGIC LINK
    // ========================================================================
    async verifyMagicLink(token) {
        try {
            console.log('🔐 Verifying magic link...');

            // ✅ NEW: Nutze APIClient statt direktes fetch
            if (typeof APIClient !== 'undefined') {
                return await APIClient.verifyMagicLink(token);
            }

            // Fallback
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/verify-magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
                credentials: 'include'
            });

            if (!res.ok) throw new Error('Verification failed');
            const result = await res.json();
            console.log('✅ Magic link verified!');

            // ✅ NEW: Speichere Token mit APIClient
            if (result.token && typeof APIClient !== 'undefined') {
                APIClient.setToken(result.token);
                console.log('✅ Token stored via APIClient');
            }

            return result;

        } catch (error) {
            console.error('❌ Magic link verification error:', error.message);
            throw error;
        }
    },

    // ========================================================================
    // 🧪 DEV LOGIN (nur für Development!)
    // ========================================================================
    async devLogin() {
        try {
            console.log('🧪 Dev login...');

            // ✅ NEW: Nutze getApiBase() statt hardcoded
            const apiBase = this.getApiBase();
            console.log(`   URL: ${apiBase}/auth/dev-login`);

            const response = await fetch(`${apiBase}/auth/dev-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'  // ✅ Important für Sessions!
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Dev login result:', result);

            if (result.success || result.token) {
                // ✅ NEW: Nutze APIClient statt direktes Auth.setToken
                if (typeof APIClient !== 'undefined') {
                    APIClient.setToken(result.token);
                    console.log('✅ Token stored via APIClient');
                } else if (typeof Auth !== 'undefined') {
                    Auth.setToken(result.token);
                }

                if (typeof updateUI === 'function') {
                    window.updateUI();
                }
                return result;
            }
        } catch (err) {
            console.error('❌ Dev login error:', err);
            throw err;
        }
    },

    // ========================================================================
    // 🔧 HELPER: Credential zu JSON
    // ========================================================================
    credentialToJSON(credential) {
        return {
            id: credential.id,
            rawId: this.base64url(credential.rawId),
            type: credential.type,
            response: {
                clientDataJSON: this.base64url(credential.response.clientDataJSON),
                attestationObject: this.base64url(credential.response.attestationObject),
            }
        };
    },

    // ========================================================================
    // 🔧 HELPER: Assertion zu JSON
    // ========================================================================
    assertionToJSON(assertion) {
        return {
            id: assertion.id,
            rawId: this.base64url(assertion.rawId),
            type: assertion.type,
            response: {
                clientDataJSON: this.base64url(assertion.response.clientDataJSON),
                authenticatorData: this.base64url(assertion.response.authenticatorData),
                signature: this.base64url(assertion.response.signature),
                userHandle: assertion.response.userHandle ? this.base64url(assertion.response.userHandle) : null,
            }
        };
    },

    // ========================================================================
    // 🔧 HELPER: ArrayBuffer zu Base64URL
    // ========================================================================
    base64url(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
};

console.log('✅ WebAuthn loaded with enhanced debugging + ngrok support');

// Global reference
window.WebAuthn = WebAuthn;