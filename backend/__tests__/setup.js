/**
 * Jest Global Teardown
 * Schliesst den DB-Pool nach allen Tests sauber.
 * Verhindert den "--detectOpenHandles" Warning.
 */

const { pool } = require('../db');

afterAll(async () => {
  await pool.end();
});
