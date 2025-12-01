const pg = require('pg');

const pool = new pg.Pool({
    user: 'postgres',
    password: 'P@ySQL_2025_Secure!Nexus',
    host: 'localhost',
    port: 5432,
    database: 'song_nexus_dev'
});

async function addColumn() {
    try {
        console.log('🔄 Adding is_free column to tracks table...');

        // Spalte hinzufügen
        await pool.query(
            "ALTER TABLE tracks ADD COLUMN is_free BOOLEAN DEFAULT FALSE"
        );

        console.log('✅ Column is_free added!');

        // Jetzt THE SPELL auf FREE setzen
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

addColumn();
