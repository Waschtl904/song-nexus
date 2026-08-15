#!/usr/bin/env node
/**
 * ============================================================================
 * SEED DEV ADMIN – lokaler Ersatz für den entfernten /api/auth/dev-login
 * ============================================================================
 *
 * Hintergrund (Issue #1):
 * Der frühere Endpunkt POST /api/auth/dev-login legte einen Admin-User an und
 * gab ein gültiges JWT zurück – ohne NODE_ENV-Guard, öffentlich erreichbar.
 * Ein HTTP-Endpunkt mit dieser Fähigkeit ist auch mit Guard riskant: ein
 * vergessenes NODE_ENV=production genügt für einen Totalverlust.
 *
 * Dieses Skript erfüllt denselben Zweck ohne HTTP-Angriffsfläche. Es läuft
 * ausschließlich über die CLI, also nur für jemanden, der ohnehin Shell-Zugriff
 * und damit direkten Datenbankzugriff hat.
 *
 * Verwendung:
 *     cd backend
 *     npm run seed:dev-admin
 *
 * Optional eigenes Passwort setzen (sonst wird ein sicheres generiert):
 *     DEV_ADMIN_PASSWORD='meinPasswort' npm run seed:dev-admin
 *
 * Danach normal über das Login-Formular anmelden.
 * ============================================================================
 */

'use strict';

const path = require('path');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');

require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const DEV_EMAIL = process.env.DEV_ADMIN_EMAIL || 'dev@localhost';
const DEV_USERNAME = process.env.DEV_ADMIN_USERNAME || 'devadmin';

/**
 * Schutzschicht 1: Ausführung in Produktion verweigern.
 * Bewusst als Whitelist gebaut – ein unerwarteter NODE_ENV-Wert führt zum
 * Abbruch, nicht zur Ausführung. (Fail-closed statt fail-open.)
 */
function assertNotProduction() {
  const env = process.env.NODE_ENV || 'development';
  const allowed = ['development', 'test', 'local'];

  if (!allowed.includes(env)) {
    console.error('');
    console.error('❌ ABBRUCH: seed-dev-admin ist in dieser Umgebung nicht erlaubt.');
    console.error(`   NODE_ENV = "${env}" (erlaubt: ${allowed.join(', ')})`);
    console.error('');
    console.error('   Dieses Skript darf niemals auf einem Produktionssystem laufen.');
    console.error('   Admin-Rechte in Produktion bitte manuell per SQL vergeben:');
    console.error("     UPDATE users SET role = 'admin' WHERE email = '<deine-mail>';");
    console.error('');
    process.exit(1);
  }
}

/**
 * Schutzschicht 2: Datenbank muss lokal sein.
 * Verhindert, dass das Skript versehentlich gegen die Produktionsdatenbank
 * läuft, weil eine falsche .env geladen wurde.
 */
function assertLocalDatabase() {
  const host = (process.env.DB_HOST || 'localhost').toLowerCase();
  const localHosts = ['localhost', '127.0.0.1', '::1', 'db', 'postgres'];

  if (!localHosts.includes(host)) {
    console.error('');
    console.error('❌ ABBRUCH: DB_HOST zeigt nicht auf eine lokale Datenbank.');
    console.error(`   DB_HOST = "${host}"`);
    console.error('');
    console.error('   Falls das beabsichtigt ist, setze SEED_ALLOW_REMOTE_DB=true.');
    console.error('');
    if (process.env.SEED_ALLOW_REMOTE_DB !== 'true') {
      process.exit(1);
    }
    console.warn('⚠️  SEED_ALLOW_REMOTE_DB=true gesetzt – fahre auf eigene Gefahr fort.');
  }
}

function generatePassword() {
  // 18 Bytes base64url ≈ 24 Zeichen, ausreichend für einen lokalen Testaccount
  return crypto.randomBytes(18).toString('base64url');
}

async function main() {
  assertNotProduction();
  assertLocalDatabase();

  // Erst nach den Guards laden, damit kein Pool gegen Produktion geöffnet wird
  const { pool } = require('../db');

  const password = process.env.DEV_ADMIN_PASSWORD || generatePassword();
  const generated = !process.env.DEV_ADMIN_PASSWORD;
  const rounds = parseInt(process.env.BCRYPT_ROUNDS || '10', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  try {
    const existing = await pool.query('SELECT id, role FROM users WHERE email = $1', [DEV_EMAIL]);

    let user;
    if (existing.rows.length === 0) {
      const inserted = await pool.query(
        `INSERT INTO users (email, username, password_hash, role, is_active)
         VALUES ($1, $2, $3, 'admin', true)
         RETURNING id, email, username, role`,
        [DEV_EMAIL, DEV_USERNAME, passwordHash]
      );
      user = inserted.rows[0];
      console.log('✅ Dev-Admin neu angelegt.');
    } else {
      const updated = await pool.query(
        `UPDATE users
            SET password_hash = $1, role = 'admin', is_active = true
          WHERE email = $2
      RETURNING id, email, username, role`,
        [passwordHash, DEV_EMAIL]
      );
      user = updated.rows[0];
      console.log('✅ Dev-Admin aktualisiert (Passwort neu gesetzt).');
    }

    console.log('');
    console.log('   ─────────────────────────────────────────────');
    console.log(`   E-Mail:    ${user.email}`);
    console.log(`   Username:  ${user.username}`);
    console.log(`   Passwort:  ${password}`);
    console.log(`   Rolle:     ${user.role}`);
    console.log('   ─────────────────────────────────────────────');
    console.log('');
    if (generated) {
      console.log('   ℹ️  Passwort wurde zufällig generiert und wird nicht gespeichert.');
      console.log('      Jetzt notieren oder das Skript erneut ausführen.');
    }
    console.log('   Anmeldung über das normale Login-Formular.');
    console.log('');
  } catch (err) {
    console.error('❌ Seed fehlgeschlagen:', err.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

main();
