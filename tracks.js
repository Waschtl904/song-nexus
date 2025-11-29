const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../server');
const auth = require('./auth');

const router = express.Router();

// ============================================================================
// 🎵 GET ALL TRACKS
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { search, genre, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT id, name, artist, genre, description FROM tracks WHERE 1=1';
    const params = [];

    if (search) {
      query += ' AND (name ILIKE $' + (params.length + 1) + ' OR artist ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    if (genre) {
      query += ' AND genre = $' + (params.length + 1);
      params.push(genre);
    }

    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(limit, offset);

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// ============================================================================
// 🎵 CREATE TRACK (Admin only)
// ============================================================================

router.post('/', auth.verifyToken, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('artist').trim().isLength({ min: 1, max: 100 }),
  body('genre').trim().isLength({ min: 1, max: 50 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { name, artist, genre, description } = req.body;

  try {
    const result = await pool.query(
      'INSERT INTO tracks (name, artist, genre, description) VALUES ($1, $2, $3, $4) RETURNING *',
      [name, artist, genre, description]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create track' });
  }
});

module.exports = router;
