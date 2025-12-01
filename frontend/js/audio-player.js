"use strict";

// ========================================================================
// 🎚️ AUDIO PLAYER MODULE (Rust-Steel Cyberpunk Edition)
// ========================================================================

let audioElement = null;
let audioContext = null;
let isPlayerInitialized = false;
let currentTrack = null;
let animationFrameId = null;

const AudioPlayer = {
    state: {
        isPlaying: false,
        isMuted: false,
        isLooping: false,
        currentTime: 0,
        duration: 0,
        volume: 0.8,
    },

    // ===== INITIALIZATION =====
    init() {
        if (isPlayerInitialized) return;

        // Create hidden audio element
        audioElement = document.createElement('audio');
        audioElement.id = 'song-nexus-audio-player';
        audioElement.style.display = 'none';
        document.body.appendChild(audioElement);

        // Audio Context für Waveform
        audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();

        // Event Listeners
        audioElement.addEventListener('timeupdate', () => this.updateTimeDisplay());
        audioElement.addEventListener('loadedmetadata', () => this.updateDuration());
        audioElement.addEventListener('ended', () => this.onTrackEnded());

        isPlayerInitialized = true;
        console.log('🎚️ AudioPlayer initialized');
    },

    // ===== LOAD TRACK =====
    loadTrack(track) {
        currentTrack = track;

        if (!track.audio_filename) {
            console.error('❌ Track has no audio_filename');
            return;
        }

        // ✅ RICHTIG: Nutze audio_filename statt track name
        const audioUrl = `http://localhost:3000/api/tracks/audio/${track.audio_filename}`;

        audioElement.src = audioUrl;
        audioElement.volume = this.state.volume;
        this.state.isLooping = false;

        console.log('🎵 Track loaded:', track.name, '→', audioUrl);
    },

    // ===== PLAY/PAUSE CONTROLS =====
    play() {
        if (!audioElement.src) return;
        audioElement.play();
        this.state.isPlaying = true;
        this.drawWaveform();
        this.updatePlayerUI();
        console.log('▶️ Playing...');
    },

    pause() {
        audioElement.pause();
        this.state.isPlaying = false;
        cancelAnimationFrame(animationFrameId);
        this.updatePlayerUI();
        console.log('⏸️ Paused');
    },

    stop() {
        audioElement.pause();
        audioElement.currentTime = 0;
        this.state.isPlaying = false;
        this.state.currentTime = 0;
        cancelAnimationFrame(animationFrameId);
        this.updateTimeDisplay();
        this.updatePlayerUI();
        console.log('⏹️ Stopped');
    },

    togglePlayPause() {
        this.state.isPlaying ? this.pause() : this.play();
    },

    toggleLoop() {
        this.state.isLooping = !this.state.isLooping;
        audioElement.loop = this.state.isLooping;
        this.updatePlayerUI();
        console.log(this.state.isLooping ? '🔄 Loop ON' : '🔄 Loop OFF');
    },

    toggleMute() {
        this.state.isMuted = !this.state.isMuted;
        audioElement.volume = this.state.isMuted ? 0 : this.state.volume;
        this.updatePlayerUI();
    },

    // ===== SEEK CONTROL =====
    setTime(seconds) {
        if (audioElement.duration && seconds >= 0 && seconds <= audioElement.duration) {
            audioElement.currentTime = seconds;
        }
    },

    seekBy(delta) {
        const newTime = Math.max(0, Math.min(audioElement.duration, audioElement.currentTime + delta));
        this.setTime(newTime);
    },

    // ===== VOLUME CONTROL =====
    setVolume(percent) {
        const volume = Math.max(0, Math.min(1, percent / 100));
        this.state.volume = volume;
        audioElement.volume = volume;
        this.state.isMuted = false;
        this.updatePlayerUI();
    },

    adjustVolume(delta) {
        const newVolume = Math.max(0, Math.min(100, (this.state.volume * 100) + delta));
        this.setVolume(newVolume);
    },

    // ===== TIME FORMATTING =====
    formatTime(seconds) {
        if (!isFinite(seconds)) return '0:00';
        const mins = Math.floor(seconds / 60);
        const secs = Math.floor(seconds % 60);
        return `${mins}:${secs.toString().padStart(2, '0')}`;
    },

    // ===== DISPLAY UPDATES =====
    updateTimeDisplay() {
        this.state.currentTime = audioElement.currentTime;
        const currentEl = document.getElementById('modalCurrentTime');
        const durationEl = document.getElementById('modalDuration');
        const seekBar = document.getElementById('modalSeekBar');

        if (currentEl) {
            currentEl.textContent = this.formatTime(audioElement.currentTime);
        }
        if (durationEl) {
            durationEl.textContent = this.formatTime(audioElement.duration);
        }
        if (seekBar && audioElement.duration) {
            seekBar.value = (audioElement.currentTime / audioElement.duration) * 100;
        }
    },

    updateDuration() {
        this.state.duration = audioElement.duration;
        const durationEl = document.getElementById('modalDuration');
        if (durationEl) {
            durationEl.textContent = this.formatTime(audioElement.duration);
        }
    },

    updatePlayerUI() {
        const playBtn = document.getElementById('modalPlayBtn');
        const pauseBtn = document.getElementById('modalPauseBtn');
        const loopBtn = document.getElementById('modalLoopBtn');
        const volumeSlider = document.getElementById('modalVolumeSlider');

        if (playBtn && pauseBtn) {
            playBtn.style.display = this.state.isPlaying ? 'none' : 'inline-block';
            pauseBtn.style.display = this.state.isPlaying ? 'inline-block' : 'none';
        }
        if (loopBtn) {
            loopBtn.classList.toggle('active', this.state.isLooping);
        }
        if (volumeSlider) {
            volumeSlider.value = this.state.volume * 100;
        }
    },

    // ===== WAVEFORM VISUALIZER =====
    drawWaveform() {
        const canvas = document.getElementById('modalWaveform');
        if (!canvas) return;

        const ctx = canvas.getContext('2d');
        const width = canvas.offsetWidth;
        const height = canvas.offsetHeight;
        canvas.width = width;
        canvas.height = height;

        // Clear
        ctx.fillStyle = 'rgba(0, 0, 0, 0.2)';
        ctx.fillRect(0, 0, width, height);

        // Grid
        ctx.strokeStyle = 'rgba(0, 224, 255, 0.1)';
        ctx.lineWidth = 1;
        for (let i = 0; i < width; i += 20) {
            ctx.beginPath();
            ctx.moveTo(i, 0);
            ctx.lineTo(i, height);
            ctx.stroke();
        }

        // Bars
        const bars = 40;
        const barWidth = width / bars;
        const centerY = height / 2;

        for (let i = 0; i < bars; i++) {
            const barHeight = Math.random() * (height * 0.6) + (height * 0.2);
            const x = i * barWidth;

            const gradient = ctx.createLinearGradient(0, centerY - barHeight / 2, 0, centerY + barHeight / 2);
            gradient.addColorStop(0, 'rgba(0, 224, 255, 0.1)');
            gradient.addColorStop(0.5, 'rgba(50, 184, 198, 0.8)');
            gradient.addColorStop(1, 'rgba(34, 197, 94, 0.3)');

            ctx.fillStyle = gradient;
            ctx.shadowBlur = 10;
            ctx.shadowColor = 'rgba(0, 224, 255, 0.5)';
            ctx.fillRect(x, centerY - barHeight / 2, barWidth - 2, barHeight);
        }

        // Center line
        ctx.strokeStyle = 'rgba(0, 224, 255, 0.5)';
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(0, centerY);
        ctx.lineTo(width, centerY);
        ctx.stroke();

        if (this.state.isPlaying) {
            animationFrameId = requestAnimationFrame(() => this.drawWaveform());
        }
    },

    // ===== EVENT HANDLING =====
    onTrackEnded() {
        if (!this.state.isLooping) {
            this.stop();
            console.log('🎵 Track ended');
        }
    },

    // ===== KEYBOARD SHORTCUTS =====
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            // Only if modal is active
            const modal = document.getElementById('trackModal');
            if (!modal || !modal.classList.contains('active')) return;

            switch (e.key) {
                case ' ':
                    e.preventDefault();
                    this.togglePlayPause();
                    break;
                case 'ArrowLeft':
                    e.preventDefault();
                    this.seekBy(-5);
                    break;
                case 'ArrowRight':
                    e.preventDefault();
                    this.seekBy(5);
                    break;
                case 'ArrowUp':
                    e.preventDefault();
                    this.adjustVolume(10);
                    break;
                case 'ArrowDown':
                    e.preventDefault();
                    this.adjustVolume(-10);
                    break;
                case 'm':
                case 'M':
                    this.toggleMute();
                    break;
                case 'l':
                case 'L':
                    this.toggleLoop();
                    break;
                case '0':
                    this.stop();
                    break;
            }
        });
    },
};

// Global reference
window.AudioPlayer = AudioPlayer;