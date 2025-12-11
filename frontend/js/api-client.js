"use strict";

// ============================================================================
// 🔌 API CLIENT - Integriert mit universeller config.js
// ============================================================================
// Diese Klasse nutzt die zentrale URL-Konfiguration aus config.js
// Keine hardcodierten URLs mehr!
// ============================================================================

/**
 * APIClient Klasse für standardisierte API-Calls
 * - Nutzt automatisch config.js für URLs
 * - Fallback auf inline-Funktionen wenn config.js nicht geladen
 */
class APIClient {
    /**
     * Gibt die API-Basis-URL zurück (aus config.js oder Fallback)
     */
    static getApiBase() {
        // Wenn config.js geladen ist, nutze es
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }

        // Fallback: Auto-detect wie in config.js
        if (typeof window !== 'undefined') {
            if (window.location.hostname.includes('ngrok')) {
                return `https://${window.location.hostname}/api`;
            }
        }

        // Default für Development
        return 'https://localhost:3000/api';
    }

    /**
     * Haupt-Request-Methode
     * @param {string} method - HTTP-Methode (GET, POST, PUT, DELETE)
     * @param {string} endpoint - API-Endpoint (z.B. '/auth/login')
     * @param {object} data - Request Body
     * @param {string} token - JWT-Token (optional)
     * @returns {Promise} Response JSON
     */
    static async request(method, endpoint, data = null, token = null) {
        const apiBase = this.getApiBase();
        const url = `${apiBase}${endpoint}`;

        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include', // wichtig für Cookies/Sessions!
        };

        // Token hinzufügen (oder aus localStorage wenn nicht übergeben)
        const authToken = token || (typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null);
        if (authToken) {
            options.headers.Authorization = `Bearer ${authToken}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        console.log(`📡 API Request: ${method} ${url}`);

        try {
            const response = await fetch(url, options);

            // Error Handling
            if (!response.ok) {
                let error;
                try {
                    const errorData = await response.json();
                    error = new Error(errorData.error || `HTTP ${response.status}`);
                    error.data = errorData;
                } catch {
                    error = new Error(`HTTP ${response.status}`);
                }
                error.status = response.status;
                throw error;
            }

            // Leere Responses (z.B. 204 No Content)
            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (err) {
            console.error(`❌ API Error [${method} ${endpoint}]:`, err.message);
            throw err;
        }
    }

    // ====================================================================
    // 🎯 CONVENIENCE METHODS
    // ====================================================================

    /**
     * GET request
     */
    static get(endpoint, token = null) {
        return this.request('GET', endpoint, null, token);
    }

    /**
     * POST request
     */
    static post(endpoint, data, token = null) {
        return this.request('POST', endpoint, data, token);
    }

    /**
     * PUT request
     */
    static put(endpoint, data, token = null) {
        return this.request('PUT', endpoint, data, token);
    }

    /**
     * PATCH request
     */
    static patch(endpoint, data, token = null) {
        return this.request('PATCH', endpoint, data, token);
    }

    /**
     * DELETE request
     */
    static delete(endpoint, token = null) {
        return this.request('DELETE', endpoint, null, token);
    }

    // ====================================================================
    // 🔐 AUTHENTICATION METHODS
    // ====================================================================

    /**
     * User-Registrierung
     */
    static async register(email, password) {
        const response = await this.post('/auth/register', { email, password });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * User-Login
     */
    static async login(email, password) {
        const response = await this.post('/auth/login', { email, password });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * User-Logout
     */
    static async logout() {
        try {
            await this.post('/auth/logout', {});
        } finally {
            this.clearToken();
        }
    }

    /**
     * Magic Link versenden
     */
    static async sendMagicLink(email) {
        return this.post('/auth/send-magic-link', { email });
    }

    /**
     * Magic Link verifyieren
     */
    static async verifyMagicLink(token) {
        const response = await this.post('/auth/verify-magic-link', { token });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * WebAuthn: Registrierungs-Optionen abrufen
     */
    static async getWebAuthnRegisterOptions() {
        return this.get('/auth/webauthn/register-options');
    }

    /**
     * WebAuthn: Registrierung verifyieren
     */
    static async verifyWebAuthnRegistration(credential) {
        const response = await this.post('/auth/webauthn/register-verify', credential);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * WebAuthn: Authentifizierungs-Optionen abrufen
     */
    static async getWebAuthnAuthenticateOptions(email) {
        return this.post('/auth/webauthn/authenticate-options', { email });
    }

    /**
     * WebAuthn: Authentifizierung verifyieren
     */
    static async verifyWebAuthnAuthentication(assertion) {
        const response = await this.post('/auth/webauthn/authenticate-verify', assertion);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    /**
     * Aktuelle User-Info abrufen
     */
    static async getCurrentUser() {
        return this.get('/auth/me');
    }

    // ====================================================================
    // 🎵 TRACKS METHODS
    // ====================================================================

    /**
     * Alle Tracks abrufen
     */
    static async getTracks() {
        return this.get('/tracks');
    }

    /**
     * Einen Track abrufen
     */
    static async getTrack(id) {
        return this.get(`/tracks/${id}`);
    }

    /**
     * Track erstellen (Admin)
     */
    static async createTrack(trackData) {
        return this.post('/admin/tracks', trackData);
    }

    /**
     * Track aktualisieren (Admin)
     */
    static async updateTrack(id, trackData) {
        return this.put(`/admin/tracks/${id}`, trackData);
    }

    /**
     * Track löschen (Admin)
     */
    static async deleteTrack(id) {
        return this.delete(`/admin/tracks/${id}`);
    }

    /**
     * Tracks durchsuchen
     */
    static async searchTracks(query) {
        return this.get(`/tracks/search?q=${encodeURIComponent(query)}`);
    }

    // ====================================================================
    // 👤 USERS METHODS
    // ====================================================================

    /**
     * User-Profil abrufen
     */
    static async getUserProfile() {
        return this.get('/users/profile');
    }

    /**
     * User-Profil aktualisieren
     */
    static async updateUserProfile(data) {
        return this.put('/users/profile', data);
    }

    /**
     * User abrufen (by ID)
     */
    static async getUser(id) {
        return this.get(`/users/${id}`);
    }

    // ====================================================================
    // 💳 PAYMENTS METHODS
    // ====================================================================

    /**
     * PayPal Order erstellen
     */
    static async createPayPalOrder(items) {
        return this.post('/payments/create-order', { items });
    }

    /**
     * PayPal Order erfassen (capture)
     */
    static async capturePayPalOrder(orderId) {
        return this.post('/payments/capture-order', { orderId });
    }

    /**
     * PayPal Order Status abrufen
     */
    static async getPayPalOrderStatus(orderId) {
        return this.get(`/payments/order/${orderId}`);
    }

    // ====================================================================
    // 📊 PLAY HISTORY METHODS
    // ====================================================================

    /**
     * Play-Event loggen
     */
    static async logPlayEvent(trackId, duration) {
        return this.post('/play-history/log', { trackId, duration });
    }

    /**
     * Play-History abrufen
     */
    static async getPlayHistory() {
        return this.get('/play-history');
    }

    /**
     * Play-Statistiken abrufen
     */
    static async getPlayStats() {
        return this.get('/play-history/stats');
    }

    // ====================================================================
    // 🔑 TOKEN MANAGEMENT
    // ====================================================================

    /**
     * Token speichern
     */
    static setToken(token) {
        if (typeof localStorage !== 'undefined') {
            localStorage.setItem('auth_token', token);
            console.log('✅ Auth token stored');
        }
    }

    /**
     * Token abrufen
     */
    static getToken() {
        if (typeof localStorage !== 'undefined') {
            return localStorage.getItem('auth_token');
        }
        return null;
    }

    /**
     * Token löschen
     */
    static clearToken() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('auth_token');
            console.log('✅ Auth token cleared');
        }
    }

    /**
     * Prüft ob User angemeldet ist
     */
    static isAuthenticated() {
        return !!this.getToken();
    }
}

// ============================================================================
// 📤 EXPORTS
// ============================================================================

if (typeof module !== 'undefined' && module.exports) {
    module.exports = APIClient;
}

if (typeof window !== 'undefined') {
    window.APIClient = APIClient;
}