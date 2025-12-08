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
 * Author: Sebastian (Waschtl904)
 * Last Updated: December 8, 2025
 */

const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;
const pool = require('../db');

const router = express.Router();

// ============================================================================
// 1️⃣ MULTER CONFIGURATION - File Upload Settings
// ============================================================================
/**
 * Multer speichert Dateien im backend/public/audio/ Ordner
 * 
 * WARUM MULTER?
 * - Validiert MIME-Types (nur MP3/WAV)
 * - Prüft Dateigröße (max 100MB)
 * - Speichert mit eindeutigem Namen (verhindert Datei-Überschreibung)
 * - Integiert sich mit Express
 * - Production-ready
 */

const storage = multer.diskStorage({
    // 📁 Wohin werden Dateien gespeichert?
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../public/audio');
        cb(null, uploadDir);
    },

    // 📝 Wie werden Dateien benannt?
    // Format: timestamp_userid_originalname
    // Beispiel: 1702057200000_3_P_VS_NP.mp3
    filename: (req, file, cb) => {
        const timestamp = Date.now();
        const userId = req.user.id;  // Kommt von JWT Token
        const ext = path.extname(file.originalname);  // .mp3, .wav
        const name = path.basename(file.originalname, ext);  // Dateiname ohne Extension

        const safeName = name
            .replace(/[^a-zA-Z0-9_-]/g, '_')  // Nur sichere Zeichen
            .substring(0, 50);  // Max 50 Zeichen

        const filename = `${timestamp}_${userId}_${safeName}${ext}`;
        cb(null, filename);
    }
});

/**
 * MULTER FILTER - Was ist erlaubt?
 * 
 * Akzeptiert: MP3, WAV
 * Ablehnt: EXE, JS, andere Audio-Formate
 */
const fileFilter = (req, file, cb) => {
    // Erlaubte MIME-Types
    const allowedMimes = ['audio/mpeg', 'audio/wav', 'audio/x-wav'];

    // Erlaubte File-Extensions (Backup-Check)
    const allowedExts = ['.mp3', '.wav'];

    const ext = path.extname(file.originalname).toLowerCase();

    // ❌ Dateityp nicht erlaubt
    if (!allowedMimes.includes(file.mimetype) || !allowedExts.includes(ext)) {
        return cb(
            new Error(`Dateiformat nicht erlaubt! Nur MP3 & WAV. Erhalten: ${file.mimetype}`),
            false
        );
    }

    // ✅ Datei ist ok
    cb(null, true);
};

/**
 * MULTER INSTANCE - mit Settings
 * 
 * limits.fileSize: Max 100MB (100 * 1024 * 1024 Bytes)
 * fileFilter: Nur MP3/WAV
 * storage: Speicherort + Dateiname
 */
const upload = multer({
    storage: storage,
    fileFilter: fileFilter,
    limits: {
        fileSize: 100 * 1024 * 1024  // 100MB in Bytes
    }
});

