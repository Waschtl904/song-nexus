const pool = require('./db');

async function fixTracks() {
    try {
        // Prüfe erstmal, welche Tracks nicht published sind
        const check = await pool.query('SELECT id, name, is_published FROM tracks;');
        console.log('📊 Alle Tracks:', check.rows);

        // Setze alle auf is_published = TRUE
        const update = await pool.query(
            'UPDATE tracks SET is_published = TRUE WHERE is_published = FALSE RETURNING id, name, is_published;'
        );

        console.log('\n✅ Updated tracks:');
        console.log(update.rows);

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

fixTracks();
