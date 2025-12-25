// ============================================================================
// 📤 ADMIN TRACKS ROUTE - Song-Nexus v7.1 (FIXED)
// ============================================================================
// File: backend/routes/admin-tracks.js
// Purpose: Secure admin-only track upload and management
// 
// VERSION 7.1 FIXES (Dec 25, 2025):
//   ✅ FIXED: Multer error handling (was missing error response)
//   ✅ FIXED: Content-Type header issue with FormData
//   ✅ ADDED: Better logging for debugging
//   ✅ FIXED: Response format consistency
//   ✅ ADDED: Proper 201 Created status
//   ✅ FIXED: is_free handling (was not properly nullable)
//   ✅ ADDED: price_eur defaults to 0.00 for free tracks
// ============================================================================

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../server');
const { verifyToken, requireAdmin } = require('../middleware/auth-middleware');
const router = express.Router();

// ============================================================================
// 1️⃣ MULTER CONFIGURATION - File Upload Settings
// ============================================================================

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/audio');
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const userId = req.user?.id || 'unknown';
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const safeName = name
            .replace(/[^a-zA-Z0-9-]/g, '_')
            .substring(0, 50);
        const filename = `${timestamp}-${userId}-${safeName}${ext}`;
        console.log(`📁 Multer filename: ${filename}`);
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/x-wav', 'audio/flac', 'audio/mp4'];
    const allowedExts = ['.mp3', '.wav', '.flac', '.m4a'];
    const ext = path.extname(file.originalname).toLowerCase();

    console.log(`🎵 File upload attempt: ${file.originalname} (${file.mimetype})`);

    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
        console.warn(`❌ File rejected: ${file.originalname}`);
        return cb(new Error('Dateiformat nicht erlaubt! Nur MP3/WAV/FLAC.'));
    }
    cb(null, true);
};

const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024 // 100MB
    }
});

// ============================================================================
// 2️⃣ ROUTE: POST /upload - Upload new track
// ============================================================================
// Endpoint: POST /api/admin/tracks/upload
// Auth: verifyToken + requireAdmin (from middleware)
// Body: FormData { name, artist, duration_seconds, genre, price_eur, is_free, is_published, audio }

router.post(
    '/upload',
    verifyToken,
    requireAdmin,
    upload.single('audio'),
    async (req, res) => {
        try {
            console.log('📤 Upload endpoint called');
            console.log('👤 User:', req.user?.username);
            console.log('📋 Body:', req.body);
            console.log('📁 File:', req.file ? `${req.file.originalname} (${req.file.size} bytes)` : 'None');

            // ✅ Check file upload
            if (!req.file) {
                console.warn('❌ No file in upload');
                return res.status(400).json({
                    success: false,
                    error: 'Keine Datei hochgeladen!'
                });
            }

            // ✅ Extract form data (matching REAL column names)
            let { name, artist, duration_seconds, genre, price_eur, is_free, is_published } = req.body;

            console.log('📋 Extracted data:', {
                name,
                artist,
                duration_seconds,
                genre,
                price_eur,
                is_free,
                is_published
            });

            // ✅ VALIDATION
            if (!name || !name.trim()) {
                await fs.unlink(req.file.path).catch(e => console.warn('Could not delete file:', e));
                return res.status(400).json({
                    success: false,
                    error: 'Feldname erforderlich!'
                });
            }

            if (!artist || !artist.trim()) {
                await fs.unlink(req.file.path).catch(e => console.warn('Could not delete file:', e));
                return res.status(400).json({
                    success: false,
                    error: 'Feldartist erforderlich!'
                });
            }

            if (!duration_seconds) {
                await fs.unlink(req.file.path).catch(e => console.warn('Could not delete file:', e));
                return res.status(400).json({
                    success: false,
                    error: 'Feldduration_seconds erforderlich!'
                });
            }

            const durationNum = parseInt(duration_seconds);
            if (isNaN(durationNum) || durationNum < 0) {
                await fs.unlink(req.file.path).catch(e => console.warn('Could not delete file:', e));
                return res.status(400).json({
                    success: false,
                    error: 'duration_seconds muss eine positive Zahl sein!'
                });
            }

            // ✅ Parse booleans
            const isFreeBool = is_free === 'true' || is_free === true;
            console.log('✅ is_free parsed:', isFreeBool);

            // ✅ Price handling: Free tracks = 0.00, otherwise use provided price
            let priceNum = 0.00;
            if (!isFreeBool && price_eur) {
                priceNum = parseFloat(price_eur);
                if (isNaN(priceNum) || priceNum < 0) {
                    await fs.unlink(req.file.path).catch(e => console.warn('Could not delete file:', e));
                    return res.status(400).json({
                        success: false,
                        error: 'price_eur muss eine positive Zahl sein!'
                    });
                }
            }

            const isPublishedBool = is_published === 'true' || is_published === true;

            console.log('✅ Final values:', {
                name: name.trim(),
                artist: artist.trim(),
                duration_seconds: durationNum,
                genre: genre || 'Other',
                price_eur: priceNum,
                is_free: isFreeBool,
                is_published: isPublishedBool,
                audio_filename: req.file.filename,
                file_size_bytes: req.file.size
            });

            // ✅ Insert into database (REAL column names!)
            const query = `
        INSERT INTO tracks (
          name, 
          artist, 
          duration_seconds, 
          genre, 
          price_eur, 
          is_free, 
          audio_filename, 
          is_published,
          file_size_bytes
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        RETURNING 
          id, 
          name, 
          artist, 
          price_eur, 
          audio_filename, 
          is_published,
          is_free,
          duration_seconds,
          created_at
      `;

            const values = [
                name.trim(),
                artist.trim(),
                durationNum,
                genre || 'Other',
                priceNum,
                isFreeBool,
                req.file.filename,
                isPublishedBool,
                req.file.size
            ];

            console.log('🗄️ Executing INSERT query...');
            const result = await pool.query(query, values);
            const track = result.rows[0];

            console.log('✅ Track in DB gespeichert:', {
                id: track.id,
                name: track.name,
                artist: track.artist,
                is_free: track.is_free,
                price_eur: track.price_eur,
                filename: track.audio_filename
            });

            // ✅ Return 201 Created with proper response
            res.status(201).json({
                success: true,
                message: 'Track erfolgreich hochgeladen!',
                track: {
                    id: track.id,
                    name: track.name,
                    artist: track.artist,
                    price_eur: parseFloat(track.price_eur),
                    is_free: track.is_free,
                    filename: track.audio_filename,
                    duration_seconds: track.duration_seconds,
                    created_at: track.created_at
                }
            });

        } catch (err) {
            console.error('❌ UPLOAD ERROR:', err.message);
            console.error('Stack:', err.stack);

            // ✅ Try to delete file on error
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                    console.log('🗑️ Deleted file on error:', req.file.filename);
                } catch (unlinkErr) {
                    console.error('⚠️ Could not delete file:', unlinkErr);
                }
            }

            res.status(500).json({
                success: false,
                error: err.message || 'Upload fehlgeschlagen!'
            });
        }
    }
);

