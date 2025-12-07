// ============================================================================
// SONG-NEXUS Frontend - Debug Version mit Console Logging
// ============================================================================

class Auth {
    static setToken(token) {
        if (token) {
            localStorage.setItem('auth_token', token);
            console.log('✅ Token gespeichert:', token.substring(0, 20) + '...');
        } else {
            localStorage.removeItem('auth_token');
            console.log('✅ Token gelöscht');
        }
    }

    static getToken() {
        const token = localStorage.getItem('auth_token');
        console.log('🔑 Token abrufen:', token ? 'vorhanden' : 'NICHT vorhanden');
        return token;
    }

    static setUser(user) {
        if (user) {
            localStorage.setItem('user', JSON.stringify(user));
            console.log('👤 User gespeichert:', user.username);
        } else {
            localStorage.removeItem('user');
            console.log('👤 User gelöscht');
        }
    }

    static getUser() {
        const user = JSON.parse(localStorage.getItem('user') || 'null');
        console.log('👤 User abrufen:', user ? user.username : 'NICHT angemeldet');
        return user;
    }

    static isAuthenticated() {
        return !!Auth.getToken();
    }
}

// ============================================================================
// AUDIO PLAYER CLASS mit Debug-Output
// ============================================================================

class AudioPlayer {
    constructor() {
        this.audio = null;
        this.currentTrack = null;
        this.isPlaying = false;
        console.log('🎵 AudioPlayer initialisiert');
    }

