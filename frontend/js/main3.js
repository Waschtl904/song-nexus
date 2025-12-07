"use strict";

// ========================================================================
// 🎵 SONG-NEXUS MAIN APPLICATION
// ========================================================================

const App = {
    baseURL: 'https://localhost:3000/api',  // ← HTTPS ENABLED
    tracks: [],
    blogPosts: [],
    token: null,
    user: null,

    // ===== INITIALIZATION =====
    async init() {
        console.log('🚀 SONG-NEXUS Initializing...');

        // Check Auth Status
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');

        // Init AudioPlayer
        if (window.AudioPlayer) {
            window.AudioPlayer.init();
            window.AudioPlayer.setupKeyboardShortcuts();
            console.log('✅ AudioPlayer initialized');
        }

        // Load Content
        await Promise.all([
            this.loadTracks(),
            this.loadBlogPosts()
        ]);

        // Update UI
        this.updateUI();

        // Theme Toggle
        this.initTheme();

        // Event Listeners (CSP-safe)
        this.setupEventListeners();

        console.log('✅ App ready!');
    },

    // ===== EVENT LISTENERS (CSP-SAFE) =====
    setupEventListeners() {
        // Theme Toggle
        document.getElementById('themeToggle')?.addEventListener('click', () => {
            const current = document.documentElement.getAttribute('data-theme');
            const next = current === 'dark' ? 'light' : 'dark';
            document.documentElement.setAttribute('data-theme', next);
            localStorage.setItem('theme', next);
            this.updateThemeButton(next);
        });

        // Auth Modal Toggle
        document.getElementById('authToggle')?.addEventListener('click', () => {
            this.toggleAuthModal();
        });

        // Modal Close Button
        document.querySelector('.modal-close')?.addEventListener('click', () => {
            this.toggleAuthModal();
        });

        // Tab Buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(btn.getAttribute('data-tab'), e);
            });
        });

        // Password Login Form
        document.querySelector('form[data-form="password-login"]')?.addEventListener('submit', (e) => {
            this.passwordLogin(e);
        });

        // Magic Link Button
        document.getElementById('magicLinkBtn')?.addEventListener('click', () => {
            this.sendMagicLink();
        });

        // WebAuthn Button
        document.getElementById('webauthnBtn')?.addEventListener('click', () => {
            this.webauthnLogin();
        });

        // Register Biometric Button
        document.getElementById('registerBiometricBtn')?.addEventListener('click', () => {
            this.registerBiometric();
        });

        // Toggle Bio Register Modal
        document.getElementById('toggleBioRegisterBtn')?.addEventListener('click', () => {
            this.toggleBioRegister(true);
        });

        // Logout Button
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });
    },

    // ===== THEME MANAGEMENT =====
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        this.updateThemeButton(savedTheme);
    },

    updateThemeButton(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
        }
    },

    // ===== LOAD TRACKS =====
    async loadTracks() {
        try {
            const response = await fetch(`${this.baseURL}/tracks`);
            if (!response.ok) throw new Error('Failed to load tracks');

            this.tracks = await response.json();
            this.renderTracks();
            console.log(`✅ Loaded ${this.tracks.length} tracks`);
        } catch (err) {
            console.error('❌ Load tracks error:', err);
            this.showError('Failed to load tracks');
        }
    },

    // ===== RENDER TRACKS =====
    renderTracks() {
        const tracksList = document.getElementById('tracksList');
        if (!tracksList) return;

        // Take top 3 for featured
        const featured = this.tracks.slice(0, 3);

        if (featured.length === 0) {
            tracksList.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center;"><p style="color: var(--text-secondary);">🎵 No tracks available</p></div>';
            return;
        }

        tracksList.innerHTML = featured.map((track, idx) => `
            <div class="card track-card">
                <div class="track-title">♪ ${this.escapeHtml(track.name)}</div>
                <div class="track-meta">🎤 ${this.escapeHtml(track.artist || 'Unknown')}</div>
                <div class="track-meta">⏱️ ${track.duration || '3:00'}</div>
                
                ${track.is_free ? '' : '<div class="track-badge">🔒 Premium</div>'}
                ${track.is_premium ? '<div class="track-badge">💰 Paid</div>' : '<div class="track-badge" style="background: rgba(0, 204, 119, 0.1); color: var(--accent-teal); border-color: var(--accent-teal);">🆓 Free</div>'}
                
                <button class="button play-track-btn" data-filename="${this.escapeHtml(track.audio_filename)}" data-premium="${track.is_premium}" data-name="${this.escapeHtml(track.name)}" style="width: 100%; margin-top: 12px;">
                    ▶️ ${track.is_premium && !App.token ? '🔊 Preview 40s' : 'Play'}
                </button>
            </div>
        `).join('');

        // Add listeners to play buttons
        document.querySelectorAll('.play-track-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                this.playTrack(
                    btn.getAttribute('data-filename'),
                    btn.getAttribute('data-premium') === 'true',
                    btn.getAttribute('data-name')
                );
            });
        });
    },

    // ===== PLAY TRACK =====
    async playTrack(filename, isPremium, trackName) {
        try {
            // Create track object for AudioPlayer
            const track = {
                id: this.tracks.find(t => t.audio_filename === filename)?.id || 0,
                name: trackName,
                audio_filename: filename,
                is_premium: isPremium
            };

            // Determine if preview or full
            const isPreview = isPremium && !this.token;

            // Load in AudioPlayer
            window.AudioPlayer.loadTrack(track, isPreview);
            window.AudioPlayer.play();

            // Update sticky player display
            this.updatePlayerDisplay(trackName);

            // Log play (if authenticated)
            if (this.token) {
                await fetch(`${this.baseURL}/users/track-play`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${this.token}`
                    },
                    body: JSON.stringify({ track_id: track.id })
                }).catch(e => console.warn('Play log failed:', e));
            }

            console.log(`▶️ Playing: ${trackName} ${isPreview ? '(PREVIEW)' : '(FULL)'}`);
        } catch (err) {
            console.error('❌ Play error:', err);
            this.showError('Failed to play track');
        }
    },

    // ===== UPDATE PLAYER DISPLAY =====
    updatePlayerDisplay(trackName) {
        const trackNameEl = document.querySelector('.track-name');
        if (trackNameEl) {
            trackNameEl.textContent = trackName;
        }
    },

    // ===== LOAD BLOG POSTS =====
    async loadBlogPosts() {
        try {
            const response = await fetch('blog/posts.json');
            if (!response.ok) throw new Error('Failed to load blog');

            this.blogPosts = await response.json();
            this.renderBlogPosts();
            console.log(`✅ Loaded ${this.blogPosts.length} blog posts`);
        } catch (err) {
            console.warn('⚠️ Blog load failed:', err);
            this.renderBlogPosts(true); // Show fallback
        }
    },

    // ===== RENDER BLOG POSTS =====
    renderBlogPosts(error = false) {
        const blogList = document.getElementById('blogList');
        if (!blogList) return;

        if (error || this.blogPosts.length === 0) {
            blogList.innerHTML = `
                <div class="card blog-card">
                    <div class="blog-card-title">📝 Coming Soon</div>
                    <div class="blog-card-excerpt">We're working on bringing you amazing content about music, production, and technology.</div>
                </div>
            `;
            return;
        }

        // Show 4 latest posts
        const latest = this.blogPosts.slice(0, 4);

        blogList.innerHTML = latest.map(post => `
            <div class="card blog-card" data-slug="${post.slug}">
                <div class="blog-card-date">${new Date(post.date).toLocaleDateString()}</div>
                <div class="blog-card-title">${this.escapeHtml(post.title)}</div>
                <div class="blog-card-excerpt">${this.escapeHtml(post.excerpt)}</div>
                <a href="blog/${post.slug}/" class="blog-card-link">Read More →</a>
            </div>
        `).join('');

        // Add click listeners to blog cards
        document.querySelectorAll('.blog-card').forEach(card => {
            card.addEventListener('click', () => {
                const slug = card.getAttribute('data-slug');
                window.location.href = `blog/${slug}/`;
            });
        });
    },

    // ===== AUTHENTICATION =====
    toggleAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = modal.style.display === 'none' ? 'flex' : 'none';
        }
    },

    switchTab(tabName, event) {
        if (event) event.preventDefault();

        document.querySelectorAll('.tab-content').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));

        document.getElementById(tabName + '-tab')?.classList.add('active');
        event.target?.classList.add('active');
    },

    async passwordLogin(event) {
        event.preventDefault();

        const email = document.getElementById('loginEmail')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!email || !password) {
            this.showStatus('passwordStatus', '❌ Email and password required', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) throw new Error('Invalid credentials');

            const data = await response.json();
            localStorage.setItem('auth_token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            this.token = data.token;
            this.user = data.user;

            this.showStatus('passwordStatus', '✅ Login successful!', 'success');
            setTimeout(() => {
                this.toggleAuthModal();
                this.updateUI();
            }, 500);
        } catch (err) {
            this.showStatus('passwordStatus', `❌ ${err.message}`, 'error');
        }
    },

    async sendMagicLink() {
        const email = document.getElementById('magicEmail')?.value.trim();

        if (!email) {
            this.showStatus('magicStatus', '❌ Email required', 'error');
            return;
        }

        try {
            const response = await fetch(`${this.baseURL}/auth/magic-link`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            if (!response.ok) throw new Error('Failed to send');

            this.showStatus('magicStatus', '✅ Check your email!', 'success');
        } catch (err) {
            this.showStatus('magicStatus', `❌ ${err.message}`, 'error');
        }
    },

    async webauthnLogin() {
        this.showStatus('bioStatus', '👆 Scanning...', 'loading');
        // WebAuthn implementation here
        setTimeout(() => {
            this.showStatus('bioStatus', '⚠️ WebAuthn coming soon', 'error');
        }, 1000);
    },

    async registerBiometric() {
        // Biometric registration here
        this.showStatus('bioStatus', '⚠️ Registration coming soon', 'error');
    },

    toggleBioRegister(show) {
        const modal = document.getElementById('bioRegisterModal');
        if (modal) {
            modal.style.display = show ? 'block' : 'none';
        }
    },

    // ===== LOGOUT =====
    logout() {
        localStorage.removeItem('auth_token');
        localStorage.removeItem('user');
        this.token = null;
        this.user = null;
        this.updateUI();
        this.showStatus('authToggle', '👋 Logged out', 'success');
    },

    // ===== UI UPDATES =====
    updateUI() {
        const authToggle = document.getElementById('authToggle');
        const userInfo = document.getElementById('userInfo');

        if (this.token && this.user) {
            authToggle.style.display = 'none';
            userInfo.style.display = 'flex';
            document.getElementById('userDisplay').textContent = `👤 ${this.user.username}`;
        } else {
            authToggle.style.display = 'inline-block';
            userInfo.style.display = 'none';
        }
    },

    // ===== UTILITIES =====
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    showStatus(elementId, message, type) {
        const el = document.getElementById(elementId);
        if (!el) return;

        el.textContent = message;
        el.className = `status-message ${type}`;
        el.style.display = 'block';

        if (type !== 'loading') {
            setTimeout(() => el.style.display = 'none', 4000);
        }
    },

    showError(message) {
        console.error(message);
        // Optional: Show toast notification
    }
};

// ===== INITIALIZE ON LOAD =====
window.addEventListener('load', () => {
    App.init();
});

// Make global
window.App = App;