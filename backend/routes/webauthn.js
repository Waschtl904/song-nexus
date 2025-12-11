// ============================================================================
// 🔧 WEBAUTHN ROUTES - FIREFOX FIX (CORRECTED)
// ============================================================================
// Ersetze deine bestehende Datei damit!
// ============================================================================

const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const { pool } = require('../server');

const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');

const base64urlPkg = require('base64url');

// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================

function base64url(buf) {
    return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

const jwt = require('jsonwebtoken');
function generateJWT(user) {
    return jwt.sign(
        { id: user.id, username: user.username, email: user.email },
        process.env.JWT_SECRET,
        { expiresIn: '7d' }
    );
}

// ============================================================================
// 🔧 FIXED: getRPID() - rpID MUSS IMMER definiert sein!
// ============================================================================

/**
 * ✅ FIX: rpID darf NIEMALS undefined sein!
 * WebAuthn braucht IMMER eine rpID.
 * Für localhost: 'localhost'
 * Für ngrok: 'xxxx-xxxx-xxxx.ngrok.io'
 */
function getRPID() {
    // ✅ WICHTIG: Nutze .env oder setze hier direkt
    const rpid = process.env.WEBAUTHN_RP_ID || 'localhost';

    console.log('✅ WebAuthn rpID configured:', rpid);
    console.log('   (Sicherstelle dass es in .env gesetzt ist!)');

    // ✅ IMMER einen Wert zurückgeben, NIE undefined!
    return rpid;
}

// ============================================================================
// 🔧 FIXED: getExpectedOrigin() 
// ============================================================================

/**
 * ✅ FIX: Origin muss HTTP oder HTTPS sein
 * Für localhost: 'http://localhost:5500'
 * Für ngrok: 'https://xxxx-xxxx-xxxx.ngrok.io'
 */
function getExpectedOrigin() {
    // ✅ WICHTIG: http:// NICHT https:// für localhost!
    const origin = process.env.WEBAUTHN_ORIGIN || 'http://localhost:5500';

    console.log('✅ WebAuthn expectedOrigin:', origin);

    // ⚠️ WICHTIG: Origin muss http:// oder https:// sein, KEIN localhost:5500 allein!
    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
        console.error('❌ FEHLER: Origin muss mit http:// oder https:// starten!');
        throw new Error('Invalid WEBAUTHN_ORIGIN: must start with http:// or https://');
    }

    return origin;
}

// ============================================================================
// 📝 REGISTER - OPTIONS (FIXED!)
// ============================================================================

