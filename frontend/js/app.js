// ============================================================================
// 🎵 APP.JS v8.4 - ES6 MODULE (COMPLETE & FIXED & CSP-SAFE)
// Main Application Controller - imports everything
// ============================================================================

import { Auth } from './auth.js';
import { AudioPlayer } from './audio-player.js';
import { Player } from './player.js';
import { PlayerDraggable } from './player-draggable.js';
import { TracksLoader } from './tracks-loader.js';
import { UI } from './ui.js';

export const App = {
  tracks: [],
  blogPosts: [],
  token: null,
  user: null,

  async init() {
    console.log('🚀 SONG-NEXUS Initializing (ES6 Modules)...');

    try {
      // ✅ CRITICAL: Initialize Auth FIRST
      // This ensures event listeners are attached and token is loaded
      Auth.init();

      // Get current state
      this.token = Auth.getToken();
      this.user = Auth.getUser();

      // Check Magic Link from URL
      if (Auth.verifyMagicLinkFromUrl) {
        console.log('🔐 Checking for magic link token in URL...');
        const verified = await Auth.verifyMagicLinkFromUrl();
        if (verified) {
          console.log('✅ Magic link verified - page will reload');
          return;
        }
      }

      // Initialize Dark Mode
      this.initDarkMode();

      // Initialize AudioPlayer
      AudioPlayer.init();
      AudioPlayer.setupKeyboardShortcuts();
      console.log('✅ AudioPlayer initialized');

      // Initialize Player UI
      Player.init();
      console.log('✅ Player module initialized');

      // Initialize Draggable Player
      PlayerDraggable.init();
      console.log('✅ PlayerDraggable initialized');

      // Setup UI (Global UI helpers)
      UI.init();
      UI.updateAuthUI(); // Initial check
      console.log('✅ UI initialized');

      // Setup App-specific Listeners (Non-Auth)
      this.setupEventListeners();

      // Load Content
      this.loadTracksWithPagination();
      await this.loadBlogPosts();

      console.log('✅ App ready!');

    } catch (err) {
      console.error('❌ App initialization error:', err);
      UI.showError('Failed to initialize application');
    }
  },

  initDarkMode() {
    document.documentElement.setAttribute('data-color-scheme', 'dark');
    document.documentElement.setAttribute('data-theme', 'dark');
    console.log('🌙 Dark mode initialized');
  },

  setupEventListeners() {
    console.log('🔌 Setting up event listeners (non-auth)...');
    // ====== BLOG CARD CLICKS ======
    // This is done in renderBlogPosts() dynamically

    console.log('✅ All non-auth event listeners attached');
  },

  loadTracksWithPagination() {
    try {
      console.log('🎵 Initializing pagination with TracksLoader...');
      if (!window.tracksLoader) {
        const container = document.getElementById('tracksList');
        if (container) {
          // Make globally available for debugging if needed
          window.TracksLoader = TracksLoader;
          window.tracksLoader = new TracksLoader(container, 12);
          console.log('✅ TracksLoader initialized');
        } else {
          console.warn('⚠️ tracksList container not found');
        }
      }
    } catch (err) {
      console.error('❌ Pagination init error:', err);
      UI.showError('Failed to initialize tracks');
    }
  },

  async loadBlogPosts() {
    try {
      console.log('📝 Loading blog posts...');
      // Pfad relativ zum Frontend root
      const response = await fetch('blog/posts.json');

      if (!response.ok) {
        // Fallback: Manchmal liegt es in assets/ oder einem anderen Pfad
        // Wir werfen Error, um in den catch-Block zu gehen
        throw new Error(`HTTP ${response.status}`);
      }

      this.blogPosts = await response.json();
      this.renderBlogPosts();

      const blogList = document.getElementById('blogList');
      if (blogList) {
        blogList.setAttribute('aria-busy', 'false');
      }
      console.log(`✅ Loaded ${this.blogPosts.length} blog posts`);

    } catch (err) {
      console.warn('⚠️ Blog load failed (posts.json might be missing):', err);
      this.renderBlogPosts(true); // Render empty state

      const blogList = document.getElementById('blogList');
      if (blogList) {
        blogList.setAttribute('aria-busy', 'false');
      }
    }
  },

  renderBlogPosts(error = false) {
    const blogList = document.getElementById('blogList');
    if (!blogList) return;

    if (error || !this.blogPosts || this.blogPosts.length === 0) {
      blogList.innerHTML = `
                <div class="card" style="grid-column: 1/-1; text-align: center; padding: 40px; background: rgba(0,0,0,0.2);">
                    <div style="font-size: 3rem; margin-bottom: 10px;">🚀</div>
                    <h3 style="color: var(--color-primary); margin-bottom: 10px;">Coming Soon</h3>
                    <p style="color: var(--color-text_secondary);">
                        Die neuesten Updates aus der Entwicklung erscheinen hier in Kürze.
                    </p>
                </div>
            `;
      return;
    }

    // 1. HTML generieren (OHNE onclick Attribut - CSP Safe!)
    blogList.innerHTML = this.blogPosts.map(post => `
            <article class="card blog-card" data-id="${post.id}" style="cursor: pointer;">
                <div class="blog-header">
                    <span class="blog-date">${post.date}</span>
                    <span class="blog-tag">${post.tag || 'Update'}</span>
                </div>
                <h3>${post.title}</h3>
                <p>${post.excerpt}</p>
                <div class="blog-footer">
                    <span>Mehr lesen →</span>
                </div>
            </article>
        `).join('');

    // 2. Event Listener sauber via JS anhängen
    const cards = blogList.querySelectorAll('.blog-card');
    cards.forEach(card => {
      card.addEventListener('click', () => {
        const id = card.getAttribute('data-id');
        window.location.href = `blog/article.html?id=${id}`;
      });
    });
  }
};
