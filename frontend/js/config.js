// ============================================================================
// 🔧 GLOBAL API CONFIGURATION - Universelles Basis-URL-System (v7.2 UPDATED)
// ============================================================================
// Diese Datei ist die ZENTRALE SOURCE OF TRUTH für alle API-URLs
// Sie unterscheidet automatisch zwischen ngrok und localhost
// ✅ UPDATED: v7.2 Endpoints für Magic Link + Password Login
// ============================================================================


/**
 * Erkennt ob wir on ngrok oder localhost sind
 * @returns {boolean} true wenn ngrok
 */
function isNgrokEnvironment() {
    return window.location.hostname.includes('ngrok');
}


/**
 * Gibt die Basis-URL für API-Calls zurück
 * ngrok: https://xxxxx-ngrok-free.dev/api
 * localhost: https://localhost:3000/api
 */
function getApiBaseUrl() {
    if (isNgrokEnvironment()) {
        return `https://${window.location.hostname}/api`;
    }
    return 'https://localhost:3000/api';
}


/**
 * Gibt die Wurzel-URL für den Server zurück
 * ngrok: https://xxxxx-ngrok-free.dev
 * localhost: https://localhost:3000
 */
function getServerBaseUrl() {
    if (isNgrokEnvironment()) {
        return `https://${window.location.hostname}`;
    }
    return 'https://localhost:3000';
}


// ============================================================================
// 📋 ZENTRALE ENDPOINT-DEFINITIONEN (v7.2 UPDATED)
// ============================================================================


const API_ENDPOINTS = {
    // Authentication (v7.2 UPDATED)
    auth: {
        register: '/auth/webauthn/register-password',           // ✅ v7.2
        login: '/auth/webauthn/authenticate-password',          // ✅ v7.2
        logout: '/auth/logout',
        refresh: '/auth/refresh',
        me: '/auth/me',
    },


    // WebAuthn
    webauthn: {
        registerOptions: '/auth/webauthn/register-options',
        registerVerify: '/auth/webauthn/register-verify',
        authenticateOptions: '/auth/webauthn/authenticate-options',
        authenticateVerify: '/auth/webauthn/authenticate-verify',
    },


    // Magic Link / Simple Auth (v7.2 UPDATED)
    authSimple: {
        sendMagicLink: '/auth/webauthn/magic-link-request',    // ✅ v7.2
        verifyMagicLink: '/auth/webauthn/magic-link-verify',   // ✅ v7.2
    },


    // Tracks
    tracks: {
        list: '/tracks',
        get: (id) => `/tracks/${id}`,
        create: '/tracks',
        update: (id) => `/tracks/${id}`,
        delete: (id) => `/tracks/${id}`,
        search: '/tracks/search',
    },


    // Users
    users: {
        get: (id) => `/users/${id}`,
        update: (id) => `/users/${id}`,
        profile: '/users/profile',
    },


    // Payments
    payments: {
        createOrder: '/payments/create-order',
        captureOrder: '/payments/capture-order',
        orderStatus: (orderId) => `/payments/order/${orderId}`,
    },


    // Play History
    playHistory: {
        log: '/play-history/log',
        list: '/play-history',
        stats: '/play-history/stats',
    },


    // Admin
    admin: {
        tracks: {
            list: '/admin/tracks',
            create: '/admin/tracks',
            update: (id) => `/admin/tracks/${id}`,
            delete: (id) => `/admin/tracks/${id}`,
        },
    },
};


// ============================================================================
// 🎯 HELPER-FUNKTIONEN FÜR API-CALLS
// ============================================================================


/**
 * Generiert vollständige URL aus Endpoint
 * @param {string} endpoint - z.B. '/auth/login'
 * @returns {string} Vollständige URL
 */
function getFullUrl(endpoint) {
    const baseUrl = getApiBaseUrl();
    // Stelle sicher, dass endpoint mit / anfängt
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    return `${baseUrl}${cleanEndpoint}`;
}


/**
 * Macht einen standardisierten API-Call
 * @param {string} endpoint - Endpoint oder aus API_ENDPOINTS
 * @param {object} options - fetch options (method, body, headers, etc.)
 * @returns {Promise} Response JSON
 */
async function apiCall(endpoint, options = {}) {
    const url = getFullUrl(endpoint);
    const defaultOptions = {
        method: 'GET',
        headers: {
            'Content-Type': 'application/json',
        },
        credentials: 'include', // wichtig für Cookies/Sessions!
    };


    // Headers mergen
    const finalOptions = {
        ...defaultOptions,
        ...options,
        headers: {
            ...defaultOptions.headers,
            ...(options.headers || {}),
        },
    };


    // Authorization Token hinzufügen, falls vorhanden
    const token = localStorage.getItem('auth_token');
    if (token) {
        finalOptions.headers.Authorization = `Bearer ${token}`;
    }


    console.log(`📡 API Call: ${finalOptions.method} ${url}`);


    try {
        const response = await fetch(url, finalOptions);


        // Error handling
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const error = new Error(errorData.error || `API Error: ${response.status}`);
            error.status = response.status;
            error.data = errorData;
            throw error;
        }


        // Leere Responses (z.B. 204 No Content)
        if (response.status === 204) {
            return null;
        }


        return await response.json();
    } catch (error) {
        console.error(`❌ API Error: ${error.message}`, error);
        throw error;
    }
}


