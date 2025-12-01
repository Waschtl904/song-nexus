// Fix duplicate tracks - DELETE the duplicate instead of updating
require('dotenv').config();
const pg = require('pg');

const pool = new pg.Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function fixDuplicateTracks() {
    try {
        console.log('🔍 Searching for duplicate SPELL tracks...');

        // Find all SPELL tracks
        const result = await pool.query(
            `SELECT id, name, audio_filename FROM tracks WHERE name LIKE '%SPELL%' ORDER BY id`
        );

        console.log('📊 Found tracks:');
        result.rows.forEach(row => {
            console.log(`  ID ${row.id}: ${row.name} → ${row.audio_filename}`);
        });

        if (result.rows.length > 1) {
            console.log('\n✅ Found duplicates!');

            // Keep the first one (ID 1), delete all others
            const toDelete = result.rows.slice(1);

            console.log(`\n🗑️ Deleting ${toDelete.length} duplicate(s)...`);

            for (const track of toDelete) {
                const deleteResult = await pool.query(
                    `DELETE FROM tracks WHERE id = $1 RETURNING id, name`,
                    [track.id]
                );
                console.log(`  ✅ Deleted ID ${deleteResult.rows[0].id}: ${deleteResult.rows[0].name}`);
            }

            console.log('\n✅ FIX COMPLETE! Duplicate tracks deleted.');
            console.log('   Remaining track: ID 1 → THE SPELL.mp3');
        } else {
            console.log('✅ No duplicates found!');
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

fixDuplicateTracks();