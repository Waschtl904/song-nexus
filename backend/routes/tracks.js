const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { pool } = require('../server');
const { verifyToken } = require('./auth');

const router = express.Router();

// ============================================================================
// 🎵 GET /api/tracks - Liste aller Tracks (Public)
// ============================================================================

router.get('/', async (req, res) => {
  try {
    const { search, genre, limit = 50, offset = 0, sort = 'name' } = req.query;
    let query = 'SELECT id, name, artist, genre, description, price_eur, play_count, is_free, audio_filename FROM tracks WHERE is_published = TRUE';
    const params = [];

    // Search Filter
    if (search) {
      query += ' AND (name ILIKE $' + (params.length + 1) + ' OR artist ILIKE $' + (params.length + 2) + ')';
      params.push(`%${search}%`, `%${search}%`);
    }

    // Genre Filter
    if (genre) {
      query += ' AND genre = $' + (params.length + 1);
      params.push(genre);
    }

    // Sorting
    const validSort = ['name', 'artist', 'created_at', 'play_count'];
    const sortBy = validSort.includes(sort) ? sort : 'name';
    query += ` ORDER BY ${sortBy} ASC`;

    // Pagination
    query += ' LIMIT $' + (params.length + 1) + ' OFFSET $' + (params.length + 2);
    params.push(parseInt(limit), parseInt(offset));

    const result = await pool.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Tracks GET error:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// ============================================================================
// 🎵 GET /api/tracks/:id - Einzelner Track mit Stats
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const result = await pool.query(
      `SELECT 
        id, name, artist, genre, description, 
        price_eur, play_count, duration_seconds, 
        audio_filename, created_at, is_published
       FROM tracks 
       WHERE id = $1 AND is_published = TRUE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Track detail error:', err);
    res.status(500).json({ error: 'Failed to fetch track' });
  }
});

// ============================================================================
// ➕ POST /api/tracks - Create Track (Admin only)
// ============================================================================

router.post('/', verifyToken, [
  body('name').trim().isLength({ min: 1, max: 100 }),
  body('artist').trim().isLength({ min: 1, max: 100 }),
  body('genre').trim().isLength({ min: 1, max: 50 }),
  body('audio_filename').trim().isLength({ min: 1, max: 255 }),
  body('price_eur').isFloat({ min: 0, max: 10000 }).optional(),
  body('duration_seconds').isInt({ min: 0 }).optional(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  // Check Admin Role
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required' });
  }

  const {
    name, artist, genre, description,
    audio_filename, price_eur = 0.99,
    duration_seconds, is_published = false
  } = req.body;

  try {
    // Check ob Audio-Datei existiert
    const audioPath = path.join(__dirname, '../public/audio', audio_filename);
    if (!fs.existsSync(audioPath)) {
      return res.status(400).json({ error: 'Audio file not found in /public/audio' });
    }

    // Get File Size
    const stat = fs.statSync(audioPath);
    const fileSize = stat.size;

    const result = await pool.query(
      `INSERT INTO tracks 
       (name, artist, genre, description, audio_filename, price_eur, duration_seconds, file_size_bytes, is_published)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
       RETURNING *`,
      [name, artist, genre, description, audio_filename, price_eur, duration_seconds, fileSize, is_published]
    );

    console.log(`✅ Track created: ${result.rows[0].id} (${audio_filename})`);
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('❌ Track creation error:', err);
    res.status(500).json({ error: 'Failed to create track' });
  }
});

// ============================================================================
// 🔊 GET /api/tracks/audio/:filename - Audio Streaming (Range Support) - FIXED CORS
// ============================================================================

router.get('/audio/:filename', (req, res) => {
  try {
    // Sanitize filename - verhindert Path Traversal!
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._ \-]/g, '');

    if (!filename) {
      return res.status(400).json({ error: 'Invalid filename' });
    }

    const filepath = path.join(__dirname, '../public/audio', filename);

    // Überprüfe ob Datei existiert
    if (!fs.existsSync(filepath)) {
      console.warn(`⚠️ Audio file not found: ${filename}`);
      return res.status(404).json({ error: 'Audio file not found' });
    }

    // Hole Dateigrößen Info
    const stat = fs.statSync(filepath);
    const filesize = stat.size;

    // ✅ KRITISCHE CORS HEADERS - MUSS VOR ALLEM ANDEREN SEIN!
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');

    // ✅ RANGE REQUEST SUPPORT (für Seeking/Skipping)
    const range = req.headers.range;
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : filesize - 1;

      // Validiere Range
      if (start >= filesize) {
        res.status(416).send('Requested range not satisfiable\n' + start + ' >= ' + filesize);
        return;
      }

      // 206 Partial Content Response
      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${filesize}`);
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', end - start + 1);
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Cache-Control', 'public, max-age=86400');

      console.log(`✅ Streaming range: ${start}-${end}/${filesize} (${filename})`);
      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      // Normales Streaming (kein Range)
      res.setHeader('Content-Type', 'audio/mpeg');
      res.setHeader('Accept-Ranges', 'bytes');
      res.setHeader('Content-Length', filesize);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      console.log(`✅ Streaming full file: ${filename} (${(filesize / 1024 / 1024).toFixed(2)} MB)`);
      fs.createReadStream(filepath).pipe(res);
    }
  } catch (err) {
    console.error('❌ Audio streaming error:', err);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

// ============================================================================
// 📋 GET /api/tracks/audio/list/available - Audio File List (Admin)
// ============================================================================

router.get('/audio/list/available', verifyToken, (req, res) => {
  try {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const audioDir = path.join(__dirname, '../public/audio');

    if (!fs.existsSync(audioDir)) {
      return res.json([]);
    }

    const files = fs.readdirSync(audioDir)
      .filter(file => /\.(mp3|wav|m4a|flac)$/i.test(file))
      .map(file => {
        const filepath = path.join(audioDir, file);
        const stat = fs.statSync(filepath);
        return {
          name: file,
          size: stat.size,
          size_mb: (stat.size / 1024 / 1024).toFixed(2),
          created: stat.birthtime,
        };
      });

    res.json(files);
  } catch (err) {
    console.error('❌ Audio list error:', err);
    res.status(500).json({ error: 'Failed to get audio list' });
  }
});

// ============================================================================
// 📊 GET /api/tracks/genres - Liste aller Genres
// ============================================================================

router.get('/genres/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT genre FROM tracks WHERE is_published = TRUE ORDER BY genre`
    );
    res.json(result.rows.map(r => r.genre));
  } catch (err) {
    console.error('❌ Genres error:', err);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

module.exports = router;