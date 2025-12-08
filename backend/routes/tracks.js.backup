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
    let query = 'SELECT id, name, artist, genre, description, price_eur, play_count, is_free, free_preview_duration, audio_filename, price, duration FROM tracks WHERE is_published = TRUE';
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

    console.log('📊 Query:', query);
    console.log('📊 Params:', params);

    const result = await pool.query(query, params);
    console.log(`✅ Tracks found: ${result.rows.length}`);
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
// 🎵 GET /api/tracks/admin/all - ALLE Tracks (Admin für Dashboard)
// ============================================================================

router.get('/admin/all', verifyToken, async (req, res) => {
  try {
    // ✅ Admin sieht ALLE Tracks (auch unpublished)
    if (req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Admin access required' });
    }

    const result = await pool.query(
      `SELECT 
        id, name, artist, genre, description, 
        price_eur, price, play_count, duration_seconds, duration,
        audio_filename, created_at, is_published, is_free, free_preview_duration
       FROM tracks 
       ORDER BY created_at DESC`
    );

    console.log(`✅ Admin fetched ${result.rows.length} tracks (including unpublished)`);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Admin tracks error:', err);
    res.status(500).json({ error: 'Failed to fetch tracks' });
  }
});

// ============================================================================
// 🔊 GET /api/tracks/audio/:filename - FIXED Audio Streaming mit Authentication
// ============================================================================

router.get('/audio/:filename', async (req, res) => {
  try {
    console.log('\n========== AUDIO STREAM REQUEST ==========');

    // 1. Sanitize filename - verhindert Path Traversal!
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._ \-]/g, '');

    if (!filename) {
      console.log('❌ Invalid filename');
      return res.status(400).json({ error: 'Invalid filename' });
    }

    console.log(`📁 Requested file: ${filename}`);

    const filepath = path.join(__dirname, '../public/audio', filename);

    // 2. Überprüfe ob Datei existiert
    if (!fs.existsSync(filepath)) {
      console.warn(`❌ Audio file not found: ${filepath}`);
      return res.status(404).json({ error: 'Audio file not found' });
    }

    console.log(`✅ File exists: ${filepath}`);

    // 3. 🧠 Track zu diesem Filename finden
    const trackResult = await pool.query(
      `SELECT id, is_free, free_preview_duration, duration_seconds
       FROM tracks
       WHERE audio_filename = $1
       LIMIT 1`,
      [filename]
    );

    if (trackResult.rows.length === 0) {
      console.warn(`⚠️ No track record for audio file: ${filename}`);
      // Fallback: Datei existiert, kein DB-Record → 40s Preview
      console.log('🎧 No DB record found, treating as 40s preview');
      return servePreview(filepath, filename, null, req, res);
    }

    const track = trackResult.rows[0];
    console.log(`📊 Track found:`, track);

    // 4. 🧠 Prüfen ob User vollen Zugriff hat
    let hasFullAccess = false;
    let userId = null;

    // ✅ FREE TRACK: Immer vollen Zugriff!
    if (track.is_free === true) {
      hasFullAccess = true;
      console.log('✅ FREE TRACK - Full access for everyone');
    } else {
      // 🔐 PREMIUM TRACK: Prüfe Token & Purchase
      const authHeader = req.headers.authorization || '';
      console.log(`🔑 Auth header present: ${!!authHeader}`);

      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        console.log(`🔑 Token present: ${token.substring(0, 20)}...`);

        try {
          const decoded = verifyToken(token);
          userId = decoded.id || decoded.userId;
          console.log(`👤 User ID from token: ${userId}`);

          // Prüfe ob User das Track gekauft hat
          const purchaseResult = await pool.query(
            `SELECT 1 FROM purchases
             WHERE user_id = $1 AND track_id = $2
             LIMIT 1`,
            [userId, track.id]
          );

          if (purchaseResult.rows.length > 0) {
            hasFullAccess = true;
            console.log(`✅ User has purchased this track`);
          } else {
            console.log(`❌ User has NOT purchased this track - 40s preview only`);
          }
        } catch (e) {
          console.warn('⚠️ Token verification failed:', e.message);
        }
      } else {
        console.log('❌ No token provided - 40s preview only');
      }
    }

    // 5. 📤 SERVE FILE
    const stat = fs.statSync(filepath);
    const filesize = stat.size;

    // Set CORS & Streaming Headers
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', 'http://localhost:5500');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    // Wenn voller Zugriff → normaler Range-Stream
    if (hasFullAccess) {
      console.log(`✅ FULL ACCESS - Streaming complete file`);
      return serveFullFile(filepath, filename, filesize, req.headers.range, res);
    }

    // Kein voller Zugriff → 40s Preview
    console.log(`🎧 PREVIEW MODE - Streaming 40s preview`);
    return servePreview(filepath, filename, track, req, res);

  } catch (err) {
    console.error('❌ Audio streaming error:', err);
    res.status(500).json({ error: 'Failed to stream audio', details: err.message });
  }
});

