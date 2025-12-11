// ============================================================================
// 🔐 WEBAUTHN ROUTES - FIXED & OPTIMIZED FOR ALL BROWSERS
// ============================================================================
const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../server');

// npm install @simplewebauthn/server base64url
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const base64urlPkg = require('base64url');

// HELPER: Base64URL
function base64url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// HELPER: JWT
const jwt = require('jsonwebtoken');
function generateJWT(user) {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ========================================================================
// 🔧 HELPER: rpID-Konfiguration (Browser-kompatibel)
// ========================================================================
function getRPID() {
    // ✅ FIX: Für localhost rpID weglassen oder undefined zurück (browser wird automatisch current domain)
    const rpid = process.env.WEBAUTHN_RP_ID || 'localhost';

    // Firefox mag localhost.rpID nicht. Daher: undefined für localhost
    if (rpid === 'localhost' || rpid === '127.0.0.1') {
        return undefined;
    }
    return rpid;
}

// ========================================================================
// 📝 REGISTER - OPTIONS
// ========================================================================
router.post('/webauthn-register-options', async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username || !email) return res.status(400).json({ error: 'Missing fields' });

        // Check user existence
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

        // 🆔 User ID generieren
        const userID = crypto.randomBytes(16);

        const rpID = getRPID();

        // ⚙️ WebAuthn Options
        const optionsConfig = {
            rpID: rpID,  // ✅ undefined für localhost (Browser-fix)
            rpName: 'SONG-NEXUS',
            userID: userID,
            userName: email,
            userDisplayName: username,
            attestationType: 'none',
            authenticatorSelection: {
                // ✅ IMPROVED: Nicht mehr 'platform' erzwingen
                // Dadurch funktioniert WebAuthn auf mehr Systemen (auch Firefox)
                authenticatorAttachment: undefined,  // Erlaubt sowohl platform als auch cross-platform
                userVerification: 'preferred',
                residentKey: 'preferred'
            }
        };

        console.log('🔧 Registration config:', {
            rpID: optionsConfig.rpID,
            authenticatorAttachment: optionsConfig.authenticatorSelection.authenticatorAttachment
        });

        const options = await generateRegistrationOptions(optionsConfig);

        // 💾 Challenge in Session speichern
        req.session.webauthnChallenge = options.challenge;
        req.session.webauthnUsername = username;
        req.session.webauthnEmail = email;
        req.session.webauthnUserId = base64url(userID);

        console.log('✅ Register Options generated for:', email);
        console.log('   Challenge length:', options.challenge.length);
        console.log('   Session ID:', req.sessionID);

        res.json(options);
    } catch (error) {
        console.error('❌ Register Options Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 📝 REGISTER - VERIFY
// ========================================================================
router.post('/webauthn-register-verify', async (req, res) => {
    try {
        const { webauthnChallenge, webauthnEmail, webauthnUsername } = req.session;

        if (!webauthnChallenge) {
            console.error('❌ No challenge in session! Session lost?');
            return res.status(400).json({ error: 'Session expired or invalid' });
        }

        const rpID = getRPID();
        const expectedOrigin = process.env.WEBAUTHN_ORIGIN || 'https://localhost:5500';

        console.log('🔍 Verifying with:', {
            rpID: rpID,
            origin: expectedOrigin
        });

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: webauthnChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID  // ✅ undefined für localhost ist ok
        });

        if (verification.verified) {
            // Debug: Schauen, was verification zurückgibt
            console.log('✅ Verification result:', verification);

            const credentialData = {
                credentialID: typeof verification.registrationInfo?.credentialID === 'string'
                    ? verification.registrationInfo.credentialID
                    : base64url(Buffer.from(verification.registrationInfo?.credentialID || '')),
                credentialPublicKey: typeof verification.registrationInfo?.credentialPublicKey === 'string'
                    ? verification.registrationInfo.credentialPublicKey
                    : base64url(Buffer.from(verification.registrationInfo?.credentialPublicKey || '')),
                counter: verification.registrationInfo?.counter || 0
            };


            // DB Insert
            const bcrypt = require('bcryptjs');
            const hashedPassword = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 10);

            const result = await pool.query(
                'INSERT INTO users (username, email, password_hash, webauthn_credential) VALUES ($1, $2, $3, $4) RETURNING id, username, email',
                [webauthnUsername, webauthnEmail, hashedPassword, JSON.stringify(credentialData)]
            );

            // Cleanup Session
            req.session.webauthnChallenge = null;

            const token = generateJWT(result.rows[0]);
            console.log('✅ Register Verify Success:', webauthnEmail);
            res.json({ success: true, token, user: result.rows[0] });
        } else {
            console.error('❌ Verification failed:', verification);
            res.status(400).json({ error: 'Verification failed' });
        }
    } catch (error) {
        console.error('❌ Register Verify Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 🔓 LOGIN - OPTIONS
// ========================================================================
router.post('/webauthn-authenticate-options', async (req, res) => {
    try {
        const rpID = getRPID();

        console.log('🔧 Authentication config:', {
            rpID: rpID
        });

        const options = await generateAuthenticationOptions({
            rpID: rpID,  // ✅ undefined für localhost
            userVerification: 'preferred'
        });

        req.session.webauthnChallenge = options.challenge;
        console.log('✅ Login Options generated. Challenge stored.');
        console.log('   Challenge length:', options.challenge.length);

        res.json(options);
    } catch (error) {
        console.error('❌ Login Options Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ========================================================================
// 🔓 LOGIN - VERIFY
// ========================================================================
router.post('/webauthn-authenticate-verify', async (req, res) => {
    try {
        const { webauthnChallenge } = req.session;
        if (!webauthnChallenge) return res.status(400).json({ error: 'No challenge found' });

        // 1. User finden anhand Credential ID
        const result = await pool.query('SELECT * FROM users WHERE webauthn_credential IS NOT NULL');
        let user = null;
        let dbCred = null;

        for (const row of result.rows) {
            const cred = JSON.parse(row.webauthn_credential);
            if (cred.credentialID === req.body.rawId || cred.credentialID === base64url(Buffer.from(req.body.rawId, 'base64'))) {
                user = row;
                dbCred = cred;
                break;
            }
        }

        if (!user) return res.status(400).json({ error: 'User not found' });

        const rpID = getRPID();
        const expectedOrigin = process.env.WEBAUTHN_ORIGIN || 'https://localhost:5500';

        console.log('🔍 Verifying authentication with:', {
            rpID: rpID,
            origin: expectedOrigin,
            userEmail: user.email
        });

        // 2. Verify
        const verification = await verifyAuthenticationResponse({
            response: req.body,
            expectedChallenge: webauthnChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID,  // ✅ undefined für localhost ist ok
            credential: {
                id: dbCred.credentialID,
                publicKey: Buffer.from(dbCred.credentialPublicKey, 'base64'),
                counter: dbCred.counter
            }
        });

        if (verification.verified) {
            // Counter updaten (Replay Attack Schutz)
            dbCred.counter = verification.authenticationInfo.newCounter;
            await pool.query('UPDATE users SET webauthn_credential = $1 WHERE id = $2', [JSON.stringify(dbCred), user.id]);

            req.session.webauthnChallenge = null;
            const token = generateJWT(user);
            console.log('✅ Login Success:', user.email);
            res.json({ success: true, token, user: { id: user.id, username: user.username, email: user.email } });
        } else {
            console.error('❌ Authentication verification failed:', verification);
            res.status(400).json({ error: 'Verification failed' });
        }
    } catch (error) {
        console.error('❌ Login Verify Error:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;