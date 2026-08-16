const express = require('express');
const { body, validationResult } = require('express-validator');
const fs = require('fs');
const path = require('path');
const { bytesProSekunde } = require('../utils/audio-rate');
const { pool } = require('../db');
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
    let whereClause = 'WHERE is_published = TRUE AND (is_deleted = FALSE OR is_deleted IS NULL)';
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
       WHERE audio_filename = $1
         AND is_deleted = FALSE
         AND is_published = TRUE
       LIMIT 1`,
      [filename]
    );

    if (trackResult.rows.length === 0) {
      // Fail closed. Vorher wurde hier eine 40-Sekunden-Vorschau ausgeliefert
      // ("treating as 40s preview"). Das bedeutete:
      //
      //   - ein nicht veroeffentlichter Track war anhoerbar, sobald man den
      //     Dateinamen kannte
      //   - jede Datei im Audio-Verzeichnis OHNE Datenbankeintrag war
      //     teilweise oeffentlich, etwa ein abgebrochener Upload
      //
      // Wenn die Datenbank einen Track nicht als veroeffentlicht kennt, gibt
      // es keinen Grund, davon irgendetwas auszuliefern. Ein Standardwert,
      // der im Zweifel Daten herausgibt, zeigt in die falsche Richtung.
      console.warn(`⚠️ Kein veroeffentlichter Track zu dieser Datei: ${filename} — 404`);
      return res.status(404).json({ error: 'Audio file not found' });
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
      // Token aus der Kopfzeile ODER dem Cookie.
      //
      // Das Cookie ist hier nicht optional: Der Player laedt ueber ein
      // <audio src="...">-Element, und ein solcher Abruf kann keine
      // Authorization-Kopfzeile mitschicken. Ohne diesen Rueckfall bekaeme
      // ein Kaeufer dauerhaft nur die Vorschau seines eigenen Songs.
      const authHeader = req.headers.authorization || '';
      const cookieToken = req.cookies?.auth_token || '';
      const token = authHeader.startsWith('Bearer ')
        ? authHeader.slice(7)
        : cookieToken;

      console.log(`🔑 Token vorhanden: ${!!token} (${authHeader ? 'Kopfzeile' : cookieToken ? 'Cookie' : 'keines'})`);

      if (token) {
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
        console.log('❌ Kein Token (weder Kopfzeile noch Cookie) - nur 40s Vorschau');
      }
    }

    // Set CORS & Streaming Headers
    const frontendUrl = process.env.FRONTEND_URL || 'https://localhost:5500';
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Access-Control-Allow-Origin', frontendUrl);
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Range, Authorization');
    res.setHeader('Access-Control-Expose-Headers', 'Content-Range, Content-Length, Accept-Ranges');
    // Der Content-Type war fest 'audio/mpeg' — auch bei .wav-Dateien.
    // Zwei deiner Tracks liegen als WAV vor; der Browser bekam eine
    // RIFF/WAVE-Datei als MPEG angekuendigt. Dass dein Browser den
    // Content-Type auswertet, hat er schon einmal gezeigt:
    // "HTTP-Content-Type text/html wird nicht unterstuetzt".
    res.setHeader('Content-Type', audioContentType(filename));
    res.setHeader('Accept-Ranges', 'bytes');

    if (hasFullAccess) {
      console.log(`✅ FULL ACCESS - Streaming complete file`);
      return serveFullFile(filepath, filename, filesize, req.headers.range, res);
    }

    console.log(`🎶 PREVIEW MODE - Streaming 40s preview`);
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
      console.log(`💤 206 Partial Content: bytes ${start}-${end}/${filesize}`);
      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      res.setHeader('Content-Length', filesize);
      res.setHeader('Cache-Control', 'public, max-age=86400');
      console.log(`💤 200 OK: Full file (${(filesize / 1024 / 1024).toFixed(2)} MB)`);
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

// Content-Type nach Dateiendung. Ein falscher Typ laesst den Browser die
// Datei ablehnen, obwohl die Bytes in Ordnung sind.
const AUDIO_TYPEN = {
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.oga': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.aac': 'audio/aac',
  '.flac': 'audio/flac',
  '.opus': 'audio/opus',
  '.webm': 'audio/webm',
};

function audioContentType(filename) {
  const endung = path.extname(String(filename || '')).toLowerCase();
  return AUDIO_TYPEN[endung] || 'application/octet-stream';
}

function servePreview(filepath, filename, track, req, res) {
  try {
    const stat = fs.statSync(filepath);
    const filesize = stat.size;

    // Wie lang darf die Vorschau sein?
    //
    // Vorher stand hier fest 40 Sekunden, obwohl die Spalte
    // free_preview_duration extra dafuer da ist, geladen wird und dann
    // ungenutzt blieb. Jetzt zaehlt der Wert pro Track, mit 40 als Rueckfall.
    const gewuenscht = Number(track && track.free_preview_duration);
    const PREVIEW_SECONDS =
      Number.isFinite(gewuenscht) && gewuenscht > 0 ? gewuenscht : 40;

    // Wie viele Bytes ist eine Sekunde wert?
    //
    // Vorher: filesize / duration_seconds, also vollstaendig abhaengig von
    // einem Wert aus der Datenbank. Stimmte der nicht, stimmte die Vorschau
    // nicht — zu kurz bei zu grosser Dauer, im Grenzfall der ganze Song bei
    // zu kleiner. Die Datenrate steht aber in der Datei selbst.
    const { bytesProSekunde: rate, quelle } = bytesProSekunde(
      filepath,
      filesize,
      track && track.duration_seconds
    );

    // Die Vorschau ist ab hier eine Sache fuer sich: eine Datei von
    // vorschauGroesse Bytes. Nicht ein Ausschnitt aus einer groesseren.
    //
    // Das ist der Kern der Aenderung. Vorher meldete der Server
    //
    //     Content-Range: bytes 0-640600/960931
    //
    // also die volle Dateigroesse als Gesamtlaenge, obwohl nur der vordere
    // Teil kam. Der Browser rechnete daraus eine Spieldauer von knapp vier
    // Minuten, las weiter — und bekam 416 Range Not Satisfiable. Der Ton
    // brach ab, die Anzeige log.
    //
    // Wenn die Gesamtlaenge die Vorschaulaenge ist, passt beides zusammen:
    // die angezeigte Dauer stimmt, und es wird nichts angefordert, was es
    // nicht gibt.
    const vorschauGroesse = Math.max(1, Math.min(filesize, rate * PREVIEW_SECONDS));
    const letztesByte = vorschauGroesse - 1;

    console.log(
      `🎶 Vorschau: ${PREVIEW_SECONDS}s x ${rate} Byte/s (${quelle}) ` +
      `= ${Math.floor(vorschauGroesse / 1024)} KB von ${Math.floor(filesize / 1024)} KB`
    );

    const range = req.headers.range;

    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      let start = parseInt(parts[0], 10);
      let end = parts[1] ? parseInt(parts[1], 10) : letztesByte;

      if (isNaN(start) || start < 0) start = 0;
      if (isNaN(end) || end > letztesByte) end = letztesByte;

      if (start > end || start > letztesByte) {
        // Gesamtlaenge mitgeben, damit der Client weiss, woran er ist.
        res.status(416);
        res.setHeader('Content-Range', `bytes */${vorschauGroesse}`);
        res.end();
        return;
      }

      res.status(206);
      res.setHeader('Content-Range', `bytes ${start}-${end}/${vorschauGroesse}`);
      res.setHeader('Content-Length', end - start + 1);
      res.setHeader('Cache-Control', 'no-store');
      console.log(`💤 206 Vorschau: Bytes ${start}-${end} von ${vorschauGroesse}`);
      fs.createReadStream(filepath, { start, end }).pipe(res);
    } else {
      res.status(206);
      res.setHeader('Content-Range', `bytes 0-${letztesByte}/${vorschauGroesse}`);
      res.setHeader('Content-Length', vorschauGroesse);
      res.setHeader('Cache-Control', 'no-store');
      console.log(`💤 206 Vorschau: Bytes 0-${letztesByte} von ${vorschauGroesse}`);
      fs.createReadStream(filepath, { start: 0, end: letztesByte }).pipe(res);
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