// ============================================================================
// HELPER: Streame volle Datei mit Range Support
// ============================================================================

function serveFullFile(filepath, filename, filesize, range, res) {
  try {
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : filesize - 1;

      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end >= filesize) end = filesize - 1;

      if (start > end || start >= filesize) {
        console.warn(`❌ Invalid range: ${start}-${end}/${filesize}`);
        res.status(416).send('Requested range not satisfiable');
        return;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${filesize}`);
      res.setHeader('Content-Length', end - start + 1);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      console.log(`📤 206 Partial Content: bytes ${start}-${end}/${filesize}`);
      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      // No range header → send full file
      res.setHeader('Content-Length', filesize);
      res.setHeader('Cache-Control', 'public, max-age=86400');

      console.log(`📤 200 OK: Full file (${(filesize / 1024 / 1024).toFixed(2)} MB)`);
      fs.createReadStream(filepath).pipe(res);
    }
  } catch (err) {
    console.error('❌ serveFullFile error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Streaming error' });
    }
  }
}

// ============================================================================
// HELPER: Streame 40 Sekunden Preview
// ============================================================================

function servePreview(filepath, filename, track, req, res) {
  try {
    const stat = fs.statSync(filepath);
    const filesize = stat.size;

    // Standard 40 Sekunden Preview
    const PREVIEW_SECONDS = 40;

    // Berechne durchschnittliche Bytes pro Sekunde
    let avgBytesPerSecond = 128000; // ~128 kbps default

    if (track && track.duration_seconds && track.duration_seconds > 0) {
      avgBytesPerSecond = Math.floor(filesize / track.duration_seconds);
      console.log(`📊 Calculated speed: ${avgBytesPerSecond} bytes/sec (from ${filesize} bytes, ${track.duration_seconds}s duration)`);
    }

    const previewBytes = avgBytesPerSecond * PREVIEW_SECONDS;
    const maxPreviewEnd = Math.min(filesize - 1, previewBytes);

    console.log(`🎧 Preview: ~${PREVIEW_SECONDS}s = ~${Math.floor(previewBytes / 1024)} KB`);

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : maxPreviewEnd;

      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end > maxPreviewEnd) end = maxPreviewEnd;

      if (start > end || start >= filesize) {
        res.status(416).send('Requested range not satisfiable');
        return;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${filesize}`);
      res.setHeader('Content-Length', end - start + 1);
      res.setHeader('Cache-Control', 'no-store');

      console.log(`📤 206 Preview: bytes ${start}-${end} (max ${maxPreviewEnd})`);
      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      // No range → send preview from start
      res.status(206);
      res.setHeader('Content-Range', `bytes 0-${maxPreviewEnd}/${filesize}`);
      res.setHeader('Content-Length', maxPreviewEnd + 1);
      res.setHeader('Cache-Control', 'no-store');

      console.log(`📤 206 Preview: bytes 0-${maxPreviewEnd}/${filesize}`);
      fs.createReadStream(filepath, { start: 0, end: maxPreviewEnd }).pipe(res);
    }
  } catch (err) {
    console.error('❌ servePreview error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: 'Preview streaming error' });
    }
  }
}

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