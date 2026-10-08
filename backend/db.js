const { Pool } = require('pg');
require('dotenv').config();
const { databaseOptions } = require('./utils/db-options');
const pool = new Pool(databaseOptions());
pool.on('error', () => console.error('PostgreSQL pool connection failed'));
module.exports = { pool };
