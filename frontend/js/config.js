
// ============================================================================
// 🔧 CONFIG.JS v8.0 - ES6 MODULE
// Zentrale API-Konfiguration + Helper-Funktionen
// ============================================================================

"use strict";

export function isNgrokEnvironment() {
    return typeof window !== 'undefined' && window.location.hostname.includes('ngrok');
}

export function getApiBaseUrl() {
    if (isNgrokEnvironment()) {
        return `https://${window.location.hostname}/api`;
    }
    return 'https://localhost:3000/api';
}

export function getServerBaseUrl() {
    if (isNgrokEnvironment()) {
        return `https://${window.location.hostname}`;
    }
    return 'https://localhost:3000';
}

export const API_ENDPOINTS = {
    auth: {
        register: '/auth/webauthn/register-password',
        login: '/auth/webauthn/authenticate-password',
        logout: '/auth/logout',
        refresh: '/auth/refresh',
        me: '/auth/me',
    },
    webauthn: {
        registerOptions: '/auth/webauthn/register-options',
        registerVerify: '/auth/webauthn/register-verify',
        authenticateOptions: '/auth/webauthn/authenticate-options',
        authenticateVerify: '/auth/webauthn/authenticate-verify',
    },
    authSimple: {
        sendMagicLink: '/auth/webauthn/magic-link-request',
        verifyMagicLink: '/auth/webauthn/magic-link-verify',
    },
    tracks: {
        list: '/tracks',
        get: (id) => `/tracks/${id}`,
        create: '/tracks',
        update: (id) => `/tracks/${id}`,
        delete: (id) => `/tracks/${id}`,
        search: '/tracks/search',
    },
    users: {
        get: (id) => `/users/${id}`,
        update: (id) => `/users/${id}`,
        profile: '/users/profile',
        purchases: '/users/purchases',
    },
    payments: {
        createOrder: '/payments/create-order',
        captureOrder: '/payments/capture-order',
        orderStatus: (orderId) => `/payments/order/${orderId}`,
    },
    playHistory: {
        log: '/play-history/log',
        list: '/play-history',
        stats: '/play-history/stats',
    },
    admin: {
        tracks: {
            list: '/admin/tracks',
            create: '/admin/tracks',
            update: (id) => `/admin/tracks/${id}`,
            delete: (id) => `/admin/tracks/${id}`,
        },
    },
};

export function getFullUrl(endpoint) {
    const baseUrl = getApiBaseUrl();
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
}

export async function apiCall(endpoint, options = {}) {
    const url = getFullUrl(endpoint);
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include',
    };

    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
        },
    };

    const token = typeof localStorage !== 'undefined' ? localStorage.getItem('auth_token') : null;
    if (token) {
        finalOptions.headers.Authorization = `Bearer ${token}`;
    }

    console.log(`📡 API Call: ${finalOptions.method} ${url}`);

    try {
        const response = await fetch(url, finalOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error || `API Error: ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }

        if (response.status === 204) {
            return null;
        }

        return await response.json();
    } catch (error) {
        console.error(`❌ API Error: ${error.message}`, error);
        throw error;
    }
}

export function setAuthToken(token) {
    if (typeof localStorage !== 'undefined') {
        localStorage.setItem('auth_token', token);
        console.log('✅ Auth token stored');
    }
}

export function getAuthToken() {
    if (typeof localStorage !== 'undefined') {
        return localStorage.getItem('auth_token');
    }
    return null;
}

export function clearAuthToken() {
    if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('auth_token');
        console.log('✅ Auth token cleared');
    }
}

export function isAuthenticated() {
    return !!getAuthToken();
}

export function getAudioUrl(filename) {
    const serverBase = getServerBaseUrl();
    return `${serverBase}/public/audio/${filename}`;
}

export function getAssetUrl(path) {
    const serverBase = getServerBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${serverBase}${cleanPath}`;
}

export async function fetchTracks() {
    return apiCall('/tracks');
}

export async function fetchTrack(id) {
    return apiCall(`/tracks/${id}`);
}

export async function registerWebAuthn(credential) {
    return apiCall('/auth/webauthn/register-verify', {
        method: 'POST',
        body: JSON.stringify(credential),
    });
}

export async function authenticateWebAuthn(assertion) {
    return apiCall('/auth/webauthn/authenticate-verify', {
        method: 'POST',
        body: JSON.stringify(assertion),
    });
}

export function logConfigInfo() {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║ 🔧 SONG-NEXUS API CONFIGURATION v8.0 ES6 ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`🌐 Environment: ${isNgrokEnvironment() ? '🌍 ngrok' : '🏠 localhost'}`);
    console.log(`📍 Server Base: ${getServerBaseUrl()}`);
    console.log(`🔌 API Base: ${getApiBaseUrl()}`);
    console.log(`🔐 Authenticated: ${isAuthenticated() ? '✅ Yes' : '❌ No'}`);
    console.log('');
}

console.log('✅ config.js v8.0 loaded - ES6 Module');