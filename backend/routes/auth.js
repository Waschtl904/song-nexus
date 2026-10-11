const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { verifyToken } = require('../middleware/auth-middleware');
const { createLogin, refreshLogin, logout, clearAuthCookie, digest } = require('../utils/auth-session');
const { createAccountLink, consumeAccountLink } = require('../utils/security-state');
const { sendPasswordResetEmail } = require('../utils/mailer');
const { passwortValidator } = require('../utils/password-policy');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
const publicUser = user => ({ id: user.id, email: user.email, username: user.username, role: user.role });
const failure = (res, error) => res.status(error.status || 503).json({ error: 'Authentication unavailable' });
router.post('/register', [
  body('email').isEmail().normalizeEmail(), body('password').custom(passwortValidator()),
  body('username').isLength({ min: 3, max: 20 }).trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  const { email, password, username } = req.body;
  try {
    const existing = await pool.query('SELECT id FROM users WHERE email=$1 OR LOWER(username)=LOWER($2)', [email, username]);
    if (existing.rows.length) return res.status(400).json({ error: 'User already exists' });
    const hash = await bcrypt.hash(password, Number(process.env.BCRYPT_ROUNDS || 12));
    const result = await pool.query(`INSERT INTO users(email,username,password_hash,role,is_active)
      VALUES($1,$2,$3,'user',true) RETURNING id,email,username,role,token_version`, [email, username, hash]);
    const user = result.rows[0];
    await createLogin(user, res);
    res.status(201).json({ user: publicUser(user) });
  } catch (error) { failure(res, error); }
});
router.post('/login', [body('username').notEmpty(), body('password').notEmpty()], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  try {
    const result = await pool.query(`SELECT id,email,username,password_hash,role,is_active,token_version FROM users
      WHERE (LOWER(username)=LOWER($1) OR email=$1) AND is_active=true LIMIT 1`, [req.body.username]);
    const user = result.rows[0];
    if (!user || user.is_active !== true || !await bcrypt.compare(req.body.password, user.password_hash))
      return res.status(401).json({ error: 'Invalid credentials' });
    await createLogin(user, res);
    await pool.query('UPDATE users SET last_login=now() WHERE id=$1', [user.id]);
    res.json({ user: publicUser(user) });
  } catch (error) { failure(res, error); }
});
router.post('/verify', verifyToken, (req, res) => res.json({ valid: true, user: publicUser(req.user) }));
router.get('/me', verifyToken, (req, res) => res.json({ user: publicUser(req.user) }));
router.post('/logout', async (req, res) => {
  try { await logout(req, res); res.json({ success: true }); }
  catch (error) { clearAuthCookie(res); failure(res, error); }
});
router.post('/logout-all', verifyToken, async (req, res) => {
  try { await logout(req, res, true); res.json({ success: true }); }
  catch (error) { failure(res, error); }
});
router.post('/refresh-token', async (req, res) => {
  try { res.json({ user: await refreshLogin(req, res) }); }
  catch (error) { failure(res, error); }
});
router.post('/password-reset/request', [body('email').isEmail().normalizeEmail()], async (req, res) => {
  if (!validationResult(req).isEmpty()) return res.json({ message: 'OK' });
  try {
    const result = await pool.query('SELECT id,email FROM users WHERE email=$1 AND is_active=true', [req.body.email]);
    if (result.rows.length) {
      const token = await createAccountLink(result.rows[0].id, 'reset');
      if (token) await sendPasswordResetEmail(result.rows[0].email, token, process.env.FRONTEND_URL || 'https://localhost:5500');
    }
  } catch { console.error('Password reset delivery failed'); }
  res.json({ message: 'OK' });
});
router.post('/password-reset/verify', async (req, res) => {
  const token = req.body.token;
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({ error: 'Invalid token' });
  try {
    const result = await pool.query(`SELECT l.user_id FROM account_links l JOIN users u ON u.id=l.user_id
      WHERE l.token_hash=$1 AND l.purpose='reset' AND l.expires_at>now()
      AND u.is_active=true AND l.token_version=u.token_version`, [digest(token)]);
    res.status(result.rows.length ? 200 : 400).json({ valid: result.rows.length > 0 });
  } catch (error) { failure(res, error); }
});
router.post('/password-reset/confirm', [body('newPassword').custom(passwortValidator())], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  let client;
  try {
    const hash = await bcrypt.hash(req.body.newPassword, Number(process.env.BCRYPT_ROUNDS || 12));
    client = await pool.connect();
    await client.query('BEGIN');
    const user = await consumeAccountLink(req.body.token, 'reset', client);
    if (!user) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Invalid token' }); }
    // Trigger invalidates access, refresh, downloads and outstanding account links.
    const changed = await client.query(`UPDATE users SET password_hash=$1,updated_at=now()
      WHERE id=$2 AND token_version=$3 AND is_active=true RETURNING id`, [hash, user.id, user.token_version]);
    if (!changed.rows.length) { await client.query('ROLLBACK'); return res.status(400).json({ error: 'Invalid token' }); }
    await client.query('COMMIT');
    clearAuthCookie(res);
    res.json({ message: 'Passwort erfolgreich geändert' });
  } catch (error) { if (client) await client.query('ROLLBACK'); failure(res, error); }
  finally { client?.release(); }
});
module.exports = router;
