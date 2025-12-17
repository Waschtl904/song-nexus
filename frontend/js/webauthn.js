// ============================================================================
// 🔐 WEBAUTHN.JS v8.0 - ES6 MODULE
// WebAuthn / Biometric Authentication Handler
// ============================================================================

import { getApiBaseUrl } from './config.js';
import { APIClient } from './api-client.js';

export const WebAuthn = {
    getApiBase() {
        return getApiBaseUrl();
    },

    async getRegisterOptions() {
        try {
            console.log('🔐 Getting WebAuthn registration options...');
            return await APIClient.getWebAuthnRegisterOptions();
        } catch (err) {
            console.error('❌ Failed to get registration options:', err);
            throw err;
        }
    },

    async registerWithBiometric(username, email) {
        try {
            console.log('🔐 Starting WebAuthn biometric registration...');

            if (!navigator.credentials || !window.PublicKeyCredential) {
                throw new Error('WebAuthn not supported in this browser');
            }

            const options = await this.getRegisterOptions();

            if (!options.challenge) {
                throw new Error('Server did not return challenge');
            }

            options.challenge = this.base64ToBuffer(options.challenge);
            options.user.id = this.base64ToBuffer(options.user.id);

            console.log('📋 Challenge received:', options.challenge.length, 'bytes');

            const credential = await navigator.credentials.create({
                publicKey: options,
            });

            if (!credential) {
                throw new Error('User cancelled biometric verification or registration failed');
            }

            console.log('✅ Biometric credential created');

            const credentialForServer = {
                id: credential.id,
                rawId: this.bufferToBase64(credential.rawId),
                response: {
                    clientDataJSON: this.bufferToBase64(credential.response.clientDataJSON),
                    attestationObject: this.bufferToBase64(credential.response.attestationObject),
                },
                type: credential.type,
            };

            const result = await APIClient.verifyWebAuthnRegistration(credentialForServer);
            console.log('✅ Registration verified by server!', result);
            return result;
        } catch (err) {
            console.error('❌ WebAuthn registration error:', err.message);
            throw err;
        }
    },

    async getAuthenticateOptions(email) {
        try {
            console.log('🔐 Getting WebAuthn authentication options...');
            return await APIClient.getWebAuthnAuthenticateOptions(email);
        } catch (err) {
            console.error('❌ Failed to get authentication options:', err);
            throw err;
        }
    },

    async authenticateWithBiometric() {
        try {
            console.log('🔐 Starting WebAuthn biometric authentication...');

            if (!navigator.credentials || !window.PublicKeyCredential) {
                throw new Error('WebAuthn not supported in this browser');
            }

            const options = await this.getAuthenticateOptions('');

            if (!options.challenge) {
                throw new Error('Server did not return challenge');
            }

            options.challenge = this.base64ToBuffer(options.challenge);

            if (options.allowCredentials && Array.isArray(options.allowCredentials)) {
                options.allowCredentials = options.allowCredentials.map(cred => ({
                    ...cred,
                    id: this.base64ToBuffer(cred.id),
                }));
            }

            console.log('📋 Challenge received:', options.challenge.length, 'bytes');

            const assertion = await navigator.credentials.get({
                publicKey: options,
            });

            if (!assertion) {
                throw new Error('User cancelled biometric verification or authentication failed');
            }

            console.log('✅ Biometric assertion created');

            const assertionForServer = {
                id: assertion.id,
                rawId: this.bufferToBase64(assertion.rawId),
                response: {
                    clientDataJSON: this.bufferToBase64(assertion.response.clientDataJSON),
                    authenticatorData: this.bufferToBase64(assertion.response.authenticatorData),
                    signature: this.bufferToBase64(assertion.response.signature),
                    userHandle: assertion.response.userHandle ? this.bufferToBase64(assertion.response.userHandle) : null,
                },
                type: assertion.type,
            };

            const result = await APIClient.verifyWebAuthnAuthentication(assertionForServer);
            console.log('✅ Authentication verified by server!', result);
            return result;
        } catch (err) {
            console.error('❌ WebAuthn authentication error:', err.message);
            throw err;
        }
    },

    async loginWithMagicLink(email) {
        try {
            console.log('📧 Sending magic link to:', email);
            const result = await APIClient.sendMagicLink(email);
            console.log('✅ Magic link sent!');
            return result;
        } catch (err) {
            console.error('❌ Magic link send error:', err.message);
            throw err;
        }
    },

    async verifyMagicLink(token) {
        try {
            console.log('🔐 Verifying magic link token...');
            const result = await APIClient.verifyMagicLink(token);
            console.log('✅ Magic link verified!');
            return result;
        } catch (err) {
            console.error('❌ Magic link verification error:', err.message);
            throw err;
        }
    },

    async devLogin() {
        try {
            console.log('🧪 Dev login...');
            const apiBase = this.getApiBase();
            const res = await fetch(`${apiBase}/auth/dev-login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
            });

            if (!res.ok) throw new Error('Dev login failed');

            const result = await res.json();
            if (result.token) {
                APIClient.setToken(result.token);
            }
            console.log('✅ Dev login successful!');
            return result;
        } catch (err) {
            console.error('❌ Dev login error:', err.message);
            throw err;
        }
    },

    base64ToBuffer(base64) {
        const binary_string = atob(base64);
        const bytes = new Uint8Array(binary_string.length);
        for (let i = 0; i < binary_string.length; i++) {
            bytes[i] = binary_string.charCodeAt(i);
        }
        return bytes.buffer;
    },

    bufferToBase64(buffer) {
        let binary = '';
        const bytes = new Uint8Array(buffer);
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        return btoa(binary);
    },
};

console.log('✅ WebAuthn v8.0 loaded - ES6 Module');