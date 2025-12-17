/**
 * 🎵 SONG-NEXUS TracksLoader
 * Pagination + Infinite Scroll für Track-Liste
 * 
 * Verwendet:
 * - GET /api/tracks?page=1&limit=12
 * - Intersection Observer für Infinite Scroll
 * - Dynamic DOM rendering
 */

class TracksLoader {
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
        await this.loadTracks(false); // Initial load
    }

    /**
     * ✅ Load tracks from API with pagination
     * @param {boolean} append - True to append, false to replace
     */
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
            const apiBase = this.getApiBase();
            const queryParams = new URLSearchParams({
                page: this.currentPage,
                limit: this.itemsPerPage,
                sort: this.sortBy
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

            // ✅ Update pagination state
            this.totalPages = result.pagination.totalPages;

            console.log(`✅ Loaded page ${this.currentPage}/${this.totalPages}, ${result.data.length} tracks`);

            // ✅ Render tracks
            if (append) {
                this.addTracksToDOM(result.data);
            } else {
                this.renderTracks(result.data);
            }

            // ✅ Increment page for next load
            this.currentPage++;

        } catch (error) {
            console.error('❌ TracksLoader error:', error);
            this.hasError = true;
            this.showError(error.message);
        } finally {
            this.isLoading = false;
        }
    }

    /**
     * ✅ Replace container with new tracks
     */
    renderTracks(tracks) {
        console.log(`🎨 Rendering ${tracks.length} tracks...`);
        this.container.innerHTML = '';
        this.addTracksToDOM(tracks);
    }

    /**
     * ✅ Append tracks to container
     */
    addTracksToDOM(tracks) {
        if (tracks.length === 0) {
            if (this.currentPage === 1) {
                this.container.innerHTML = '<p class="no-tracks">No tracks found.</p>';
            }
            return;
        }

        tracks.forEach(track => {
            const trackElement = this.createTrackElement(track);
            this.container.appendChild(trackElement);
        });

        console.log(`✅ Added ${tracks.length} track elements to DOM`);
    }

    /**
     * ✅ Create single track card element
     */
    createTrackElement(track) {
        const div = document.createElement('div');
        div.className = 'track-card glass-style';
        div.setAttribute('data-track-id', track.id);

        // ✅ Format duration
        const duration = this.formatDuration(track.duration_seconds || 0);

        // ✅ Price display
        let priceText = '0.99';
        if (track.price_eur) {
            priceText = parseFloat(track.price_eur).toFixed(2);
        }
        const priceDisplay = track.is_free
            ? '<span class="free-badge">FREE</span>'
            : `<span class="price">€${priceText}</span>`;

        // ✅ Play counts
        const playCount = track.play_count || 0;
        const playCountText = playCount > 0 ? `${playCount} plays` : 'New';

        div.innerHTML = `
      <div class="track-header">
        <h3 class="track-name" title="${this.escapeHtml(track.name)}">
          ${this.escapeHtml(track.name)}
        </h3>
        <p class="track-artist" title="${this.escapeHtml(track.artist)}">
          ${this.escapeHtml(track.artist)}
        </p>
      </div>
      
      <div class="track-meta">
        <span class="genre" data-genre="${this.escapeHtml(track.genre)}">
          ${this.escapeHtml(track.genre || 'Unknown')}
        </span>
        <span class="duration">⏱️ ${duration}</span>
      </div>
      
      <div class="track-stats">
        <span class="play-count">🎧 ${playCountText}</span>
      </div>
      
      <div class="track-footer">
        ${priceDisplay}
        <button class="btn-play" data-track-id="${track.id}" aria-label="Play ${track.name}">
          ▶ Play
        </button>
      </div>
    `;

        // ✅ Event Listeners
        const playBtn = div.querySelector('.btn-play');
        if (playBtn) {
            playBtn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log(`▶ Playing track: ${track.name}`);
                if (window.AudioPlayer) {
                    window.AudioPlayer.loadTrack(track.id);
                } else {
                    console.warn('⚠️ AudioPlayer not available');
                }
            });
        }

        return div;
    }

    /**
     * ✅ Setup Intersection Observer for infinite scroll
     */
    setupInfiniteScroll() {
        console.log('👁️ Setting up infinite scroll observer...');

        // Create sentinel element at the end
        const sentinel = document.createElement('div');
        sentinel.className = 'scroll-sentinel';
        sentinel.setAttribute('aria-hidden', 'true');
        this.container.appendChild(sentinel);

        // Create observer
        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting && !this.isLoading && this.currentPage <= this.totalPages) {
                    console.log(`📍 Sentinel visible - loading next page (${this.currentPage}/${this.totalPages})`);
                    this.loadTracks(true); // Append mode
                }
            });
        }, {
            root: null,
            rootMargin: '100px', // Load before user reaches bottom
            threshold: 0.1
        });

        observer.observe(sentinel);
        this.sentinel = sentinel;
        console.log('✅ Infinite scroll observer ready');
    }

    /**
     * ✅ Format seconds to MM:SS
     */
    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    /**
     * ✅ Escape HTML special characters
     */
    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * ✅ Get API base URL
     */
    getApiBase() {
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }
        return 'https://localhost:3000/api';
    }

    /**
     * ✅ Show error message to user
     */
    showError(message) {
        console.error('❌ Error:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = `⚠️ ${message}`;
        this.container.prepend(errorDiv);
    }

    /**
     * ✅ Reset pagination (e.g., after search)
     */
    reset() {
        console.log('🔄 Resetting pagination...');
        this.currentPage = 1;
        this.totalPages = 1;
        this.isLoading = false;
        this.hasError = false;
    }

    /**
     * ✅ Search tracks
     */
    async search(query, genre = '', sort = 'created_at') {
        console.log(`🔍 Searching for: "${query}"`);
        this.searchQuery = query;
        this.selectedGenre = genre;
        this.sortBy = sort;
        this.reset();
        await this.loadTracks(false);
    }
}

// ✅ Export for use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = TracksLoader;
}

console.log('✅ TracksLoader loaded');