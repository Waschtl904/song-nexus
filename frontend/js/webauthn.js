const WebAuthn = {
    apiBase: 'https://localhost:3000/api/auth',

    async registerWithBiometric(username, email) {
        try {
            console.log('📝 Registering:', email);
            const optionsRes = await fetch(`${this.apiBase}/webauthn-register-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, email }),
                credentials: 'include'
            });
            if (!optionsRes.ok) throw new Error('Failed to get options');
            const options = await optionsRes.json();
            const credential = await navigator.credentials.create(options);
            if (!credential) throw new Error('Registration cancelled');
            const verifyRes = await fetch(`${this.apiBase}/webauthn-register-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.credentialToJSON(credential)),
                credentials: 'include'
            });
            if (!verifyRes.ok) throw new Error('Verification failed');
            const result = await verifyRes.json();
            console.log('✅ Registration successful!');
            return result;
        } catch (error) {
            console.error('❌ Registration error:', error.message);
            throw error;
        }
    },

    async authenticateWithBiometric() {
        try {
            console.log('🔐 Authenticating...');
            const optionsRes = await fetch(`${this.apiBase}/webauthn-authenticate-options`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({}),
                credentials: 'include'
            });
            if (!optionsRes.ok) throw new Error('Failed to get options');
            const options = await optionsRes.json();
            const assertion = await navigator.credentials.get(options);
            if (!assertion) throw new Error('Authentication cancelled');
            const verifyRes = await fetch(`${this.apiBase}/webauthn-authenticate-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(this.assertionToJSON(assertion)),
                credentials: 'include'
            });
            if (!verifyRes.ok) throw new Error('Verification failed');
            const result = await verifyRes.json();
            console.log('✅ Authentication successful!');
            return result;
        } catch (error) {
            console.error('❌ Authentication error:', error.message);
            throw error;
        }
    },

    async loginWithMagicLink(email) {
        try {
            console.log('📧 Sending magic link...');
            const res = await fetch(`${this.apiBase}/magic-link`, {
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

    async verifyMagicLink(token) {
        try {
            console.log('🔐 Verifying magic link...');
            const res = await fetch(`${this.apiBase}/magic-link-verify`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ token }),
                credentials: 'include'
            });
            if (!res.ok) throw new Error('Verification failed');
            const result = await res.json();
            console.log('✅ Magic link verified!');
            return result;
        } catch (error) {
            console.error('❌ Magic link verification error:', error.message);
            throw error;
        }
    },

    async devLogin() {
        try {
            console.log('🧪 Dev login...');
            const response = await fetch(`${this.apiBase}/dev-login`, {  // ← RELATIVER PFAD!
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include'
            });

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}`);
            }

            const result = await response.json();
            console.log('✅ Dev login result:', result);

            if (result.success || result.token) {
                Auth.setToken(result.token);
                Auth.setUser(result.user);
                if (window.updateUI) {
                    window.updateUI();
                }
                return result;
            }
        } catch (err) {
            console.error('❌ Dev login error:', err);
            throw err;
        }
    },



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

    base64url(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
};

console.log('✅ WebAuthn loaded');