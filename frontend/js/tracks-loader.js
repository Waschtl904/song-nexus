// ============================================================================
// 🎵 TRACKS-LOADER.JS v8.7 - FIXED (Price & Type Conversion)
// ============================================================================

import { APIClient } from './api-client.js';

let designConfig = null;

async function loadDesignConfig() {
    try {
        const response = await fetch('./config/design.config.json');
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const contentType = response.headers.get('content-type');
        if (!contentType || !contentType.includes('application/json')) {
            throw new Error(`Invalid content-type: ${contentType}`);
        }
        designConfig = await response.json();
        console.log(`✅ Design config loaded in TracksLoader`);
    } catch (err) {
        console.warn('⚠️ Design config load failed, using defaults:', err.message);
        designConfig = {
            components: {
                buttons: {
                    track_play: {
                        image_url: '../assets/images/metal-play-button-optimized.webp',
                        width: 140,
                        height: 70,
                    }
                }
            }
        };
    }
}

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
        console.log('🔄 TracksLoader initializing...');
        await loadDesignConfig();
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
                this.container.innerHTML = '<div class="no-tracks">🎵 No tracks found.</div>';
            }
            return;
        }

        tracks.forEach((track) => {
            try {
                const trackCard = document.createElement('div');
                trackCard.className = 'track-card';

                // ✅ FIXED: Proper type conversion for all fields
                const duration = this.formatDuration(parseInt(track.duration_seconds) || 0);

                // ✅ CRITICAL FIX: Convert price_eur to number properly
                let priceNum = 0;
                if (track.price_eur !== null && track.price_eur !== undefined) {
                    priceNum = parseFloat(track.price_eur) || 0;
                }
                const priceDisplay = track.is_free ? 'FREE' : `€${priceNum.toFixed(2)}`;
                const badgeClass = track.is_free ? 'badge-free' : 'badge-paid';

                console.log(`📊 Track ${track.id}: ${track.name} | Price: ${priceNum} | Free: ${track.is_free}`);

                trackCard.innerHTML = `
          <div class="track-card-wrapper">
            <!-- Header with Title & Info -->
            <div class="track-header">
              <div class="track-info">
                <h3 class="track-title">${this.escapeHtml(track.name || track.title)}</h3>
                <p class="track-artist">${this.escapeHtml(track.artist || 'Unknown')}</p>
                <div class="track-meta">
                  <span class="track-duration">⏱️ ${duration}</span>
                  <span class="track-genre">${this.escapeHtml(track.genre || 'Other')}</span>
                </div>
              </div>
            </div>

            <!-- Price & Badge -->
            <div class="track-footer">
              <span class="track-price">${priceDisplay}</span>
              <span class="track-badge ${badgeClass}">
                ${track.is_free ? '🎵 FREE' : '💰 PAID'}
              </span>
            </div>

            <!-- Play Button -->
            <button 
              class="play-button button-metal-play"
              data-track-id="${track.id}"
              aria-label="Play ${this.escapeHtml(track.name || track.title)}"
              title="Play"
            ></button>
          </div>
        `;

                // ✅ FIX: Event Listener & Styling
                const playBtn = trackCard.querySelector('.play-button');
                if (playBtn) {
                    // 1. Apply Image from Config
                    if (designConfig && designConfig.components?.buttons?.track_play?.image_url) {
                        playBtn.style.backgroundImage = `url('${designConfig.components.buttons.track_play.image_url}')`;
                    }

                    // 2. Add Click Listener
                    playBtn.addEventListener('click', (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        console.log('▶️ Play clicked for:', track.id, track.name);

                        // Dispatch global event
                        const playEvent = new CustomEvent('track-play-request', {
                            detail: {
                                trackId: track.id,
                                trackData: track
                            },
                            bubbles: true
                        });
                        document.dispatchEvent(playEvent);
                    });
                }

                this.container.appendChild(trackCard);
            } catch (err) {
                console.error('❌ Error rendering track:', track.id, err);
            }
        });

        console.log(`✅ Added ${tracks.length} track elements to DOM`);
    }

    formatDuration(seconds) {
        if (!seconds || seconds < 0) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    }

    setupInfiniteScroll() {
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting && !this.isLoading && this.currentPage <= this.totalPages) {
                        this.loadTracks(true);
                    }
                });
            },
            { rootMargin: '200px' }
        );

        // Create sentinel element
        const sentinel = document.createElement('div');
        sentinel.className = 'infinite-scroll-sentinel';
        this.container.appendChild(sentinel);
        observer.observe(sentinel);
    }

    showError(message) {
        console.error('🚨 Error:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = `❌ Error: ${message}`;
        this.container.appendChild(errorDiv);
    }

    escapeHtml(text) {
        if (!text) return '';
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}