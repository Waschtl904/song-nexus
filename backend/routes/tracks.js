const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { pool } = require('../server');
const { verifyToken, verifyTokenSync } = require('../middleware/auth-middleware');
const router = express.Router();

// ============================================================================
// 🎵 GET /api/tracks - Public track list with PAGINATION
// ============================================================================

router.get('/', async (req, res) => {
  try {
    // ✅ Parse query parameters with defaults
    const page = parseInt(req.query.page) || 1;
    const limit = Math.min(parseInt(req.query.limit) || 12, 100); // Max 100 per page
    const offset = (page - 1) * limit;
    const search = req.query.search || '';
    const genre = req.query.genre || '';
    const sort = req.query.sort || 'created_at';

    // ✅ Build dynamic WHERE clause
    let whereClause = 'WHERE is_published = TRUE AND is_deleted = FALSE';
    const params = [];

    if (search) {
      whereClause += ` AND (name ILIKE $${params.length + 1} OR artist ILIKE $${params.length + 2})`;
      params.push(`%${search}%`, `%${search}%`);
    }

    if (genre) {
      whereClause += ` AND genre = $${params.length + 1}`;
      params.push(genre);
    }

    // ✅ Validate sort parameter (prevent SQL injection)
    const validSort = {
      'created_at': 'created_at DESC',
      'play_count': 'play_count DESC',
      'name': 'name ASC',
      'artist': 'artist ASC'
    };
    const orderBy = validSort[sort] || 'created_at DESC';

    // ✅ QUERY 1: Get total count
    const countQuery = `SELECT COUNT(*) as total FROM tracks ${whereClause}`;
    const countResult = await pool.query(countQuery, params);
    console.log('🔍 COUNT Query Result:', countResult.rows[0]); // DEBUG
    const total = parseInt(countResult.rows[0].total) || 0;
    if (isNaN(total)) {
      console.warn('⚠️ COUNT returned NaN, using fallback');
    }
    const totalPages = Math.ceil(total / limit);

    // ✅ QUERY 2: Get paginated tracks
    const tracksQuery = `
      SELECT id, name, artist, genre, description, 
             price_eur, duration_seconds, play_count,
             audio_filename, is_free, free_preview_duration,
             created_at
      FROM tracks
      ${whereClause}
      ORDER BY ${orderBy}
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    params.push(limit, offset);

    console.log('📊 Pagination Query:', {
      page,
      limit,
      offset,
      total,
      totalPages,
      sort: orderBy
    });

    const tracksResult = await pool.query(tracksQuery, params);

    // ✅ Return structured response with pagination metadata
    res.json({
      success: true,
      data: tracksResult.rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
        hasMore: offset + limit < total
      },
      metadata: {
        timestamp: new Date().toISOString(),
        search,
        genre,
        sort
      }
    });

    console.log(`✅ Response: ${tracksResult.rows.length} tracks, page ${page}/${totalPages}`);

  } catch (err) {
    console.error('❌ Tracks GET error:', err);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch tracks',
      details: process.env.NODE_ENV === 'development' ? err.message : undefined
    });
  }
});

// ============================================================================
// 🔊 GET /api/tracks/audio/:filename - AUDIO STREAMING (MUST BE BEFORE /:id!)
// ============================================================================

router.get('/audio/:filename', async (req, res) => {
  try {
    console.log('\n========== AUDIO STREAM REQUEST ==========');
    const filename = req.params.filename.replace(/[^a-zA-Z0-9._\-]/g, '');

    if (!filename) {
      console.log('❌ Invalid filename');
      return res.status(400).json({ error: 'Invalid filename' });
    }

    console.log(`📁 Requested file: ${filename}`);
    const filepath = path.join(__dirname, '../public/audio', filename);

    if (!fs.existsSync(filepath)) {
      console.warn(`❌ Audio file not found: ${filepath}`);
      return res.status(404).json({ error: 'Audio file not found' });
    }

    console.log(`✅ File exists: ${filepath}`);

    // Find track record
    const trackResult = await pool.query(
      `SELECT id, is_free, free_preview_duration, duration_seconds
       FROM tracks
       WHERE audio_filename = $1 AND is_deleted = FALSE
       LIMIT 1`,
      [filename]
    );

    if (trackResult.rows.length === 0) {
      console.warn(`⚠️ No track record for audio file: ${filename}`);
      console.log('🎧 No DB record found, treating as 40s preview');
      return servePreview(filepath, filename, null, req, res);
    }

    const track = trackResult.rows[0];
    console.log(`📊 Track found:`, track);
    const stat = fs.statSync(filepath);
    const filesize = stat.size;

    // Check if user has full access
    let hasFullAccess = false;

    // ✅ FREE TRACK: Always full access!
    if (track.is_free === true) {
      hasFullAccess = true;
      console.log('✅ FREE TRACK - Full access for everyone');
    } else {
      // 🔐 PREMIUM TRACK: Check token & purchase
      const authHeader = req.headers.authorization || '';
      console.log(`🔑 Auth header present: ${!!authHeader}`);

      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.slice(7);
        console.log(`🔑 Token present: ${token.substring(0, 20)}...`);

        try {
          const decoded = verifyTokenSync(token);
          const userId = decoded.id || decoded.userId;
          console.log(`👤 User ID from token: ${userId}`);

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

    // Set CORS & Streaming Headers
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', 'https://localhost:5500');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Accept-Ranges', 'bytes');

    if (hasFullAccess) {
      console.log(`✅ FULL ACCESS - Streaming complete file`);
      return serveFullFile(filepath, filename, filesize, req.headers.range, res);
    }

    console.log(`🎧 PREVIEW MODE - Streaming 40s preview`);
    return servePreview(filepath, filename, track, req, res);
  } catch (err) {
    console.error('❌ Audio streaming error:', err);
    res.status(500).json({ error: 'Failed to stream audio', details: err.message });
  }
});

// ============================================================================
// 🎵 GET /api/tracks/:id - SINGLE TRACK (AFTER /audio/:filename!)
// ============================================================================

router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `SELECT
        id, name, artist, genre, description,
        price_eur, play_count, duration_seconds,
        audio_filename, created_at, is_published, is_free, free_preview_duration
       FROM tracks
       WHERE id = $1 AND is_published = TRUE AND is_deleted = FALSE`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Track detail error:', err);
    res.status(500).json({ error: 'Failed to fetch track', details: err.message });
  }
});

// ============================================================================
// HELPER: Serve full file with range support
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
// HELPER: Serve 40 Sekunden Preview
// ============================================================================

function servePreview(filepath, filename, track, req, res) {
  try {
    const stat = fs.statSync(filepath);
    const filesize = stat.size;
    const PREVIEW_SECONDS = 40;
    let avgBytesPerSecond = 128000;

    if (track && track.duration_seconds && track.duration_seconds > 0) {
      avgBytesPerSecond = Math.floor(filesize / track.duration_seconds);
      console.log(`📊 Calculated speed: ${avgBytesPerSecond} bytes/sec`);
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
// 📊 GET /api/tracks/genres/list - Genre Liste
// ============================================================================

router.get('/genres/list', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT genre FROM tracks WHERE is_published = TRUE AND is_deleted = FALSE ORDER BY genre`
    );
    res.json(result.rows.map(r => r.genre));
  } catch (err) {
    console.error('❌ Genres error:', err);
    res.status(500).json({ error: 'Failed to fetch genres' });
  }
});

