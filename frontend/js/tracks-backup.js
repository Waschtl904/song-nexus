"use strict";



// ========================================================================
// 🎵 TRACK BROWSER
// ========================================================================



let allTracks = [];
let userPurchases = [];
let currentModalTrack = null;
let paypalClientId = null;



const Tracks = {
  async loadTracks() {
    try {
      const tracks = await APIClient.get('/tracks', token);
      allTracks = tracks;
      console.log('📊 Tracks loaded:', tracks);
      console.log('📊 Total tracks:', tracks.length);


      // ✅ WICHTIG: Zeige ALLE Tracks (kostenlos + bezahlt)
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


      // ✅ FIX: Prüfe free_preview_duration ODER is_free
      const isFree = track.is_free === true || track.free_preview_duration >= 999999;
      const price = track.price_eur || track.price || 0;


      return `
        <div class="track-card" onclick="Tracks.openModal(${track.id})">
          <div class="track-title">🎵 ${UI.escapeHtml(track.name)}</div>
          <div class="track-meta">Artist: ${UI.escapeHtml(track.artist)}</div>
          <div class="track-meta">Genre: ${track.genre}</div>
          <div class="track-meta">Plays: ${track.play_count || 0}</div>
          <div class="track-price">${isFree ? '🎁 FREE' : '€' + parseFloat(price).toFixed(2)}</div>
          ${isFree ? '<div class="track-badge">✅ FREE TRACK</div>' : (isPurchased ? '<div class="track-badge purchased">✅ PURCHASED</div>' : '<div class="track-badge">🔒 PREVIEW 40s</div>')}
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


    // ✅ FIX: Prüfe free_preview_duration ODER is_free
    const isFree = track.is_free === true || track.free_preview_duration >= 999999;
    const isPreview = !isFree && !isPurchased; // ✅ NEU: Preview wenn bezahlt & nicht gekauft



    // Audio Player HTML (für Free/Purchased/Preview)
    const audioPlayerHTML = `
      <div style="margin: 16px 0; background: rgba(0, 204, 119, 0.05); border: 1px solid rgba(0, 204, 119, 0.15); border-radius: 4px; padding: 14px;">
        <div style="color: var(--accent-teal); font-weight: 600; margin-bottom: 8px; font-size: 0.9rem;">
          🎚️ AUDIO PLAYER
          ${isPreview ? '<span style="color: var(--accent-pink); margin-left: 8px;">⏱️ 40s PREVIEW</span>' : ''}
        </div>
        
        <!-- Waveform -->
        <div style="margin-bottom: 12px; padding: 8px; background: rgba(0, 0, 0, 0.4); border: 1px solid rgba(34, 197, 94, 0.2); border-radius: 4px; height: 80px; overflow: hidden;">
          <canvas id="modalWaveform" style="width: 100%; height: 100%;"></canvas>
        </div>



        <!-- Time Display -->
        <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px; padding: 6px 8px; background: rgba(0, 224, 255, 0.05); border: 1px solid rgba(0, 224, 255, 0.2); border-radius: 3px; font-family: 'JetBrains Mono', monospace; font-size: 11px;">
          <span id="modalCurrentTime" style="color: var(--text-primary); font-weight: bold;">0:00</span>
          <span style="color: var(--text-secondary);">/</span>
          <span id="modalDuration" style="color: var(--text-secondary);">0:00</span>
        </div>



        <!-- Seek Bar -->
        <input 
          type="range" 
          id="modalSeekBar" 
          min="0" 
          max="100" 
          value="0"
          style="width: 100%; height: 6px; margin-bottom: 10px; background: linear-gradient(90deg, rgba(0, 204, 119, 0.3) 0%, rgba(0, 204, 119, 0.3) 100%); border-radius: 3px; outline: none; cursor: pointer; accent-color: var(--accent-teal);"
          onchange="AudioPlayer.setTime(this.value)"
        />



        <!-- Controls -->
        <div style="display: flex; gap: 8px; align-items: center; flex-wrap: wrap;">
          <button class="button" id="modalPlayBtn" onclick="Player.togglePlayTrack()" style="flex: 1; padding: 8px 12px; font-size: 0.85rem;">▶️ PLAY</button>
          <button class="button" id="modalPauseBtn" onclick="AudioPlayer.pause()" style="display: none; flex: 1; padding: 8px 12px; font-size: 0.85rem;">⏸ PAUSE</button>
          <button class="button" onclick="AudioPlayer.stop()" style="flex: 1; padding: 8px 12px; font-size: 0.85rem;">⏹ STOP</button>
          <button class="button" id="modalLoopBtn" onclick="AudioPlayer.toggleLoop()" style="flex: 1; padding: 8px 12px; font-size: 0.85rem;">🔄 LOOP</button>
          
          <!-- Volume -->
          <div style="display: flex; align-items: center; gap: 6px; margin-left: auto;">
            <span style="font-size: 14px;">🔊</span>
            <input 
              type="range" 
              id="modalVolumeSlider" 
              min="0" 
              max="100" 
              value="80"
              style="width: 60px; height: 4px; background: linear-gradient(90deg, rgba(0, 204, 119, 0.3) 0%, rgba(0, 204, 119, 0.3) 100%); border-radius: 2px; outline: none; cursor: pointer; accent-color: var(--accent-teal);"
              onchange="AudioPlayer.setVolume(this.value)"
            />
          </div>
        </div>
      </div>
    `;



    let actionButtonHTML = '';



    if (isFree) {
      // FREE TRACK: Download Button
      actionButtonHTML = `
        <button class="button" id="modalDownloadBtn" onclick="Tracks.downloadTrack()" style="flex: 1;">
          ⬇️ DOWNLOAD
        </button>
      `;
    } else if (isPurchased) {
      // PURCHASED: Download Button
      actionButtonHTML = `
        <button class="button" id="modalDownloadBtn" onclick="Tracks.downloadTrack()" style="flex: 1;">
          ⬇️ DOWNLOAD
        </button>
      `;
    } else {
      // NOT OWNED: Buy Button
      actionButtonHTML = `
        <button class="button" id="modalBuyBtn" onclick="Tracks.buyTrack()" style="flex: 1;">
          💳 BUY TRACK (€${parseFloat(price).toFixed(2)})
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



      ${audioPlayerHTML}



      <div id="purchaseStatus" style="margin: 16px 0;"></div>



      <div style="display: flex; gap: 10px; margin-top: 20px;">
        ${actionButtonHTML}
        <button class="button button-secondary" onclick="Tracks.closeModal()" style="flex: 1;">❌ Close</button>
      </div>
    `;



    document.querySelector('.modal-content').innerHTML = modalContent;
    UI.openModal('trackModal');

    // ✅ NEU: Audio Player laden mit Preview-Flag
    setTimeout(() => {
      AudioPlayer.init();
      AudioPlayer.loadTrack(track, isPreview);
      AudioPlayer.updatePlayerUI();
    }, 100);
  },



  closeModal() {
    AudioPlayer.stop();
    UI.closeModal('trackModal');
    currentModalTrack = null;
  },



  async buyTrack() {
    if (!currentModalTrack) return;



    try {
      const statusEl = document.getElementById('purchaseStatus');
      statusEl.innerHTML = '<div class="status-message loading"><span class="loading-spinner"></span> 💳 Initializing PayPal...</div>';



      const price = currentModalTrack.price_eur || currentModalTrack.price || 0.99;



      // 1️⃣ Create PayPal Order
      console.log(`💰 Creating order for track: ${currentModalTrack.name} (€${price})`);



      const orderResponse = await APIClient.post('/payments/create-order', {
        track_id: currentModalTrack.id,
        price: parseFloat(price)
      }, token);



      if (!orderResponse || !orderResponse.order_id) {
        throw new Error('Failed to create payment order');
      }



      console.log(`✅ PayPal order created: ${orderResponse.order_id}`);



      // 2️⃣ Get PayPal Mode from Backend
      const configResponse = await fetch('https://localhost:3000/api/payments/config');
      const config = await configResponse.json();
      const paypalMode = config.paypal_mode || 'sandbox';



      // 3️⃣ Build PayPal Checkout URL
      const paypalDomain = paypalMode === 'production' ? 'paypal.com' : 'sandbox.paypal.com';
      const checkoutUrl = `https://www.${paypalDomain}/checkoutnow?token=${orderResponse.order_id}`;



      statusEl.innerHTML = '<div class="status-message loading"><span class="loading-spinner"></span> 🔄 Redirecting to PayPal...</div>';



      // Store order ID im localStorage für später
      localStorage.setItem('pendingPaymentOrderId', orderResponse.order_id);
      localStorage.setItem('pendingTrackId', currentModalTrack.id);



      console.log(`🔗 Redirecting to: ${checkoutUrl}`);



      // Redirect zu PayPal
      window.location.href = checkoutUrl;



    } catch (err) {
      console.error('❌ Buy error:', err);
      const statusEl = document.getElementById('purchaseStatus');
      statusEl.innerHTML = `<div class="status-message error">❌ Error: ${err.message}</div>`;
    }
  },



  downloadTrack() {
    if (!currentModalTrack) return;



    try {
      // ✅ RICHTIG: Nutze audio_filename statt track name!
      const audioFilename = currentModalTrack.audio_filename;



      if (!audioFilename) {
        console.error('❌ No audio filename found');
        return;
      }



      const downloadLink = `https://localhost:3000/api/tracks/audio/${audioFilename}`;



      // Force Download mit content-disposition
      const xhr = new XMLHttpRequest();
      xhr.open('GET', downloadLink, true);
      xhr.responseType = 'blob';



      xhr.onload = function () {
        if (xhr.status === 200) {
          // Erstelle Blob und Download Link
          const blob = xhr.response;
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `${currentModalTrack.name}.mp3`;
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          window.URL.revokeObjectURL(url);



          console.log('✅ Download started:', currentModalTrack.name);
        } else {
          console.error('❌ Download failed:', xhr.status);
        }
      };



      xhr.onerror = function () {
        console.error('❌ Download error:', xhr.statusText);
      };



      xhr.send();
    } catch (err) {
      console.error('❌ Download error:', err);
    }
  }
};



// Make available globally
window.Tracks = Tracks;