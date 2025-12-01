"use strict";

// ========================================================================
// 🛠️ DEVELOPMENT MODE – AUTO-LOGIN (DEVUSER)
// ========================================================================

const DEV_MODE = true;

async function initDevMode() {
    if (!DEV_MODE) return;

    try {
        const loginResponse = await fetch('http://localhost:3000/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'dev@nexus.local',
                password: 'dev123'
            })
        });

        if (loginResponse.ok) {
            const data = await loginResponse.json();
            token = data.token;
            currentUser = data.user;
            localStorage.setItem('token', token);
            setTimeout(() => showUserDashboard(), 300);
            console.log('%c🟣 DEV-MODE: Angemeldet als devuser', 'color: #dd00dd;');
        } else {
            console.warn('DEV-MODE: Login fehlgeschlagen');
        }
    } catch (err) {
        console.error('DEV-MODE Error:', err);
    }
}

// ========================================================================
// 📊 DASHBOARD FUNCTIONS
// ========================================================================

async function showUserDashboard() {
    try {
        const user = await APIClient.get('/users/profile', token);
        const stats = await APIClient.get('/users/stats', token);
        const purchases = await APIClient.get('/users/purchases', token);

        UI.updateUserCard(user.username, user.email, stats.total_plays, stats.total_spent);
        userPurchases = purchases;

        await loadPlayHistory();
        await loadPurchaseHistory();
        await Tracks.loadTracks();

        UI.showAuthSection(false);
        UI.showUserSection(true);
        UI.showTrackBrowser(true);
    } catch (err) {
        console.error('Dashboard load error:', err);
    }
}

async function loadPlayHistory() {
    try {
        const history = await APIClient.get('/users/play-history', token);
        const container = document.getElementById('playHistoryContainer');

        if (!history || history.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No play history yet</p>';
            return;
        }

        container.innerHTML = history.slice(0, 10).map(item => `
      <div class="history-item">
        <div>
          <div class="history-track">🎵 ${UI.escapeHtml(item.track_name)}</div>
          <div class="history-time">${UI.escapeHtml(item.artist_name)}</div>
        </div>
        <div class="history-time">${new Date(item.played_at).toLocaleDateString()}</div>
      </div>
    `).join('');
    } catch (err) {
        console.error('Play history error:', err);
    }
}

async function loadPurchaseHistory() {
    try {
        const history = await APIClient.get('/users/purchases', token);
        const container = document.getElementById('purchaseHistoryContainer');

        if (!history || history.length === 0) {
            container.innerHTML = '<p style="color: var(--text-secondary);">No purchases yet</p>';
            return;
        }

        container.innerHTML = history.map(item => `
      <div class="history-item">
        <div>
          <div class="history-track">💿 ${UI.escapeHtml(item.track_name)}</div>
          <div class="history-time">${UI.escapeHtml(item.artist_name)}</div>
        </div>
        <div style="text-align: right;">
          <div style="color: var(--accent-pink); font-weight: 700;">€${parseFloat(item.price).toFixed(2)}</div>
          <div class="history-time">${new Date(item.purchase_date).toLocaleDateString()}</div>
        </div>
      </div>
    `).join('');
    } catch (err) {
        console.error('Purchase history error:', err);
    }
}

// ========================================================================
// 🚀 INITIALIZATION
// ========================================================================

document.addEventListener('DOMContentLoaded', () => {
    console.log('%c⚡ SONG-NEXUS v6.0 – PRODUCTION READY ⚡', 'color: #00cc77; font-size: 16px; font-weight: bold;');
    console.log('%c>> Modular Frontend Architecture', 'color: #00ffff; font-size: 12px;');

    // Init theme
    UI.initTheme();

    // Build Auth Section HTML
    const authSection = document.getElementById('authSection');
    if (authSection) {
        authSection.innerHTML = `
      <h2>🔑 Authentication</h2>
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
        <div>
          <h3 style="color: var(--accent-teal); font-size: 1rem; margin-bottom: 16px;">📝 REGISTER</h3>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="regEmail" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label>Username</label>
            <input type="text" id="regUsername" placeholder="username">
          </div>
          <div class="form-group">
            <label>Password (min 8 chars)</label>
            <input type="password" id="regPassword" placeholder="••••••••">
          </div>
          <button class="button" onclick="register()">📝 Register</button>
        </div>
        <div>
          <h3 style="color: var(--accent-teal); font-size: 1rem; margin-bottom: 16px;">🔐 LOGIN</h3>
          <div class="form-group">
            <label>Email</label>
            <input type="email" id="loginEmail" placeholder="your@email.com">
          </div>
          <div class="form-group">
            <label>Password</label>
            <input type="password" id="loginPassword" placeholder="••••••••">
          </div>
          <button class="button" onclick="login()">🔐 Login</button>
        </div>
      </div>
      <div class="status-message" id="authStatus"></div>
    `;
    }

    // Build User Section HTML
    const userSection = document.getElementById('userSection');
    if (userSection) {
        userSection.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
        <h2>👤 User Dashboard</h2>
        <button class="button button-secondary" onclick="logout()">🚪 Logout</button>
      </div>

      <div class="user-info">
        <div class="user-card">
          <div class="user-card-label">Username</div>
          <div class="user-card-value" id="displayUsername">-</div>
        </div>
        <div class="user-card">
          <div class="user-card-label">Email</div>
          <div class="user-card-value" id="displayEmail" style="font-size: 0.9rem;">-</div>
        </div>
        <div class="user-card">
          <div class="user-card-label">Total Plays</div>
          <div class="user-card-value" id="totalPlays">0</div>
        </div>
        <div class="user-card">
          <div class="user-card-label">Total Spent</div>
          <div class="user-card-value" id="totalSpent">€0</div>
        </div>
      </div>

      <div class="tabs">
        <button class="tab-btn active" onclick="UI.switchTab('play-history')">🎵 Play History</button>
        <button class="tab-btn" onclick="UI.switchTab('purchase-history')">💳 Purchase History</button>
      </div>

      <div id="play-history" class="tab-content active">
        <div id="playHistoryContainer"><p style="color: var(--text-secondary);">Loading...</p></div>
      </div>

      <div id="purchase-history" class="tab-content">
        <div id="purchaseHistoryContainer"><p style="color: var(--text-secondary);">Loading...</p></div>
      </div>
    `;
    }

    // Build Track Browser HTML
    const trackBrowser = document.getElementById('trackBrowserSection');
    if (trackBrowser) {
        trackBrowser.innerHTML = `
      <h2>🎵 Track Browser</h2>
      <p style="color: var(--text-secondary); margin-bottom: 20px;">Alle verfügbaren Tracks – Klick für Details</p>
      <div class="status-message" id="trackStatus"></div>
      <div id="trackContainer" class="track-grid">
        <p style="color: var(--text-secondary);">Loading tracks...</p>
      </div>
    `;
    }

    // Build Modal HTML
    const modal = document.getElementById('trackModal');
    if (modal) {
        modal.innerHTML = '<div class="modal-content"></div>';
    }

    // Start dev mode or wait for token
    initDevMode();

    if (token && !DEV_MODE) {
        showUserDashboard();
    }
});