// ============================================================================
// 2️⃣ MIDDLEWARE - JWT Token Verification
// ============================================================================
/**
 * MIDDLEWARE: Authentifizierung prüfen
 * 
 * Token Format: "Bearer eyJhbGciOiJIUzI1NiIs..."
 * 
 * Was passiert hier:
 * 1. Liest Authorization Header aus
 * 2. Extrahiert den Token
 * 3. Verifiziert mit JWT_SECRET
 * 4. Speichert User-Daten in req.user
 * 5. Nächste Funktion wird aufgerufen
 * 
 * WENN Token ungültig: 401 Unauthorized
 */
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];  // "Bearer TOKEN" → TOKEN

    if (!token) {
        return res.status(401).json({
            success: false,
            error: 'Kein Token! Bitte login.'
        });
    }

    const jwt = require('jsonwebtoken');
    const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-key';

    try {
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded;  // { id, username, role, ... }
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
/**
 * MIDDLEWARE: Ist der User Admin?
 * 
 * Prüft: req.user.role === 'admin'
 * 
 * WARUM?
 * - Nur Admins dürfen Uploads machen
 * - Verhindert, dass normale User Dateien hochladen
 * - Sicherheits-Layer
 */
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
// 4️⃣ ROUTE: POST /admin/tracks/upload
// ============================================================================
/**
 * FLOW:
 * 1. JWT Token prüfen (authenticateToken)
 * 2. Admin-Role prüfen (requireAdmin)
 * 3. Datei validieren & hochladen (upload.single('audio'))
 * 4. Formulardaten validieren (trackName, artist, etc.)
 * 5. In Datenbank speichern
 * 6. Response (success/error)
 */
router.post(
    '/upload',
    authenticateToken,           // Middleware 1: JWT
    requireAdmin,                // Middleware 2: Admin?
    upload.single('audio'),      // Middleware 3: Multer
    async (req, res) => {
        try {
            // ============================================================
            // DATEI PRÜFEN
            // ============================================================
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

            // ============================================================
            // FORMULAR-DATEN VALIDIEREN
            // ============================================================
            const { name, artist, duration, genre, price, is_free } = req.body;

            // Pflichtfelder prüfen
            if (!name || !artist || !duration || !price) {
                // Datei löschen wenn Validierung fehlschlägt
                await fs.unlink(req.file.path);
                return res.status(400).json({
                    success: false,
                    error: 'Felder erforderlich: name, artist, duration, price'
                });
            }

            // Datentypen prüfen
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

            // ============================================================
            // IN DATENBANK SPEICHERN
            // ============================================================
            /**
             * INSERT INTO tracks (
             *   name, artist, duration, genre, price_eur, 
             *   is_free, audio_filename, uploaded_by
             * )
             * VALUES (...)
             * 
             * Spalten:
             * - name: Track-Name (z.B. "P VS NP")
             * - artist: Artist-Name (z.B. "Computational")
             * - duration: Länge in Sekunden
             * - genre: Genre (z.B. "Metal")
             * - price_eur: Preis in Euro
             * - is_free: Boolean - ist kostenlos?
             * - audio_filename: Speichername der Datei (was Multer erstellt hat)
             * - uploaded_by: Admin-ID (wer hat hochgeladen?)
             * - created_at: Timestamp (automatisch)
             */
            const query = `
                INSERT INTO tracks (
                    name, artist, duration, genre, price_eur, 
                    is_free, audio_filename, uploaded_by
                )
                VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING id, name, artist, price_eur, audio_filename;
            `;

            const values = [
                name,                              // $1
                artist,                            // $2
                durationNum,                       // $3
                genre || 'Other',                  // $4 (Standard: "Other")
                priceNum,                          // $5
                is_free === 'true' || is_free === true,  // $6 (Boolean)
                req.file.filename,                 // $7 (von Multer)
                req.user.id                        // $8 (Admin-ID)
            ];

            const result = await pool.query(query, values);
            const track = result.rows[0];

            console.log('✅ Track in DB gespeichert:', track);

            // ============================================================
            // SUCCESS RESPONSE
            // ============================================================
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

            // Datei löschen wenn Fehler
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
// 5️⃣ ROUTE: GET /admin/tracks/list
// ============================================================================
/**
 * Alle Tracks auflisten (für Admin-Dashboard)
 * 
 * Nur Admins dürfen sehen:
 * - audio_filename (Dateipfad)
 * - uploaded_by (Wer hat hochgeladen)
 * - created_at (Wann hochgeladen)
 */
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
// 6️⃣ ROUTE: DELETE /admin/tracks/:id
// ============================================================================
/**
 * Track löschen - SOFT DELETE PATTERN
 * 
 * SOFT DELETE = nur DB Entry markieren, Datei BLEIBT!
 * 
 * WHY?
 * - Datei bleibt sicher auf dem Server
 * - Man kann später wiederherstellen
 * - Keine Datenverluste durch Unfälle
 * - Audit Trail möglich (wer hat gelöscht, wann)
 * 
 * UPDATE tracks SET is_deleted = true WHERE id = ?
 * 
 * Die Datei bleibt in backend/public/audio/ bestehen!
 */
router.delete('/:id', authenticateToken, requireAdmin, async (req, res) => {
    try {
        const trackId = parseInt(req.params.id);

        if (isNaN(trackId)) {
            return res.status(400).json({
                success: false,
                error: 'Ungültige Track-ID!'
            });
        }

        // ============================================================
        // TRACK PRÜFEN
        // ============================================================
        const checkQuery = 'SELECT id, name, audio_filename FROM tracks WHERE id = $1';
        const checkResult = await pool.query(checkQuery, [trackId]);

        if (checkResult.rows.length === 0) {
            return res.status(404).json({
                success: false,
                error: 'Track nicht gefunden!'
            });
        }

        const track = checkResult.rows[0];

        // ============================================================
        // SOFT DELETE - Nur DB markieren
        // ============================================================
        const deleteQuery = `
            UPDATE tracks 
            SET is_deleted = true, deleted_at = NOW()
            WHERE id = $1
            RETURNING id, name;
        `;

        const result = await pool.query(deleteQuery, [trackId]);

        console.log(`🗑️  Track gelöscht (Soft Delete): ${track.name}`);
        console.log(`📁 Datei BLEIBT bestehen: ${track.audio_filename}`);

        // ============================================================
        // SUCCESS RESPONSE
        // ============================================================
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
// 7️⃣ ROUTE: PUT /admin/tracks/:id (Optional - Update Metadata)
// ============================================================================
/**
 * Track Metadaten updaten (Name, Artist, Price, etc.)
 * 
 * Datei wird NICHT angefasst - nur Datenbank-Info!
 */
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

        // Nur nicht-NULL Felder updaten
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
/**
 * Behandelt Multer-Fehler separat
 * Z.B. wenn Datei zu groß ist
 */
router.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
        // LIMIT_FILE_SIZE: Datei zu groß
        if (err.code === 'LIMIT_FILE_SIZE') {
            return res.status(413).json({
                success: false,
                error: 'Datei zu groß! Maximum: 100MB'
            });
        }
        // Andere Multer Fehler
        return res.status(400).json({
            success: false,
            error: `Upload Fehler: ${err.message}`
        });
    }

    // Andere Fehler
    if (err) {
        return res.status(400).json({
            success: false,
            error: err.message
        });
    }

    next();
});

module.exports = router;