    async playTrack(track) {
        console.log('▶️ Starte playTrack():', track.title);

        try {
            const token = Auth.getToken();
            console.log('🔑 Token verfügbar:', !!token);

            if (!token) {
                console.error('❌ FEHLER: Keine Auth-Token! User nicht angemeldet?');
                showNotification('Bitte melden Sie sich an', 'error');
                return;
            }

            // ===== FETCH AUDIO BLOB =====
            console.log(`📡 Fetche Audio: /api/tracks/audio/${track.audio_filename}`);

            const response = await fetch(`/api/tracks/audio/${track.audio_filename}`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Accept': 'audio/mpeg, audio/*'
                }
            });

            console.log(`📊 Fetch Response Status: ${response.status} (${response.statusText})`);
            console.log(`📋 Response Headers:`, {
                contentType: response.headers.get('content-type'),
                contentLength: response.headers.get('content-length'),
                cacheControl: response.headers.get('cache-control')
            });

            if (!response.ok) {
                const errorText = await response.text();
                console.error(`❌ HTTP Fehler ${response.status}:`, errorText);
                showNotification(`Fehler: ${response.status} - ${errorText}`, 'error');
                return;
            }

            // ===== CONVERT RESPONSE TO BLOB =====
            const audioBlob = await response.blob();
            console.log(`💾 Audio Blob erstellt:`, {
                size: audioBlob.size,
                type: audioBlob.type
            });

            if (audioBlob.size === 0) {
                console.error('❌ FEHLER: Blob ist leer!');
                showNotification('Audio-Datei ist leer', 'error');
                return;
            }

            // ===== CREATE BLOB URL =====
            const blobUrl = URL.createObjectURL(audioBlob);
            console.log(`🔗 Blob URL erstellt:`, blobUrl);

            // ===== CREATE/UPDATE AUDIO ELEMENT =====
            if (this.audio) {
                console.log('🔄 Vorheriges Audio-Element wird gelöscht');
                this.audio.pause();
                this.audio.src = '';
            }

            this.audio = new Audio();
            this.audio.src = blobUrl;
            this.audio.preload = 'metadata';

            // Event Listener mit Debug
            this.audio.addEventListener('loadedmetadata', () => {
                console.log(`✅ Audio Metadata geladen: ${this.audio.duration.toFixed(2)}s`);
            });

            this.audio.addEventListener('canplay', () => {
                console.log('✅ Audio ist bereit zum Abspielen');
            });

            this.audio.addEventListener('play', () => {
                console.log('▶️ Audio started');
                this.isPlaying = true;
            });

            this.audio.addEventListener('pause', () => {
                console.log('⏸️ Audio paused');
                this.isPlaying = false;
            });

            this.audio.addEventListener('ended', () => {
                console.log('⏹️ Audio ended');
                this.isPlaying = false;
            });

            this.audio.addEventListener('error', (e) => {
                console.error('❌ Audio Error:', this.audio.error);
                showNotification('Audio-Fehler: ' + this.audio.error.message, 'error');
            });

            // ===== PLAY AUDIO =====
            console.log('▶️ Starte Audio-Wiedergabe...');
            this.audio.play().then(() => {
                console.log('✅ Audio-Wiedergabe erfolgreich gestartet');
            }).catch(err => {
                console.error('❌ Fehler beim Starten der Wiedergabe:', err);
                showNotification('Fehler beim Starten der Wiedergabe: ' + err.message, 'error');
            });

            this.currentTrack = track;

            // ===== RECORD PLAY HISTORY =====
            console.log('📝 Registriere Play-History...');
            await this.recordPlayHistory(track.id);

        } catch (error) {
            console.error('❌ Kritischer Fehler in playTrack():', error);
            showNotification('Fehler: ' + error.message, 'error');
        }
    }

    async recordPlayHistory(trackId) {
        try {
            const token = Auth.getToken();
            const user = Auth.getUser();

            if (!token || !user) {
                console.warn('⚠️ Kann Play-History nicht speichern (nicht angemeldet)');
                return;
            }

            console.log(`📡 POST /api/play-history (trackId: ${trackId})`);

            const response = await fetch('/api/play-history', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ track_id: trackId })
            });

            console.log(`📊 Play-History Response: ${response.status}`);

            if (!response.ok) {
                const error = await response.text();
                console.warn('⚠️ Play-History Fehler:', error);
            }
        } catch (error) {
            console.error('❌ Play-History Fehler:', error);
        }
    }

    pause() {
        if (this.audio) {
            console.log('⏸️ Audio pausiert');
            this.audio.pause();
        }
    }

    resume() {
        if (this.audio) {
            console.log('▶️ Audio fortgesetzt');
            this.audio.play();
        }
    }
}

// ============================================================================
// GLOBAL AUDIO PLAYER INSTANCE
// ============================================================================

const player = new AudioPlayer();

// ============================================================================
// DOM & UI FUNCTIONS
// ============================================================================

function showNotification(message, type = 'info') {
    console.log(`📢 [${type.toUpperCase()}] ${message}`);

    const notif = document.createElement('div');
    notif.className = `notification notification--${type}`;
    notif.textContent = message;
    notif.style.cssText = `
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 12px 20px;
    background: ${type === 'error' ? '#e74c3c' : type === 'success' ? '#27ae60' : '#3498db'};
    color: white;
    border-radius: 4px;
    z-index: 9999;
    font-weight: 500;
  `;
    document.body.appendChild(notif);
    setTimeout(() => notif.remove(), 4000);
}

async function loadTracks() {
    console.log('📡 Lade Tracks...');

    try {
        const response = await fetch('/api/tracks');
        console.log(`📊 /api/tracks Response: ${response.status}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const tracks = await response.json();
        console.log(`✅ ${tracks.length} Tracks geladen`, tracks);

        const tracksContainer = document.getElementById('tracks');
        if (!tracksContainer) {
            console.error('❌ Element #tracks nicht gefunden!');
            return;
        }

        tracksContainer.innerHTML = tracks.map(track => `
      <div class="track-card" style="border: 1px solid #444; padding: 16px; margin: 8px 0; border-radius: 4px;">
        <h3>${track.title}</h3>
        <p style="color: #888; margin: 4px 0;">von ${track.artist}</p>
        <p style="color: #666; margin: 8px 0; font-size: 12px;">
          ${track.is_free ? '✅ Kostenlos' : '💰 Premium'}
        </p>
        <button onclick="player.playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})" 
                style="padding: 8px 16px; background: #1abc9c; color: white; border: none; border-radius: 4px; cursor: pointer;">
          ▶️ Abspielen
        </button>
      </div>
    `).join('');

    } catch (error) {
        console.error('❌ Fehler beim Laden der Tracks:', error);
        showNotification('Fehler beim Laden der Tracks', 'error');
    }
}

async function loadPlayHistory() {
    console.log('📡 Lade Play-History...');

    try {
        const user = Auth.getUser();
        if (!user) {
            console.log('⚠️ Nicht angemeldet, überspringe Play-History');
            return;
        }

        const token = Auth.getToken();
        const response = await fetch(`/api/play-history/user/${user.id}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        console.log(`📊 /api/play-history/user/${user.id} Response: ${response.status}`);

        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }

        const history = await response.json();
        console.log(`✅ ${history.length} Play-History Einträge geladen`, history);

        const historyContainer = document.getElementById('playHistory');
        if (!historyContainer) {
            console.error('❌ Element #playHistory nicht gefunden!');
            return;
        }

        historyContainer.innerHTML = history.map(entry => `
      <div style="padding: 8px; background: #333; margin: 4px 0; border-radius: 4px; font-size: 12px;">
        <strong>${entry.track_title}</strong> - ${new Date(entry.played_at).toLocaleString()}
      </div>
    `).join('');

    } catch (error) {
        console.error('❌ Fehler beim Laden der Play-History:', error);
    }
}

async function logout() {
    console.log('🚪 Logout wird ausgeführt...');
    Auth.setToken(null);
    Auth.setUser(null);
    console.log('✅ Logout erfolgreich');
    location.reload();
}

// ============================================================================
// PAGE INITIALIZATION
// ============================================================================

window.addEventListener('DOMContentLoaded', () => {
    console.log('🚀 Page DOMContentLoaded - Initialisiere App');

    const isAuthenticated = Auth.isAuthenticated();
    console.log(`🔐 Authentifiziert: ${isAuthenticated}`);

    if (isAuthenticated) {
        const user = Auth.getUser();
        console.log(`👤 Eingeloggt als: ${user.username}`);

        // Zeige Login-Status
        const loginStatus = document.getElementById('loginStatus');
        if (loginStatus) {
            loginStatus.innerHTML = `👤 ${user.username} <button onclick="logout()" style="margin-left: 16px; padding: 6px 12px; background: #e74c3c; color: white; border: none; border-radius: 4px; cursor: pointer;">Logout</button>`;
        }

        loadTracks();
        loadPlayHistory();
    } else {
        console.warn('⚠️ User nicht authentifiziert - zeige Auth-Seite');
        // Redirect to auth or show login UI
        location.href = '/auth.html';
    }
});

// ============================================================================
// EXPORT FÜR HTML INLINE SCRIPT ZUGRIFF
// ============================================================================

window.player = player;
window.loadTracks = loadTracks;
window.loadPlayHistory = loadPlayHistory;
window.logout = logout;