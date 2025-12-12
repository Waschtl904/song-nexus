// ============================================================================
// 🔐 WEBAUTHN - FIREFOX & EDGE FIX (v7.2 Updated Magic Link Endpoints)
// ============================================================================

const WebAuthn = {

    /**
     * Gibt die WebAuthn API Base URL zurück (dynamisch aus config.js)
     */
    getApiBase() {
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }
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
        if (options.challenge && typeof options.challenge === 'string') {
            console.log('  ✅ Converting challenge to ArrayBuffer');
            options.challenge = this.base64urlToBuffer(options.challenge);
        }
        if (options.user && options.user.id && typeof options.user.id === 'string') {
            console.log('  ✅ Converting user.id to ArrayBuffer');
            options.user.id = this.base64urlToBuffer(options.user.id);
        }
        console.log('✅ Registration options converted successfully');
        return options;
    },

    convertAuthenticationOptions(options) {
        console.log('🔄 Converting authentication options...');
        if (options.challenge && typeof options.challenge === 'string') {
            console.log('  ✅ Converting challenge to ArrayBuffer');
            options.challenge = this.base64urlToBuffer(options.challenge);
        }
        if (options.allowCredentials && Array.isArray(options.allowCredentials)) {
            console.log('  ✅ Converting allowCredentials to ArrayBuffer');
            options.allowCredentials = options.allowCredentials.map(cred => ({
                ...cred,
                id: this.base64urlToBuffer(cred.id)
            }));
        }
        console.log('✅ Authentication options converted successfully');
        return options;
    },

    // ========================================================================
    // 📝 REGISTER WITH BIOMETRIC (FIREFOX & EDGE FIXED!)
    // ========================================================================

    async registerWithBiometric(username, email) {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`📝 Registration attempt ${attempt}/${maxRetries}...`);
                console.log('Registering:', email);
                const apiBase = this.getApiBase();

                // 1️⃣ Get options from server
                console.log('1️⃣ Fetching registration options from server...');
                console.log(`  URL: ${apiBase}/auth/webauthn/register-options`);
                const optionsRes = await fetch(`${apiBase}/auth/webauthn/register-options`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ username, email }),
                    credentials: 'include'  // ← WICHTIG!
                });

                if (!optionsRes.ok) {
                    const errorData = await optionsRes.json().catch(() => ({}));
                    const error = new Error(`Server error ${optionsRes.status}: ${errorData.error || 'Unknown error'}`);
                    error.status = optionsRes.status;
                    throw error;
                }

                let options = await optionsRes.json();
                console.log('📋 Raw options from server:', options);

                // 2️⃣ Convert options (Base64URL → ArrayBuffer)
                console.log('2️⃣ Converting options for WebAuthn API...');
                options = this.convertRegistrationOptions(options);
                console.log('📋 Converted options ready for WebAuthn:', options);

                // ✅ FIREFOX & EDGE FIX: Ensure only required credential type
                const cleanOptions = {
                    challenge: options.challenge,
                    rp: options.rp,
                    user: options.user,
                    pubKeyCredParams: options.pubKeyCredParams,
                    timeout: options.timeout,
                    attestation: options.attestation || 'none',
                    authenticatorSelection: {
                        authenticatorAttachment: undefined,
                        userVerification: 'preferred',
                        residentKey: 'discouraged'
                    }
                };

                console.log('✅ Final cleaned options for navigator.credentials.create():', {
                    challenge: typeof cleanOptions.challenge,
                    rp: cleanOptions.rp,
                    user: cleanOptions.user,
                    pubKeyCredParams: cleanOptions.pubKeyCredParams,
                    authenticatorSelection: cleanOptions.authenticatorSelection
                });

                // 3️⃣ Call WebAuthn API with CLEAN options
                console.log('3️⃣ Calling navigator.credentials.create()...');

                // ✅ DEBUG: Check if WebAuthn is available
                if (!navigator.credentials) {
                    throw new Error('navigator.credentials not available');
                }
                if (!window.PublicKeyCredential) {
                    throw new Error('PublicKeyCredential not available');
                }

                console.log('✅ WebAuthn API available, calling create()...');
                const credential = await navigator.credentials.create({
                    publicKey: cleanOptions
                });

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
                    credentials: 'include'
                });

                if (!verifyRes.ok) {
                    const error = await verifyRes.json().catch(() => ({}));
                    const err = new Error(`Verification failed: ${error.error || 'Unknown error'}`);
                    err.status = verifyRes.status;
                    throw err;
                }

                const result = await verifyRes.json();
                console.log('✅ Registration successful!', result);

                if (result.token && typeof APIClient !== 'undefined') {
                    APIClient.setToken(result.token);
                    console.log('✅ Token stored via APIClient');
                }

                return result;

            } catch (error) {
                lastError = error;
                console.error(`❌ Attempt ${attempt} failed:`, error.message);

                if (error.status === 429 && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    },

    // ========================================================================
    // 🔓 AUTHENTICATE WITH BIOMETRIC (FIREFOX & EDGE FIXED!)
    // ========================================================================

    async authenticateWithBiometric() {
        const maxRetries = 3;
        let lastError;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`🔓 Authentication attempt ${attempt}/${maxRetries}...`);
                console.log('Starting authentication - NO email needed...');
                const apiBase = this.getApiBase();

                // 1️⃣ Get authentication options from server
                console.log('1️⃣ Fetching authentication options from server...');
                console.log(`  URL: ${apiBase}/auth/webauthn/authenticate-options`);
                const optionsRes = await fetch(`${apiBase}/auth/webauthn/authenticate-options`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({}),
                    credentials: 'include'  // ← WICHTIG!
                });

                if (!optionsRes.ok) {
                    const errorData = await optionsRes.json().catch(() => ({}));
                    const error = new Error(`Server error ${optionsRes.status}: ${errorData.error || 'Unknown error'}`);
                    error.status = optionsRes.status;
                    throw error;
                }

                let options = await optionsRes.json();
                console.log('📋 Raw auth options from server:', options);

                // 2️⃣ Convert options (Base64URL → ArrayBuffer)
                console.log('2️⃣ Converting options for WebAuthn API...');
                options = this.convertAuthenticationOptions(options);
                console.log('📋 Converted auth options ready for WebAuthn:', options);

                // ✅ FIREFOX & EDGE FIX: Ensure only required credential type
                const cleanOptions = {
                    challenge: options.challenge,
                    timeout: options.timeout,
                    rpId: options.rpId,
                    userVerification: options.userVerification || 'preferred',
                    allowCredentials: options.allowCredentials || []  // ← DEFAULT EMPTY ARRAY!
                };

                console.log('✅ Final cleaned options for navigator.credentials.get():', {
                    challenge: typeof cleanOptions.challenge,
                    rpId: cleanOptions.rpId,
                    userVerification: cleanOptions.userVerification,
                    allowCredentials: cleanOptions.allowCredentials.length
                });

                // 3️⃣ Call WebAuthn API with CLEAN options
                console.log('3️⃣ Calling navigator.credentials.get()...');

                if (!navigator.credentials) {
                    throw new Error('navigator.credentials not available');
                }

                console.log('✅ WebAuthn API available, calling get()...');
                const assertion = await navigator.credentials.get({
                    publicKey: cleanOptions
                });

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
                    credentials: 'include'
                });

                if (!verifyRes.ok) {
                    const error = await verifyRes.json().catch(() => ({}));
                    const err = new Error(`Verification failed: ${error.error || 'Unknown error'}`);
                    err.status = verifyRes.status;
                    throw err;
                }

                const result = await verifyRes.json();
                console.log('✅ Authentication successful!', result);

                if (result.token && typeof APIClient !== 'undefined') {
                    APIClient.setToken(result.token);
                    console.log('✅ Token stored via APIClient');
                }

                return result;

            } catch (error) {
                lastError = error;
                console.error(`❌ Attempt ${attempt} failed:`, error.message);

                if (error.status === 429 && attempt < maxRetries) {
                    const delay = Math.pow(2, attempt) * 1000;
                    console.log(`⏳ Rate limited. Waiting ${delay}ms before retry...`);
                    await new Promise(r => setTimeout(r, delay));
                    continue;
                }

                throw error;
            }
        }

        throw lastError;
    },

    // ========================================================================
    // 📧 MAGIC LINK LOGIN (v7.2 UPDATED ENDPOINT)
    // ========================================================================

    async loginWithMagicLink(email) {
        try {
            console.log('📧 Sending magic link to:', email);

            if (typeof APIClient !== 'undefined') {
                return await APIClient.sendMagicLink(email);
            }

            const apiBase = this.getApiBase();
            // ✅ UPDATED: v7.2 endpoint
            const res = await fetch(`${apiBase}/auth/webauthn/magic-link-request`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email }),
                credentials: 'include'
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(error.error || 'Failed to send magic link');
            }

            const result = await res.json();
            console.log('✅ Magic link sent!');
            return result;

        } catch (error) {
            console.error('❌ Magic link error:', error.message);
            throw error;
        }
    },

    // ========================================================================
    // 🔗 VERIFY MAGIC LINK (v7.2 UPDATED ENDPOINT)
    // ========================================================================

    async verifyMagicLink(token) {
        try {
            console.log('🔐 Verifying magic link...');

            if (typeof APIClient !== 'undefined') {
                return await APIClient.verifyMagicLink(token);
            }

            const apiBase = this.getApiBase();
            // ✅ UPDATED: v7.2 endpoint
            const res = await fetch(`${apiBase}/auth/webauthn/magic-link-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
                credentials: 'include'
            });

            if (!res.ok) {
                const error = await res.json().catch(() => ({}));
                throw new Error(`Verification failed: ${error.error || 'Unknown error'}`);
            }

            const result = await res.json();
            console.log('✅ Magic link verified!');

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
    // 🧪 DEV LOGIN
    // ========================================================================

    async devLogin() {
        try {
            console.log('🧪 Dev login...');
            const apiBase = this.getApiBase();
            console.log(`  URL: ${apiBase}/auth/dev-login`);

            const response = await fetch(`${apiBase}/auth/dev-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                const error = await response.json().catch(() => ({}));
                throw new Error(`HTTP ${response.status}: ${error.error || 'Unknown error'}`);
            }

            const result = await response.json();
            console.log('✅ Dev login result:', result);

            if (result.success && result.token) {
                if (typeof APIClient !== 'undefined') {
                    APIClient.setToken(result.token);
                    console.log('✅ Token stored via APIClient');
                } else if (typeof Auth !== 'undefined') {
                    Auth.setToken(result.token);
                }

                if (typeof updateUI === 'function') {
                    window.updateUI();
                }
            }

            return result;

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
                attestationObject: this.base64url(credential.response.attestationObject)
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
                userHandle: assertion.response.userHandle ? this.base64url(assertion.response.userHandle) : null
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
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
    }
};

console.log('✅ WebAuthn loaded with FIREFOX + EDGE FIX - v7.2 Magic Link endpoints');

// Global reference
window.WebAuthn = WebAuthn;