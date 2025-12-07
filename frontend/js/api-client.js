"use strict";

// ========================================================================
// 🔌 API CLIENT
// ========================================================================

const API_BASE = 'https://localhost:3000/api';

class APIClient {
    static async request(method, endpoint, data = null, token = null) {
        const options = {
            method,
            headers: {
                'Content-Type': 'application/json',
            },
        };

        if (token) {
            options.headers.Authorization = `Bearer ${token}`;
        }

        if (data) {
            options.body = JSON.stringify(data);
        }

        try {
            const response = await fetch(`${API_BASE}${endpoint}`, options);
            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Request failed');
            }
            return await response.json();
        } catch (err) {
            console.error('API Error:', err);
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

    static delete(endpoint, token = null) {
        return this.request('DELETE', endpoint, null, token);
    }
}