router.post('/webauthn/register-options', async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username || !email) return res.status(400).json({ error: 'Missing fields' });

        // Check user existence
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) return res.status(400).json({ error: 'User already exists' });

        const userID = crypto.randomBytes(16);
        const rpID = getRPID();  // ✅ NOW mit Wert!
        const expectedOrigin = getExpectedOrigin();  // ✅ Für Debugging

        // ⚙️ SimpleWebAuthn Options
        const optionsConfig = {
            rpID: rpID,  // ✅ NEVER undefined!
            rpName: 'SONG-NEXUS',
            userID: userID,
            userName: email,
            userDisplayName: username,
            attestationType: 'none',
            authenticatorSelection: {
                authenticatorAttachment: undefined,
                userVerification: 'preferred',
                residentKey: 'discouraged'
            },
            timeout: 60000,
            supportedAlgorithmIDs: [-7, -257]
        };

        console.log('🔧 Registration config:', {
            rpID: optionsConfig.rpID,
            userVerification: optionsConfig.authenticatorSelection.userVerification,
            residentKey: optionsConfig.authenticatorSelection.residentKey
        });

        const options = await generateRegistrationOptions(optionsConfig);

        // 💾 Challenge in Session speichern
        req.session.webauthnChallenge = options.challenge;
        req.session.webauthnUsername = username;
        req.session.webauthnEmail = email;
        req.session.webauthnUserId = base64url(userID);

        console.log('✅ Register Options generated for:', email);
        console.log('   Challenge length:', options.challenge.length);
        console.log('   rpID being used:', options.rp.id);
        console.log('   Session ID:', req.sessionID);

        // ✅ Sende komplette Options (nicht gefiltert!)
        res.json(options);

    } catch (error) {
        console.error('❌ Register Options Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 📝 REGISTER - VERIFY (IMPROVED)
// ============================================================================

router.post('/webauthn/register-verify', async (req, res) => {
    try {
        const { webauthnChallenge, webauthnEmail, webauthnUsername } = req.session;

        console.log('🔍 Register Verify - Session Check:', {
            hasChallenge: !!webauthnChallenge,
            sessionID: req.sessionID
        });

        if (!webauthnChallenge) {
            console.error('❌ No challenge in session!');
            return res.status(400).json({
                error: 'Session expired or invalid',
                hint: 'Try registering again'
            });
        }

        const rpID = getRPID();  // ✅ NOW mit Wert!
        const expectedOrigin = getExpectedOrigin();  // ✅ NOW mit Wert!

        console.log('🔍 Verifying Registration with:', {
            rpID: rpID,
            origin: expectedOrigin,
            email: webauthnEmail
        });

        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: webauthnChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID
        });

        if (verification.verified) {
            console.log('✅ Verification successful!');

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
            console.log('✅ Register Success:', webauthnEmail);

            res.json({
                success: true,
                token,
                user: result.rows[0]
            });

        } else {
            console.error('❌ Verification failed');
            res.status(400).json({ error: 'Verification failed' });
        }

    } catch (error) {
        console.error('❌ Register Verify Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 🔓 LOGIN - OPTIONS (FIXED!)
// ============================================================================

router.post('/webauthn/authenticate-options', async (req, res) => {
    try {
        const rpID = getRPID();  // ✅ NOW mit Wert!

        console.log('🔧 Authentication config:', {
            rpID: rpID,
            userVerification: 'preferred'
        });

        const options = await generateAuthenticationOptions({
            rpID: rpID,  // ✅ NEVER undefined!
            userVerification: 'preferred'
        });

        req.session.webauthnChallenge = options.challenge;
        console.log('✅ Login Options generated');
        console.log('   rpId being used:', options.rpId);

        res.json(options);

    } catch (error) {
        console.error('❌ Login Options Error:', error);
        res.status(500).json({ error: error.message });
    }
});

// ============================================================================
// 🔓 LOGIN - VERIFY (IMPROVED)
// ============================================================================

router.post('/webauthn/authenticate-verify', async (req, res) => {
    try {
        const { webauthnChallenge } = req.session;

        if (!webauthnChallenge) {
            console.error('❌ No challenge in session!');
            return res.status(400).json({ error: 'No challenge found. Try again.' });
        }

        // 1. Find user by credential
        const result = await pool.query('SELECT * FROM users WHERE webauthn_credential IS NOT NULL');
        let user = null;
        let dbCred = null;

        for (const row of result.rows) {
            const cred = JSON.parse(row.webauthn_credential);
            if (cred.credentialID === req.body.rawId) {
                user = row;
                dbCred = cred;
                break;
            }
        }

        if (!user) {
            console.error('❌ User not found for credential');
            return res.status(400).json({ error: 'User not found' });
        }

        const rpID = getRPID();  // ✅ NOW mit Wert!
        const expectedOrigin = getExpectedOrigin();  // ✅ NOW mit Wert!

        console.log('🔍 Verifying Authentication:', {
            rpID: rpID,
            origin: expectedOrigin,
            userEmail: user.email
        });

        // 2. Verify
        const verification = await verifyAuthenticationResponse({
            response: req.body,
            expectedChallenge: webauthnChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID,
            credential: {
                id: dbCred.credentialID,
                publicKey: Buffer.from(dbCred.credentialPublicKey, 'base64'),
                counter: dbCred.counter
            }
        });

        if (verification.verified) {
            // Update counter
            dbCred.counter = verification.authenticationInfo.newCounter;
            await pool.query('UPDATE users SET webauthn_credential = $1 WHERE id = $2',
                [JSON.stringify(dbCred), user.id]);

            req.session.webauthnChallenge = null;
            const token = generateJWT(user);
            console.log('✅ Auth Success:', user.email);

            res.json({
                success: true,
                token,
                user: { id: user.id, username: user.username, email: user.email }
            });

        } else {
            console.error('❌ Authentication verification failed');
            res.status(400).json({ error: 'Verification failed' });
        }

    } catch (error) {
        console.error('❌ Auth Verify Error:', error.message);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;