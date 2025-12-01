// Reset play history for devuser
require('dotenv').config();
const pg = require('pg');

const pool = new pg.Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function resetPlayHistory() {
    try {
        console.log('🔍 Searching for devuser...');

        // Find devuser
        const userResult = await pool.query(
            `SELECT id, username FROM users WHERE username = 'devuser'`
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User "devuser" not found!');
            await pool.end();
            process.exit(1);
        }

        const devuserId = userResult.rows[0].id;
        console.log(`✅ Found devuser (ID: ${devuserId})`);

        // Show current play history
        const historyBefore = await pool.query(
            `SELECT COUNT(*) FROM play_history WHERE user_id = $1`,
            [devuserId]
        );
        console.log(`\n📊 Current play history entries: ${historyBefore.rows[0].count}`);

        // Delete play history
        const deleteResult = await pool.query(
            `DELETE FROM play_history WHERE user_id = $1`,
            [devuserId]
        );
        console.log(`\n🗑️ Deleted ${deleteResult.rowCount} play history entries`);

        // Verify
        const historyAfter = await pool.query(
            `SELECT COUNT(*) FROM play_history WHERE user_id = $1`,
            [devuserId]
        );
        console.log(`✅ Play history after reset: ${historyAfter.rows[0].count}`);
        console.log('\n✅ RESET COMPLETE!');

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

resetPlayHistory();