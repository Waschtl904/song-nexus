const express = require('express');
const { pool } = require('../server');
const auth = require('./auth');

const router = express.Router();

// ============================================================================
// 👤 GET USER PROFILE
// ============================================================================

router.get('/profile', auth.verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, created_at FROM users WHERE id = $1',
      [req.user.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

// ============================================================================
// 📊 GET USER STATS
// ============================================================================

router.get('/stats', auth.verifyToken, async (req, res) => {
  try {
    const statsResult = await pool.query(
      'SELECT COUNT(*) as total_plays, SUM(amount) as total_spent FROM orders WHERE user_id = $1',
      [req.user.id]
    );
    res.json(statsResult.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

module.exports = router;