module.exports = router;

// ============================================================================
// 📖 DATABASE SCHEMA REFERENCE (REAL COLUMNS)
// ============================================================================
/*
TRACKS TABLE (PostgreSQL 18):
- id: integer (PRIMARY KEY)
- name: varchar (REQUIRED)
- artist: varchar (REQUIRED)
- genre: varchar
- description: text
- audio_filename: varchar (REQUIRED)
- price_eur: numeric(10,2) - Default: 0.99
- duration_seconds: integer
- file_size_bytes: bigint
- play_count: integer - Default: 0
- is_published: boolean - Default: false
- is_free: boolean - Default: false
- free_preview_duration: integer - Default: 40
- price: numeric(10,2) - Legacy field - Default: 0.99
- duration: integer - Legacy field - Default: 0
- created_at: timestamp - Default: CURRENT_TIMESTAMP
- updated_at: timestamp - Default: CURRENT_TIMESTAMP
- is_deleted: boolean - Default: false
- deleted_at: timestamp

IMPORTANT:
✅ Use snake_case column names (is_published, audio_filename, etc.)
✅ is_free = true: Free track (no payment required)
✅ is_free = false: Paid track (price_eur applies)
✅ free_preview_duration: Default 40 seconds for preview
✅ Soft delete: is_deleted = true, deleted_at = NOW()
*/