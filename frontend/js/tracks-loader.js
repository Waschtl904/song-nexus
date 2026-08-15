// ============================================================================
// 🎵 TRACKS-LOADER.JS v8.9 - FIXED (Play Button Image Positioning)
// ============================================================================

import { APIClient } from './api-client.js';

let designConfig = null;

// ---------------------------------------------------------------------------
// Issue #8: Soft-Launch. Solange der Verkauf nicht freigeschaltet ist, darf
// die Oberfläche keinen Preis versprechen, den man nicht bezahlen kann.
//
// Bewusst mit false vorbelegt und auch im Fehlerfall false: lieber "bald
// verfügbar" anzeigen als einen Kaufpreis, der ins Leere führt. Der
// eigentliche Schutz sitzt ohnehin im Backend (503 PAYMENTS_DISABLED) –
// das hier ist reine Ehrlichkeit gegenüber dem Besucher.
// ---------------------------------------------------------------------------
let paymentsEnabled = false;

async function loadPaymentsConfig() {
    try {
        const config = await APIClient.get('/payments/config');
        paymentsEnabled = config?.payments_enabled === true;
        console.log(
            paymentsEnabled
                ? '💰 Verkauf aktiv'
                : '🔌 Verkauf deaktiviert – Preise werden als "bald verfügbar" angezeigt'
        );
    } catch (err) {
        paymentsEnabled = false;
        console.warn('⚠️ Zahlungs-Config nicht erreichbar, Verkauf gilt als deaktiviert:', err.message);
    }
}

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
                        image_url: '/assets/images/metal-play-button-optimized.webp',
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
        await Promise.all([loadDesignConfig(), loadPaymentsConfig()]);
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
                // Gratis-Tracks sind immer "FREE". Bezahltracks zeigen ihren
                // Preis nur, wenn er auch bezahlbar ist (Issue #8).
                let priceDisplay;
                if (track.is_free) {
                    priceDisplay = 'FREE';
                } else if (paymentsEnabled) {
                    priceDisplay = `€${priceNum.toFixed(2)}`;
                } else {
                    priceDisplay = 'BALD';
                }
                const badgeClass = track.is_free ? 'badge-free' : 'badge-paid';

                console.log(`📊 Track ${track.id}: ${track.name} | Price: ${priceNum} | Free: ${track.is_free}`);

                trackCard.innerHTML = `
          <div class="track-card-wrapper">
            <!-- Header with Title & Info -->
            <div class="track-header">
              <div class="track-info">
                <h3 class="track-title">${this.escapeHtml(track.name || track.title)}</h3>
                ${track.artist && !['Unknown', 'New', 'comp', 'unknown', 'new'].includes(track.artist.trim()) ? `<p class="track-artist">${this.escapeHtml(track.artist)}</p>` : ''}
                <div class="track-meta">
                  <span class="track-duration">${duration}</span>
                  <span class="track-genre">${this.escapeHtml(track.genre || '')}</span>
                </div>
              </div>
            </div>

            <!-- Price & Status -->
            <div class="track-footer">
              <span
                class="track-price ${track.is_free ? 'free' : ''}${!track.is_free && !paymentsEnabled ? ' soon' : ''}"
                ${!track.is_free && !paymentsEnabled ? 'title="Kauf noch nicht freigeschaltet – 40-Sekunden-Vorschau verfügbar"' : ''}
              >${priceDisplay}</span>
            </div>

            <!-- Play Button -->
            <button 
              class="button-metal-play"
              data-track-id="${track.id}"
              aria-label="Play ${this.escapeHtml(track.name || track.title)}"
              title="Play"
              type="button"
            ></button>
          </div>
        `;

                // ✅ FIX: Proper button setup with image loading and positioning
                const playBtn = trackCard.querySelector('.button-metal-play');
                if (playBtn) {
                    // 1. Get image URL from config (absolute path)
                    let imageUrl = '/assets/images/metal-play-button-optimized.webp';
                    if (designConfig?.components?.buttons?.track_play?.image_url) {
                        imageUrl = designConfig.components.buttons.track_play.image_url;
                        // Ensure absolute path
                        if (!imageUrl.startsWith('/') && !imageUrl.startsWith('http')) {
                            imageUrl = '/' + imageUrl.replace(/^\.\//g, '');
                        }
                    }

                    // 2. Set dimensions from config
                    const width = designConfig?.components?.buttons?.track_play?.width || 140;
                    const height = designConfig?.components?.buttons?.track_play?.height || 70;
                    
                    playBtn.style.backgroundImage = `url('${imageUrl}')`;
                    playBtn.style.width = `${width}px`;
                    playBtn.style.height = `${height}px`;
                    playBtn.style.backgroundSize = 'cover';
                    playBtn.style.backgroundRepeat = 'no-repeat';
                    playBtn.style.backgroundPosition = 'center 20%';
                    playBtn.style.backgroundColor = 'transparent';
                    playBtn.style.border = 'none';
                    playBtn.style.padding = '0';
                    playBtn.style.cursor = 'pointer';
                    playBtn.style.display = 'block';
                    playBtn.style.margin = '8px auto 0';
                    playBtn.style.overflow = 'hidden';

                    // Individuelle Abnutzung per Track-ID (deterministisch)
                    // Jeder Track bekommt immer dieselbe Variation, aber anders als andere
                    const id = track.id || 0;
                    const variations = [
                        // hue-rotate, brightness, contrast, saturate, sepia
                        'brightness(0.88) contrast(1.12) saturate(0.80) sepia(0.10)',  // leicht verblasst
                        'brightness(1.05) contrast(0.95) saturate(1.15) hue-rotate(5deg)',  // frisch
                        'brightness(0.82) contrast(1.20) saturate(0.65) sepia(0.22)',  // stark verrostet
                        'brightness(0.95) contrast(1.08) saturate(0.90) hue-rotate(-8deg)',  // kühl
                        'brightness(1.10) contrast(0.90) saturate(1.25) sepia(0.05)',  // poliert
                        'brightness(0.78) contrast(1.25) saturate(0.55) sepia(0.35)',  // alt & abgenutzt
                        'brightness(0.92) contrast(1.05) saturate(1.05) hue-rotate(12deg)',  // warm
                        'brightness(1.02) contrast(1.15) saturate(0.75) sepia(0.15)',  // patina
                    ];
                    playBtn.style.filter = variations[id % variations.length];

                    console.log(`🎬 Play button styled: ${imageUrl} (${width}x${height}) with background-position adjustment`);

                    // 3. Add Click Listener
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