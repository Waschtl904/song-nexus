// ============================================================================
// 🎵 TRACKS-LOADER.JS v8.0 - ES6 CLASS
// Pagination + Infinite Scroll für Track-Liste
// ============================================================================

import { APIClient } from './api-client.js';

export class TracksLoader {
    constructor(containerElement, itemsPerPage = 12) {
        console.log('🎵 TracksLoader initializing...');

        this.container = containerElement;
        this.itemsPerPage = itemsPerPage;
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.hasError = false;
        this.searchQuery = '';
        this.selectedGenre = '';
        this.sortBy = 'created_at';

        this.init();
    }

    async init() {
        console.log('🔄 TracksLoader initializing infinite scroll...');
        this.setupInfiniteScroll();
        await this.loadTracks(false);
    }

    async loadTracks(append = false) {
        // Prevent double-loading
        if (this.isLoading) {
            console.warn('⚠️ Already loading...');
            return;
        }

        // Prevent loading past the end
        if (append && this.currentPage > this.totalPages) {
            console.log('✅ No more pages to load');
            return;
        }

        this.isLoading = true;
        this.hasError = false;

        try {
            const apiBase = APIClient.getApiBase();
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: this.sortBy,
            });

            if (this.searchQuery) {
                queryParams.append('search', this.searchQuery);
            }

            if (this.selectedGenre) {
                queryParams.append('genre', this.selectedGenre);
            }

            const url = `${apiBase}/tracks?${queryParams.toString()}`;
            console.log(`📡 Fetching: ${url}`);

            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json();

            if (!result.success) {
                throw new Error(result.error || 'Unknown API error');
            }

            // Update pagination state
            this.totalPages = result.pagination.totalPages;
            console.log(`✅ Loaded page ${this.currentPage}/${this.totalPages}, ${result.data.length} tracks`);

            // Render tracks
            if (append) {
                this.addTracksToDOM(result.data);
            } else {
                this.renderTracks(result.data);
            }

            // Increment page for next load
            this.currentPage++;
        } catch (error) {
            console.error('❌ TracksLoader error:', error);
            this.hasError = true;
            this.showError(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    renderTracks(tracks) {
        console.log(`🎨 Rendering ${tracks.length} tracks...`);
        this.container.innerHTML = '';
        this.addTracksToDOM(tracks);
    }

    addTracksToDOM(tracks) {
        if (tracks.length === 0) {
            if (this.currentPage === 1) {
                this.container.innerHTML = '<div style="grid-column: 1/-1; text-align: center;"><p>No tracks found.</p></div>';
            }
            return;
        }

        tracks.forEach(track => {
            const trackElement = this.createTrackElement(track);
            this.container.appendChild(trackElement);
        });

        console.log(`✅ Added ${tracks.length} track elements to DOM`);
    }

    createTrackElement(track) {
        const div = document.createElement('div');
        div.className = 'track-card glass-style';
        div.setAttribute('data-track-id', track.id);

        const duration = this.formatDuration(track.duration_seconds || 0);
        const price = track.price_eur ? parseFloat(track.price_eur).toFixed(2) : '0.99';
        const priceDisplay = track.is_free ? 'FREE' : `€${price}`;
        const playCount = track.play_count || 0;
        const playCountText = playCount > 0 ? `${playCount} plays` : 'New';

        div.innerHTML = `
      <div class="track-card-header">
        <h3 class="track-card-title">${this.escapeHtml(track.name)}</h3>
        <span class="track-card-plays">${playCountText}</span>
      </div>
      <div class="track-card-meta">
        <span class="track-card-artist">${this.escapeHtml(track.artist || 'Unknown')}</span>
        <span class="track-card-duration">${duration}</span>
      </div>
      <div class="track-card-price">${priceDisplay}</div>
      <button class="button play-btn" data-track-id="${track.id}" aria-label="Play ${this.escapeHtml(track.name)}">
        ▶️ Play
      </button>
    `;

        // Add play button listener
        const playBtn = div.querySelector('.play-btn');
        playBtn.addEventListener('click', () => {
            if (typeof window.Player !== 'undefined') {
                window.Player.loadAndPlay(track, !window.Auth?.getToken() && track.is_premium);
            }
        });

        return div;
    }

    formatDuration(seconds) {
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    setupInfiniteScroll() {
        if (!('IntersectionObserver' in window)) {
            console.warn('⚠️ IntersectionObserver not supported, infinite scroll disabled');
            return;
        }

        // Create sentinel element
        const sentinel = document.createElement('div');
        sentinel.className = 'tracks-sentinel';
        sentinel.style.height = '50px';
        this.container.appendChild(sentinel);

        // Observe sentinel
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && !this.isLoading && this.currentPage <= this.totalPages) {
                    console.log('📡 Infinite scroll triggered, loading next page...');
                    this.loadTracks(true);
                }
            },
            { threshold: 0.1 }
        );

        observer.observe(sentinel);
        console.log('✅ Infinite scroll observer attached');
    }

    showError(message) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = `❌ ${message}`;
        errorDiv.style.cssText = 'color: var(--error); padding: 16px; text-align: center; width: 100%;';
        this.container.insertAdjacentElement('beforebegin', errorDiv);

        setTimeout(() => errorDiv.remove(), 5000);
    }

    setSortBy(sortKey) {
        this.sortBy = sortKey;
        this.currentPage = 1;
        this.loadTracks(false);
    }

    setGenre(genre) {
        this.selectedGenre = genre;
        this.currentPage = 1;
        this.loadTracks(false);
    }

    search(query) {
        this.searchQuery = query;
        this.currentPage = 1;
        this.loadTracks(false);
    }
}

console.log('✅ TracksLoader v8.0 loaded - ES6 Module');