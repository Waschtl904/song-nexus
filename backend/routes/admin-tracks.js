// ============================================================================
// 📤 ADMIN TRACKS ROUTE - Song-Nexus v7.0 (COMPLETE REWRITE)
// ============================================================================
// File: backend/routes/admin-tracks.js
// Purpose: Secure admin-only track upload and management
// Features:
//   - JWT Token Verification (via centralized middleware)
//   - Admin-Role Check (via centralized middleware)
//   - Multer File Upload (MP3/WAV, max 100MB)
//   - Input Validation
//   - Support for FREE & PAID tracks
//   - Soft-Delete (DB only, files stay)
//   - Error Handling
//
// VERSION 7.0 CHANGES (Dec 12, 2025):
//   - CORRECTED: All column names match REAL PostgreSQL schema
//   - FIXED: priceeur → price_eur
//   - FIXED: audiofilename → audio_filename
//   - FIXED: duration → duration_seconds
//   - FIXED: ispublished → is_published
//   - FIXED: isdeleted → is_deleted
//   - FIXED: deletedat → deleted_at
//   - FIXED: createdat → created_at
//   - ADDED: Support for is_free tracks
//   - ADDED: file_size_bytes tracking
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
        const userId = req.user.id;
        const ext = path.extname(file.originalname);
        const name = path.basename(file.originalname, ext);
        const safeName = name
            .replace(/[^a-zA-Z0-9-]/g, '_')
            .substring(0, 50);
        const filename = `${timestamp}-${userId}-${safeName}${ext}`;
        cb(null, filename);
    }
});

const fileFilter = (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/x-wav'];
    const allowedExts = ['.mp3', '.wav'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
        return cb(new Error('Dateiformat nicht erlaubt! Nur MP3/WAV.'));
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
            // Check file upload
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Keine Datei hochgeladen!'
                });
            }

            console.log('✅ Upload gestartet:', {
                filename: req.file.filename,
                size: req.file.size,
                user: req.user.username
            });

            // Extract form data (matching REAL column names)
            const { name, artist, duration_seconds, genre, price_eur, is_free, is_published } = req.body;

            // Validation
            if (!name || !artist || !duration_seconds || price_eur === undefined) {
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'Felder erforderlich: name, artist, duration_seconds, price_eur'
                });
            }

            const durationNum = parseInt(duration_seconds);
            const priceNum = parseFloat(price_eur);

            if (isNaN(durationNum) || durationNum < 0) {
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'duration_seconds muss eine positive Zahl sein!'
                });
            }

            if (isNaN(priceNum) || priceNum < 0) {
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'price_eur muss eine positive Zahl sein!'
                });
            }

            // Parse booleans
            const isFreeBool = is_free === 'true' || is_free === true;
            const isPublishedBool = is_published === 'true' || is_published === true;

            // Insert into database (REAL column names!)
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
          duration_seconds
      `;

            const values = [
                name,
                artist,
                durationNum,
                genre || 'Other',
                priceNum,
                isFreeBool,               // is_free: can be true or false
                req.file.filename,        // audio_filename
                isPublishedBool,          // is_published
                req.file.size             // file_size_bytes
            ];

            const result = await pool.query(query, values);
            const track = result.rows[0];

            console.log('✅ Track in DB gespeichert:', {
                id: track.id,
                name: track.name,
                artist: track.artist,
                is_free: track.is_free,
                price_eur: track.price_eur
            });

            res.status(201).json({
                success: true,
                message: 'Track erfolgreich hochgeladen!',
                track: {
                    id: track.id,
                    name: track.name,
                    artist: track.artist,
                    price_eur: track.price_eur,
                    is_free: track.is_free,
                    filename: track.audio_filename,
                    duration_seconds: track.duration_seconds
                }
            });
        } catch (err) {
            console.error('❌ Upload Fehler:', err.message);
            if (req.file) {
                try {
                    await fs.unlink(req.file.path);
                } catch (unlinkErr) {
                    console.error('Konnte Datei nicht löschen:', unlinkErr);
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
          created_at
        FROM tracks
        WHERE is_deleted = false
        ORDER BY created_at DESC
      `;

            const result = await pool.query(query);
            res.json(result.rows);
        } catch (err) {
            console.error('❌ List Fehler:', err);
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

            console.log('✅ Track gelöscht (Soft Delete):', track.name);
            console.log('   Datei BLEIBT bestehen:', track.audio_filename);

            res.json({
                success: true,
                message: 'Track gelöscht!',
                track: result.rows[0],
                note: 'Die Audiodatei wurde NICHT gelöscht und bleibt auf dem Server.'
            });
        } catch (err) {
            console.error('❌ Delete Fehler:', err);
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

            res.json({
                success: true,
                message: 'Track aktualisiert!',
                track: result.rows[0]
            });
        } catch (err) {
            console.error('❌ Update Fehler:', err);
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
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'Datei zu groß! Maximum 100MB.'
            });
        }
        return res.status(400).json({
            success: false,
            error: 'Upload Fehler: ' + err.message
        });
    }

    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
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
  name: varchar - Track name
  artist: varchar - Artist name
  genre: varchar - Music genre
  description: text - Track description
  audio_filename: varchar - Audio file name
  price_eur: numeric(10,2) - Price in EUR
  duration_seconds: integer - Duration in seconds
  file_size_bytes: bigint - File size in bytes
  play_count: integer - Number of plays
  is_published: boolean - Published status
  created_at: timestamp - Creation time
  updated_at: timestamp - Last update time
  is_free: boolean - Free track flag (FREE or PAID)
  price: numeric(10,2) - Legacy price field
  free_preview_duration: integer - Preview length in seconds
  duration: integer - Legacy duration field
  is_deleted: boolean - Soft-delete flag
  deleted_at: timestamp - Deletion time

IMPORTANT:
  ✅ Use snake_case column names (is_published, audio_filename, etc.)
  ✅ is_free = true: Free track (no payment required)
  ✅ is_free = false: Paid track (price_eur applies)
  ✅ All timestamps: created_at, updated_at, deleted_at
  ✅ Soft delete: is_deleted = true, deleted_at = NOW()

*/