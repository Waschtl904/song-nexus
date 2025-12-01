"use strict";

// ========================================================================
// 🎵 TRACK BROWSER
// ========================================================================

let allTracks = [];
let userPurchases = [];
let currentModalTrack = null;

const Tracks = {
  async loadTracks() {
    try {
      const tracks = await APIClient.get('/tracks', token);
      allTracks = tracks;
      console.log('📊 Tracks loaded:', tracks);
      console.log('📊 Total tracks:', tracks.length);
      this.renderTracks(tracks);
    } catch (err) {
      console.error('Track load error:', err);
      UI.showStatus('trackStatus', 'Failed to load tracks', 'error');
    }
  },

  renderTracks(tracks) {
    const container = document.getElementById('trackContainer');

    if (!tracks || tracks.length === 0) {
      container.innerHTML = '<p style="color: var(--text-secondary);">No tracks available</p>';
      return;
    }

    container.innerHTML = tracks.map(track => {
      const isPurchased = userPurchases.some(p => p.track_id === track.id);
      const isFree = track.is_free === true;
      const price = track.price_eur || track.price || 0;
      return `
        <div class="track-card" onclick="Tracks.openModal(${track.id})">
          <div class="track-title">🎵 ${UI.escapeHtml(track.name)}</div>
          <div class="track-meta">Artist: ${UI.escapeHtml(track.artist)}</div>
          <div class="track-meta">Genre: ${track.genre}</div>
          <div class="track-meta">Plays: ${track.play_count || 0}</div>
          <div class="track-price">${isFree ? '🎁 FREE' : '€' + parseFloat(price).toFixed(2)}</div>
          ${isFree ? '<div class="track-badge">✅ FREE TRACK</div>' : (isPurchased ? '<div class="track-badge purchased">✅ PURCHASED</div>' : '<div class="track-badge">🔒 NOT OWNED</div>')}
        </div>
      `;
    }).join('');
  },

  openModal(trackId) {
    const track = allTracks.find(t => t.id === trackId);
    if (!track) return;

    currentModalTrack = track;
    const price = track.price_eur || track.price || 0;
    const isPurchased = userPurchases.some(p => p.track_id === track.id);
    const isFree = track.is_free === true;

    let actionButtonHTML = '';

    if (isFree) {
      // FREE TRACK: Play & Download
      actionButtonHTML = `
        <button class="button" id="modalPlayBtn" onclick="Player.togglePlayTrack()" style="flex: 1;">
          ▶️ PLAY NOW
        </button>
        <button class="button" id="modalDownloadBtn" onclick="Tracks.downloadTrack()" style="flex: 1;">
          ⬇️ DOWNLOAD
        </button>
      `;
    } else if (isPurchased) {
      // PURCHASED: Play & Download
      actionButtonHTML = `
        <button class="button" id="modalPlayBtn" onclick="Player.togglePlayTrack()" style="flex: 1;">
          ▶️ PLAY NOW
        </button>
        <button class="button" id="modalDownloadBtn" onclick="Tracks.downloadTrack()" style="flex: 1;">
          ⬇️ DOWNLOAD
        </button>
      `;
    } else {
      // NOT OWNED: Buy
      actionButtonHTML = `
        <button class="button" id="modalBuyBtn" onclick="Tracks.buyTrack()" style="flex: 1;">
          💳 BUY TRACK
        </button>
      `;
    }

    const modalContent = `
      <button class="modal-close" onclick="Tracks.closeModal()">&times;</button>
      <h2>🎵 ${UI.escapeHtml(track.name)}</h2>

      <div style="margin: 16px 0;">
        <p style="color: var(--text-secondary); margin-bottom: 4px;">
          <strong>Artist:</strong> <span>${UI.escapeHtml(track.artist)}</span>
        </p>
        <p style="color: var(--text-secondary); margin-bottom: 4px;">
          <strong>Genre:</strong> <span>${track.genre}</span>
        </p>
        <p style="color: var(--text-secondary); margin-bottom: 4px;">
          <strong>Plays:</strong> <span>${track.play_count || 0}</span>
        </p>
        <p style="color: var(--accent-pink); font-weight: 700; font-size: 1.2rem; margin-top: 12px;">
          ${isFree ? '🎁 FREE DOWNLOAD' : 'Price: €' + parseFloat(price).toFixed(2)}
        </p>
      </div>

      <div class="audio-player" id="audioPlayer" style="display: ${isFree || isPurchased ? 'flex' : 'none'};">
        <button class="play-btn" id="modalPlayBtn" onclick="Player.togglePlayTrack()">▶️</button>
        <div style="flex: 1;">
          <div style="color: var(--accent-teal); font-weight: 600; font-size: 0.9rem;">${UI.escapeHtml(track.name)}.mp3</div>
          <div style="color: var(--text-secondary); font-size: 0.75rem;">PREVIEW • 320K • NO ADS • NO TRACKING</div>
        </div>
      </div>

      <div id="purchaseStatus" style="margin: 16px 0;"></div>

      <div style="display: flex; gap: 10px; margin-top: 20px;">
        ${actionButtonHTML}
        <button class="button button-secondary" onclick="Tracks.closeModal()" style="flex: 1;">❌ Close</button>
      </div>
    `;

    document.querySelector('.modal-content').innerHTML = modalContent;
    UI.openModal('trackModal');
  },

  closeModal() {
    UI.closeModal('trackModal');
    currentModalTrack = null;
  },

  async buyTrack() {
    if (!currentModalTrack) return;

    try {
      const statusEl = document.getElementById('purchaseStatus');
      statusEl.innerHTML = '<div class="status-message loading"><span class="loading-spinner"></span> Processing...</div>';

      const price = currentModalTrack.price_eur || currentModalTrack.price || 0;
      const orderResponse = await APIClient.post('/payments/create-order', {
        amount: price.toString(),
        track_id: currentModalTrack.id,
        description: `${UI.escapeHtml(currentModalTrack.name)} - Digital Track License`
      }, token);

      window.open(orderResponse.approval_url, 'paypal', 'width=800,height=600');
    } catch (err) {
      const statusEl = document.getElementById('purchaseStatus');
      statusEl.innerHTML = `<div class="status-message error">Error: ${err.message}</div>`;
    }
  },

  downloadTrack() {
    if (!currentModalTrack) return;

    const trackName = UI.escapeHtml(currentModalTrack.name);
    const downloadLink = `http://localhost:3000/api/tracks/audio/${encodeURIComponent(trackName)}.mp3`;

    // Direkt downloaden (nicht öffnen)
    const a = document.createElement('a');
    a.href = downloadLink;
    a.download = `${trackName}.mp3`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    console.log('📥 Download started:', trackName);
  }
};

// Make available globally
window.Tracks = Tracks;