// ============================================================================
// 🔐 AUTHENTICATION HELPERS
// ============================================================================


/**
 * Speichert Auth-Token
 */
function setAuthToken(token) {
    localStorage.setItem('auth_token', token);
    console.log('✅ Auth token stored');
}


/**
 * Holt Auth-Token
 */
function getAuthToken() {
    return localStorage.getItem('auth_token');
}


/**
 * Löscht Auth-Token
 */
function clearAuthToken() {
    localStorage.removeItem('auth_token');
    console.log('✅ Auth token cleared');
}


/**
 * Prüft ob User angemeldet ist
 */
function isAuthenticated() {
    return !!getAuthToken();
}


// ============================================================================
// 📊 PUBLIC ASSETS / MEDIA URLS
// ============================================================================


/**
 * Gibt URL für Audio-Datei zurück
 * @param {string} filename - z.B. 'track-123.mp3'
 * @returns {string} Vollständige URL
 */
function getAudioUrl(filename) {
    const serverBase = getServerBaseUrl();
    return `${serverBase}/public/audio/${filename}`;
}


/**
 * Gibt URL für Media-Asset zurück
 * @param {string} path - z.B. 'images/cover.jpg'
 * @returns {string} Vollständige URL
 */
function getAssetUrl(path) {
    const serverBase = getServerBaseUrl();
    const cleanPath = path.startsWith('/') ? path : `/${path}`;
    return `${serverBase}${cleanPath}`;
}


// ============================================================================
// 🎵 SPEZIFISCHE HELPER (Optional, für häufige Calls)
// ============================================================================


/**
 * Lädt aktuelle Track-Liste
 */
async function fetchTracks() {
    return apiCall(API_ENDPOINTS.tracks.list);
}


/**
 * Lädt einen Track nach ID
 */
async function fetchTrack(id) {
    return apiCall(API_ENDPOINTS.tracks.get(id));
}


/**
 * Registriert WebAuthn
 */
async function registerWebAuthn(credential) {
    return apiCall(
        API_ENDPOINTS.webauthn.registerVerify,
        {
            method: 'POST',
            body: JSON.stringify(credential),
        }
    );
}


/**
 * Authentifiziert mit WebAuthn
 */
async function authenticateWebAuthn(assertion) {
    return apiCall(
        API_ENDPOINTS.webauthn.authenticateVerify,
        {
            method: 'POST',
            body: JSON.stringify(assertion),
        }
    );
}


// ============================================================================
// 🔍 DEBUG-INFOS
// ============================================================================


function logConfigInfo() {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🔧 SONG-NEXUS API CONFIGURATION v7.2     ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`🌐 Environment: ${isNgrokEnvironment() ? '🌍 ngrok' : '🏠 localhost'}`);
    console.log(`📍 Server Base: ${getServerBaseUrl()}`);
    console.log(`🔌 API Base: ${getApiBaseUrl()}`);
    console.log(`🔐 Authenticated: ${isAuthenticated() ? '✅ Yes' : '❌ No'}`);
    console.log('');
}


// Beim Laden automatisch loggen (nur in Development)
if (typeof window !== 'undefined' && !window.location.hostname.includes('production')) {
    window.addEventListener('DOMContentLoaded', logConfigInfo);
}


// ============================================================================
// 📤 EXPORTS
// ============================================================================


// Für ES6 Module-Umgebungen
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        // URLs
        API_BASE_URL: getApiBaseUrl(),
        SERVER_BASE_URL: getServerBaseUrl(),


        // Funktionen
        getApiBaseUrl,
        getServerBaseUrl,
        getFullUrl,
        apiCall,
        isNgrokEnvironment,


        // Auth
        setAuthToken,
        getAuthToken,
        clearAuthToken,
        isAuthenticated,


        // Assets
        getAudioUrl,
        getAssetUrl,


        // Endpoints
        API_ENDPOINTS,


        // Spezifische Helpers
        fetchTracks,
        fetchTrack,
        registerWebAuthn,
        authenticateWebAuthn,


        // Debug
        logConfigInfo,
    };
}


// Für globale Nutzung (inline <script>)
window.songNexusConfig = {
    API_BASE_URL: getApiBaseUrl(),
    SERVER_BASE_URL: getServerBaseUrl(),
    getFullUrl,
    apiCall,
    getApiBaseUrl,
    getServerBaseUrl,
    isNgrokEnvironment,
    setAuthToken,
    getAuthToken,
    clearAuthToken,
    isAuthenticated,
    getAudioUrl,
    getAssetUrl,
    API_ENDPOINTS,
    fetchTracks,
    fetchTrack,
    registerWebAuthn,
    authenticateWebAuthn,
    logConfigInfo,
};


console.log('✅ config.js v7.2 loaded - Updated Magic Link + Password Login endpoints');