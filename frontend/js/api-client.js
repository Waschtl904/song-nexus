// ============================================================================
// 🌐 API-CLIENT.JS v8.0 - ES6 CLASS
// REST API Client mit allen Backend-Endpoints
// ============================================================================

import { getApiBaseUrl, getAuthToken, setAuthToken } from './config.js';

export class APIClient {
    static getApiBase() {
        try {
            return getApiBaseUrl();
        } catch (err) {
            console.warn('⚠️ Config not available, using fallback');
            return '/api';   // relativ, siehe Begründung in config.js
        }
    }

    static async request(method, endpoint, data = null, token = null) {
        const apiBase = this.getApiBase();
        const url = `${apiBase}${endpoint}`;
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
            credentials: 'include',
        };

        const authToken = token || getAuthToken();
        if (authToken) {
            options.headers.Authorization = `Bearer ${authToken}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        console.log(`📡 API Request: ${method} ${url}`);

        try {
            const response = await fetch(url, options);

            if (!response.ok) {
                let error;
                try {
                    const errorData = await response.json();
                    let meldung = errorData.error || `HTTP ${response.status}`;

                    // 429 ohne Hinweis auf die Wartezeit sah aus, als wuerde
                    // die Anmeldung einfach nichts tun. Die Wartezeit steht
                    // in der Antwort und gehoert in die Meldung.
                    if (response.status === 429) {
                        const warte = errorData.retryAfter || response.headers.get('Retry-After');
                        meldung = warte
                            ? `Zu viele Anfragen. Bitte ${warte} Sekunden warten, dann erneut versuchen.`
                            : 'Zu viele Anfragen. Bitte kurz warten.';
                    }

                    error = new Error(meldung);
                    error.data = errorData;
                } catch {
                    error = new Error(
                        response.status === 429
                            ? 'Zu viele Anfragen. Bitte kurz warten.'
                            : `HTTP ${response.status}`
                    );
                }

                error.status = response.status;
                throw error;
            }

            if (response.status === 204) {
                return null;
            }

            return await response.json();
        } catch (err) {
            console.error(`❌ API Error [${method} ${endpoint}]:`, err.message);
            throw err;
        }
    }

    static get(endpoint, token = null) {
        return this.request('GET', endpoint, null, token);
    }

    static post(endpoint, data, token = null) {
        return this.request('POST', endpoint, data, token);
    }

    static put(endpoint, data, token = null) {
        return this.request('PUT', endpoint, data, token);
    }

    static patch(endpoint, data, token = null) {
        return this.request('PATCH', endpoint, data, token);
    }

    static delete(endpoint, token = null) {
        return this.request('DELETE', endpoint, null, token);
    }

    static async register(email, username, password) {
        const response = await this.post('/auth/webauthn/register-password', { email, username, password });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    static async login(username, password) {
        const response = await this.post('/auth/webauthn/authenticate-password', { username, password });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    static async logout() {
        try {
            console.log('🚪 Logout: Sending request to backend...');
            // Cookie wird vom Browser automatisch mitgeschickt (credentials: 'include')
            // Backend löscht den HttpOnly Cookie serverseitig
            await this.post('/auth/logout', {});
            console.log('✅ Logout successful from backend');
            this.clearToken(); // Lokale Kopie bereinigen (Legacy)
        } catch (err) {
            console.error('❌ Logout error:', err.message);
            this.clearToken();
            throw err;
        }
    }

    static async sendMagicLink(email) {
        return this.post('/auth/webauthn/magic-link-request', { email });
    }

    static async verifyMagicLink(token) {
        const response = await this.post('/auth/webauthn/magic-link-verify', { token });
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    static async getWebAuthnRegisterOptions() {
        return this.get('/auth/webauthn/register-options');
    }

    static async verifyWebAuthnRegistration(credential) {
        const response = await this.post('/auth/webauthn/register-verify', credential);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    static async getWebAuthnAuthenticateOptions(email) {
        return this.post('/auth/webauthn/authenticate-options', { email });
    }

    static async verifyWebAuthnAuthentication(assertion) {
        const response = await this.post('/auth/webauthn/authenticate-verify', assertion);
        if (response.token) {
            this.setToken(response.token);
        }
        return response;
    }

    static async getCurrentUser() {
        return this.get('/auth/me');
    }

    static async getTracks() {
        return this.get('/tracks');
    }

    static async getTrack(id) {
        return this.get(`/tracks/${id}`);
    }

    static async createTrack(trackData) {
        return this.post('/admin/tracks', trackData);
    }

    static async updateTrack(id, trackData) {
        return this.put(`/admin/tracks/${id}`, trackData);
    }

    static async deleteTrack(id) {
        return this.delete(`/admin/tracks/${id}`);
    }

    static async searchTracks(query) {
        return this.get(`/tracks/search?q=${encodeURIComponent(query)}`);
    }

    static async getUserProfile() {
        return this.get('/users/profile');
    }

    static async updateUserProfile(data) {
        return this.put('/users/profile', data);
    }

    static async getUser(id) {
        return this.get(`/users/${id}`);
    }

    static async getUserPurchases() {
        return this.get('/users/purchases');
    }

    static async createPayPalOrder(items) {
        return this.post('/payments/create-order', { items });
    }

    static async capturePayPalOrder(orderId) {
        return this.post('/payments/capture-order', { orderId });
    }

    static async getPayPalOrderStatus(orderId) {
        return this.get(`/payments/order/${orderId}`);
    }

    static async logPlayEvent(trackId, duration) {
        return this.post('/play-history/log', { trackId, duration });
    }

    static async getPlayHistory() {
        return this.get('/play-history');
    }

    static async getPlayStats() {
        return this.get('/play-history/stats');
    }

    static setToken(token) {
        // Token wird jetzt primär als HttpOnly Cookie vom Backend gesetzt.
        // Lokale Kopie nur noch als Legacy-Fallback für Übergangszeitraum.
        if (token) setAuthToken(token);
    }

    static getToken() {
        // Gibt localStorage-Token zurück (Legacy).
        // In Zukunft: /api/auth/me aufrufen statt Token lokal lesen.
        return getAuthToken();
    }

    static clearToken() {
        if (typeof localStorage !== 'undefined') {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            console.log('✅ Lokale Auth-Daten gelöscht');
        }
    }

    static isAuthenticated() {
        // Primär: localStorage-Check (Legacy)
        // In Zukunft: /api/auth/me als Quelle der Wahrheit
        return !!this.getToken();
    }
}

console.log('✅ APIClient v8.0 loaded - ES6 Module');