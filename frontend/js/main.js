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

        // ✅ NEW: Dark Mode Init FIRST (vor allem anderen!)
        this.initDarkMode();

        // Check Auth Status
        this.token = localStorage.getItem('auth_token');
        this.user = JSON.parse(localStorage.getItem('user') || 'null');

        // Init AudioPlayer
        if (window.AudioPlayer) {
            window.AudioPlayer.init();
            window.AudioPlayer.setupKeyboardShortcuts();
            console.log('✅ AudioPlayer initialized');
        }

        // Setup Event Listeners FIRST (before DOM operations)
        this.setupEventListeners();

        // ✅ NEW: Setup Keyboard Navigation for A11y
        this.setupKeyboardNavigation();

        // Load Content
        await Promise.all([
            this.loadTracks(),
            this.loadBlogPosts()
        ]);

        // Update UI
        this.updateUI();

        // Theme Toggle
        this.initTheme();

        console.log('✅ App ready!');
    },

    // ✅ NEW: DARK MODE INITIALIZATION
    initDarkMode() {
        // Force dark mode on load (before any rendering)
        document.documentElement.setAttribute('data-color-scheme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        console.log('🌙 Dark mode initialized');
    },

    // ===== EVENT LISTENERS (CSP-SAFE) =====
    setupEventListeners() {
        // Theme Toggle - CRITICAL: Must work immediately
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                console.log('🌙 Theme toggle clicked');
                const current = document.documentElement.getAttribute('data-theme') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                console.log(`Switching from ${current} to ${next}`);
                document.documentElement.setAttribute('data-theme', next);
                document.documentElement.setAttribute('data-color-scheme', next);
                localStorage.setItem('theme', next);
                this.updateThemeButton(next);
            });
            console.log('✅ Theme toggle listener attached');
        }

        // Auth Modal Toggle
        const authToggle = document.getElementById('authToggle');
        if (authToggle) {
            authToggle.addEventListener('click', () => {
                this.toggleAuthModal();
            });
        }

        // Modal Close Button
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => {
                this.toggleAuthModal();
            });
        }

        // Tab Buttons
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const tabName = btn.getAttribute('data-tab');
                this.switchTab(tabName, e);
            });
        });

        // Password Login Form
        const passwordForm = document.querySelector('form[data-form="password-login"]');
        if (passwordForm) {
            passwordForm.addEventListener('submit', (e) => {
                this.passwordLogin(e);
            });
        }

        // Magic Link Button
        const magicLinkBtn = document.getElementById('magicLinkBtn');
        if (magicLinkBtn) {
            magicLinkBtn.addEventListener('click', () => {
                this.sendMagicLink();
            });
        }

        // WebAuthn Button
        const webauthnBtn = document.getElementById('webauthnBtn');
        if (webauthnBtn) {
            webauthnBtn.addEventListener('click', () => {
                this.webauthnLogin();
            });
        }

        // Register Biometric Button
        const registerBiometricBtn = document.getElementById('registerBiometricBtn');
        if (registerBiometricBtn) {
            registerBiometricBtn.addEventListener('click', () => {
                this.registerBiometric();
            });
        }

        // Toggle Bio Register Modal
        const toggleBioRegisterBtn = document.getElementById('toggleBioRegisterBtn');
        if (toggleBioRegisterBtn) {
            toggleBioRegisterBtn.addEventListener('click', () => {
                this.toggleBioRegister(true);
            });
        }

        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                this.logout();
            });
        }

        console.log('✅ All event listeners attached');
    },

    // ✅ NEW: KEYBOARD NAVIGATION FOR ACCESSIBILITY
    setupKeyboardNavigation() {
        // ===== TAB NAVIGATION (Arrow Keys) =====
        const tabs = document.querySelectorAll('[role="tab"]');
        if (tabs.length > 0) {
            tabs.forEach((tab, index) => {
                tab.addEventListener('keydown', (e) => {
                    let newIndex = index;

                    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
                        e.preventDefault();
                        newIndex = (index + 1) % tabs.length;
                    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
                        e.preventDefault();
                        newIndex = (index - 1 + tabs.length) % tabs.length;
                    } else if (e.key === 'Home') {
                        e.preventDefault();
                        newIndex = 0;
                    } else if (e.key === 'End') {
                        e.preventDefault();
                        newIndex = tabs.length - 1;
                    } else {
                        return;
                    }

                    tabs[newIndex].focus();
                    tabs[newIndex].click();
                    console.log(`📑 Tab navigation: switched to tab ${newIndex}`);
                });
            });
            console.log('✅ Tab keyboard navigation enabled');
        }

        // ===== SLIDER NAVIGATION (Seek Bar Arrow Keys) =====
        const seekBar = document.getElementById('playerSeekBar');
        if (seekBar) {
            seekBar.addEventListener('keydown', (e) => {
                const currentValue = parseInt(seekBar.getAttribute('aria-valuenow')) || 0;
                const step = 5; // 5% per key
                let newValue = currentValue;

                if (e.key === 'ArrowRight') {
                    e.preventDefault();
                    newValue = Math.min(100, currentValue + step);
                } else if (e.key === 'ArrowLeft') {
                    e.preventDefault();
                    newValue = Math.max(0, currentValue - step);
                } else if (e.key === 'Home') {
                    e.preventDefault();
                    newValue = 0;
                } else if (e.key === 'End') {
                    e.preventDefault();
                    newValue = 100;
                } else {
                    return;
                }

                seekBar.setAttribute('aria-valuenow', newValue);
                console.log(`🎚️ Seek bar updated: ${newValue}%`);

                // Dispatch custom event for audio-player.js to handle seek
                if (window.AudioPlayer && window.AudioPlayer.seek) {
                    const duration = window.AudioPlayer.audioElement?.duration || 0;
                    window.AudioPlayer.seek(duration * (newValue / 100));
                }
            });
            console.log('✅ Slider keyboard navigation enabled');
        }

        // ===== MODAL FOCUS MANAGEMENT =====
        const authModal = document.getElementById('authModal');
        if (authModal) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && authModal.style.display !== 'none') {
                    this.toggleAuthModal();
                    const authToggle = document.getElementById('authToggle');
                    if (authToggle) authToggle.focus();
                    console.log('🚪 Modal closed via Escape key');
                }
            });
            console.log('✅ Modal keyboard handling enabled');
        }

        console.log('✅ All keyboard navigation setup complete');
    },

    // ===== THEME MANAGEMENT =====
    initTheme() {
        const savedTheme = localStorage.getItem('theme') || 'dark';
        document.documentElement.setAttribute('data-theme', savedTheme);
        document.documentElement.setAttribute('data-color-scheme', savedTheme);
        this.updateThemeButton(savedTheme);
        console.log(`🎨 Theme initialized: ${savedTheme}`);
    },

    updateThemeButton(theme) {
        const btn = document.getElementById('themeToggle');
        if (btn) {
            btn.textContent = theme === 'dark' ? '☀️' : '🌙';
            btn.setAttribute('aria-pressed', theme === 'dark' ? 'true' : 'false');
            console.log(`🎯 Theme button updated to: ${btn.textContent}`);
        }
    },

    // ===== LOAD TRACKS =====
    async loadTracks() {
        try {
            const response = await fetch(`${this.baseURL}/tracks`);
            if (!response.ok) throw new Error('Failed to load tracks');

            this.tracks = await response.json();
            this.renderTracks();

            // ✅ NEW: Update ARIA busy state
            const tracksList = document.getElementById('tracksList');
            if (tracksList) {
                tracksList.setAttribute('aria-busy', 'false');
            }

            console.log(`✅ Loaded ${this.tracks.length} tracks`);
        } catch (err) {
            console.error('❌ Load tracks error:', err);
            this.showError('Failed to load tracks');

            // ✅ NEW: Update ARIA busy state on error
            const tracksList = document.getElementById('tracksList');
            if (tracksList) {
                tracksList.setAttribute('aria-busy', 'false');
            }
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
                
                <button class="button play-track-btn" data-filename="${this.escapeHtml(track.audio_filename)}" data-premium="${track.is_premium}" data-name="${this.escapeHtml(track.name)}" style="width: 100%; margin-top: 12px;" aria-label="Play ${this.escapeHtml(track.name)}">
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

            // ✅ NEW: Update ARIA busy state
            const blogList = document.getElementById('blogList');
            if (blogList) {
                blogList.setAttribute('aria-busy', 'false');
            }

            console.log(`✅ Loaded ${this.blogPosts.length} blog posts`);
        } catch (err) {
            console.warn('⚠️ Blog load failed:', err);
            this.renderBlogPosts(true); // Show fallback

            // ✅ NEW: Update ARIA busy state on error
            const blogList = document.getElementById('blogList');
            if (blogList) {
                blogList.setAttribute('aria-busy', 'false');
            }
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
            <div class="card blog-card" data-slug="${post.slug}" role="button" tabindex="0" aria-label="Read ${this.escapeHtml(post.title)}">
                <div class="blog-card-date">${new Date(post.date).toLocaleDateString()}</div>
                <div class="blog-card-title">${this.escapeHtml(post.title)}</div>
                <div class="blog-card-excerpt">${this.escapeHtml(post.excerpt)}</div>
                <a href="blog/${post.slug}/" class="blog-card-link" aria-hidden="true">Read More →</a>
            </div>
        `).join('');

        // Add click listeners to blog cards
        document.querySelectorAll('.blog-card').forEach(card => {
            const handleCardClick = () => {
                const slug = card.getAttribute('data-slug');
                window.location.href = `blog/${slug}/`;
            };

            card.addEventListener('click', handleCardClick);

            // ✅ NEW: Keyboard support for blog cards (Enter + Space)
            card.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    handleCardClick();
                }
            });
        });
    },

    // ===== AUTHENTICATION =====
    toggleAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            const isHidden = modal.style.display === 'none';
            modal.style.display = isHidden ? 'flex' : 'none';
            modal.setAttribute('aria-hidden', !isHidden);

            if (isHidden) {
                // Focus first focusable element in modal
                const firstFocusable = modal.querySelector('button, input, a');
                if (firstFocusable) firstFocusable.focus();
            }
        }
    },

    switchTab(tabName, event) {
        if (event) event.preventDefault();

        // Update all tab buttons
        document.querySelectorAll('.tab-btn').forEach(b => {
            const isActive = b.getAttribute('data-tab') === tabName;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive);
        });

        // Update all tab content
        document.querySelectorAll('.tab-content').forEach(t => {
            const isActive = t.id === tabName + '-tab';
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-hidden', !isActive);
        });

        console.log(`📑 Switched to tab: ${tabName}`);
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
        el.setAttribute('role', 'alert');
        el.setAttribute('aria-live', 'polite');

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
    console.log('📄 DOM loaded, initializing App...');
    App.init();
});

// Make global
window.App = App;