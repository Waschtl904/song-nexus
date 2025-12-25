// ============================================================================
// 🎵 TRACKS.JS v8.7 - FIXED: USES CENTRAL AUDIOPLAYER
// Integration mit APIClient + Auth + Central Player Logic
// ============================================================================

import { APIClient } from './api-client.js';
import { Auth } from './auth.js';
import { AudioPlayer } from './audio-player.js';

// ← Design config storage
let designConfig = null;

async function loadDesignConfig() {
  try {
    const response = await fetch('./config/design.config.json');
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    designConfig = await response.json();
    console.log(`✅ Design config loaded in Tracks module`);
  } catch (err) {
    console.warn('⚠️ Design config load failed in Tracks module:', err.message);
    designConfig = {
      components: { buttons: { track_play: { image_url: '../assets/images/metal-play-button-optimized.webp' } } }
    };
  }
}

export const Tracks = {
  allTracks: [],
  userPurchases: [],
  currentlyPlayingId: null,

  async init() {
    console.log('🎵 Tracks module initializing...');
    await loadDesignConfig();

    // 1. Tracks laden
    await this.loadTracks();

    // 2. 🔥 Event Listener für Play-Requests
    // WICHTIG: Das wird von tracks-loader.js gesendet!
    document.addEventListener('track-play-request', (e) => {
      console.log('🎧 Tracks module received play request:', e.detail);
      this.playTrack(e.detail.trackData);
    });
  },

  getApiBase() {
    return APIClient.getApiBase();
  },

  async loadTracks() {
    try {
      console.log('📥 Loading tracks...');
      const token = Auth.getToken();
      this.allTracks = await APIClient.getTracks();
      console.log('📊 Tracks loaded:', this.allTracks.length);

      if (token) {
        await this.loadUserPurchases(token);
      }

      // Legacy Render (falls TracksLoader nicht genutzt wird)
      this.renderTracks(this.allTracks);

    } catch (err) {
      console.error('❌ Track load error:', err);
      this.showStatus('Failed to load tracks', 'error');
    }
  },

  async loadUserPurchases(token) {
    try {
      const apiBase = this.getApiBase();
      const response = await fetch(`${apiBase}/users/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include',
      });

      if (response.ok) {
        this.userPurchases = await response.json();
        console.log('🛍️ Purchases loaded:', this.userPurchases.length);
      }
    } catch (err) {
      console.warn('⚠️ Failed to load purchases:', err);
    }
  },

  // 🔥 DER NEUE FIX: Nutze den zentralen AudioPlayer!
  playTrack(track) {
    console.log('▶️ Attempting to play track:', track.name || track.title);

    // 1. Toggle: Wenn wir auf den gleichen Track klicken, pause/resume
    if (this.currentlyPlayingId === track.id) {
      if (AudioPlayer.state.isPlaying) {
        AudioPlayer.pause();
      } else {
        AudioPlayer.play();
      }
      return;
    }

    // 2. Stoppe den alten Track
    AudioPlayer.stop();

    // 3. Lade den neuen Track in den zentralen Player
    try {
      AudioPlayer.loadTrack(track, false); // false = nicht im Preview Mode
      AudioPlayer.play();
      this.currentlyPlayingId = track.id;
      console.log('✅ Track loaded and playing in central AudioPlayer');
    } catch (err) {
      console.error('❌ Failed to play track:', err);
      this.showStatus(`Could not play "${track.name}"`, 'error');
    }
  },

  // Legacy Render (falls TracksLoader nicht genutzt wird)
  renderTracks(tracks) {
    const container = document.getElementById('tracksList');
    if (!container || container.children.length > 0) return;

    tracks.forEach((track) => {
      const trackCard = document.createElement('div');
      trackCard.className = 'card track-card';
      trackCard.innerHTML = `
                <div class="track-header">
                    <div class="track-info">
                        <h3 class="track-title">${this.escapeHtml(track.name || track.title)}</h3>
                        <p class="track-artist">${this.escapeHtml(track.artist)}</p>
                    </div>
                    <button 
                        class="play-button button-metal-play"
                        data-track-id="${track.id}"
                        aria-label="Play"
                    ></button>
                </div>
            `;
      const btn = trackCard.querySelector('.play-button');
      if (btn) {
        if (designConfig?.components?.buttons?.track_play?.image_url) {
          btn.style.backgroundImage = `url('${designConfig.components.buttons.track_play.image_url}')`;
        }
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          this.playTrack(track);
        });
      }
      container.appendChild(trackCard);
    });
  },

  showStatus(message, type = 'info') {
    const container = document.getElementById('tracksList');
    if (container) {
      const statusDiv = document.createElement('div');
      statusDiv.className = `status-message status-${type}`;
      statusDiv.textContent = message;
      container.appendChild(statusDiv);
    }
  },

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};
