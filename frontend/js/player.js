"use strict";

// ============================================================================
// 🎵 PLAYER INTEGRATION – CENTRAL WRAPPER
// ✅ UPDATED: Full integration with APIClient + Auth + AudioPlayer
// ============================================================================

const Player = {
    currentTrack: null,
    isPlaying: false,

    /**
     * Initialize Player module
     */
    init() {
        console.log('🎵 Player module initializing...');

        // Verify dependencies
        if (!window.AudioPlayer) {
            console.error('❌ AudioPlayer not loaded');
            return false;
        }

        if (!window.APIClient) {
            console.warn('⚠️ APIClient not loaded, using fallback');
        }

        console.log('✅ Player module initialized');
        return true;
    },

    /**
     * Load and play a track
     * @param {Object} track - Track object with {id, name, audio_filename, is_premium}
     * @param {boolean} isPreview - Whether to play preview (40s) or full track
     */
    async loadAndPlay(track, isPreview = false) {
        try {
            if (!track || !track.audio_filename) {
                console.error('❌ Invalid track object');
                throw new Error('Track missing audio_filename');
            }

            console.log(`🎵 Loading track: ${track.name} ${isPreview ? '(PREVIEW)' : '(FULL)'}`);

            // Store current track
            this.currentTrack = track;

            // Load into AudioPlayer
            window.AudioPlayer.loadTrack(track, isPreview);

            // Auto-play
            window.AudioPlayer.play();

            // Update UI
            this.updatePlayerUI(track);

            // Log play event (async, don't wait)
            this.logPlayEvent(track.id).catch(err => {
                console.warn('⚠️ Play logging failed:', err);
            });

            console.log(`▶️ Playing: ${track.name}`);
            this.isPlaying = true;

            return true;

        } catch (err) {
            console.error('❌ Load and play error:', err);
            this.showPlayerError(`Failed to play: ${err.message}`);
            return false;
        }
    },

    /**
     * Toggle play/pause
     */
    async togglePlayPause() {
        try {
            if (!window.AudioPlayer.audioElement) {
                console.warn('⚠️ No audio element');
                return;
            }

            if (window.AudioPlayer.audioElement.paused) {
                window.AudioPlayer.play();
                this.isPlaying = true;
                console.log('▶️ Playing');
            } else {
                window.AudioPlayer.pause();
                this.isPlaying = false;
                console.log('⏸️ Paused');
            }
        } catch (err) {
            console.error('❌ Toggle play/pause error:', err);
        }
    },

    /**
     * Log play event to backend (for statistics)
     * @param {number} trackId - Track ID
     * @param {string} token - Optional auth token
     */
    async logPlayEvent(trackId, token = null) {
        try {
            // Use stored token if not provided
            if (!token && typeof Auth !== 'undefined') {
                token = Auth.getToken();
            }

            // Only log if authenticated
            if (!token) {
                console.log('ℹ️ Play not logged (not authenticated)');
                return;
            }

            // Use APIClient if available
            if (typeof APIClient !== 'undefined' && APIClient.logPlayEvent) {
                await APIClient.logPlayEvent(trackId, token);
                console.log('📊 Play logged via APIClient');
                return;
            }

            // Fallback: Direct API call
            const apiBase = this.getApiBase();
            const response = await fetch(`${apiBase}/users/track-play`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ track_id: trackId }),
                credentials: 'include'
            });

            if (!response.ok) {
                console.warn(`⚠️ Play logging failed: ${response.status}`);
                return;
            }

            console.log('📊 Play logged to backend');

        } catch (err) {
            console.warn('⚠️ Play logging error:', err);
        }
    },

    /**
     * Update player UI elements
     * @param {Object} track - Track object
     */
    updatePlayerUI(track) {
        try {
            // Update track name in player
            const trackNameEl = document.querySelector('.track-name');
            if (trackNameEl) {
                trackNameEl.textContent = track.name;
            }

            // Update track info
            const trackArtistEl = document.querySelector('.track-artist');
            if (trackArtistEl) {
                trackArtistEl.textContent = track.artist || 'Unknown Artist';
            }

            // Update cover art if available
            if (track.cover_url) {
                const coverEl = document.querySelector('.player-cover');
                if (coverEl) {
                    coverEl.style.backgroundImage = `url('${track.cover_url}')`;
                }
            }

            // Scroll track name if too long (marquee effect)
            if (trackNameEl && trackNameEl.textContent.length > 30) {
                trackNameEl.classList.add('marquee');
            }

        } catch (err) {
            console.warn('⚠️ UI update error:', err);
        }
    },

    /**
     * Queue next track (for playlist support)
     * @param {Object} track - Track to queue
     */
    queueTrack(track) {
        try {
            if (!track || !track.audio_filename) {
                console.error('❌ Invalid track for queue');
                return false;
            }

            console.log(`📋 Queued track: ${track.name}`);

            // Store in AudioPlayer queue if supported
            if (window.AudioPlayer && window.AudioPlayer.queue) {
                window.AudioPlayer.queue.push(track);
            }

            return true;

        } catch (err) {
            console.error('❌ Queue track error:', err);
            return false;
        }
    },

    /**
     * Skip to next track in queue
     */
    skipNext() {
        try {
            if (window.AudioPlayer && window.AudioPlayer.skipNext) {
                window.AudioPlayer.skipNext();
                console.log('⏭️ Skipped to next track');
                return true;
            }

            console.warn('⚠️ Skip next not supported');
            return false;

        } catch (err) {
            console.error('❌ Skip next error:', err);
            return false;
        }
    },

    /**
     * Skip to previous track
     */
    skipPrevious() {
        try {
            if (window.AudioPlayer && window.AudioPlayer.skipPrevious) {
                window.AudioPlayer.skipPrevious();
                console.log('⏮️ Skipped to previous track');
                return true;
            }

            console.warn('⚠️ Skip previous not supported');
            return false;

        } catch (err) {
            console.error('❌ Skip previous error:', err);
            return false;
        }
    },

    /**
     * Set player volume (0-100)
     * @param {number} volume - Volume level
     */
    setVolume(volume) {
        try {
            const vol = Math.max(0, Math.min(100, volume));

            if (window.AudioPlayer && window.AudioPlayer.setVolume) {
                window.AudioPlayer.setVolume(vol);
                console.log(`🔊 Volume set to ${vol}%`);
                return true;
            }

            console.warn('⚠️ Volume control not supported');
            return false;

        } catch (err) {
            console.error('❌ Set volume error:', err);
            return false;
        }
    },

    /**
     * Seek to position (in seconds)
     * @param {number} seconds - Position in seconds
     */
    seek(seconds) {
        try {
            if (window.AudioPlayer && window.AudioPlayer.seek) {
                window.AudioPlayer.seek(seconds);
                console.log(`⏱️ Seeked to ${seconds.toFixed(1)}s`);
                return true;
            }

            console.warn('⚠️ Seek not supported');
            return false;

        } catch (err) {
            console.error('❌ Seek error:', err);
            return false;
        }
    },

    /**
     * Toggle loop mode
     */
    toggleLoop() {
        try {
            if (window.AudioPlayer && window.AudioPlayer.toggleLoop) {
                window.AudioPlayer.toggleLoop();
                console.log('🔄 Loop toggled');
                return true;
            }

            console.warn('⚠️ Loop control not supported');
            return false;

        } catch (err) {
            console.error('❌ Toggle loop error:', err);
            return false;
        }
    },

    /**
     * Toggle mute
     */
    toggleMute() {
        try {
            if (window.AudioPlayer && window.AudioPlayer.toggleMute) {
                window.AudioPlayer.toggleMute();
                console.log('🔇 Mute toggled');
                return true;
            }

            console.warn('⚠️ Mute control not supported');
            return false;

        } catch (err) {
            console.error('❌ Toggle mute error:', err);
            return false;
        }
    },

    /**
     * Stop playback
     */
    stop() {
        try {
            if (window.AudioPlayer && window.AudioPlayer.stop) {
                window.AudioPlayer.stop();
                this.isPlaying = false;
                console.log('⏹️ Stopped');
                return true;
            }

            console.warn('⚠️ Stop not supported');
            return false;

        } catch (err) {
            console.error('❌ Stop error:', err);
            return false;
        }
    },

    /**
     * Get current playback time
     * @returns {number} Current time in seconds
     */
    getCurrentTime() {
        try {
            if (window.AudioPlayer && window.AudioPlayer.audioElement) {
                return window.AudioPlayer.audioElement.currentTime || 0;
            }
            return 0;
        } catch (err) {
            console.warn('⚠️ Get current time error:', err);
            return 0;
        }
    },

    /**
     * Get total duration
     * @returns {number} Duration in seconds
     */
    getDuration() {
        try {
            if (window.AudioPlayer && window.AudioPlayer.audioElement) {
                return window.AudioPlayer.audioElement.duration || 0;
            }
            return 0;
        } catch (err) {
            console.warn('⚠️ Get duration error:', err);
            return 0;
        }
    },

    /**
     * Show player error message
     * @param {string} message - Error message
     */
    showPlayerError(message) {
        try {
            const errorEl = document.getElementById('playerError');
            if (errorEl) {
                errorEl.textContent = message;
                errorEl.style.display = 'block';
                errorEl.setAttribute('role', 'alert');

                setTimeout(() => {
                    errorEl.style.display = 'none';
                }, 5000);
            } else {
                console.error('❌ Player error:', message);
            }
        } catch (err) {
            console.warn('⚠️ Error display failed:', err);
        }
    },

    /**
     * Get API base URL
     */
    getApiBase() {
        if (typeof window !== 'undefined' && window.songNexusConfig) {
            return window.songNexusConfig.getApiBaseUrl();
        }
        return 'https://localhost:3000/api';
    }
};

// ========================================================================
// INITIALIZE ON LOAD
// ========================================================================
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        console.log('📄 DOM ready, initializing Player module...');
        Player.init();
    });
} else {
    Player.init();
}

// Make global
window.Player = Player;