"use strict";

// ============================================================================
// 🎵 TRACK BROWSER – Full Integration
// ✅ UPDATED: APIClient + Auth + ngrok + Player + PayPal
// ============================================================================

const Tracks = {
  allTracks: [],
  userPurchases: [],
  currentModalTrack: null,
  paypalClientId: null,

  /**
   * Initialize Tracks module
   */
  init() {
    console.log('🎵 Tracks module initializing...');
    this.loadTracks();
  },

  /**
   * Get API base URL
   */
  getApiBase() {
    if (typeof window !== 'undefined' && window.songNexusConfig) {
      return window.songNexusConfig.getApiBaseUrl();
    }
    return 'https://localhost:3000/api';
  },

  /**
   * Load all tracks from backend
   */
  async loadTracks() {
    try {
      console.log('📥 Loading tracks...');

      // ✅ NEW: Get token from Auth module if available
      let token = null;
      if (typeof Auth !== 'undefined') {
        token = Auth.getToken();
      }

      // ✅ NEW: Use APIClient if available
      if (typeof APIClient !== 'undefined') {
        this.allTracks = await APIClient.getTracks();
      } else {
        const apiBase = this.getApiBase();
        const response = await fetch(`${apiBase}/tracks`);
        if (!response.ok) throw new Error('Failed to load tracks');
        this.allTracks = await response.json();
      }

      console.log('📊 Tracks loaded:', this.allTracks.length);

      // Load user purchases if authenticated
      if (token) {
        await this.loadUserPurchases(token);
      }

      // Render all tracks
      this.renderTracks(this.allTracks);

    } catch (err) {
      console.error('❌ Track load error:', err);
      this.showStatus('Failed to load tracks', 'error');
    }
  },

  /**
   * Load user's purchased tracks
   */
  async loadUserPurchases(token) {
    try {
      const apiBase = this.getApiBase();
      const response = await fetch(`${apiBase}/users/purchases`, {
        headers: { 'Authorization': `Bearer ${token}` },
        credentials: 'include'
      });

      if (response.ok) {
        this.userPurchases = await response.json();
        console.log('🛍️ Purchases loaded:', this.userPurchases.length);
      }
    } catch (err) {
      console.warn('⚠️ Failed to load purchases:', err);
    }
  },

  /**
   * Render all tracks in grid
   */
  renderTracks(tracks) {
    const container = document.getElementById('trackContainer');

    if (!container) {
      console.warn('⚠️ Track container not found');
      return;
    }

    if (!tracks || tracks.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">🎵 No tracks available</p>';
      return;
    }

    // Get token for purchase checking
    let token = null;
    if (typeof Auth !== 'undefined') {
      token = Auth.getToken();
    }

    container.innerHTML = tracks.map(track => {
      const isPurchased = this.userPurchases.some(p => p.track_id === track.id);
      const isFree = track.is_free === true || (track.free_preview_duration >= 999999);
      const price = track.price_eur || track.price || 0;

      return `
                <div class="track-card" onclick="Tracks.openModal(${track.id})" role="button" tabindex="0" aria-label="Play ${this.escapeHtml(track.name)}">
                    <div class="track-title">♪ ${this.escapeHtml(track.name)}</div>
                    <div class="track-meta">🎤 ${this.escapeHtml(track.artist || 'Unknown')}</div>
                    <div class="track-meta">🎵 ${track.genre || 'Various'}</div>
                    <div class="track-meta">▶️ ${track.play_count || 0} plays</div>
                    <div class="track-price">${isFree ? '🎁 FREE' : '€' + parseFloat(price).toFixed(2)}</div>
                    ${isFree ? '<div class="track-badge" style="background: rgba(0, 204, 119, 0.1); color: var(--accent-teal);">✅ FREE</div>' : (isPurchased ? '<div class="track-badge">✅ PURCHASED</div>' : '<div class="track-badge">🔒 PREVIEW</div>')}
                </div>
            `;
    }).join('');

    // Add keyboard support to track cards
    document.querySelectorAll('.track-card').forEach(card => {
      card.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          card.click();
        }
      });
    });

    console.log(`✅ Rendered ${tracks.length} tracks`);
  },

  /**
   * Open track modal
   */
  async openModal(trackId) {
    try {
      const track = this.allTracks.find(t => t.id === trackId);
      if (!track) {
        console.error('❌ Track not found');
        return;
      }

      this.currentModalTrack = track;

      const price = track.price_eur || track.price || 0;
      const isPurchased = this.userPurchases.some(p => p.track_id === track.id);
      const isFree = track.is_free === true || (track.free_preview_duration >= 999999);
      const isPreview = !isFree && !isPurchased;

      console.log(`🎵 Opening modal for: ${track.name} (Preview: ${isPreview})`);

      // Build action button
      let actionButtonHTML = '';

      if (isFree || isPurchased) {
        actionButtonHTML = `
                    <button class="button" id="modalDownloadBtn" onclick="Tracks.downloadTrack()" style="flex: 1;">
                        ⬇️ DOWNLOAD
                    </button>
                `;
      } else {
        actionButtonHTML = `
                    <button class="button" id="modalBuyBtn" onclick="Tracks.buyTrack()" style="flex: 1;">
                        💳 BUY (€${parseFloat(price).toFixed(2)})
                    </button>
                `;
      }

      // Build modal content
      const modalContent = `
                <button class="modal-close" onclick="Tracks.closeModal()">&times;</button>
                <h2>🎵 ${this.escapeHtml(track.name)}</h2>

                <div style="margin: 16px 0;">
                    <p style="color: var(--text-secondary); margin-bottom: 4px;">
                        <strong>🎤 Artist:</strong> ${this.escapeHtml(track.artist || 'Unknown')}
                    </p>
                    <p style="color: var(--text-secondary); margin-bottom: 4px;">
                        <strong>🎵 Genre:</strong> ${track.genre || 'Various'}
                    </p>
                    <p style="color: var(--text-secondary); margin-bottom: 4px;">
                        <strong>▶️ Plays:</strong> ${track.play_count || 0}
                    </p>
                    <p style="color: var(--accent-teal); font-weight: 700; font-size: 1.2rem; margin-top: 12px;">
                        ${isFree ? '🎁 FREE DOWNLOAD' : 'Price: €' + parseFloat(price).toFixed(2)}
                        ${isPreview ? '<span style="color: var(--accent-pink); margin-left: 8px;">⏱️ 40s PREVIEW</span>' : ''}
                    </p>
                </div>

                <div id="purchaseStatus" style="margin: 16px 0;"></div>

                <div style="display: flex; gap: 10px; margin-top: 20px;">
                    ${actionButtonHTML}
                    <button class="button button-secondary" onclick="Tracks.closeModal()" style="flex: 1;">❌ Close</button>
                </div>
            `;

      const modal = document.querySelector('.modal-content');
      if (modal) {
        modal.innerHTML = modalContent;

        // Open modal UI
        const modalEl = document.getElementById('trackModal');
        if (modalEl) {
          modalEl.style.display = 'flex';
        }

        // Load track in player
        setTimeout(() => {
          if (typeof Player !== 'undefined') {
            Player.loadAndPlay(track, isPreview);
          } else if (typeof window.AudioPlayer !== 'undefined') {
            window.AudioPlayer.loadTrack(track, isPreview);
          }
        }, 100);
      }

    } catch (err) {
      console.error('❌ Open modal error:', err);
      this.showStatus(`Error: ${err.message}`, 'error');
    }
  },

  /**
   * Close track modal
   */
  closeModal() {
    try {
      if (typeof window.AudioPlayer !== 'undefined') {
        window.AudioPlayer.stop();
      }

      const modalEl = document.getElementById('trackModal');
      if (modalEl) {
        modalEl.style.display = 'none';
      }

      this.currentModalTrack = null;
      console.log('❌ Modal closed');

    } catch (err) {
      console.warn('⚠️ Close modal error:', err);
    }
  },

  /**
   * Buy track via PayPal
   */
  async buyTrack() {
    if (!this.currentModalTrack) return;

    try {
      const statusEl = document.getElementById('purchaseStatus');
      if (statusEl) {
        statusEl.innerHTML = '<div style="color: var(--accent-teal); padding: 8px;">💳 Initializing PayPal...</div>';
      }

      const track = this.currentModalTrack;
      const price = track.price_eur || track.price || 0.99;

      console.log(`💰 Creating payment order for: ${track.name} (€${price})`);

      // Get token
      let token = null;
      if (typeof Auth !== 'undefined') {
        token = Auth.getToken();
      }

      // Create PayPal order
      const apiBase = this.getApiBase();
      const orderResponse = await fetch(`${apiBase}/payments/create-order`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { 'Authorization': `Bearer ${token}` })
        },
        body: JSON.stringify({
          track_id: track.id,
          price: parseFloat(price)
        }),
        credentials: 'include'
      });

      if (!orderResponse.ok) {
        throw new Error(`Payment error: ${orderResponse.status}`);
      }

      const orderData = await orderResponse.json();
      if (!orderData || !orderData.order_id) {
        throw new Error('Failed to create payment order');
      }

      console.log(`✅ PayPal order created: ${orderData.order_id}`);

      // Get PayPal mode
      const configResponse = await fetch(`${apiBase}/payments/config`);
      const config = await configResponse.json();
      const paypalMode = config.paypal_mode || 'sandbox';
      const paypalDomain = paypalMode === 'production' ? 'paypal.com' : 'sandbox.paypal.com';

      // Redirect to PayPal
      const checkoutUrl = `https://www.${paypalDomain}/checkoutnow?token=${orderData.order_id}`;

      if (statusEl) {
        statusEl.innerHTML = '<div style="color: var(--accent-teal); padding: 8px;">🔄 Redirecting to PayPal...</div>';
      }

      console.log(`🔗 Redirecting to: ${checkoutUrl}`);

      // Store for later verification
      localStorage.setItem('pendingPaymentOrderId', orderData.order_id);
      localStorage.setItem('pendingTrackId', track.id);

      // Redirect
      window.location.href = checkoutUrl;

    } catch (err) {
      console.error('❌ Buy error:', err);
      const statusEl = document.getElementById('purchaseStatus');
      if (statusEl) {
        statusEl.innerHTML = `<div style="color: var(--accent-pink); padding: 8px;">❌ Error: ${err.message}</div>`;
      }
    }
  },

  /**
   * Download track
   */
  async downloadTrack() {
    if (!this.currentModalTrack) return;

    try {
      const track = this.currentModalTrack;
      const audioFilename = track.audio_filename;

      if (!audioFilename) {
        console.error('❌ No audio filename found');
        this.showStatus('Download failed: No audio file', 'error');
        return;
      }

      const apiBase = this.getApiBase();
      const downloadUrl = `${apiBase}/tracks/audio/${audioFilename}`;

      console.log(`⬇️ Downloading: ${track.name}`);

      // Use fetch to download
      const response = await fetch(downloadUrl, {
        credentials: 'include'
      });

      if (!response.ok) {
        throw new Error(`Download failed: ${response.status}`);
      }

      // Create blob and download
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${track.name}.mp3`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);

      console.log('✅ Download started:', track.name);
      this.showStatus(`✅ Downloading: ${track.name}`, 'success');

    } catch (err) {
      console.error('❌ Download error:', err);
      this.showStatus(`Download failed: ${err.message}`, 'error');
    }
  },

  /**
   * Search tracks
   */
  searchTracks(query) {
    if (!query || query.length < 2) {
      this.renderTracks(this.allTracks);
      return;
    }

    const filtered = this.allTracks.filter(track =>
      track.name.toLowerCase().includes(query.toLowerCase()) ||
      track.artist.toLowerCase().includes(query.toLowerCase()) ||
      (track.genre && track.genre.toLowerCase().includes(query.toLowerCase()))
    );

    console.log(`🔍 Search results: ${filtered.length} tracks`);
    this.renderTracks(filtered);
  },

  /**
   * Filter tracks by type
   */
  filterTracks(filterType) {
    let filtered = this.allTracks;

    switch (filterType) {
      case 'free':
        filtered = this.allTracks.filter(t => t.is_free === true);
        break;
      case 'purchased':
        filtered = this.allTracks.filter(t =>
          this.userPurchases.some(p => p.track_id === t.id)
        );
        break;
      case 'premium':
        filtered = this.allTracks.filter(t => t.is_free !== true);
        break;
    }

    console.log(`📊 Filtered: ${filtered.length} tracks (${filterType})`);
    this.renderTracks(filtered);
  },

  /**
   * Sort tracks
   */
  sortTracks(sortBy) {
    let sorted = [...this.allTracks];

    switch (sortBy) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'artist':
        sorted.sort((a, b) => a.artist.localeCompare(b.artist));
        break;
      case 'plays':
        sorted.sort((a, b) => (b.play_count || 0) - (a.play_count || 0));
        break;
      case 'price':
        sorted.sort((a, b) => {
          const priceA = a.price_eur || a.price || 0;
          const priceB = b.price_eur || b.price || 0;
          return priceA - priceB;
        });
        break;
    }

    console.log(`↕️ Sorted by: ${sortBy}`);
    this.renderTracks(sorted);
  },

  /**
   * Show status message
   */
  showStatus(message, type = 'info') {
    try {
      const statusEl = document.getElementById('trackStatus');
      if (statusEl) {
        statusEl.textContent = message;
        statusEl.className = `status-message ${type}`;
        statusEl.style.display = 'block';
        statusEl.setAttribute('role', 'alert');

        if (type !== 'loading') {
          setTimeout(() => {
            statusEl.style.display = 'none';
          }, 4000);
        }
      } else {
        console.log(`[${type.toUpperCase()}] ${message}`);
      }
    } catch (err) {
      console.warn('⚠️ Status display error:', err);
    }
  },

  /**
   * Escape HTML
   */
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }
};

// ========================================================================
// INITIALIZE ON LOAD
// ========================================================================
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    console.log('📄 DOM ready, initializing Tracks...');
    Tracks.init();
  });
} else {
  Tracks.init();
}

// Make global
window.Tracks = Tracks;