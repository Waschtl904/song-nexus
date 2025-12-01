// Create play_history table
require('dotenv').config();
const pg = require('pg');

const pool = new pg.Pool({
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    database: process.env.DB_NAME,
});

async function createPlayHistoryTable() {
    try {
        console.log('📋 Creating play_history table...');

        const createTableQuery = `
      CREATE TABLE IF NOT EXISTS play_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
        played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        duration_played_seconds INTEGER,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(user_id, track_id, played_at)
      );
    `;

        await pool.query(createTableQuery);
        console.log('✅ Table created successfully!');

        // Create index for faster queries
        console.log('\n📊 Creating indexes...');
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_play_history_track_id ON play_history(track_id)`);
        await pool.query(`CREATE INDEX IF NOT EXISTS idx_play_history_played_at ON play_history(played_at)`);
        console.log('✅ Indexes created!');

        // Verify table
        const verifyResult = await pool.query(
            `SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'play_history'
      )`
        );

        if (verifyResult.rows[0].exists) {
            console.log('\n✅ SETUP COMPLETE! play_history table is ready.');
        }

        await pool.end();
        process.exit(0);
    } catch (err) {
        console.error('❌ Error:', err.message);
        await pool.end();
        process.exit(1);
    }
}

createPlayHistoryTable();