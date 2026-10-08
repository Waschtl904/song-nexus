import './cookie-session.js';
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

// Compatibility exports return no credential; authentication is checked by /auth/me.
export function setAuthToken() { clearAuthToken(); }
export function getAuthToken() { return null; }
export function clearAuthToken() {
    for (const storage of [localStorage, sessionStorage])
        for (const key of ['auth_token','auth_token_expiry','token','songNexusAdminToken']) storage.removeItem(key);
}
export function isTokenExpired() { return !globalThis.CookieSession.user; }

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
    // Geschuetzte Route, NICHT /public/audio.
    //
    // /public/audio war eine statische Auslieferung ohne jede Pruefung: ein
    // Aufruf ohne Anmeldung lieferte die vollstaendige Datei eines
    // Premium-Tracks, MD5-identisch mit dem Original. Da /api/tracks den
    // Dateinamen oeffentlich herausgibt, genuegte die Trackliste, um jeden
    // Kauf zu umgehen.
    //
    // /api/tracks/audio/:filename prueft is_free, Token und Kauf und liefert
    // sonst nur die 40-Sekunden-Vorschau. Genau diese Route ist auch die,
    // fuer die es Tests gibt - der Player benutzte sie bisher nicht, weshalb
    // die gruenen SECURITY-Tests eine Sicherheit vorgaben, die es nicht gab.
    return `${API_BASE_URL}/tracks/audio/${trackId}`;
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