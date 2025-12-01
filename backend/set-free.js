const pg = require('pg');
const { pool } = require('./db');

async function setTrackFree() {
    try {
        console.log('🔄 Connecting to database...');

        const result = await pool.query(
            "UPDATE tracks SET is_free = TRUE WHERE name = $1",
            ['THE SPELL']
        );

        if (result.rowCount === 0) {
            console.log('❌ Track "THE SPELL" not found!');
        } else {
            console.log('✅ THE SPELL is now FREE!');
            console.log('Updated rows:', result.rowCount);
        }

        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        process.exit(1);
    }
}

setTrackFree();
