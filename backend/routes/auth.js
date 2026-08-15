const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { verifyToken, generateJWT, setAuthCookie, clearAuthCookie } = require('../middleware/auth-middleware');
const { sendPasswordResetEmail } = require('../utils/mailer');
const router = express.Router();

// ============================================================================
// 📝 POST /api/auth/register - Register New User
// ============================================================================

router.post('/register', [
  body('email').isEmail().normalizeEmail().withMessage('Invalid email'),
  body('password').isLength({ min: 8 }).withMessage('Password must be at least 8 characters'),
  body('username').isLength({ min: 3, max: 20 }).trim().escape().withMessage('Username 3-20 chars'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, username } = req.body;

  try {
    // 1️⃣ Check if user already exists
    const existingUser = await pool.query(
      'SELECT id FROM users WHERE email = $1 OR LOWER(username) = LOWER($2)',
      [email, username]
    );

    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email or username already exists' });
    }

    // 2️⃣ Hash password
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);
    console.log(`🔐 Password hashed with ${bcryptRounds} rounds`);

    // 3️⃣ Insert user into database
    const result = await pool.query(
      `INSERT INTO users (email, username, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, email, username, role`,
      [email, username, hashedPassword, 'user', true]
    );

    const user = result.rows[0];
    console.log(`✅ User registered: ${user.username} (${user.email})`);

    // 4️⃣ Generate JWT token + als HttpOnly Cookie setzen
    const token = generateJWT(user);
    setAuthCookie(res, token);

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token, // Beibehalten für Rückwärtskompatibilität (wird in späterer Version entfernt)
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ============================================================================
// 🔑 POST /api/auth/login - Login With Username/Email + Password
// ============================================================================

router.post('/login', [
  body('username').notEmpty().withMessage('Username or email required'),
  body('password').notEmpty().withMessage('Password required'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { username, password } = req.body;

  try {
    console.log(`🔐 Login attempt: ${username}`);

    // 1️⃣ Find user (case-insensitive username, or by email)
    const result = await pool.query(
      `SELECT id, email, username, password_hash, role, is_active
       FROM users
       WHERE (LOWER(username) = LOWER($1) OR email = $2) AND is_active = TRUE
       LIMIT 1`,
      [username, username]
    );

    if (result.rows.length === 0) {
      console.log(`❌ User not found: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    console.log(`✅ User found: ${user.username}`);

    // 2️⃣ Verify password
    let isValidPassword = false;
    try {
      isValidPassword = await bcrypt.compare(password, user.password_hash);
      console.log(`✅ Bcrypt verify result: ${isValidPassword}`);
    } catch (err) {
      // ⚠️ Fallback: plain text comparison (ONLY in development!)
      if (process.env.NODE_ENV === 'production') {
        console.error('❌❌ SECURITY: Bcrypt verify failed in production - rejecting login');
        console.error('   This indicates a configuration issue. Check password_hash in database.');
        return res.status(500).json({ error: 'Authentication system error' });
      }

      console.warn('⚠️ Bcrypt compare failed in development, trying plain text comparison');
      isValidPassword = (password === user.password_hash);
    }

    if (!isValidPassword) {
      console.log(`❌ Invalid password for user: ${username}`);
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // 3️⃣ Update last_login timestamp
    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
    console.log(`✅ Password valid, last_login updated: ${user.username}`);

    // 4️⃣ Generate JWT token + als HttpOnly Cookie setzen
    const token = generateJWT(user);
    console.log(`✅ JWT token generated for user: ${user.username}`);
    setAuthCookie(res, token);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token, // Beibehalten für Rückwärtskompatibilität
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ============================================================================
// ⛔ ENTFERNT: POST /api/auth/dev-login
// ============================================================================
//
// Dieser Endpunkt legte einen User mit role='admin' an und gab ein gültiges
// JWT zurück – ohne jeden NODE_ENV-Guard. Der Router ist über
// app.use('/api/auth', ...) öffentlich gemountet, damit war ein vollständiger
// Admin-Takeover per einzelnem POST möglich (Issue #1).
//
// Die clientseitige localhost-Prüfung im Admin-Hub war KEIN Schutz – sie lief
// im Browser und war mit curl trivial umgehbar.
//
// Der Endpunkt wurde bewusst NICHT nur weggeguarded, sondern ersetzt:
// Ein HTTP-Endpunkt, der Admin-Accounts erzeugt, ist auch mit Guard eine
// Fehlkonfiguration von der Katastrophe entfernt (z. B. vergessenes
// NODE_ENV=production). Für den lokalen Komfort gibt es stattdessen:
//
//     cd backend && npm run seed:dev-admin
//
// Das Skript läuft ausschließlich über die CLI, verweigert den Start bei
// NODE_ENV=production und hat keine HTTP-Angriffsfläche.
// Siehe backend/scripts/seed-dev-admin.js
//
// ⚠️  NICHT wieder hinzufügen. Regressionstest: __tests__/auth.test.js
//     ('SECURITY: dev-login darf nicht existieren')
// ============================================================================

// ============================================================================
// 🔍 POST /api/auth/verify - Verify JWT Token is Valid
// ============================================================================

router.post('/verify', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user,
  });
});

// ============================================================================
// 👤 GET /api/auth/me - Get Current Authenticated User
// ============================================================================

router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role, created_at, is_active FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    console.log(`✅ User profile fetched: ${result.rows[0].username}`);
    res.json({ user: result.rows[0] });
  } catch (err) {
    console.error('❌ Get user error:', err);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ============================================================================
// 🔓 POST /api/auth/logout - Logout (Client removes token)
// ============================================================================

router.post('/logout', verifyToken, (req, res) => {
  console.log(`✅ User ${req.user.id} logged out`);
  clearAuthCookie(res); // HttpOnly Cookie löschen
  res.json({ success: true, message: 'Logged out successfully' });
});

// ============================================================================
// 🔄 POST /api/auth/refresh-token - Refresh JWT Token
// ============================================================================

router.post('/refresh-token', verifyToken, async (req, res) => {
  try {
    // Fetch latest user data
    const result = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];
    const token = generateJWT(user);
    setAuthCookie(res, token); // Cookie erneuern

    console.log(`✅ Token refreshed for user: ${user.username}`);
    res.json({ token }); // Beibehalten für Rückwärtskompatibilität
  } catch (err) {
    console.error('❌ Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

// ============================================================================
// 🔑 POST /api/auth/password-reset/request — Reset-Token anfordern
// ============================================================================
router.post('/password-reset/request', [
  body('email').isEmail().normalizeEmail().withMessage('Ungültige E-Mail'),
], async (req, res) => {
  // Immer 200 zurückgeben (verhindert User-Enumeration)
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(200).json({ message: 'OK' });

  const { email } = req.body;
  try {
    const result = await pool.query('SELECT id, email, username FROM users WHERE email = $1 AND is_active = true', [email]);
    if (result.rows.length === 0) return res.status(200).json({ message: 'OK' });

    const user = result.rows[0];
    const crypto = require('crypto');
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 Stunde

    // Token in DB speichern (Spalte wird ggf. angelegt)
    await pool.query(
      `INSERT INTO password_reset_tokens (user_id, token, expires_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO UPDATE SET token = $2, expires_at = $3, created_at = NOW()`,
      [user.id, token, expiresAt]
    );

    // E-Mail versenden (dev: nur Log, prod: echte E-Mail via Nodemailer)
    await sendPasswordResetEmail(user.email, token, process.env.FRONTEND_URL || 'http://localhost:3000');

    res.status(200).json({ message: 'OK' });
  } catch (err) {
    console.error('Password reset request error:', err);
    res.status(200).json({ message: 'OK' }); // Kein Fehler nach außen
  }
});

// ============================================================================
// 🔑 POST /api/auth/password-reset/verify — Token prüfen
// ============================================================================
router.post('/password-reset/verify', [
  body('token').notEmpty().trim(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ error: 'Token fehlt' });

  const { token } = req.body;
  try {
    const result = await pool.query(
      `SELECT prt.user_id, prt.expires_at, u.email
       FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1`,
      [token]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Ungültiger Token' });
    if (new Date(result.rows[0].expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token abgelaufen. Bitte neu anfordern.' });
    }
    res.json({ valid: true });
  } catch (err) {
    console.error('Password reset verify error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

// ============================================================================
// 🔑 POST /api/auth/password-reset/confirm — Neues Passwort setzen
// ============================================================================
router.post('/password-reset/confirm', [
  body('token').notEmpty().trim(),
  body('newPassword').isLength({ min: 8 }).withMessage('Mindestens 8 Zeichen'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });

  const { token, newPassword } = req.body;
  try {
    const result = await pool.query(
      `SELECT prt.user_id, prt.expires_at
       FROM password_reset_tokens prt
       WHERE prt.token = $1`,
      [token]
    );
    if (result.rows.length === 0) return res.status(400).json({ error: 'Ungültiger Token' });
    if (new Date(result.rows[0].expires_at) < new Date()) {
      return res.status(400).json({ error: 'Token abgelaufen' });
    }

    const userId = result.rows[0].user_id;
    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(newPassword, bcryptRounds);

    await pool.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [hashedPassword, userId]);
    await pool.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);

    console.log(`✅ Passwort erfolgreich zurückgesetzt für User ID ${userId}`);
    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (err) {
    console.error('Password reset confirm error:', err);
    res.status(500).json({ error: 'Serverfehler' });
  }
});

module.exports = router;

// ============================================================================
// 📖 DATABASE SCHEMA REFERENCE
// ============================================================================
/*
USERS TABLE:
- id: integer (PRIMARY KEY)
- email: varchar (UNIQUE, REQUIRED)
- username: varchar (REQUIRED)
- password_hash: varchar (REQUIRED)
- role: varchar - Default: 'user' (user | admin)
- is_active: boolean - Default: true
- created_at: timestamp - Default: CURRENT_TIMESTAMP
- last_login: timestamp
- updated_at: timestamp - Default: CURRENT_TIMESTAMP
- webauthn_credential: jsonb

IMPORTANT:
✅ Uses auth-middleware.js for verifyToken & generateJWT
✅ All passwords hashed with bcrypt
✅ Case-insensitive username/email search
✅ Token generation uses auth-middleware.generateJWT()
✅ last_login updated on every successful login
✅ is_active flag prevents deactivated users from logging in
✅ SECURITY: Plaintext password fallback DISABLED in production
*/
