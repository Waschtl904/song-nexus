const pg = require('pg');

const pool = new pg.Pool({
    user: 'postgres',
    password: 'P@ySQL_2025_Secure!Nexus',
    host: 'localhost',
    port: 5432,
    database: 'song_nexus_dev'  // ← WICHTIG: _dev suffix!
});

async function setTrackFree() {
    try {
        console.log('🔄 Connecting to database...');

        const result = await pool.query(
            "UPDATE tracks SET is_free = TRUE WHERE name = $1",
            ['THE SPELL']
        );

        console.log('✅ THE SPELL is now FREE!');
        console.log('Updated rows:', result.rowCount);

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

setTrackFree();