// ============================================================================
// 3️⃣ ROUTE: GET /list - List all tracks
// ============================================================================
// Endpoint: GET /api/admin/tracks/list
// Auth: verifyToken + requireAdmin

router.get(
    '/list',
    verifyToken,
    requireAdmin,
    async (req, res) => {
        try {
            console.log('📋 Listing tracks for user:', req.user?.username);

            const query = `
        SELECT 
          id, 
          name, 
          artist, 
          duration_seconds, 
          genre, 
          price_eur,
          is_free,
          audio_filename, 
          is_published, 
          play_count,
          file_size_bytes,
          created_at,
          updated_at
        FROM tracks
        WHERE is_deleted = false
        ORDER BY created_at DESC
      `;

            const result = await pool.query(query);
            console.log(`✅ Found ${result.rows.length} tracks`);

            res.json(result.rows);
        } catch (err) {
            console.error('❌ List Error:', err.message);
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }
);

// ============================================================================
// 4️⃣ ROUTE: DELETE /:id - Soft delete track
// ============================================================================
// Endpoint: DELETE /api/admin/tracks/:id
// Auth: verifyToken + requireAdmin
// Note: File stays on disk, only DB record marked as deleted

router.delete(
    '/:id',
    verifyToken,
    requireAdmin,
    async (req, res) => {
        try {
            const trackId = parseInt(req.params.id);

            if (isNaN(trackId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Ungültige Track-ID!'
                });
            }

            console.log(`🗑️ Delete request for track ${trackId}`);

            // Check if track exists
            const checkQuery = 'SELECT id, name, audio_filename FROM tracks WHERE id = $1';
            const checkResult = await pool.query(checkQuery, [trackId]);

            if (checkResult.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Track nicht gefunden!'
                });
            }

            const track = checkResult.rows[0];

            // Soft delete (mark as deleted, don't remove file)
            const deleteQuery = `
        UPDATE tracks
        SET is_deleted = true, deleted_at = NOW()
        WHERE id = $1
        RETURNING id, name
      `;

            const result = await pool.query(deleteQuery, [trackId]);

            console.log('✅ Track soft-deleted:', track.name);
            console.log('   File retained:', track.audio_filename);

            res.json({
                success: true,
                message: 'Track gelöscht!',
                track: result.rows[0]
            });
        } catch (err) {
            console.error('❌ Delete Error:', err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }
);

