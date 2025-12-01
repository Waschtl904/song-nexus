// backend/db.js
const { Pool } = require('pg');
const pool = new Pool({
    user: 'postgres',
    password: 'P@ySQL_2025_Secure!Nexus',
    host: 'localhost',
    port: 5432,
    database: 'song_nexus_dev'
});
module.exports = pool;
