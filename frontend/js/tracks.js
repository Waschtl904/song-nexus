// ============================================================================
// 🎵 TRACKS.JS v8.8 - COMPLETE REWRITE (Track Management + Central Player)
// ============================================================================

import { APIClient } from './api-client.js';
import { Auth } from './auth.js';
import { AudioPlayer } from './audio-player.js';

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
      components: {
        buttons: {
          track_play: {
            image_url: '../assets/images/metal-play-button-optimized.webp',
            width: 140,
            height: 70
          }
        }
      }
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

    // Load all data
    await this.loadTracks();

    // 🔥 Event Listener for Play Requests from TracksLoader
    document.addEventListener('track-play-request', (e) => {
      console.log('🎧 Tracks module received play request:', e.detail);
      this.playTrack(e.detail.trackData);
    });

    console.log('✅ Tracks module initialized');
  },

  getApiBase() {
    return APIClient.getApiBase();
  },

  async loadTracks() {
    try {
      console.log('📥 Loading tracks from API...');
      const token = Auth.getToken();

      // Get tracks from API
      this.allTracks = await APIClient.getTracks();
      console.log('📊 Tracks loaded:', this.allTracks.length);

      if (token) {
        await this.loadUserPurchases(token);
      }

      return this.allTracks;
    } catch (err) {
      console.error('❌ Track load error:', err);
      return [];
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

  // 🔥 CENTRAL PLAY LOGIC - Used by AudioPlayer
  playTrack(track) {
    if (!track) {
      console.error('❌ No track provided to playTrack()');
      return;
    }

    console.log('▶️ Playing track:', track.name || track.title);

    // Toggle: Click same track = pause/resume
    if (this.currentlyPlayingId === track.id) {
      if (AudioPlayer.state.isPlaying) {
        AudioPlayer.pause();
      } else {
        AudioPlayer.play();
      }
      return;
    }

    // Stop previous
    AudioPlayer.stop();

    // Load new track
    try {
      AudioPlayer.loadTrack(track, false); // false = not preview mode
      AudioPlayer.play();
      this.currentlyPlayingId = track.id;
      console.log('✅ Track loaded in AudioPlayer');
    } catch (err) {
      console.error('❌ Failed to play track:', err);
    }
  },

  // Format duration from seconds to MM:SS
  formatDuration(seconds) {
    if (!seconds || seconds < 0) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  },

  // Get purchase status for track
  isPurchased(trackId) {
    if (!this.userPurchases) return false;
    return this.userPurchases.some(p => p.track_id === trackId);
  },

  // HTML Escape
  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};