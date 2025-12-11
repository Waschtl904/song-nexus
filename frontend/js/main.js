"use strict";

// ============================================================================
// 🎵 SONG-NEXUS MAIN APPLICATION
// ✅ UPDATED: Nutzt APIClient + config.js statt hardcoded URLs
// ============================================================================

const App = {
    tracks: [],
    blogPosts: [],
    token: null,
    user: null,

    /**
     * Gibt die API Base URL zurück (dynamisch aus config.js)
     */
    getApiBase() {
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }
        // Fallback
        return 'https://localhost:3000/api';
    },

    // ===== INITIALIZATION =====
    async init() {
        console.log('🚀 SONG-NEXUS Initializing...');

        // ✅ NEW: Dark Mode Init FIRST (vor allem anderen!)
        this.initDarkMode();

        // ✅ NEW: Get token/user from Auth module (centralized)
        if (typeof Auth !== 'undefined') {
            this.token = Auth.getToken();
            this.user = Auth.getUser();
        } else {
            this.token = localStorage.getItem('auth_token');
            this.user = JSON.parse(localStorage.getItem('user') || 'null');
        }

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

        // ✅ NEW: Verify Magic Link if in URL
        if (typeof Auth !== 'undefined' && Auth.verifyMagicLinkFromUrl) {
            await Auth.verifyMagicLinkFromUrl();
        }

        console.log('✅ App ready!');
    },

    // ✅ NEW: DARK MODE INITIALIZATION
    initDarkMode() {
        document.documentElement.setAttribute('data-color-scheme', 'dark');
        document.documentElement.setAttribute('data-theme', 'dark');
        console.log('🌙 Dark mode initialized');
    },

    // ===== EVENT LISTENERS (CSP-SAFE) =====
    setupEventListeners() {
        // Theme Toggle
        const themeToggle = document.getElementById('themeToggle');
        if (themeToggle) {
            themeToggle.addEventListener('click', (e) => {
                e.preventDefault();
                e.stopPropagation();
                const current = document.documentElement.getAttribute('data-theme') || 'dark';
                const next = current === 'dark' ? 'light' : 'dark';
                document.documentElement.setAttribute('data-theme', next);
                document.documentElement.setAttribute('data-color-scheme', next);
                localStorage.setItem('theme', next);
                this.updateThemeButton(next);
            });
        }

        // Auth Modal Toggle
        const authToggle = document.getElementById('authToggle');
        if (authToggle) {
            authToggle.addEventListener('click', () => this.toggleAuthModal());
        }

        // Modal Close Button
        const modalClose = document.querySelector('.modal-close');
        if (modalClose) {
            modalClose.addEventListener('click', () => this.toggleAuthModal());
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
                if (typeof Auth !== 'undefined') {
                    Auth.login(e);
                }
            });
        }

        // Magic Link Button
        const magicLinkBtn = document.getElementById('magicLinkBtn');
        if (magicLinkBtn) {
            magicLinkBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined') {
                    Auth.loginWithMagicLink();
                }
            });
        }

        // WebAuthn Button (LOGIN)
        const webauthnBtn = document.getElementById('webauthnBtn');
        if (webauthnBtn) {
            webauthnBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined') {
                    Auth.authenticateWithWebAuthn();
                }
            });
        }

        // Register Biometric Button
        const registerBiometricBtn = document.getElementById('registerBiometricBtn');
        if (registerBiometricBtn) {
            registerBiometricBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined') {
                    Auth.registerWithWebAuthn();
                }
            });
        }

        // Dev Login Button
        const devLoginBtn = document.getElementById('devLoginBtn');
        if (devLoginBtn) {
            devLoginBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined') {
                    Auth.devLogin();
                }
            });
        }

        // Logout Button
        const logoutBtn = document.getElementById('logoutBtn');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (typeof Auth !== 'undefined') {
                    Auth.logout();
                } else {
                    this.logout();
                }
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
                });
            });
        }

        // ===== MODAL FOCUS MANAGEMENT =====
        const authModal = document.getElementById('authModal');
        if (authModal) {
            document.addEventListener('keydown', (e) => {
                if (e.key === 'Escape' && authModal.style.display !== 'none') {
                    this.toggleAuthModal();
                    const authToggle = document.getElementById('authToggle');
                    if (authToggle) authToggle.focus();
                }
            });
        }

        console.log('✅ Keyboard navigation setup complete');
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
        }
    },

    // ===== LOAD TRACKS =====
    async loadTracks() {
        try {
            // ✅ NEW: Nutze APIClient statt direktes fetch
            if (typeof APIClient !== 'undefined') {
                this.tracks = await APIClient.getTracks();
            } else {
                const apiBase = this.getApiBase();
                const response = await fetch(`${apiBase}/tracks`);
                if (!response.ok) throw new Error('Failed to load tracks');
                this.tracks = await response.json();
            }

            this.renderTracks();

            const tracksList = document.getElementById('tracksList');
            if (tracksList) {
                tracksList.setAttribute('aria-busy', 'false');
            }

            console.log(`✅ Loaded ${this.tracks.length} tracks`);
        } catch (err) {
            console.error('❌ Load tracks error:', err);
            this.showError('Failed to load tracks');

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

        const featured = this.tracks.slice(0, 3);

        if (featured.length === 0) {
            tracksList.innerHTML = '<div class="card" style="grid-column: 1/-1; text-align: center;"><p style="color: var(--text-secondary);">🎵 No tracks available</p></div>';
            return;
        }

        tracksList.innerHTML = featured.map((track) => `
            <div class="card track-card">
                <div class="track-title">♪ ${this.escapeHtml(track.name)}</div>
                <div class="track-meta">🎤 ${this.escapeHtml(track.artist || 'Unknown')}</div>
                <div class="track-meta">⏱️ ${track.duration || '3:00'}</div>
                
                ${track.is_free ? '' : '<div class="track-badge">🔒 Premium</div>'}
                ${track.is_premium ? '<div class="track-badge">💰 Paid</div>' : '<div class="track-badge" style="background: rgba(0, 204, 119, 0.15); color: var(--accent-teal); border-color: var(--accent-teal);">🆓 Free</div>'}
                
                <button class="button play-track-btn" data-track-id="${track.id}" data-filename="${this.escapeHtml(track.audio_filename)}" data-premium="${track.is_premium}" data-name="${this.escapeHtml(track.name)}" style="width: 100%; margin-top: 12px;" aria-label="Play ${this.escapeHtml(track.name)}">
                    ▶️ ${track.is_premium && !this.token ? '🔊 Preview 40s' : 'Play'}
                </button>
            </div>
        `).join('');

        // Add listeners to play buttons
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
    },

    // ===== PLAY TRACK =====
    async playTrack(trackId, filename, isPremium, trackName) {
        try {
            const track = {
                id: trackId,
                name: trackName,
                audio_filename: filename,
                is_premium: isPremium
            };

            const isPreview = isPremium && !this.token;

            window.AudioPlayer.loadTrack(track, isPreview);
            window.AudioPlayer.play();

            this.updatePlayerDisplay(trackName);

            // ✅ NEW: Log play via APIClient
            if (this.token && typeof APIClient !== 'undefined') {
                APIClient.logPlayEvent(trackId, null).catch(e => console.warn('Play log failed:', e));
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

            const blogList = document.getElementById('blogList');
            if (blogList) {
                blogList.setAttribute('aria-busy', 'false');
            }

            console.log(`✅ Loaded ${this.blogPosts.length} blog posts`);
        } catch (err) {
            console.warn('⚠️ Blog load failed:', err);
            this.renderBlogPosts(true);

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

        const latest = this.blogPosts.slice(0, 4);

        blogList.innerHTML = latest.map(post => `
            <div class="card blog-card" data-slug="${post.slug}" role="button" tabindex="0" aria-label="Read ${this.escapeHtml(post.title)}">
                <div class="blog-card-date">${new Date(post.date).toLocaleDateString()}</div>
                <div class="blog-card-title">${this.escapeHtml(post.title)}</div>
                <div class="blog-card-excerpt">${this.escapeHtml(post.excerpt)}</div>
                <a href="blog/${post.slug}/" class="blog-card-link" aria-hidden="true">Read More →</a>
            </div>
        `).join('');

        document.querySelectorAll('.blog-card').forEach(card => {
            const handleCardClick = () => {
                const slug = card.getAttribute('data-slug');
                window.location.href = `blog/${slug}/`;
            };

            card.addEventListener('click', handleCardClick);
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
                const firstFocusable = modal.querySelector('button, input, a');
                if (firstFocusable) firstFocusable.focus();
            }
        }
    },

    switchTab(tabName, event) {
        if (event) event.preventDefault();

        document.querySelectorAll('.tab-btn').forEach(b => {
            const isActive = b.getAttribute('data-tab') === tabName;
            b.classList.toggle('active', isActive);
            b.setAttribute('aria-selected', isActive);
        });

        document.querySelectorAll('.tab-content').forEach(t => {
            const isActive = t.id === tabName + '-tab';
            t.classList.toggle('active', isActive);
            t.setAttribute('aria-hidden', !isActive);
        });

        console.log(`📑 Switched to tab: ${tabName}`);
    },

    // ===== LOGOUT =====
    logout() {
        if (typeof Auth !== 'undefined') {
            Auth.logout();
        } else {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user');
            this.token = null;
            this.user = null;
            this.updateUI();
        }
    },

    // ===== UI UPDATES =====
    updateUI() {
        const authToggle = document.getElementById('authToggle');
        const userInfo = document.getElementById('userInfo');

        if (this.token && this.user) {
            if (authToggle) authToggle.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                const userDisplay = document.getElementById('userDisplay');
                if (userDisplay) {
                    userDisplay.textContent = `👤 ${this.user.username || this.user.email}`;
                }
            }
        } else {
            if (authToggle) authToggle.style.display = 'inline-block';
            if (userInfo) userInfo.style.display = 'none';
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
    }
};

// ===== INITIALIZE ON LOAD =====
window.addEventListener('load', () => {
    console.log('📄 DOM loaded, initializing App...');
    App.init();
});

// ========================================================================
// 🎮 PLAYER CONTROLS - Button Event Listeners
// ========================================================================

function setupPlayerControls() {
    console.log('🎮 Setting up player controls...');

    const playBtn = document.getElementById('playerPlayBtn');
    if (playBtn) {
        playBtn.addEventListener('click', () => {
            window.AudioPlayer?.play();
        });
    }

    const pauseBtn = document.getElementById('playerPauseBtn');
    if (pauseBtn) {
        pauseBtn.addEventListener('click', () => {
            window.AudioPlayer?.pause();
        });
    }

    const stopBtn = document.getElementById('playerStopBtn');
    if (stopBtn) {
        stopBtn.addEventListener('click', () => {
            window.AudioPlayer?.stop();
        });
    }

    const loopBtn = document.getElementById('playerLoopBtn');
    if (loopBtn) {
        loopBtn.addEventListener('click', () => {
            window.AudioPlayer?.toggleLoop();
        });
    }

    const muteBtn = document.getElementById('playerMuteBtn');
    if (muteBtn) {
        muteBtn.addEventListener('click', () => {
            window.AudioPlayer?.toggleMute();
        });
    }

    const volumeSlider = document.getElementById('playerVolumeSlider');
    if (volumeSlider) {
        volumeSlider.addEventListener('input', (e) => {
            const volume = parseInt(e.target.value);
            window.AudioPlayer?.setVolume(volume);
        });
    }

    const seekBar = document.getElementById('playerSeekBar');
    if (seekBar) {
        seekBar.addEventListener('input', (e) => {
            const percent = parseInt(e.target.value);
            const duration = window.AudioPlayer?.state.duration || 0;
            const seconds = (percent / 100) * duration;
            window.AudioPlayer?.setTime(seconds);
        });
    }

    const minimizeBtn = document.getElementById('playerMinimize');
    const playerContent = document.getElementById('playerContent');
    if (minimizeBtn && playerContent) {
        minimizeBtn.addEventListener('click', () => {
            const isHidden = playerContent.style.display === 'none';
            playerContent.style.display = isHidden ? 'block' : 'none';
            minimizeBtn.textContent = isHidden ? '−' : '+';
        });
    }

    console.log('✅ Player controls setup complete');
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', setupPlayerControls);
} else {
    setupPlayerControls();
}

// Make global
window.App = App;