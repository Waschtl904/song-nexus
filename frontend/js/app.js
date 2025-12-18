// ============================================================================
// 🎵 APP.JS v8.1 - ES6 MODULE (FIXED - NO DUPLICATE LISTENERS)
// Main Application Controller - imports everything
// ============================================================================

import { Auth } from './auth.js';
import { AudioPlayer } from './audio-player.js';
import { Player } from './player.js';
import { PlayerDraggable } from './player-draggable.js';
import { Tracks } from './tracks.js';
import { TracksLoader } from './tracks-loader.js';
import { UI } from './ui.js';
import { APIClient } from './api-client.js';

export const App = {
  tracks: [],
  blogPosts: [],
  token: null,
  user: null,

  async init() {
    console.log('🚀 SONG-NEXUS Initializing (ES6 Modules)...');

    try {
      // ✅ CRITICAL: Verify Magic Link FIRST
      if (typeof Auth !== 'undefined' && Auth.verifyMagicLinkFromUrl) {
        console.log('🔐 Checking for magic link token in URL...');
        const verified = await Auth.verifyMagicLinkFromUrl();
        if (verified) {
          console.log('✅ Magic link verified - page will reload');
          return;
        }
      }

      // Initialize Dark Mode
      this.initDarkMode();

      // Get token/user from Auth module
      this.token = Auth.getToken();
      this.user = Auth.getUser();

      // Initialize AudioPlayer
      AudioPlayer.init();
      AudioPlayer.setupKeyboardShortcuts();
      console.log('✅ AudioPlayer initialized');

      // Initialize Player
      Player.init();
      console.log('✅ Player module initialized');

      // Initialize PlayerDraggable
      PlayerDraggable.init();
      console.log('✅ PlayerDraggable initialized');

      // Setup UI
      UI.init();
      UI.updateAuthUI();
      console.log('✅ UI initialized');

      // ⚠️ CRITICAL FIX: DO NOT duplicate Auth event listeners!
      // Auth.js ALREADY handles:
      // - Modal toggle button
      // - Modal close button
      // - Tab switching
      // - All form submissions
      // - WebAuthn buttons
      // - Logout button
      // ⚠️ We ONLY setup non-auth related listeners here!

      this.setupEventListeners();

      // Load Tracks with pagination
      this.loadTracksWithPagination();

      // Load Blog Posts
      await this.loadBlogPosts();

      // Update UI
      this.updateUI();

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
    // This is done in renderBlogPosts()

    // ====== OTHER NON-AUTH LISTENERS CAN GO HERE ======

    console.log('✅ All non-auth event listeners attached');
  },

  loadTracksWithPagination() {
    try {
      console.log('🎵 Initializing pagination with TracksLoader...');

      if (!window.tracksLoader) {
        const container = document.getElementById('tracksList');
        if (container) {
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

    console.log('✅ Blog posts rendered');
  },

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
      console.log(`👤 User logged in: ${this.user.email}`);
    } else {
      if (authToggle) authToggle.style.display = 'inline-block';
      if (userInfo) userInfo.style.display = 'none';
      console.log('👤 User logged out');
    }
  },

  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  },
};

console.log('✅ App v8.1 loaded - ES6 Module (NO DUPLICATE LISTENERS)');