/**
 * 🎵 SONG-NEXUS v6.2 - Main App Module
 * Handles track loading, playback, and history management
 * 
 * ✅ UPDATED: Nutzt APIClient statt hardcodiert localhost URLs
 */

"use strict";

const App = {
  // ========================================================================
  // 🎵 LOAD & DISPLAY TRACKS
  // ========================================================================

  async loadTracks() {
    try {
      // ✅ NEW: Nutze APIClient statt hardcoded fetch
      if (!APIClient.isAuthenticated()) {
        console.warn('⚠️ No authentication token for loading tracks');
        return;
      }

      console.log('📊 Loading tracks...');

      // ✅ APIClient kümmert sich um Token, URL, Error-Handling
      const tracks = await APIClient.getTracks();

      console.log(`✅ Tracks loaded: ${tracks.length}`);
      this.displayTracks(tracks);

    } catch (error) {
      console.error('❌ Track load error:', error);
      const el = document.getElementById('tracksList');
      if (el) {
        el.innerHTML = `<div class="card" style="grid-column: 1/-1; text-align: center;"><p style="color: var(--text-secondary);">❌ Error loading tracks: ${error.message}</p></div>`;
      }
    }
  },

  displayTracks(tracks) {
    const container = document.getElementById('tracksList');
    if (!container) return;

    if (!tracks || tracks.length === 0) {
      container.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center;"><p style="color: var(--text-secondary);">🎵 No tracks available</p></div>';
      return;
    }

    container.innerHTML = tracks.map(track => {
      const isFree = track.is_free === true || (track.free_preview_duration && track.free_preview_duration >= 999999);
      const price = track.price_eur || track.price || 0.99;

      return `
        <div class="card" style="cursor: pointer; transition: all 0.2s;" onclick="App.playTrack(${track.id}, '${this.escapeHtml(track.name)}', '${this.escapeHtml(track.audio_filename)}')">
          <div style="display: flex; justify-content: space-between; align-items: start;">
            <div style="flex: 1;">
              <h3 style="margin: 0 0 8px 0; color: var(--accent-teal);">🎵 ${this.escapeHtml(track.name)}</h3>
              <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 4px 0;">👤 ${this.escapeHtml(track.artist)}</p>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 4px 0;">🎸 ${track.genre}</p>
              <p style="color: var(--text-secondary); font-size: 0.85rem; margin: 4px 0;">▶️ ${track.play_count || 0} plays</p>
            </div>
            <div style="text-align: right;">
              <div style="color: var(--accent-pink); font-weight: 700; font-size: 1.1rem; margin-bottom: 8px;">
                ${isFree ? '🎁 FREE' : '€' + parseFloat(price).toFixed(2)}
              </div>
              <span style="display: inline-block; background: rgba(0, 204, 119, 0.15); color: var(--accent-teal); padding: 4px 8px; border-radius: 3px; font-size: 0.75rem;">
                ${isFree ? '✅ FREE' : '🎧 PREVIEW 40s'}
              </span>
            </div>
          </div>
        </div>
      `;
    }).join('');
  },

  // ========================================================================
  // ▶️ PLAY TRACK - MIT BLOB & AUTHORIZATION
  // ========================================================================

  async playTrack(trackId, trackName, audioFilename) {
    try {
      // ✅ NEW: Nutze APIClient für Auth-Check
      if (!APIClient.isAuthenticated()) {
        console.error('❌ No token for playback');
        alert('❌ Please log in to play tracks');
        return;
      }

      console.log(`▶️ Playing: ${trackName} (${audioFilename})`);

      // ✅ NEW: Nutze getServerBaseUrl statt hardcoded localhost
      const serverBase = (typeof window !== 'undefined' && window.songNexusConfig)
        ? window.songNexusConfig.getServerBaseUrl()
        : 'https://localhost:3000';

      const audioUrl = `${serverBase}/public/audio/${encodeURIComponent(audioFilename)}`;

      // 🔐 Fetch audio mit Authorization Header
      const token = APIClient.getToken();
      const response = await fetch(audioUrl, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status} - ${response.statusText}`);
      }

      // 📦 Convert to Blob URL
      const audioBlob = await response.blob();
      const blobUrl = URL.createObjectURL(audioBlob);

      console.log(`✅ Audio blob created: ${blobUrl}`);

      // Create or update audio element
      let audioPlayer = document.getElementById('globalAudioPlayer');
      if (!audioPlayer) {
        audioPlayer = document.createElement('audio');
        audioPlayer.id = 'globalAudioPlayer';
        audioPlayer.controls = true;
        audioPlayer.style.cssText = 'width: 100%; margin-top: 20px; margin-bottom: 20px;';
        const container = document.querySelector('.container');
        if (container) {
          container.insertBefore(audioPlayer, container.children[1]);
        }
      }

      // 🎵 Set source and play
      audioPlayer.src = blobUrl;
      audioPlayer.play().catch(err => console.error('Play error:', err));

      // Log play when ended
      audioPlayer.onended = () => {
        console.log(`✅ Track finished: ${trackName}`);
        this.recordPlayback(trackId, trackName);
      };

    } catch (error) {
      console.error('❌ Play error:', error);
      alert(`❌ Play error: ${error.message}`);
    }
  },

  // ========================================================================
  // 📊 RECORD PLAYBACK IN HISTORY
  // ========================================================================

  async recordPlayback(trackId, trackName) {
    try {
      // ✅ NEW: Nutze APIClient
      if (!APIClient.isAuthenticated()) return;

      console.log(`📝 Recording play: track_id=${trackId}`);

      // ✅ APIClient kümmert sich um alles
      await APIClient.logPlayEvent(trackId, null);

      console.log(`✅ Play recorded successfully`);
      this.loadHistory();

    } catch (error) {
      console.error('❌ Record playback error:', error);
    }
  },

  // ========================================================================
  // 📊 LOAD & DISPLAY PLAY HISTORY
  // ========================================================================

  async loadHistory() {
    try {
      // ✅ NEW: Nutze APIClient
      if (!APIClient.isAuthenticated()) {
        console.warn('⚠️ No auth for loading history');
        return;
      }

      console.log('📊 Loading play history...');

      // ✅ APIClient kümmert sich um URL und Token
      const history = await APIClient.getPlayHistory();

      console.log(`✅ History loaded: ${history.length} entries`);
      this.displayHistory(history);

    } catch (error) {
      console.error('❌ History load error:', error);
      const el = document.getElementById('historyList');
      if (el) {
        el.innerHTML = `<div class="card" style="text-align: center;"><p style="color: var(--text-secondary);">❌ Error loading history: ${error.message}</p></div>`;
      }
    }
  },

  displayHistory(history) {
    const container = document.getElementById('historyList');
    if (!container) return;

    if (!history || history.length === 0) {
      container.innerHTML = '<div class="card" style="text-align: center;"><p style="color: var(--text-secondary);">📊 No play history yet</p></div>';
      return;
    }

    container.innerHTML = history.map((entry, index) => {
      const playedAt = new Date(entry.played_at);
      const timeStr = playedAt.toLocaleString('de-AT', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
      });

      return `
        <div class="card">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div>
              <h4 style="margin: 0 0 4px 0; color: var(--accent-teal);">#${index + 1} - ${this.escapeHtml(entry.name)}</h4>
              <p style="color: var(--text-secondary); font-size: 0.9rem; margin: 4px 0;">👤 ${this.escapeHtml(entry.artist)}</p>
              <small style="color: var(--text-secondary);">⏰ ${timeStr}</small>
            </div>
            <button class="button button-secondary" onclick="App.playTrack(${entry.track_id}, '${this.escapeHtml(entry.name)}', '${this.escapeHtml(entry.audio_filename)}')" style="padding: 6px 12px; font-size: 0.8rem;">
              ▶️ PLAY
            </button>
          </div>
        </div>
      `;
    }).join('');
  },

  // ========================================================================
  // 🚪 LOGOUT
  // ========================================================================

  logout() {
    console.log('🔓 Logging out...');

    // ✅ NEW: Nutze APIClient
    APIClient.clearToken();

    // Stop audio playback
    const audioPlayer = document.getElementById('globalAudioPlayer');
    if (audioPlayer) {
      audioPlayer.pause();
      audioPlayer.src = '';
    }

    // Update UI (assumes updateUI() function exists)
    if (typeof updateUI === 'function') {
      updateUI();
    }
  },

  // ========================================================================
  // 🛡️ UTILITY: Escape HTML
  // ========================================================================

  escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// Make available globally
window.App = App;