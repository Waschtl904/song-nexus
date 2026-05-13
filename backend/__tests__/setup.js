/**
 * Jest Global Teardown
 * Schliesst den DB-Pool und beendet offene Intervals nach allen Tests.
 * Verhindert dass Jest haengt (--detectOpenHandles).
 */

const { pool } = require('../db');
const { cleanupInterval } = require('../middleware/csrf-middleware');

afterAll(async () => {
  clearInterval(cleanupInterval);
  await pool.end();
});
