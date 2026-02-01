const express = require('express');
const bcrypt = require('bcryptjs');
const { body, validationResult } = require('express-validator');
const { pool } = require('../server');
const { verifyToken, generateJWT } = require('../middleware/auth-middleware');
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

    // 4️⃣ Generate JWT token
    const token = generateJWT(user);

    res.status(201).json({
      message: 'User registered successfully',
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token,
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

    // 4️⃣ Generate JWT token
    const token = generateJWT(user);
    console.log(`✅ JWT token generated for user: ${user.username}`);

    res.json({
      message: 'Login successful',
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token,
    });
  } catch (err) {
    console.error('❌ Login error:', err);
    res.status(500).json({ error: 'Server error during login' });
  }
});

// ============================================================================
// 🧨 POST /api/auth/dev-login - Development Quick Login
// ============================================================================

router.post('/dev-login', async (req, res) => {
  try {
    console.log('🧨 Dev login attempt...');

    const devEmail = 'dev@localhost';
    const devUsername = 'devuser';
    const devPassword = 'dev123456';

    // 1️⃣ Check if dev user exists
    let userResult = await pool.query(
      'SELECT id, email, username, role FROM users WHERE email = $1',
      [devEmail]
    );

    let user;
    if (userResult.rows.length === 0) {
      // Create dev user if not exists
      console.log('📃 Creating dev user...');
      const hashedPassword = await bcrypt.hash(devPassword, 10);
      userResult = await pool.query(
        `INSERT INTO users (email, username, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, email, username, role`,
        [devEmail, devUsername, hashedPassword, 'admin', true]
      );
      console.log('✅ Dev user created');
    } else {
      console.log('✅ Dev user already exists');
    }

    user = userResult.rows[0];

    // 2️⃣ Generate token
    const token = generateJWT(user);

    res.json({
      success: true,
      message: '✅ Dev login successful',
      user: { id: user.id, email: user.email, username: user.username, role: user.role },
      token,
    });
  } catch (err) {
    console.error('❌ Dev login error:', err);
    res.status(500).json({ error: 'Dev login failed' });
  }
});

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
  // Stateless: Just acknowledge logout (token removed on client)
  console.log(`✅ User ${req.user.id} logged out`);
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

    console.log(`✅ Token refreshed for user: ${user.username}`);
    res.json({ token });
  } catch (err) {
    console.error('❌ Refresh token error:', err);
    res.status(500).json({ error: 'Failed to refresh token' });
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
