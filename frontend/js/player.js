// ============================================================================
// 🎮 PLAYER.JS v8.0 - ES6 MODULE
// Player State Management + Track Loading
// ============================================================================

import { AudioPlayer } from './audio-player.js';
import { Auth } from './auth.js';
import { APIClient } from './api-client.js';

export const Player = {
    currentTrack: null,
    isPreview: false,

    init() {
        console.log('🎮 Player module initializing...');
        this.setupControls();
        console.log('✅ Player initialized');
    },

    setupControls() {
        const playBtn = document.getElementById('playerPlayBtn');
        if (playBtn) {
            playBtn.addEventListener('click', () => this.play());
        }

        const pauseBtn = document.getElementById('playerPauseBtn');
        if (pauseBtn) {
            pauseBtn.addEventListener('click', () => this.pause());
        }

        const stopBtn = document.getElementById('playerStopBtn');
        if (stopBtn) {
            stopBtn.addEventListener('click', () => this.stop());
        }

        const loopBtn = document.getElementById('playerLoopBtn');
        if (loopBtn) {
            loopBtn.addEventListener('click', () => this.toggleLoop());
        }

        const muteBtn = document.getElementById('playerMuteBtn');
        if (muteBtn) {
            muteBtn.addEventListener('click', () => this.toggleMute());
        }

        const volumeSlider = document.getElementById('playerVolumeSlider');
        if (volumeSlider) {
            volumeSlider.addEventListener('input', (e) => {
                this.setVolume(parseInt(e.target.value));
            });
        }

        const seekBar = document.getElementById('playerSeekBar');
        if (seekBar) {
            seekBar.addEventListener('input', (e) => {
                const duration = AudioPlayer.state.duration || 0;
                const percent = parseInt(e.target.value);
                const seconds = (percent / 100) * duration;
                this.setTime(seconds);
            });
        }
    },

    async loadAndPlay(track, isPreview = false) {
        try {
            console.log(`🎵 Loading and playing: ${track.name}`);

            this.currentTrack = track;
            this.isPreview = isPreview;

            AudioPlayer.loadTrack(track, isPreview);
            AudioPlayer.play();

            if (Auth.isAuthenticated()) {
                await APIClient.logPlayEvent(track.id, null).catch(e => {
                    console.warn('⚠️ Play event log failed:', e);
                });
            }

            console.log(`✅ Playing: ${track.name} ${isPreview ? '(PREVIEW)' : '(FULL)'}`);
        } catch (err) {
            console.error('❌ Load and play error:', err);
        }
    },

    play() {
        if (AudioPlayer.audio.src) {
            AudioPlayer.play();
        }
    },

    pause() {
        AudioPlayer.pause();
    },

    stop() {
        AudioPlayer.stop();
    },

    setTime(seconds) {
        AudioPlayer.setTime(seconds);
    },

    setVolume(percent) {
        AudioPlayer.setVolume(percent);
    },

    toggleMute() {
        AudioPlayer.toggleMute();
    },

    toggleLoop() {
        AudioPlayer.toggleLoop();
    },

    getCurrentTrack() {
        return this.currentTrack;
    },

    getState() {
        return AudioPlayer.state;
    },
};

console.log('✅ Player v8.0 loaded - ES6 Module');