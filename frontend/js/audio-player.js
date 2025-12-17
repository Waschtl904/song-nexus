// ============================================================================
// 🎵 AUDIO-PLAYER.JS v8.0 - ES6 MODULE
// Audio Playback Engine mit Waveform + Visualisierung
// ============================================================================

import { getAudioUrl } from './config.js';

export const AudioPlayer = {
    audio: null,
    state: {
        isPlaying: false,
        isPaused: false,
        currentTime: 0,
        duration: 0,
        volume: 80,
        isMuted: false,
        isLooping: false,
        currentTrack: null,
    },
    visualizer: null,
    animationId: null,

    init() {
        console.log('🎵 AudioPlayer initializing...');

        this.audio = new Audio();
        this.audio.crossOrigin = 'anonymous';

        this.setupEventListeners();
        this.setupVisualization();

        console.log('✅ AudioPlayer initialized');
    },

    setupEventListeners() {
        this.audio.addEventListener('play', () => {
            this.state.isPlaying = true;
            this.state.isPaused = false;
            this.updatePlayerUI();
            console.log('▶️ Audio playing');
        });

        this.audio.addEventListener('pause', () => {
            this.state.isPlaying = false;
            this.state.isPaused = true;
            this.updatePlayerUI();
            console.log('⏸️ Audio paused');
        });

        this.audio.addEventListener('ended', () => {
            this.state.isPlaying = false;
            this.state.isPaused = false;
            if (this.state.isLooping) {
                this.audio.currentTime = 0;
                this.audio.play();
            }
            this.updatePlayerUI();
            console.log('🔄 Audio ended');
        });

        this.audio.addEventListener('timeupdate', () => {
            this.state.currentTime = this.audio.currentTime;
            this.updateTimeDisplay();
        });

        this.audio.addEventListener('loadedmetadata', () => {
            this.state.duration = this.audio.duration;
            this.updateTimeDisplay();
            console.log(`📊 Duration: ${this.formatTime(this.state.duration)}`);
        });

        this.audio.addEventListener('error', (e) => {
            console.error('❌ Audio error:', e);
        });
    },

    setupVisualization() {
        const canvas = document.getElementById('playerWaveform');
        if (!canvas) return;

        this.visualizer = canvas.getContext('2d');
        this.drawWaveform();
    },

    loadTrack(track, isPreview = false) {
        try {
            console.log(`🎵 Loading track: ${track.name}`);

            const audioUrl = getAudioUrl(track.audio_filename);
            this.audio.src = audioUrl;

            this.state.currentTrack = track;
            this.state.isPreview = isPreview;

            if (isPreview && track.free_preview_duration) {
                this.state.previewDuration = track.free_preview_duration;
                console.log(`⏱️ Preview mode: ${this.state.previewDuration}s`);
            }

            this.updatePlayerUI();
            console.log(`✅ Track loaded: ${audioUrl}`);
        } catch (err) {
            console.error('❌ Failed to load track:', err);
        }
    },

    play() {
        try {
            if (!this.audio.src) {
                console.warn('⚠️ No track loaded');
                return;
            }

            this.audio.play();
        } catch (err) {
            console.error('❌ Play error:', err);
        }
    },

    pause() {
        this.audio.pause();
    },

    stop() {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.state.isPlaying = false;
        this.state.isPaused = false;
        this.updatePlayerUI();
    },

    setTime(seconds) {
        this.audio.currentTime = Math.min(seconds, this.audio.duration);
    },

    setVolume(percent) {
        const volume = Math.max(0, Math.min(100, percent));
        this.state.volume = volume;
        this.audio.volume = volume / 100;

        const volumeDisplay = document.querySelector('.volume-display');
        if (volumeDisplay) {
            volumeDisplay.textContent = `${volume}%`;
        }

        console.log(`🔊 Volume: ${volume}%`);
    },

    toggleMute() {
        this.state.isMuted = !this.state.isMuted;
        this.audio.muted = this.state.isMuted;

        const muteBtn = document.getElementById('playerMuteBtn');
        if (muteBtn) {
            muteBtn.textContent = this.state.isMuted ? '🔇' : '🔊';
        }

        console.log(`${this.state.isMuted ? '🔇 Muted' : '🔊 Unmuted'}`);
    },

    toggleLoop() {
        this.state.isLooping = !this.state.isLooping;

        const loopBtn = document.getElementById('playerLoopBtn');
        if (loopBtn) {
            loopBtn.classList.toggle('active', this.state.isLooping);
        }

        console.log(`${this.state.isLooping ? '🔄 Loop ON' : '🔄 Loop OFF'}`);
    },

    updatePlayerUI() {
        const playBtn = document.getElementById('playerPlayBtn');
        const pauseBtn = document.getElementById('playerPauseBtn');

        if (this.state.isPlaying) {
            if (playBtn) playBtn.style.display = 'none';
            if (pauseBtn) pauseBtn.style.display = 'inline-block';
        } else {
            if (playBtn) playBtn.style.display = 'inline-block';
            if (pauseBtn) pauseBtn.style.display = 'none';
        }

        const trackName = document.querySelector('.track-name');
        if (trackName && this.state.currentTrack) {
            trackName.textContent = this.state.currentTrack.name;
        }

        const trackArtist = document.querySelector('.track-artist');
        if (trackArtist && this.state.currentTrack) {
            trackArtist.textContent = this.state.currentTrack.artist || 'Unknown Artist';
        }
    },

    updateTimeDisplay() {
        const currentTimeEl = document.getElementById('playerCurrentTime');
        const durationEl = document.getElementById('playerDuration');
        const seekBar = document.getElementById('playerSeekBar');

        if (currentTimeEl) {
            currentTimeEl.textContent = this.formatTime(this.state.currentTime);
        }

        if (durationEl) {
            durationEl.textContent = this.formatTime(this.state.duration);
        }

        if (seekBar) {
            const percent = this.state.duration ? (this.state.currentTime / this.state.duration) * 100 : 0;
            seekBar.value = percent;
        }

        this.drawWaveform();
    },

    formatTime(seconds) {
        if (!seconds || isNaN(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    drawWaveform() {
        if (!this.visualizer) return;

        const canvas = this.visualizer.canvas;
        const ctx = this.visualizer;

        ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.fillStyle = '#20b0a0';
        const barWidth = 4;
        const barGap = 2;
        const numBars = Math.floor(canvas.width / (barWidth + barGap));

        for (let i = 0; i < numBars; i++) {
            const height = Math.random() * canvas.height * 0.8;
            const x = i * (barWidth + barGap);
            const y = (canvas.height - height) / 2;

            ctx.fillRect(x, y, barWidth, height);
        }

        const progress = this.state.duration ? (this.state.currentTime / this.state.duration) * canvas.width : 0;
        ctx.fillStyle = '#ff5459';
        ctx.fillRect(0, 0, progress, canvas.height);
    },

    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.code === 'Space' && e.target === document.body) {
                e.preventDefault();
                if (this.state.isPlaying) {
                    this.pause();
                } else {
                    this.play();
                }
            }

            if (e.code === 'ArrowRight') {
                this.setTime(this.state.currentTime + 5);
            }

            if (e.code === 'ArrowLeft') {
                this.setTime(this.state.currentTime - 5);
            }

            if (e.code === 'ArrowUp') {
                this.setVolume(this.state.volume + 10);
            }

            if (e.code === 'ArrowDown') {
                this.setVolume(this.state.volume - 10);
            }

            if (e.code === 'KeyM') {
                this.toggleMute();
            }

            if (e.code === 'KeyL') {
                this.toggleLoop();
            }
        });

        console.log('✅ Keyboard shortcuts enabled');
    },
};

console.log('✅ AudioPlayer v8.0 loaded - ES6 Module');