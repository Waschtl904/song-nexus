// ============================================================================
// 🔐 WEBAUTHN.JS v6.0 - WebAuthn + Magic Link Implementation
// ============================================================================
// Handles biometric registration/authentication + Magic Link

import { APIClient } from './api-client.js';
import { getAuthToken, setAuthToken, clearAuthToken } from './config.js';

export const WebAuthn = {

    // ========================================================================
    // 👆 BIOMETRIC REGISTRATION
    // ========================================================================

    async registerWithBiometric(username, email) {
        try {
            console.log('📝 Getting WebAuthn registration options...');

            // Get registration options from backend
            const options = await APIClient.post('/auth/webauthn/register-options', {
                username,
                email
            });

            console.log('✅ Registration options received');
            console.log('   Challenge:', options.challenge.substring(0, 20) + '...');

            // Create credential using WebAuthn API
            console.log('👆 Waiting for biometric input...');
            const credential = await navigator.credentials.create({
                publicKey: {
                    challenge: this._base64urlToBuffer(options.challenge),
                    rp: {
                        name: options.rp.name,
                        id: options.rp.id
                    },
                    user: {
                        id: this._base64urlToBuffer(options.user.id),
                        name: options.user.name,
                        displayName: options.user.displayName
                    },
                    pubKeyCredParams: options.pubKeyCredParams,
                    timeout: options.timeout,
                    attestation: options.attestation,
                    authenticatorSelection: options.authenticatorSelection
                }
            });

            if (!credential) {
                throw new Error('User cancelled biometric registration');
            }

            console.log('✅ Credential created');
            console.log('   ID:', credential.id.substring(0, 20) + '...');

            // Verify registration with backend
            console.log('📡 Verifying credential with backend...');
            const response = await APIClient.post('/auth/webauthn/register-verify', {
                id: credential.id,
                rawId: credential.id,
                response: {
                    clientDataJSON: this._bufferToBase64url(new Uint8Array(credential.response.clientDataJSON)),
                    attestationObject: this._bufferToBase64url(new Uint8Array(credential.response.attestationObject)),
                    transports: credential.response.getTransports ? credential.response.getTransports() : ['internal']
                },
                type: credential.type
            });

            if (response.token) {
                console.log('✅ Registration verified!');
                setAuthToken(response.token);
                return response;
            }

            throw new Error('Registration verification failed');

        } catch (error) {
            console.error('❌ Biometric registration error:', error.message);
            throw error;
        }
    },

    // ========================================================================
    // 👆 BIOMETRIC AUTHENTICATION
    // ========================================================================

    async authenticateWithBiometric() {
        try {
            console.log('📝 Getting WebAuthn authentication options...');

            // Get authentication options from backend
            const options = await APIClient.post('/auth/webauthn/authenticate-options', {});

            console.log('✅ Authentication options received');
            console.log('   Challenge:', options.challenge.substring(0, 20) + '...');
            console.log('   Allow credentials:', options.allowCredentials.length);

            // Get assertion using WebAuthn API
            console.log('👆 Waiting for biometric input...');
            const assertion = await navigator.credentials.get({
                publicKey: {
                    challenge: this._base64urlToBuffer(options.challenge),
                    timeout: options.timeout,
                    rpId: options.rpId,
                    allowCredentials: options.allowCredentials.map(cred => ({
                        ...cred,
                        id: this._base64urlToBuffer(cred.id)
                    })),
                    userVerification: options.userVerification
                }
            });

            if (!assertion) {
                throw new Error('User cancelled biometric authentication');
            }

            console.log('✅ Assertion created');
            console.log('   ID:', assertion.id.substring(0, 20) + '...');

            // Verify authentication with backend
            console.log('📡 Verifying assertion with backend...');
            const response = await APIClient.post('/auth/webauthn/authenticate-verify', {
                id: assertion.id,
                rawId: assertion.id,
                response: {
                    clientDataJSON: this._bufferToBase64url(new Uint8Array(assertion.response.clientDataJSON)),
                    authenticatorData: this._bufferToBase64url(new Uint8Array(assertion.response.authenticatorData)),
                    signature: this._bufferToBase64url(new Uint8Array(assertion.response.signature))
                },
                type: assertion.type
            });

            if (response.token) {
                console.log('✅ Authentication verified!');
                setAuthToken(response.token);
                return response;
            }

            throw new Error('Authentication verification failed');

        } catch (error) {
            console.error('❌ Biometric authentication error:', error.message);
            throw error;
        }
    },

    // ========================================================================
    // 📧 MAGIC LINK LOGIN
    // ========================================================================

    async loginWithMagicLink(email) {
        try {
            console.log('📧 Requesting magic link...');

            // This endpoint will send email with magic link
            const response = await APIClient.post('/auth/webauthn/login-magic-link', {
                email
            });

            console.log('✅ Magic link sent to:', email);
            return response;

        } catch (error) {
            console.error('❌ Magic link error:', error.message);
            throw error;
        }
    },

    // ========================================================================
    // 📧 MAGIC LINK VERIFY
    // ========================================================================

    async verifyMagicLink(token) {
        try {
            console.log('🔐 Verifying magic link token...');

            const response = await APIClient.post('/auth/webauthn/verify-magic-link', {
                token
            });

            if (response.token) {
                console.log('✅ Magic link verified!');
                setAuthToken(response.token);
                return response;
            }

            throw new Error('Magic link verification failed');

        } catch (error) {
            console.error('❌ Magic link verification error:', error.message);
            throw error;
        }
    },

    // ========================================================================
    // 🔧 HELPER FUNCTIONS
    // ========================================================================

    _base64urlToBuffer(base64url) {
        const base64 = base64url
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const padLength = (4 - (base64.length % 4)) % 4;
        const padded = base64 + '='.repeat(padLength);
        const binary = atob(padded);
        const bytes = new Uint8Array(binary.length);
        for (let i = 0; i < binary.length; i++) {
            bytes[i] = binary.charCodeAt(i);
        }
        return bytes.buffer;
    },

    _bufferToBase64url(buffer) {
        const bytes = new Uint8Array(buffer);
        let binary = '';
        for (let i = 0; i < bytes.byteLength; i++) {
            binary += String.fromCharCode(bytes[i]);
        }
        const base64 = btoa(binary);
        return base64
            .replace(/\+/g, '-')
            .replace(/\//g, '_')
            .replace(/=/g, '');
    }
};

console.log('✅ WebAuthn v6.0 loaded - Biometric + Magic Link');