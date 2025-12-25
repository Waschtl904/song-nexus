// ============================================================================
// 🚀 MAIN.JS v8.4 - WEBPACK ENTRY POINT (FIXED: PLAYER INITIALIZATION)
// ============================================================================

import {
    API_ENDPOINTS,
    logConfigInfo,
    getAuthToken,
    setAuthToken,
    clearAuthToken,
    isTokenExpired,
    getApiBaseUrl,
    getAudioUrl
} from './config.js';
import { APIClient } from './api-client.js';
import { WebAuthn } from './webauthn.js';
import { AudioPlayer } from './audio-player.js';
import { Auth } from './auth.js';
import { Player } from './player.js';
import { PlayerDraggable } from './player-draggable.js';
import { Tracks } from './tracks.js';
import { TracksLoader } from './tracks-loader.js';
import { UI } from './ui.js';
import { App } from './app.js';
import '../css/styles-cyberpunk.css';

// ============================================================================
// 🌍 MAKE ALL MODULES GLOBAL (CRITICAL FIX!)
// ============================================================================

if (typeof window !== 'undefined') {
    // ✅ CONFIG ENDPOINTS
    window.API_ENDPOINTS = API_ENDPOINTS;
    window.logConfigInfo = logConfigInfo;
    window.getAuthToken = getAuthToken;
    window.setAuthToken = setAuthToken;
    window.clearAuthToken = clearAuthToken;
    window.isTokenExpired = isTokenExpired;
    window.getApiBaseUrl = getApiBaseUrl;
    window.getAudioUrl = getAudioUrl;

    // ✅ API CLIENT
    window.APIClient = APIClient;

    // ✅ AUTH MODULES
    window.WebAuthn = WebAuthn;
    window.Auth = Auth;

    // ✅ AUDIO MODULES
    window.AudioPlayer = AudioPlayer;
    window.Player = Player;
    window.PlayerDraggable = PlayerDraggable;

    // ✅ TRACK MODULES
    window.Tracks = Tracks;
    window.TracksLoader = TracksLoader;

    // ✅ UI MODULES
    window.UI = UI;
    window.App = App;

    console.log('✅ All modules exposed to window object');
    console.log('✅ API_ENDPOINTS now available globally!');
}

// ============================================================================
// 🚀 INITIALIZE APP ON DOM READY
// ============================================================================

function initializeApp() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  🎵 SONG-NEXUS v8.4 - ES6 Modules + Webpack      ║');
    console.log('║  All 11 modules bundled into app.bundle.js       ║');
    console.log('║  ✅ Auth Modal + WebAuthn + Magic Link Ready     ║');
    console.log('║  ✅ PLAYER CONTROLLER ACTIVE                     ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // ────────────────────────────────────────────────────────────────
    // Step 1: Log config info
    // ────────────────────────────────────────────────────────────────
    console.log('📋 Step 1: Loading configuration...');
    if (typeof logConfigInfo === 'function') {
        logConfigInfo();
    }

    // ────────────────────────────────────────────────────────────────
    // Step 2: Initialize UI
    // ────────────────────────────────────────────────────────────────
    console.log('📋 Step 2: Initializing UI...');
    if (typeof UI !== 'undefined' && UI.init) {
        try {
            UI.init();
            console.log('✅ UI initialized');
        } catch (err) {
            console.error('⚠️ UI initialization warning:', err.message);
        }
    }

    // ────────────────────────────────────────────────────────────────
    // Step 3: Initialize Auth (includes modal + form setup)
    // ⚠️ CRITICAL: Must happen AFTER DOM is fully ready
    // ────────────────────────────────────────────────────────────────
    console.log('📋 Step 3: Initializing Auth...');
    if (typeof Auth !== 'undefined' && Auth.init) {
        try {
            Auth.init();
            console.log('✅ Auth initialized (includes modal handlers)');
        } catch (err) {
            console.error('❌ Auth initialization error:', err);
        }
    } else {
        console.error('❌ Auth module not available');
    }

    // ────────────────────────────────────────────────────────────────
    // Step 4: Update UI with auth state
    // ────────────────────────────────────────────────────────────────
    console.log('📋 Step 4: Updating UI with auth state...');
    if (typeof Auth !== 'undefined' && Auth.updateUI) {
        try {
            Auth.updateUI();
            console.log('✅ Auth UI updated');
        } catch (err) {
            console.error('⚠️ Auth UI update warning:', err.message);
        }
    }

    // ────────────────────────────────────────────────────────────────
    // Step 5: Initialize App
    // ────────────────────────────────────────────────────────────────
    console.log('📋 Step 5: Initializing App...');
    if (typeof App !== 'undefined' && App.init) {
        App.init().catch(err => {
            console.error('❌ App initialization failed:', err);
        });
    } else {
        console.error('❌ App module not found');
    }

    // ────────────────────────────────────────────────────────────────
    // 🔥 Step 5b: Initialize Audio Player Logic (CRITICAL FIX!)
    // ────────────────────────────────────────────────────────────────
    console.log('📋 Step 5b: Initializing Audio Player Controller...');
    if (typeof Tracks !== 'undefined' && Tracks.init) {
        Tracks.init().then(() => {
            console.log('✅ Tracks/Audio Controller initialized & listening!');
        }).catch(err => {
            console.error('❌ Tracks/Audio Controller init failed:', err);
        });
    } else {
        console.warn('⚠️ Tracks module not found - Audio playback might not work!');
    }

    // ────────────────────────────────────────────────────────────────
    // Step 6: Check for Magic Link in URL
    // ────────────────────────────────────────────────────────────────
    console.log('📋 Step 6: Checking for Magic Link verification...');
    if (typeof Auth !== 'undefined' && Auth.verifyMagicLinkFromUrl) {
        Auth.verifyMagicLinkFromUrl().then(verified => {
            if (verified) {
                console.log('✅ Magic link verified and user logged in');
            }
        }).catch(err => {
            console.warn('⚠️ Magic link check warning:', err.message);
        });
    }

    console.log('');
    console.log('✅ ✅ ✅ APP INITIALIZATION COMPLETE ✅ ✅ ✅');
    console.log('🎵 SONG-NEXUS is ready to use!');
    console.log('');
}

// ============================================================================
// DOM READY HANDLER
// ============================================================================

if (document.readyState === 'loading') {
    console.log('⏳ Waiting for DOMContentLoaded...');
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded (e.g., if script loaded late)
    console.log('✅ DOM already loaded, initializing app...');
    // Wait a tick to ensure all elements are accessible
    setTimeout(initializeApp, 100);
}

// ============================================================================
// STARTUP MESSAGES
// ============================================================================

console.log('');
console.log('🚀 main.js v8.4 loaded - ES6 Module Entry Point for Webpack');
console.log('📦 All 11 modules imported and ready to bundle');
console.log('🌍 API_ENDPOINTS + Config functions exported to window');
console.log('🚀 App will initialize on DOMContentLoaded');
console.log('✅ Modal handlers will be setup during Auth.init()');
console.log('');
