// ============================================================================
// 🔧 CONFIG.JS - FRONTEND CONFIGURATION + API ENDPOINTS
// ============================================================================

// Relativer Pfad, absichtlich ohne Hostnamen.
//
// Vorher stand hier 'https://localhost:3000/api'. Dieser Wert wird beim
// webpack-Build fest ins Bundle geschrieben (webpack ersetzt nur NODE_ENV,
// keine URLs). In Produktion hat damit der Browser JEDES Besuchers versucht,
// dessen EIGENEN Rechner auf Port 3000 anzusprechen — jeder Aufruf der
// Schnittstelle wäre fehlgeschlagen.
//
// Ein relativer Pfad zeigt immer auf die Adresse, unter der die Seite gerade
// läuft: lokal auf Port 5500 (dessen Server /api an das Backend weiterleitet),
// in Produktion auf die echte Domain — mit und ohne www. Damit sind alle
// Aufrufe gleichursprünglich und CORS wird gar nicht erst gebraucht.
const API_BASE_URL = '/api';

export const API_ENDPOINTS = {
    // Auth Routes
    auth: {
        login: `${API_BASE_URL}/auth/login`,
        register: `${API_BASE_URL}/auth/register`,
        logout: `${API_BASE_URL}/auth/logout`,
        verify: `${API_BASE_URL}/auth/verify`,
    },

    // WebAuthn Routes
    webauthn: {
        registerOptions: `${API_BASE_URL}/auth/webauthn/register-options`,
        registerVerify: `${API_BASE_URL}/auth/webauthn/register-verify`,
        authenticateOptions: `${API_BASE_URL}/auth/webauthn/authenticate-options`,
        authenticateVerify: `${API_BASE_URL}/auth/webauthn/authenticate-verify`,
    },

    // Simple Auth (Magic Link)
    authSimple: {
        sendMagicLink: `${API_BASE_URL}/auth/simple/send-magic-link`,
        verifyMagicLink: `${API_BASE_URL}/auth/simple/verify-magic-link`,
    },

    // Tracks
    tracks: {
        list: `${API_BASE_URL}/tracks`,
        get: (id) => `${API_BASE_URL}/tracks/${id}`,
        create: `${API_BASE_URL}/tracks`,
        update: (id) => `${API_BASE_URL}/tracks/${id}`,
        delete: (id) => `${API_BASE_URL}/tracks/${id}`,
    },
};

// ============================================================================
// 🔐 TOKEN MANAGEMENT
// ============================================================================

const TOKEN_KEY = 'auth_token';
const TOKEN_EXPIRY_KEY = 'auth_token_expiry';

export function setAuthToken(token, expiryMinutes = 15) {
    if (!token) {
        clearAuthToken();
        return;
    }

    try {
        localStorage.setItem(TOKEN_KEY, token);
        const expiryTime = new Date().getTime() + (expiryMinutes * 60 * 1000);
        localStorage.setItem(TOKEN_EXPIRY_KEY, expiryTime.toString());
        console.log('✅ Auth token stored');
    } catch (err) {
        console.warn('⚠️ Could not store auth token:', err);
    }
}

export function getAuthToken() {
    try {
        const token = localStorage.getItem(TOKEN_KEY);
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);

        if (!token || !expiry) return null;

        // Check if token is expired
        if (new Date().getTime() > parseInt(expiry)) {
            clearAuthToken();
            return null;
        }

        return token;
    } catch (err) {
        console.warn('⚠️ Could not retrieve auth token:', err);
        return null;
    }
}

export function clearAuthToken() {
    try {
        localStorage.removeItem(TOKEN_KEY);
        localStorage.removeItem(TOKEN_EXPIRY_KEY);
    } catch (err) {
        console.warn('⚠️ Could not clear auth token:', err);
    }
}

export function isTokenExpired() {
    try {
        const expiry = localStorage.getItem(TOKEN_EXPIRY_KEY);
        if (!expiry) return true;
        return new Date().getTime() > parseInt(expiry);
    } catch (err) {
        return true;
    }
}

// ============================================================================
// 🌐 API BASE URL HELPER (für Compatibility)
// ============================================================================

export function getApiBaseUrl() {
    return API_BASE_URL;
}

// ============================================================================
// 🎵 AUDIO URL HELPER (für Compatibility)
// ============================================================================

export function getAudioUrl(trackId) {
    if (!trackId) {
        console.warn('⚠️ No trackId provided to getAudioUrl');
        return null;
    }
    // ✅ FIXED: trackId already contains .mp3 extension!
    // Don't add .mp3 again!
    return `${API_BASE_URL.replace('/api', '')}/public/audio/${trackId}`;
}

// ============================================================================
// 📋 CONFIG INFO LOGGING (für Debugging)
// ============================================================================

export function logConfigInfo() {
    console.group('🔧 CONFIG INFO');
    console.log('API_BASE_URL:', API_BASE_URL);
    console.log('Auth Token:', getAuthToken() ? '✅ Present' : '❌ Missing');
    console.log('Token Expired:', isTokenExpired() ? '⏰ YES' : '✅ NO');
    console.log('API_ENDPOINTS:', API_ENDPOINTS);
    console.groupEnd();
}

// ============================================================================
// 🚀 AUTO-INIT ON LOAD
// ============================================================================

console.log('✅ Config loaded - API_ENDPOINTS + Token Management + Helpers');