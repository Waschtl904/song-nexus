"use strict";

// ========================================================================
// 🎵 AUDIO PLAYER
// ========================================================================

let audioContext = null;
let audioBuffer = null;
let audioSource = null;
let isPlaying = false;
let currentTime = 0;
let duration = 0;
let startTime = 0;

const Player = {
    async initAudio() {
        if (!currentModalTrack || audioBuffer) return;

        try {
            const trackName = UI.escapeHtml(currentModalTrack.name);
            const response = await fetch(`http://localhost:3000/api/tracks/audio/${encodeURIComponent(trackName)}.mp3`);

            if (!response.ok) {
                throw new Error('Audio file not found');
            }

            const arrayBuffer = await response.arrayBuffer();
            audioContext = audioContext || new (window.AudioContext || window.webkitAudioContext)();
            audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
            duration = audioBuffer.duration;
            console.log('🎵 Audio loaded:', trackName, 'Duration:', duration.toFixed(2) + 's');
        } catch (err) {
            console.warn('Audio load warning:', err);
        }
    },

    async togglePlayTrack() {
        if (!audioBuffer) {
            await this.initAudio();
            return;
        }

        const btn = document.getElementById('modalPlayBtn');

        if (isPlaying) {
            if (audioSource) {
                audioSource.stop();
                audioSource.disconnect();
            }
            isPlaying = false;
            btn.textContent = '▶️';
            console.log('⏸️ Paused');
        } else {
            audioSource = audioContext.createBufferSource();
            audioSource.buffer = audioBuffer;
            audioSource.connect(audioContext.destination);
            audioSource.start(0, currentTime);
            startTime = audioContext.currentTime - currentTime;
            isPlaying = true;
            btn.textContent = '⏸️';
            console.log('▶️ Playing...');

            // Log play event (für Statistik)
            try {
                await APIClient.post('/users/track-play', { track_id: currentModalTrack.id }, token);
            } catch (err) {
                console.warn('Play logging failed:', err);
            }
        }
    }
};

// Make available globally
window.Player = Player;
