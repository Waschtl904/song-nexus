// ============================================================================
// SIMPLE AUTH ROUTES - Login & Register
// backend/routes/auth-simple.js
// ============================================================================

const express = require('express');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcrypt');
const { pool } = require('../db');

const router = express.Router();

// ============================================================================
// POST /api/auth/login
// ============================================================================

router.post('/login', async (req, res) => {
    console.log('\n=== POST /api/auth/login ===');

    try {
        const { email, password } = req.body;

        // 1. Validate Input
        if (!email || !password) {
            console.log('❌ Validation failed: missing email or password');
            return res.status(400).json({
                message: 'Email und Passwort erforderlich'
            });
        }

        // 2. Query User
        const query = 'SELECT id, username, email, password_hash FROM users WHERE email = $1';
        const result = await pool.query(query, [email.toLowerCase()]);
        const user = result.rows[0];

        console.log(`🔍 User lookup: ${user ? 'FOUND' : 'NOT FOUND'}`);

        if (!user) {
            console.log('❌ User not found');
            return res.status(401).json({
                message: 'Email oder Passwort falsch'
            });
        }

        // 3. Check Password
        const passwordValid = await bcrypt.compare(password, user.password_hash);
        console.log(`🔐 Password check: ${passwordValid ? 'OK' : 'FAIL'}`);

        if (!passwordValid) {
            console.log('❌ Password mismatch');
            return res.status(401).json({
                message: 'Email oder Passwort falsch'
            });
        }

        // 4. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        console.log(`✅ Token generated for user ${user.id}`);

        // 5. Return Success
        res.json({
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });

    } catch (error) {
        console.error('❌ Login error:', error.message);
        res.status(500).json({
            message: 'Fehler beim Login',
            error: error.message
        });
    }
});

// ============================================================================
// POST /api/auth/register
// ============================================================================

router.post('/register', async (req, res) => {
    console.log('\n=== POST /api/auth/register ===');

    try {
        const { username, email, password } = req.body;

        // 1. Validate Input
        if (!username || !email || !password) {
            console.log('❌ Validation failed: missing required fields');
            return res.status(400).json({
                message: 'Benutzername, Email und Passwort erforderlich'
            });
        }

        if (password.length < 6) {
            console.log('❌ Password too short');
            return res.status(400).json({
                message: 'Passwort muss mindestens 6 Zeichen lang sein'
            });
        }

        // 2. Check if User Already Exists
        const checkQuery = 'SELECT id FROM users WHERE email = $1 OR username = $2';
        const checkResult = await pool.query(checkQuery, [email.toLowerCase(), username]);

        if (checkResult.rows.length > 0) {
            console.log('❌ User already exists');
            return res.status(409).json({
                message: 'Email oder Benutzername existiert bereits'
            });
        }

        // 3. Hash Password
        const hashedPassword = await bcrypt.hash(password, 10);
        console.log('🔐 Password hashed');

        // 4. Create User
        const insertQuery = `
            INSERT INTO users (username, email, password_hash, created_at)
            VALUES ($1, $2, $3, NOW())
            RETURNING id, username, email
        `;
        const insertResult = await pool.query(insertQuery, [
            username,
            email.toLowerCase(),
            hashedPassword
        ]);

        const newUser = insertResult.rows[0];
        console.log(`✅ User created: ${newUser.id}`);

        // 5. Generate JWT Token
        const token = jwt.sign(
            { id: newUser.id, email: newUser.email },
            process.env.JWT_SECRET || 'your-secret-key',
            { expiresIn: '7d' }
        );

        console.log(`✅ Token generated for user ${newUser.id}`);

        // 6. Return Success
        res.status(201).json({
            token,
            user: {
                id: newUser.id,
                username: newUser.username,
                email: newUser.email
            }
        });

    } catch (error) {
        console.error('❌ Register error:', error.message);
        res.status(500).json({
            message: 'Fehler bei der Registrierung',
            error: error.message
        });
    }
});

module.exports = router;