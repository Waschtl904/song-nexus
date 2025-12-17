// ============================================================================
// 🎵 TRACKS.JS v8.0 - ES6 MODULE
// Track Browser + Integration mit APIClient + Auth + Player
// ============================================================================

import { APIClient } from './api-client.js';
import { Auth } from './auth.js';

export const Tracks = {
  allTracks: [],
  userPurchases: [],
  currentModalTrack: null,

  init() {
    console.log('🎵 Tracks module initializing...');
    this.loadTracks();
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
        headers: {
          'Authorization': `Bearer ${token}`,
        },
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

  renderTracks(tracks) {
    const container = document.getElementById('trackContainer');
    if (!container) {
      console.warn('⚠️ Track container not found');
      return;
    }

    if (!tracks || tracks.length === 0) {
      container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;"><p style="color: var(--text-secondary);">🎵 No tracks available</p></div>';
      return;
    }

    const token = Auth.getToken();

    container.innerHTML = tracks.map(track => {
      const isPurchased = this.userPurchases.some(p => p.track_id === track.id);
      const isFree = track.is_free === true || (track.free_preview_duration >= 999999);
      const price = track.price_eur || track.price || 0;
      const isPreview = track.is_premium && !token;

      return `
        <div class="card track-card">
          <div class="track-title">♪ ${this.escapeHtml(track.name)}</div>
          <div class="track-meta">🎤 ${this.escapeHtml(track.artist || 'Unknown')}</div>
          <div class="track-meta">⏱️ ${track.duration || '3:00'}</div>
          
          ${track.is_free ? '' : '<div class="track-badge">🔒 Premium</div>'}
          ${track.is_premium ? '<div class="track-badge">💰 Paid</div>' : '<div class="track-badge" style="background: rgba(0, 204, 119, 0.15); color: #00cc77; border-color: #00cc77;">🆓 Free</div>'}
          
          <button class="button play-track-btn" data-track-id="${track.id}" data-filename="${this.escapeHtml(track.audio_filename)}" data-premium="${track.is_premium}" data-name="${this.escapeHtml(track.name)}" style="width: 100%; margin-top: 12px;" aria-label="Play ${this.escapeHtml(track.name)}">
            ▶️ ${track.is_premium && !token ? '🔊 Preview 40s' : 'Play'}
          </button>
        </div>
      `;
    }).join('');

    // Add event listeners to play buttons
    document.querySelectorAll('.play-track-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.playTrack(
          parseInt(btn.getAttribute('data-track-id')),
          btn.getAttribute('data-filename'),
          btn.getAttribute('data-premium') === 'true',
          btn.getAttribute('data-name')
        );
      });
    });

    console.log('✅ Tracks rendered');
  },

  async playTrack(trackId, filename, isPremium, trackName) {
    try {
      console.log(`▶️ Playing track: ${trackName}`);

      const track = {
        id: trackId,
        name: trackName,
        audio_filename: filename,
        is_premium: isPremium,
      };

      const isPreview = isPremium && !Auth.getToken();

      if (typeof window.AudioPlayer !== 'undefined') {
        window.AudioPlayer.loadTrack(track, isPreview);
        window.AudioPlayer.play();
      }

      this.updatePlayerDisplay(trackName);

      if (Auth.getToken()) {
        APIClient.logPlayEvent(trackId, null).catch(e => console.warn('Play log failed:', e));
      }

      console.log(`▶️ Playing: ${trackName} ${isPreview ? '(PREVIEW)' : '(FULL)'}`);
    } catch (err) {
      console.error('❌ Play error:', err);
      this.showStatus('Failed to play track', 'error');
    }
  },

  updatePlayerDisplay(trackName) {
    const trackNameEl = document.querySelector('.track-name');
    if (trackNameEl) {
      trackNameEl.textContent = trackName;
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },

  showStatus(message, type) {
    console.log(`[${type.toUpperCase()}] ${message}`);
  },
};

console.log('✅ Tracks v8.0 loaded - ES6 Module');