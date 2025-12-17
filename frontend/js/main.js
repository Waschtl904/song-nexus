// ============================================================================
// 🚀 MAIN.JS v8.0 - WEBPACK ENTRY POINT
// ES6 Module Entry Point - Imports all 11 modules + initializes App
// ============================================================================

import { logConfigInfo } from './config.js';
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

// ============================================================================
// 🌍 MAKE ALL MODULES GLOBAL (for backward compatibility)
// ============================================================================

if (typeof window !== 'undefined') {
    window.Config = { logConfigInfo };
    window.APIClient = APIClient;
    window.WebAuthn = WebAuthn;
    window.AudioPlayer = AudioPlayer;
    window.Auth = Auth;
    window.Player = Player;
    window.PlayerDraggable = PlayerDraggable;
    window.Tracks = Tracks;
    window.TracksLoader = TracksLoader;
    window.UI = UI;
    window.App = App;

    console.log('✅ All modules exposed to window object');
}

// ============================================================================
// 🚀 INITIALIZE APP ON DOM READY
// ============================================================================

function initializeApp() {
    console.log('');
    console.log('╔══════════════════════════════════════════════════╗');
    console.log('║  🎵 SONG-NEXUS v8.0 - ES6 Modules + Webpack     ║');
    console.log('║  All 11 modules bundled into app.bundle.js       ║');
    console.log('╚══════════════════════════════════════════════════╝');
    console.log('');

    // Log config info
    if (typeof logConfigInfo === 'function') {
        logConfigInfo();
    }

    // Initialize App
    if (typeof App !== 'undefined' && App.init) {
        App.init().catch(err => {
            console.error('❌ App initialization failed:', err);
        });
    } else {
        console.error('❌ App module not found');
    }
}

// Run on DOM ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeApp);
} else {
    // DOM already loaded
    initializeApp();
}

console.log('✅ main.js v8.0 loaded - ES6 Module Entry Point for Webpack');
console.log('📦 All 11 modules imported and ready to bundle');
console.log('🚀 App will initialize on DOMContentLoaded');