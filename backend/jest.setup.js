/**
 * Jest Global Teardown
 * Schliesst den DB-Pool nach allen Tests.
 * Verhindert dass Jest haengt (--detectOpenHandles).
 *
 * Bis Issue #86: hier stand zusaetzlich clearInterval(cleanupInterval) fuer
 * das Cleanup-Interval aus middleware/csrf-middleware.js. Die Datei ist mit
 * #86 entfernt worden, requireTrustedSource hat kein eigenes Interval.
 */

const { pool } = require('../db');

afterAll(async () => {
  await pool.end();
});
