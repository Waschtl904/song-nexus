const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
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
    console.error('Tracks GET error:', err);
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
    console.error('Tracks POST error:', err);
    res.status(500).json({ error: 'Failed to create track' });
  }
});

// ============================================================================
// 🔊 AUDIO STREAMING ENDPOINT (mit Range Request Support)
// ============================================================================

router.get('/audio/:filename', (req, res) => {
  try {
    // Sanitize filename - verhindert Path Traversal Attacks!
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\s-]/g, '');

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

    // ✅ CORS HEADERS - Das ist der FIX!
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
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
    console.error('Audio streaming error:', err);
    res.status(500).json({ error: 'Failed to stream audio' });
  }
});

// ============================================================================
// 📋 GET AUDIO FILE LIST (für Admin Dashboard später)
// ============================================================================

router.get('/audio/list/available', (req, res) => {
  try {
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
    console.error('Audio list error:', err);
    res.status(500).json({ error: 'Failed to get audio list' });
  }
});

module.exports = router;