// ============================================================================
// Backend server.js - CORS & Audio Route Check
// ============================================================================

// WICHTIG: Diese Middleware MUSS VOR den Routes kommen!

// 1. CORS Headers (MÜSSEN richtig sein)
app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', 'http://localhost:5500');
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    // Preflight requests
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// 2. AUDIO STREAMING ROUTE mit Logging
app.get('/api/tracks/audio/:filename', authenticateToken, async (req, res) => {
    console.log('\n========== AUDIO ROUTE DEBUGGING ==========');
    console.log('📡 Anfrage: GET /api/tracks/audio/:filename');
    console.log('📁 Filename:', req.params.filename);
    console.log('🔑 Token vorhanden:', !!req.headers.authorization);
    console.log('👤 User ID:', req.user?.id);

    try {
        const filename = req.params.filename;

        // 1. Validate filename (Security!)
        if (!filename.match(/^[a-zA-Z0-9\s\-_.]+\.mp3$/i)) {
            console.log('❌ VALIDATION FEHLER: Ungültiger Dateiname');
            return res.status(400).json({ error: 'Invalid filename' });
        }

        // 2. Get track from database
        const trackQuery = `
      SELECT id, title, audio_filename, is_free, user_id 
      FROM tracks 
      WHERE audio_filename = $1
    `;
        const trackResult = await pool.query(trackQuery, [filename]);
        const track = trackResult.rows[0];

        console.log('📊 Datenbank Query Result:', track ? 'GEFUNDEN' : 'NICHT GEFUNDEN');
        if (!track) {
            console.log('❌ Track nicht in Datenbank');
            return res.status(404).json({ error: 'Track not found' });
        }

        // 3. Check permissions
        const isOwner = track.user_id === req.user.id;
        const isFree = track.is_free;

        console.log('📝 Track Info:', {
            title: track.title,
            is_free: isFree,
            is_owner: isOwner,
            user_id: track.user_id,
            request_user_id: req.user.id
        });

        // 4. Verify access (owner OR free track)
        if (!isOwner && !isFree) {
            console.log('❌ PERMISSION DENIED: Nicht Eigentümer und Track ist kostenpflichtig');
            return res.status(403).json({ error: 'Access denied' });
        }

        // 5. Build file path
        const filePath = path.join(__dirname, 'public', 'audio', filename);
        console.log('🗂️ File Path:', filePath);

        // 6. Check if file exists
        if (!fs.existsSync(filePath)) {
            console.log('❌ DATEI NICHT GEFUNDEN auf Dateisystem:', filePath);
            return res.status(404).json({ error: 'Audio file not found on disk' });
        }

        const stats = fs.statSync(filePath);
        console.log('📦 Dateiinfo:', {
            size: stats.size,
            exists: true
        });

        // 7. IMPORTANT: Check for preview vs full audio
        if (!isFree && isOwner) {
            // Owner accessing own track: serve full audio
            console.log('✅ Serving FULL audio (Eigentümer)');
        } else if (isFree) {
            // Free track: serve with possible preview limit
            console.log('✅ Serving audio (kostenloses Track)');
        }

        // 8. Send audio file with correct headers
        res.setHeader('Content-Type', 'audio/mpeg');
        res.setHeader('Content-Length', stats.size);
        res.setHeader('Content-Disposition', `inline; filename="${filename}"`);
        res.setHeader('Cache-Control', 'public, max-age=3600');

        console.log('📤 Response Headers gesetzt');
        console.log('✅ Sende Audio-Datei...');

        const fileStream = fs.createReadStream(filePath);

        fileStream.on('error', (err) => {
            console.error('❌ File Stream Error:', err);
            if (!res.headersSent) {
                res.status(500).json({ error: 'Error reading file' });
            }
        });

        fileStream.pipe(res);

    } catch (error) {
        console.error('❌ KRITISCHER FEHLER:', error);
        if (!res.headersSent) {
            res.status(500).json({ error: error.message });
        }
    }
    console.log('==========================================\n');
});

// ============================================================================
// WICHTIGE CHECKS
// ============================================================================
/*
1. ✅ CORS Headers müssen VOR den Routes kommen
2. ✅ authenticateToken Middleware MUSS auf /api/tracks/audio/:filename angewendet sein
3. ✅ Content-Type: audio/mpeg ist WICHTIG
4. ✅ Content-Length Header ist wichtig
5. ✅ File Path MUSS mit __dirname sein, nicht relative Paths
6. ✅ File muss tatsächlich existieren auf Disk
7. ✅ fs.createReadStream() statt fs.readFile() für große Dateien (besser für Speicher)
*/