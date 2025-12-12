// ============================================================================
// 🎵 PLAY HISTORY ROUTES - sing-Nexus v7.0 (FINAL)
// ============================================================================

const express = require('express');
const { pool } = require('../server');
const { verifyToken } = require('../middleware/auth-middleware');
const router = express.Router();

// ============================================================================
// ➕ POST /api/play-history - Log a track play
// ============================================================================

router.post('/', verifyToken, async (req, res) => {
    try {
        const { track_id, duration_played_seconds } = req.body;
        const user_id = req.user.id;

        if (!track_id) {
            return res.status(400).json({ error: 'track_id required' });
        }

        // Check if track exists
        const trackCheck = await pool.query(
            `SELECT id FROM tracks WHERE id = $1`,
            [track_id]
        );

        if (trackCheck.rows.length === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }

        // Insert play history
        const result = await pool.query(
            `INSERT INTO play_history (user_id, track_id, duration_played_seconds, played_at)
       VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
       RETURNING id, user_id, track_id, played_at, duration_played_seconds`,
            [user_id, track_id, duration_played_seconds || null]
        );

        // Update track play count
        await pool.query(
            `UPDATE tracks
       SET play_count = COALESCE(play_count, 0) + 1
       WHERE id = $1`,
            [track_id]
        );

        console.log(`✅ Play history logged: User ${user_id} played Track ${track_id}`);
        res.status(201).json(result.rows[0]);
    } catch (err) {
        // Ignore duplicate key error (same track played same time)
        if (err.code === '23505') {
            return res.status(200).json({ message: 'Already logged' });
        }

        console.error('❌ Play history POST error:', err);
        res.status(500).json({ error: 'Failed to log play history' });
    }
});

// ============================================================================
// 📋 GET /api/play-history/user/:userId - Get user's play history
// ============================================================================

router.get('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;
        const { limit = 50, offset = 0 } = req.query;

        // Security: Users can only see their own history (unless admin)
        if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(
            `SELECT
        ph.id,
        ph.track_id,
        ph.played_at,
        ph.duration_played_seconds,
        t.name,
        t.artist,
        t.audio_filename
       FROM play_history ph
       JOIN tracks t ON ph.track_id = t.id
       WHERE ph.user_id = $1
       ORDER BY ph.played_at DESC
       LIMIT $2 OFFSET $3`,
            [userId, parseInt(limit), parseInt(offset)]
        );

        res.json(result.rows);
    } catch (err) {
        console.error('❌ Play history GET error:', err);
        res.status(500).json({ error: 'Failed to fetch play history' });
    }
});

// ============================================================================
// 🗑️ DELETE /api/play-history/user/:userId - Clear user's play history
// ============================================================================

router.delete('/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Security: Users can only delete their own history (unless admin)
        if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(
            `DELETE FROM play_history WHERE user_id = $1 RETURNING id`,
            [userId]
        );

        console.log(`✅ Play history cleared for user ${userId}: ${result.rowCount} entries deleted`);
        res.json({
            success: true,
            message: 'Play history cleared successfully',
            deleted_count: result.rowCount,
        });
    } catch (err) {
        console.error('❌ Play history DELETE error:', err);
        res.status(500).json({ error: 'Failed to clear play history' });
    }
});

// ============================================================================
// 📊 GET /api/play-history/stats/user/:userId - Get play stats
// ============================================================================
// ⚠️ MUSS AM ENDE sein! Sonst matched /stats/user/:userId vor /user/:userId

router.get('/stats/user/:userId', verifyToken, async (req, res) => {
    try {
        const { userId } = req.params;

        // Security: Users can only see their own stats (unless admin)
        if (req.user.id !== parseInt(userId) && req.user.role !== 'admin') {
            return res.status(403).json({ error: 'Access denied' });
        }

        const result = await pool.query(
            `SELECT
        COUNT(*) as total_plays,
        COUNT(DISTINCT track_id) as unique_tracks,
        SUM(duration_played_seconds) as total_seconds_played,
        MAX(played_at) as last_played,
        MIN(played_at) as first_played
       FROM play_history
       WHERE user_id = $1`,
            [userId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error('❌ Play stats error:', err);
        res.status(500).json({ error: 'Failed to fetch stats' });
    }
});

module.exports = router;

// ============================================================================
// 📖 DATABASE SCHEMA REFERENCE
// ============================================================================
/*
PLAY_HISTORY TABLE (PostgreSQL 18):
- id: integer (PRIMARY KEY)
- user_id: integer (FK → users, REQUIRED)
- track_id: integer (FK → tracks, REQUIRED)
- played_at: timestamp - Default: CURRENT_TIMESTAMP
- duration_played_seconds: integer
- created_at: timestamp - Default: CURRENT_TIMESTAMP

IMPORTANT:
✅ Table name is "play_history" (NOT "play_stats")
✅ Uses CURRENT_TIMESTAMP for played_at
✅ All queries use "play_history" table
✅ Security: Users can only access their own data (unless admin)
✅ Stats route must be LAST to avoid route conflicts
*/