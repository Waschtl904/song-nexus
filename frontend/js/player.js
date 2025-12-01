"use strict";

// ========================================================================
// 🎵 PLAYER INTEGRATION – MINIMAL WRAPPER
// ========================================================================

const Player = {
    async togglePlayTrack() {
        if (!currentModalTrack) {
            console.error('❌ No track selected');
            return;
        }

        try {
            // Initialize AudioPlayer if not already done
            if (!window.AudioPlayer || !window.AudioPlayer.state) {
                console.error('❌ AudioPlayer not initialized');
                return;
            }

            // ✅ Load track with CORRECT audio_filename
            if (!currentModalTrack.audio_filename) {
                console.error('❌ Track has no audio_filename');
                return;
            }

            window.AudioPlayer.loadTrack(currentModalTrack);
            window.AudioPlayer.togglePlayPause();

            // Log play event (für Statistik)
            try {
                await APIClient.post('/users/track-play', { track_id: currentModalTrack.id }, token);
                console.log('📊 Play logged for track:', currentModalTrack.name);
            } catch (err) {
                console.warn('Play logging failed:', err);
            }
        } catch (err) {
            console.error('❌ Play error:', err);
        }
    }
};

// Make available globally
window.Player = Player;