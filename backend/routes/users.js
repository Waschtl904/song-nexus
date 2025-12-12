const express = require('express');
const { pool } = require('../server');
const { verifyToken } = require('../middleware/auth-middleware');
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
        COUNT(DISTINCT ph.id) as total_plays,
        SUM(o.amount) as total_spent,
        MAX(o.completed_at) as last_purchase_date
       FROM users u
       LEFT JOIN purchases p ON u.id = p.user_id
       LEFT JOIN play_history ph ON u.id = ph.user_id
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
        p.id, p.track_id, t.name, t.artist, t.genre, t.price_eur, t.audio_filename,
        p.purchased_at, p.license_type
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
        ph.id,
        t.id as track_id,
        t.name,
        t.artist,
        t.genre,
        ph.played_at,
        ph.duration_played_seconds,
        (ph.duration_played_seconds > 0) as completed
       FROM play_history ph
       JOIN tracks t ON ph.track_id = t.id
       WHERE ph.user_id = $1
       ORDER BY ph.played_at DESC
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
// 👥 GET /api/users/leaderboard - Top Users (Public)
// ============================================================================

router.get('/leaderboard', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        u.username,
        COUNT(DISTINCT p.id) as total_purchases,
        COUNT(DISTINCT ph.id) as total_plays
       FROM users u
       LEFT JOIN purchases p ON u.id = p.user_id
       LEFT JOIN play_history ph ON u.id = ph.user_id
       GROUP BY u.id, u.username
       HAVING COUNT(DISTINCT p.id) > 0 OR COUNT(DISTINCT ph.id) > 0
       ORDER BY total_purchases DESC, total_plays DESC
       LIMIT 10`
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

module.exports = router;

// ============================================================================
// 📖 DATABASE SCHEMA REFERENCE
// ============================================================================
/*
USERS TABLE:
- id: integer (PRIMARY KEY)
- email: varchar (UNIQUE, REQUIRED)
- username: varchar (REQUIRED)
- password_hash: varchar (REQUIRED)
- role: varchar - Default: 'user' (user | admin)
- is_active: boolean - Default: true
- created_at: timestamp - Default: CURRENT_TIMESTAMP
- last_login: timestamp
- updated_at: timestamp - Default: CURRENT_TIMESTAMP
- webauthn_credential: jsonb

PURCHASES TABLE:
- id: integer (PRIMARY KEY)
- user_id: integer (FK → users, REQUIRED)
- track_id: integer (FK → tracks, REQUIRED)
- order_id: integer (FK → orders) - NOW LINKED!
- license_type: varchar - Default: 'personal'
- purchased_at: timestamp - Default: CURRENT_TIMESTAMP
- expires_at: timestamp

PLAY_HISTORY TABLE:
- id: integer (PRIMARY KEY)
- user_id: integer (FK → users, REQUIRED)
- track_id: integer (FK → tracks, REQUIRED)
- played_at: timestamp - Default: CURRENT_TIMESTAMP
- duration_played_seconds: integer

TRACKS TABLE:
- id: integer (PRIMARY KEY)
- name: varchar
- artist: varchar
- price_eur: numeric(10,2)
- audio_filename: varchar
- is_published: boolean
- genre: varchar

IMPORTANT:
✅ Uses play_history table (NOT play_stats)
✅ Purchases linked to orders via order_id
✅ All timestamps in UTC
*/