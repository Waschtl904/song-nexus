// ============================================================================
// 🔐 WEBAUTHN ROUTES - server.js Integration
// ============================================================================
// Speichern unter: routes/webauthn.js

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../server');

// NPM packages (bereits installiert):
// npm install @simplewebauthn/server base64url

const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const base64url = require('base64url');

// ========================================================================
// 🔒 HELPER: JWT Token generieren
// ========================================================================

const jwt = require('jsonwebtoken');

function generateJWT(user) {
    return jwt.sign(
        {
            id: user.id,
            username: user.username,
            email: user.email
        },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ========================================================================
// 📝 WEBAUTHN REGISTRATION - OPTIONS
// ========================================================================

router.post('/webauthn-register-options', async (req, res) => {
    try {
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email required' });
        }

        // Check ob User bereits existiert
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }

        // WebAuthn Challenge generieren
        const options = generateRegistrationOptions({
            rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
            rpName: 'SONG-NEXUS',
            userID: crypto.randomBytes(16),
            userName: email,
            userDisplayName: username,
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: 'platform', // 👆 Nur Gerät (Fingerprint/Face)
                userVerification: 'preferred' // ✅ Barrierefrei
            }
        });

        // Challenge im Session speichern
        req.session = req.session || {};
        req.session.webauthnChallenge = options.challenge;
        req.session.webauthnUsername = username;
        req.session.webauthnEmail = email;
        req.session.webauthnUserId = options.user.id;

        console.log('✅ WebAuthn registration options generated for:', email);

        res.json(options);
    } catch (error) {
        console.error('❌ Registration options error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// ✅ WEBAUTHN REGISTRATION - VERIFY
// ========================================================================

router.post('/webauthn-register-verify', async (req, res) => {
    try {
        const { id, rawId, response } = req.body;

        if (!req.session || !req.session.webauthnChallenge) {
            return res.status(400).json({ error: 'No challenge found in session' });
        }

        // Verifizieren
        let verification;
        try {
            verification = await verifyRegistrationResponse({
                response: req.body,
                expectedChallenge: req.session.webauthnChallenge,
                expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:5500',
                expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost'
            });
        } catch (verifyError) {
            console.error('❌ Verification failed:', verifyError.message);
            return res.status(400).json({ error: 'Verification failed: ' + verifyError.message });
        }

        if (!verification.verified) {
            return res.status(400).json({ error: 'WebAuthn verification failed' });
        }

        // User in DB speichern
        const { webauthnUsername, webauthnEmail } = req.session;
        const hashedPassword = await require('bcryptjs').hash('webauthn', 10);

        try {
            const result = await pool.query(
                'INSERT INTO users (username, email, password_hash, webauthn_credential) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
                [
                    webauthnUsername,
                    webauthnEmail,
                    hashedPassword,
                    JSON.stringify(verification.registrationInfo)
                ]
            );

            const user = result.rows[0];

            // JWT Token generieren
            const token = generateJWT(user);

            // Session cleanup
            delete req.session.webauthnChallenge;
            delete req.session.webauthnUsername;
            delete req.session.webauthnEmail;
            delete req.session.webauthnUserId;

            console.log('✅ WebAuthn registration successful for:', webauthnEmail);

            res.json({
                success: true,
                token,
                user: {
                    id: user.id,
                    username: user.username,
                    email: user.email
                }
            });
        } catch (dbError) {
            console.error('❌ Database error during registration:', dbError.message);
            res.status(500).json({ error: 'Database error: ' + dbError.message });
        }
    } catch (error) {
        console.error('❌ Registration verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 🔓 WEBAUTHN AUTHENTICATION - OPTIONS
// ========================================================================

router.post('/webauthn-authenticate-options', async (req, res) => {
    try {
        // WebAuthn Challenge für Login generieren
        const options = generateAuthenticationOptions({
            rpID: process.env.WEBAUTHN_RP_ID || 'localhost'
        });

        // Challenge speichern
        req.session = req.session || {};
        req.session.webauthnChallenge = options.challenge;

        console.log('✅ WebAuthn auth options generated');

        res.json(options);
    } catch (error) {
        console.error('❌ Auth options error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// ✅ WEBAUTHN AUTHENTICATION - VERIFY
// ========================================================================

router.post('/webauthn-authenticate-verify', async (req, res) => {
    try {
        if (!req.session || !req.session.webauthnChallenge) {
            return res.status(400).json({ error: 'No challenge found' });
        }

        const credentialId = req.body.id;

        // User finden anhand der Credential
        const result = await pool.query(
            'SELECT id, username, email, webauthn_credential FROM users WHERE webauthn_credential IS NOT NULL',
            []
        );

        let user = null;
        let storedCredential = null;

        for (const row of result.rows) {
            const cred = JSON.parse(row.webauthn_credential);
            if (cred && cred.credentialID === credentialId) {
                user = row;
                storedCredential = cred;
                break;
            }
        }

        if (!user || !storedCredential) {
            return res.status(400).json({ error: 'Credential not found' });
        }

        // Verifizieren
        let verification;
        try {
            verification = await verifyAuthenticationResponse({
                response: req.body,
                expectedChallenge: req.session.webauthnChallenge,
                expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'http://localhost:5500',
                expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
                credential: {
                    credentialPublicKey: Buffer.from(storedCredential.credentialPublicKey, 'base64'),
                    credentialID: Buffer.from(credentialId, 'utf8'),
                    counter: storedCredential.counter || 0
                }
            });
        } catch (verifyError) {
            console.error('❌ Authentication verification failed:', verifyError.message);
            return res.status(400).json({ error: 'Authentication failed: ' + verifyError.message });
        }

        if (!verification.verified) {
            return res.status(400).json({ error: 'Authentication verification failed' });
        }

        // JWT Token generieren
        const token = generateJWT({
            id: user.id,
            username: user.username,
            email: user.email
        });

        // Session cleanup
        delete req.session.webauthnChallenge;

        console.log('✅ WebAuthn authentication successful for:', user.email);

        res.json({
            success: true,
            token,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('❌ Auth verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 🔗 MAGIC LINK LOGIN
// ========================================================================

router.post('/magic-link', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }

        // User finden
        const result = await pool.query(
            'SELECT id, username FROM users WHERE email = $1',
            [email]
        );

        // ✅ Aus Sicherheitsgründen: nicht verraten, ob Email existiert
        if (result.rows.length === 0) {
            return res.json({ message: 'Check your email for login link' });
        }

        const user = result.rows[0];
        const token = crypto.randomBytes(32).toString('hex');
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 min

        // Token speichern
        await pool.query(
            'INSERT INTO magic_links (user_id, token, expires_at) VALUES ($1, $2, $3)',
            [user.id, token, expiresAt]
        );

        // Login Link konstruieren
        const loginLink = `http://localhost:5500?token=${token}`;
        console.log('📧 Magic link for testing:', loginLink);

        // TODO: Echte Email versenden mit nodemailer
        // Für jetzt: nur in Console loggen

        res.json({
            message: 'Check your email for login link',
            // Nur für Development!
            ...(process.env.NODE_ENV === 'development' && { testLink: loginLink })
        });
    } catch (error) {
        console.error('❌ Magic link error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 🔗 MAGIC LINK VERIFY
// ========================================================================

router.post('/magic-link-verify', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }

        // Token finden
        const result = await pool.query(
            'SELECT user_id, expires_at FROM magic_links WHERE token = $1 AND used_at IS NULL',
            [token]
        );

        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'Invalid or expired token' });
        }

        const link = result.rows[0];

        // Check ob abgelaufen
        if (new Date() > new Date(link.expires_at)) {
            return res.status(400).json({ error: 'Token expired' });
        }

        // User laden
        const userResult = await pool.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [link.user_id]
        );

        if (userResult.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        // Token als verwendet markieren
        await pool.query(
            'UPDATE magic_links SET used_at = NOW() WHERE token = $1',
            [token]
        );

        // JWT generieren
        const jwtToken = generateJWT(user);

        console.log('✅ Magic link verified for:', user.email);

        res.json({
            success: true,
            token: jwtToken,
            user: {
                id: user.id,
                username: user.username,
                email: user.email
            }
        });
    } catch (error) {
        console.error('❌ Magic link verify error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 🧪 DEV LOGIN - NUR LOKAL
// ========================================================================

router.post('/dev-login', async (req, res) => {
    // ⚠️ NUR in Development!
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ error: 'Dev login not allowed in production' });
    }

    const { email, password } = req.body;

    // Hardcodierter Dev-User
    if (email === 'dev@localhost' && password === 'dev12345') {
        // Erstelle Dev-User wenn nicht existiert
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        let userId;

        if (existing.rows.length === 0) {
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(password, 10);

            const result = await pool.query(
                'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id',
                ['devuser', email, hashedPassword]
            );

            userId = result.rows[0].id;
            console.log('✅ Dev-User erstellt');
        } else {
            userId = existing.rows[0].id;
        }

        const token = generateJWT({
            id: userId,
            username: 'devuser',
            email: 'dev@localhost'
        });

        console.log('🧪 Dev login successful');

        res.json({
            success: true,
            token,
            user: {
                id: userId,
                username: 'devuser',
                email: 'dev@localhost'
            }
        });
    } else {
        res.status(401).json({ error: 'Invalid dev credentials' });
    }
});

module.exports = router;