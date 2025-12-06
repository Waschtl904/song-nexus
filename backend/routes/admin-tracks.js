const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../db'); // Deine DB Connection


const router = express.Router();


// Storage Konfiguration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const audioPath = path.join(__dirname, '..', 'public', 'audio');
        if (!fs.existsSync(audioPath)) {
            fs.mkdirSync(audioPath, { recursive: true });
        }
        cb(null, audioPath);
    },
    filename: (req, file, cb) => {
        // Speichere mit Originalname
        cb(null, file.originalname);
    }
});


const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        // Nur MP3 erlauben
        if (file.mimetype === 'audio/mpeg' || file.originalname.endsWith('.mp3')) {
            cb(null, true);
        } else {
            cb(new Error('Only MP3 files allowed'));
        }
    }
});


// POST /api/admin/tracks/upload
router.post('/upload', upload.single('audio'), async (req, res) => {
    try {
        const { name, artist, duration, genre, price = 0.99 } = req.body;
        const audioFilename = req.file.originalname;


        if (!name || !artist || !audioFilename) {
            return res.status(400).json({ error: 'Missing required fields' });
        }


        // ✅ FIX: In DB einfügen mit is_published = TRUE
        const result = await db.query(
            `INSERT INTO tracks (name, artist, duration, price, free_preview_duration, audio_filename, genre, is_published, created_at)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
             RETURNING id, name, artist, price, audio_filename`,
            [name, artist, parseInt(duration), parseFloat(price), 40, audioFilename, genre || 'Metal', true]
        );


        console.log(`✅ Track uploaded & published: ${result.rows[0].name}`);


        res.json({
            success: true,
            message: 'Track uploaded successfully',
            track: result.rows[0]
        });
    } catch (err) {
        console.error('Upload error:', err);
        res.status(500).json({ error: err.message });
    }
});


// GET /api/admin/tracks/list
router.get('/list', async (req, res) => {
    try {
        const result = await db.query(
            'SELECT id, name, artist, duration, price, audio_filename, genre, is_published FROM tracks ORDER BY created_at DESC'
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


// DELETE /api/admin/tracks/:id
router.delete('/:id', async (req, res) => {
    try {
        const { id } = req.params;


        // Get filename first
        const trackResult = await db.query('SELECT audio_filename FROM tracks WHERE id = $1', [id]);
        if (trackResult.rows.length === 0) {
            return res.status(404).json({ error: 'Track not found' });
        }


        const filename = trackResult.rows[0].audio_filename;


        // Delete from DB
        await db.query('DELETE FROM tracks WHERE id = $1', [id]);


        // Delete audio file
        const audioPath = path.join(__dirname, '..', 'public', 'audio', filename);
        if (fs.existsSync(audioPath)) {
            fs.unlinkSync(audioPath);
        }


        console.log(`✅ Track deleted: ${filename}`);
        res.json({ success: true, message: 'Track deleted' });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});


module.exports = router;
