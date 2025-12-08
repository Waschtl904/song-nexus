/**
 * 🎵 ADMIN TRACKS ROUTE - Song-Nexus v6.2
 * 
 * Sicher Upload & Management für Admin-User
 * Features:
 * - JWT Authentication ✅
 * - Admin-Role Check ✅
 * - Multer File Upload (MP3 + WAV, max 100MB) ✅
 * - Input Validation ✅
 * - Soft-Delete (DB only, files stay) ✅
 * - Error Handling ✅
 * 
 * FIXED:
 * - ✅ Import pool aus server.js (nicht db.js)
 * - ✅ JWT verifyToken von auth.js importiert
 * 
 * Author: Sebastian (Waschtl904)
 * Last Updated: December 8, 2025
 */


const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const { pool } = require('../server');  // ✅ FIXED: Import aus server.js
const jwt = require('jsonwebtoken');


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
            .replace(/[^a-zA-Z0-9_-]/g, '_')
            .substring(0, 50);

        const filename = `${timestamp}_${userId}_${safeName}${ext}`;
        cb(null, filename);
    }
});


const fileFilter = (req, file, cb) => {
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/x-wav'];
    const allowedExts = ['.mp3', '.wav'];
    const ext = path.extname(file.originalname).toLowerCase();

    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
        return cb(
            new Error(`Dateiformat nicht erlaubt! Nur MP3 & WAV. Erhalten: ${file.mimetype}`),
            false
        );
    }

    cb(null, true);
};


const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024  // 100MB
    }
});


// ============================================================================
// 2️⃣ MIDDLEWARE - JWT Token Verification
// ============================================================================

const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Kein Token! Bitte login.'
        });
    }

    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;
        next();
    } catch (err) {
        return res.status(403).json({
            success: false,
            error: 'Token ungültig oder abgelaufen!'
        });
    }
};


// ============================================================================
// 3️⃣ MIDDLEWARE - Admin Role Check
// ============================================================================

const requireAdmin = (req, res, next) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({
            success: false,
            error: 'Nur Admins dürfen Tracks hochladen!'
        });
    }
    next();
};


// ============================================================================
// 4️⃣ ROUTE: POST /upload (wird zu /api/admin/tracks/upload)
// ============================================================================

router.post(
    '/upload',
    authenticateToken,
    requireAdmin,
    upload.single('audio'),
    async (req, res) => {
        try {
            if (!req.file) {
                return res.status(400).json({
                    success: false,
                    error: 'Keine Datei hochgeladen!'
                });
            }

            console.log('📤 Upload gestartet:', {
                filename: req.file.filename,
                size: req.file.size,
                user: req.user.username
            });

            const { name, artist, duration, genre, price, is_free } = req.body;

            if (!name || !artist || !duration || !price) {
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'Felder erforderlich: name, artist, duration, price'
                });
            }

            const durationNum = parseInt(duration);
            const priceNum = parseFloat(price);

            if (isNaN(durationNum) || durationNum <= 0) {
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'Duration muss eine positive Zahl sein!'
                });
            }

            if (isNaN(priceNum) || priceNum < 0) {
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'Price muss eine positive Zahl sein!'
                });
            }

            const query = `
                INSERT INTO tracks (
                    name, artist, duration, genre, price_eur, 
                    is_free, audio_filename, uploaded_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, artist, price_eur, audio_filename;
            `;

            const values = [
                name,
                artist,
                durationNum,
                genre || 'Other',
                priceNum,
                is_free === 'true' || is_free === true,
                req.file.filename,
                req.user.id
            ];

            const result = await pool.query(query, values);
            const track = result.rows[0];

            console.log('✅ Track in DB gespeichert:', track);

            res.status(201).json({
                success: true,
                message: '✅ Track erfolgreich hochgeladen!',
                track: {
                    id: track.id,
                    name: track.name,
                    artist: track.artist,
                    price: track.price_eur,
                    filename: track.audio_filename
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
// 5️⃣ ROUTE: GET /list (wird zu /api/admin/tracks/list)
// ============================================================================

router.get('/list', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const query = `
            SELECT 
                id, name, artist, duration, genre, price_eur, 
                is_free, audio_filename, uploaded_by, created_at
            FROM tracks
            WHERE is_deleted = false
            ORDER BY created_at DESC;
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
});


// ============================================================================
// 6️⃣ ROUTE: DELETE /:id (wird zu /api/admin/tracks/:id)
// ============================================================================

router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const trackId = parseInt(req.params.id);

        if (isNaN(trackId)) {
            return res.status(400).json({
                success: false,
                error: 'Ungültige Track-ID!'
            });
        }

        const checkQuery = 'SELECT id, name, audio_filename FROM tracks WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [trackId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Track nicht gefunden!'
            });
        }

        const track = checkResult.rows[0];

        const deleteQuery = `
            UPDATE tracks 
            SET is_deleted = true, deleted_at = NOW()
            WHERE id = $1
            RETURNING id, name;
        `;

        const result = await pool.query(deleteQuery, [trackId]);

        console.log(`🗑️  Track gelöscht (Soft Delete): ${track.name}`);
        console.log(`📁 Datei BLEIBT bestehen: ${track.audio_filename}`);

        res.json({
            success: true,
            message: '✅ Track gelöscht!',
            track: result.rows[0],
            note: '📁 Die Audiodatei wurde NICHT gelöscht und bleibt auf dem Server.'
        });

    } catch (err) {
        console.error('❌ Delete Fehler:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});


// ============================================================================
// 7️⃣ ROUTE: PUT /:id (Optional - Update Metadata)
// ============================================================================

router.put('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const trackId = parseInt(req.params.id);
        const { name, artist, price, genre, is_free } = req.body;

        if (isNaN(trackId)) {
            return res.status(400).json({
                success: false,
                error: 'Ungültige Track-ID!'
            });
        }

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
        if (price !== undefined) {
            updates.push(`price_eur = $${paramIndex++}`);
            values.push(parseFloat(price));
        }
        if (genre !== undefined) {
            updates.push(`genre = $${paramIndex++}`);
            values.push(genre);
        }
        if (is_free !== undefined) {
            updates.push(`is_free = $${paramIndex++}`);
            values.push(is_free === 'true' || is_free === true);
        }

        if (updates.length === 0) {
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
            RETURNING id, name, artist, price_eur;
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
            message: '✅ Track aktualisiert!',
            track: result.rows[0]
        });

    } catch (err) {
        console.error('❌ Update Fehler:', err);
        res.status(500).json({
            success: false,
            error: err.message
        });
    }
});


// ============================================================================
// ERROR HANDLER - Multer spezifisch
// ============================================================================

router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'Datei zu groß! Maximum: 100MB'
            });
        }
        return res.status(400).json({
            success: false,
            error: `Upload Fehler: ${err.message}`
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


module.exports = router;