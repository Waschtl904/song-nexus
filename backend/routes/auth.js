const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool } = require('../server');

const router = express.Router();

// ============================================================================
// 🔐 MIDDLEWARE: Verify JWT
// ============================================================================

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(403).json({ error: 'Invalid token' });
  }
};

// ============================================================================
// 📝 REGISTER
// ============================================================================

router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 8 }).withMessage('Password min 8 chars'),
  body('username').isLength({ min: 3, max: 20 }).trim().escape(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, username } = req.body;

  try {
    const existingUser = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User already exists' });
    }

    const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
    const hashedPassword = await bcrypt.hash(password, bcryptRounds);

    const result = await pool.query(
      'INSERT INTO users (email, username, password_hash, role) VALUES ($1, $2, $3, $4) RETURNING id, email, username, role',
      [email, username, hashedPassword, 'user']
    );

    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, username: user.username },
      token
    });
  } catch (err) {
    console.error('❌ Register error:', err);
    res.status(500).json({ error: 'Server error during registration' });
  }
});

// ============================================================================
// 🔑 LOGIN
// ============================================================================

router.post('/login', [
  body('email').isEmail().normalizeEmail(),
  body('password').notEmpty(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password } = req.body;

  try {
    const result = await pool.query(
      'SELECT id, password_hash, username, role FROM users WHERE email = $1 AND is_active = TRUE',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);

    const token = jwt.sign({ id: user.id, role: user.role }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRE });

    res.json({
      message: 'Login successful',
      user: { id: user.id, username: user.username, role: user.role },
      token
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ============================================================================
// 🧪 DEV LOGIN
// ============================================================================

router.post('/dev-login', async (req, res) => {
  try {
    console.log('🧪 Dev login attempt...');

    const devEmail = 'dev@localhost';
    const devUsername = 'devuser';

    let user = await pool.query(
      'SELECT id, username, role FROM users WHERE email = $1',
      [devEmail]
    );

    if (user.rows.length === 0) {
      const hashedPassword = await bcrypt.hash('dev123456', 10);
      user = await pool.query(
        'INSERT INTO users (email, username, password_hash, role, is_active) VALUES ($1, $2, $3, $4, $5) RETURNING id, username, role',
        [devEmail, devUsername, hashedPassword, 'admin', true]
      );
    }

    const userData = user.rows[0];
    const token = jwt.sign(
      { id: userData.id, role: userData.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );

    res.json({
      success: true,
      message: '✅ Dev login successful',
      user: { id: userData.id, username: userData.username, role: userData.role },
      token
    });
  } catch (err) {
    console.error('❌ Dev login error:', err);
    res.status(500).json({ error: 'Dev login failed' });
  }
});

// ============================================================================
// 🔍 VERIFY TOKEN
// ============================================================================

router.post('/verify', verifyToken, (req, res) => {
  res.json({
    valid: true,
    user: req.user
  });
});

// ============================================================================
// 👤 GET CURRENT USER
// ============================================================================

router.get('/me', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT id, email, username, role FROM users WHERE id = $1',
      [req.user.id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({ user: result.rows[0] });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get user' });
  }
});

// ============================================================================
// 🔓 LOGOUT
// ============================================================================

router.post('/logout', verifyToken, (req, res) => {
  res.json({ message: 'Logged out successfully' });
});

// ============================================================================
// 🔄 REFRESH TOKEN
// ============================================================================

router.post('/refresh-token', verifyToken, (req, res) => {
  try {
    const token = jwt.sign(
      { id: req.user.id, role: req.user.role },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRE }
    );
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: 'Failed to refresh token' });
  }
});

module.exports = router;
module.exports.verifyToken = verifyToken;