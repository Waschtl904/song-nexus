const express = require('express');
const { pool } = require('../server');
const { verifyToken } = require('./auth');

const router = express.Router();

// ============================================================================
// 👤 GET /api/users/profile - User Profile
// ============================================================================

router.get('/profile', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        id, email, username, role, created_at, last_login, is_active
       FROM users 
       WHERE id = $1`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Profile error:', err);
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================================================
// 📊 GET /api/users/stats - User Statistics
// ============================================================================

router.get('/stats', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.id,
        u.username,
        COUNT(DISTINCT p.id) as total_purchases,
        COUNT(DISTINCT ps.id) as total_plays,
        SUM(o.amount) as total_spent,
        MAX(o.completed_at) as last_purchase_date
       FROM users u
       LEFT JOIN purchases p ON u.id = p.user_id
       LEFT JOIN play_stats ps ON u.id = ps.user_id
       LEFT JOIN orders o ON p.order_id = o.id AND o.status = 'COMPLETED'
       WHERE u.id = $1
       GROUP BY u.id, u.username`,
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.json({
        id: req.user.id,
        total_purchases: 0,
        total_plays: 0,
        total_spent: 0,
        last_purchase_date: null,
      });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch user statistics' });
  }
});

// ============================================================================
// 🎵 GET /api/users/purchases - Gekaufte Tracks
// ============================================================================

router.get('/purchases', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        p.id,
        t.id as track_id,
        t.name,
        t.artist,
        t.genre,
        t.price_eur,
        t.audio_filename,
        p.purchased_at,
        p.license_type
       FROM purchases p
       JOIN tracks t ON p.track_id = t.id
       WHERE p.user_id = $1
       ORDER BY p.purchased_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Purchases error:', err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// ============================================================================
// 🎵 GET /api/users/play-history - Recent Plays
// ============================================================================

router.get('/play-history', verifyToken, async (req, res) => {
  try {
    const limit = req.query.limit || 50;
    const result = await pool.query(
      `SELECT 
        ps.id,
        t.id as track_id,
        t.name,
        t.artist,
        t.genre,
        ps.played_at,
        ps.duration_played_seconds,
        (ps.duration_played_seconds > 0) as completed
       FROM play_stats ps
       JOIN tracks t ON ps.track_id = t.id
       WHERE ps.user_id = $1
       ORDER BY ps.played_at DESC
       LIMIT $2`,
      [req.user.id, limit]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Play history error:', err);
    res.status(500).json({ error: 'Failed to fetch play history' });
  }
});

// ============================================================================
// 📊 POST /api/users/track-play - Log a Track Play
// ============================================================================

router.post('/track-play', verifyToken, async (req, res) => {
  try {
    const { track_id, duration_played_seconds, session_id, device_type } = req.body;

    if (!track_id) {
      return res.status(400).json({ error: 'track_id required' });
    }

    // Check ob Track existiert
    const trackCheck = await pool.query('SELECT id FROM tracks WHERE id = $1', [track_id]);
    if (trackCheck.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Check ob User diesen Track gekauft hat
    const isPaidUser = await pool.query(
      'SELECT id FROM purchases WHERE user_id = $1 AND track_id = $2 LIMIT 1',
      [req.user.id, track_id]
    );

    // Log play
    await pool.query(
      `INSERT INTO play_stats 
       (user_id, track_id, duration_played_seconds, session_id, device_type, is_paid_user)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        req.user.id,
        track_id,
        duration_played_seconds || 0,
        session_id || null,
        device_type || 'web',
        isPaidUser.rows.length > 0,
      ]
    );

    res.json({ success: true, message: 'Play logged' });
  } catch (err) {
    console.error('❌ Track play error:', err);
    res.status(500).json({ error: 'Failed to log play' });
  }
});

// ============================================================================
// 👥 GET /api/users/leaderboard - Top Users (Public)
// ============================================================================

router.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        u.username,
        COUNT(DISTINCT p.id) as total_purchases,
        COUNT(DISTINCT ps.id) as total_plays
       FROM users u
       LEFT JOIN purchases p ON u.id = p.user_id
       LEFT JOIN play_stats ps ON u.id = ps.user_id
       GROUP BY u.id, u.username
       HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT ps.id) > 0
       ORDER BY total_purchases DESC, total_plays DESC
       LIMIT 10`,
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;