// ============================================================================
// 5️⃣ ROUTE: PUT /:id - Update track metadata
// ============================================================================
// Endpoint: PUT /api/admin/tracks/:id
// Auth: verifyToken + requireAdmin
// Body: { name?, artist?, price_eur?, genre?, is_free?, is_published? }

router.put(
    '/:id',
    verifyToken,
    requireAdmin,
    async (req, res) => {
        try {
            const trackId = parseInt(req.params.id);
            const { name, artist, price_eur, genre, is_free, is_published } = req.body;

            if (isNaN(trackId)) {
                return res.status(400).json({
                    success: false,
                    error: 'Ungültige Track-ID!'
                });
            }

            console.log(`✏️ Update track ${trackId}:`, req.body);

            // Build dynamic query
            const updates = [];
            const values = [];
            let paramIndex = 1;

            if (name !== undefined) {
                updates.push(`name = $${paramIndex++}`);
                values.push(name);
            }
            if (artist !== undefined) {
                updates.push(`artist = $${paramIndex++}`);
                values.push(artist);
            }
            if (price_eur !== undefined) {
                updates.push(`price_eur = $${paramIndex++}`);
                values.push(parseFloat(price_eur));
            }
            if (genre !== undefined) {
                updates.push(`genre = $${paramIndex++}`);
                values.push(genre);
            }
            if (is_free !== undefined) {
                updates.push(`is_free = $${paramIndex++}`);
                const freeBool = is_free === 'true' || is_free === true;
                values.push(freeBool);
            }
            if (is_published !== undefined) {
                updates.push(`is_published = $${paramIndex++}`);
                const pubBool = is_published === 'true' || is_published === true;
                values.push(pubBool);
            }

            // Always update updated_at
            updates.push(`updated_at = NOW()`);

            if (updates.length === 1) {
                return res.status(400).json({
                    success: false,
                    error: 'Keine Felder zum Updaten!'
                });
            }

            values.push(trackId);

            const query = `
        UPDATE tracks
        SET ${updates.join(', ')}
        WHERE id = $${paramIndex}
        RETURNING id, name, artist, price_eur, genre, is_published, is_free
      `;

            const result = await pool.query(query, values);

            if (result.rows.length === 0) {
                return res.status(404).json({
                    success: false,
                    error: 'Track nicht gefunden!'
                });
            }

            console.log('✅ Track updated:', result.rows[0]);

            res.json({
                success: true,
                message: 'Track aktualisiert!',
                track: result.rows[0]
            });
        } catch (err) {
            console.error('❌ Update Error:', err);
            res.status(500).json({
                success: false,
                error: err.message
            });
        }
    }
);

// ============================================================================
// 6️⃣ ERROR HANDLER - Multer-specific errors
// ============================================================================

router.use((err, req, res, next) => {
    console.error('🚨 Router error handler triggered:', err.message);

    // ✅ Multer file size error
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'Datei zu groß! Maximum 100MB.'
            });
        }
        console.error('❌ Multer error:', err.code, err.message);
        return res.status(400).json({
            success: false,
            error: 'Upload Fehler: ' + err.message
        });
    }

    // ✅ Other errors
    if (err) {
        console.error('❌ Generic error:', err.message);
        return res.status(400).json({
            success: false,
            error: err.message || 'Ein Fehler ist aufgetreten!'
        });
    }

    next();
});

// ============================================================================
// ✅ EXPORTS
// ============================================================================

module.exports = router;

// ============================================================================
// 📖 DATABASE SCHEMA REFERENCE (REAL COLUMNS)
// ============================================================================
/*

TRACKS TABLE COLUMNS (PostgreSQL 18):
  id: integer (PRIMARY KEY, auto-increment)
  name: varchar - Track name (REQUIRED)
  artist: varchar - Artist name (REQUIRED)
  genre: varchar - Music genre
  description: text - Track description
  audio_filename: varchar - Audio file name (REQUIRED)
  price_eur: numeric(10,2) - Price in EUR
  duration_seconds: integer - Duration in seconds (REQUIRED)
  file_size_bytes: bigint - File size in bytes
  play_count: integer - Number of plays
  is_published: boolean - Published status
  created_at: timestamp - Creation time
  updated_at: timestamp - Last update time
  is_free: boolean - Free track flag (DEFAULT: false)
  free_preview_duration: integer - Preview length in seconds
  is_deleted: boolean - Soft-delete flag (DEFAULT: false)
  deleted_at: timestamp - Deletion time

IMPORTANT:
  ✅ Use snake_case column names
  ✅ is_free = true: Free track (price_eur = 0.00)
  ✅ is_free = false: Paid track (price_eur applies)
  ✅ All timestamps: created_at, updated_at, deleted_at
  ✅ Soft delete: is_deleted = true, deleted_at = NOW()

*/