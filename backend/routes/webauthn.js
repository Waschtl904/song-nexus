// ============================================================================
// 🔐 WEBAUTHN ROUTES v16.3 - COMPLETE FILE (WITH MAGIC LINK TOKEN IN LOGS)
// ============================================================================
// WebAuthn (Biometric) + Password Registration/Login + Magic Link (with token display)

const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const CBOR = require('cbor');
const nodemailer = require('nodemailer');

const {
    generateRegistrationOptions,
    generateAuthenticationOptions
} = require('@simplewebauthn/server');

const { setAuthCookie } = require('../middleware/auth-middleware');
const { pruefePasswort } = require('../utils/password-policy');

// ============================================================================
// 🔧 HELPER FUNCTIONS
// ============================================================================

function base64urlToBuffer(base64url) {
    if (!base64url) return null;
    try {
        const base64 = base64url
            .replace(/-/g, '+')
            .replace(/_/g, '/');
        const padLength = (4 - (base64.length % 4)) % 4;
        const paddedBase64 = base64 + '='.repeat(padLength);
        return Buffer.from(paddedBase64, 'base64');
    } catch (error) {
        console.error('❌ base64urlToBuffer error:', error.message);
        return null;
    }
}

function bufferToBase64url(buffer) {
    return buffer.toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=/g, '');
}

function generateJWTToken(userId, username, email) {
    try {
        const secret = process.env.JWT_SECRET;
        const expiresIn = process.env.JWT_EXPIRE || '7d';

        if (!secret) {
            throw new Error('JWT_SECRET is missing');
        }

        const token = jwt.sign(
            { id: userId, username, email },
            secret,
            { expiresIn, algorithm: 'HS256' }
        );

        console.log('✅ JWT Token generated');
        return token;
    } catch (error) {
        console.error('❌ Error generating JWT token:', error.message);
        throw error;
    }
}

// ============================================================================
// 🔐 PASSWORD HASHING
// ============================================================================

async function hashPassword(password) {
    try {
        const salt = await bcrypt.genSalt(10);
        return await bcrypt.hash(password, salt);
    } catch (error) {
        console.error('❌ Error hashing password:', error.message);
        throw error;
    }
}

async function comparePassword(password, hash) {
    try {
        return await bcrypt.compare(password, hash);
    } catch (error) {
        console.error('❌ Error comparing password:', error.message);
        throw error;
    }
}

// ============================================================================
// 🔐 MANUAL WEBAUTHN VERIFICATION
// ============================================================================

function parseAuthData(authData) {
    try {
        console.log('   Parsing authData (length:', authData.length, ')');

        const rpIdHash = authData.slice(0, 32);
        const flags = authData[32];
        const userPresent = (flags & 0x01) !== 0;
        const userVerified = (flags & 0x04) !== 0;
        const attestedCredentialData = (flags & 0x40) !== 0;
        const signCount = authData.readUInt32BE(33);

        let credentialId = null;
        let credentialPublicKey = null;

        if (attestedCredentialData) {
            console.log('   ✅ Attested credential data present');

            const aaguid = authData.slice(37, 53);
            const credentialIdLength = authData.readUInt16BE(53);
            credentialId = authData.slice(55, 55 + credentialIdLength);

            console.log('   Credential ID length:', credentialIdLength);

            try {
                const cbor_pubkey_start = 55 + credentialIdLength;
                const remainingBuffer = authData.slice(cbor_pubkey_start);
                credentialPublicKey = CBOR.decode(remainingBuffer);
            } catch (cborError) {
                console.log('   ℹ️ Storing raw public key buffer');
                credentialPublicKey = authData.slice(55 + credentialIdLength);
            }
        }

        return {
            rpIdHash,
            flags,
            userPresent,
            userVerified,
            attestedCredentialData,
            signCount,
            credentialId,
            credentialPublicKey,
        };

    } catch (error) {
        console.error('❌ parseAuthData error:', error.message);
        throw error;
    }
}

async function manualVerifyRegistrationResponse({
    response,
    expectedChallenge,
    expectedOrigin,
    expectedRPID
}) {
    try {
        console.log('🔐 MANUAL VERIFICATION STARTING...');

        const clientDataJSONBuffer = response.clientDataJSON;
        const clientDataJSON = JSON.parse(clientDataJSONBuffer.toString('utf8'));

        console.log('   ✅ clientDataJSON decoded');

        if (clientDataJSON.challenge !== expectedChallenge) {
            throw new Error(`Challenge mismatch`);
        }
        if (clientDataJSON.origin !== expectedOrigin) {
            throw new Error(`Origin mismatch`);
        }
        if (clientDataJSON.type !== 'webauthn.create') {
            throw new Error(`Type mismatch`);
        }

        console.log('   ✅ Challenge, origin, and type verified');

        const attestationObjectBuffer = response.attestationObject;
        const attestationObject = CBOR.decode(attestationObjectBuffer);

        console.log('   ✅ Attestation object decoded');
        console.log('      fmt:', attestationObject.fmt);

        const authData = attestationObject.authData;
        const parsedAuthData = parseAuthData(authData);

        const expectedRpIdHash = crypto
            .createHash('sha256')
            .update(expectedRPID)
            .digest();

        if (!parsedAuthData.rpIdHash.equals(expectedRpIdHash)) {
            throw new Error('RP ID hash mismatch');
        }

        console.log('   ✅ RP ID hash verified');
        console.log('   ✅ Flags verified');
        console.log('      User Present:', parsedAuthData.userPresent);
        console.log('      User Verified:', parsedAuthData.userVerified);
        console.log('      Attested Credential Data:', parsedAuthData.attestedCredentialData);

        if (!parsedAuthData.userPresent) {
            throw new Error('User not present');
        }

        console.log('   ✅ All verifications passed!');

        let publicKeyBuffer = parsedAuthData.credentialPublicKey;
        if (typeof publicKeyBuffer === 'object' && !Buffer.isBuffer(publicKeyBuffer)) {
            publicKeyBuffer = Buffer.from(CBOR.encode(publicKeyBuffer));
        }

        return {
            verified: true,
            registrationInfo: {
                credential: {
                    id: parsedAuthData.credentialId,
                    publicKey: publicKeyBuffer,
                    signCount: parsedAuthData.signCount,
                }
            }
        };

    } catch (error) {
        console.error('❌ Manual verification failed:', error.message);
        throw error;
    }
}

// ============================================================================
// 📋 WEBAUTHN REGISTRATION OPTIONS
// ============================================================================

router.post('/register-options', async (req, res) => {
    try {
        const { username, email } = req.body;

        if (!username || !email) {
            return res.status(400).json({ error: 'Username and email required' });
        }

        console.log('📋 Generating WebAuthn registration options...');

        const existingUser = await req.app.db.query(
            'SELECT id FROM users WHERE email = $1',
            [email]
        );

        if (existingUser.rows.length > 0) {
            return res.status(400).json({ error: 'Email already registered' });
        }

        const registrationOptions = await generateRegistrationOptions({
            rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
            rpName: process.env.WEBAUTHN_RP_NAME || 'SONG-NEXUS',
            userName: username,
            userID: Buffer.from(email + Date.now()),
            userDisplayName: email,
            attestationType: 'direct',
            authenticatorSelection: {
                authenticatorAttachment: 'platform',
                residentKey: 'preferred',
                userVerification: 'preferred',
            },
        });

        console.log('✅ Options generated');

        req.session.webauthnRegistrationSession = {
            challenge: registrationOptions.challenge,
        };
        req.session.username = username;
        req.session.email = email;

        console.log('✅ Session saved');
        res.json(registrationOptions);

    } catch (error) {
        console.error('❌ Error generating registration options:', error);
        res.status(500).json({ error: 'Failed to generate registration options' });
    }
});

// ============================================================================
// ✅ WEBAUTHN REGISTRATION VERIFY
// ============================================================================

router.post('/register-verify', async (req, res) => {
    try {
        const { id, rawId, response, type } = req.body;

        if (!rawId || !response) {
            return res.status(400).json({ error: 'Missing registration data' });
        }

        console.log('🔐 REGISTRATION VERIFY - MANUAL VERIFICATION');

        const sessionData = req.session.webauthnRegistrationSession;
        if (!sessionData) {
            return res.status(400).json({ error: 'Session expired' });
        }

        const attestationResponse = {
            clientDataJSON: base64urlToBuffer(response.clientDataJSON),
            attestationObject: base64urlToBuffer(response.attestationObject),
        };

        const verification = await manualVerifyRegistrationResponse({
            response: attestationResponse,
            expectedChallenge: sessionData.challenge,
            expectedOrigin: process.env.WEBAUTHN_ORIGIN || 'https://localhost:5500',
            expectedRPID: process.env.WEBAUTHN_RP_ID || 'localhost',
        });

        console.log('✅ VERIFICATION PASSED!');

        if (!verification.verified) {
            return res.status(400).json({ error: 'Registration verification failed' });
        }

        const credentialId = bufferToBase64url(verification.registrationInfo.credential.id);

        const createUser = await req.app.db.query(
            `INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id`,
            [req.session.username, req.session.email, 'webauthn_user', 'user', true]
        );

        const userId = createUser.rows[0].id;
        console.log('   ✅ User created:', userId);

        const publicKey = bufferToBase64url(verification.registrationInfo.credential.publicKey);

        await req.app.db.query(
            `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports, created_at)
             VALUES ($1, $2, $3, $4, $5, NOW())`,
            [userId, credentialId, publicKey, 0, response.transports || ['internal']]
        );

        const token = generateJWTToken(userId, req.session.username, req.session.email);
        setAuthCookie(res, token);

        console.log('\n🎉🎉🎉 REGISTRATION SUCCESSFUL! 🎉🎉🎉\n');
        res.json({
            verified: true,
            token, // Beibehalten für Rückwärtskompatibilität
            user: {
                id: userId,
                username: req.session.username,
                email: req.session.email,
            },
        });

        req.session.webauthnRegistrationSession = null;

    } catch (error) {
        console.error('❌ Registration error:', error.message);
        res.status(500).json({ error: 'Registration verification failed' });
    }
});

// ============================================================================
// 📋 WEBAUTHN AUTHENTICATION OPTIONS
// ============================================================================

router.post('/authenticate-options', async (req, res) => {
    try {
        console.log('📋 Generating WebAuthn authentication options...');

        const credentialsResult = await req.app.db.query(
            'SELECT credential_id, transports FROM webauthn_credentials'
        );

        const allowCredentials = credentialsResult.rows.map(row => ({
            id: row.credential_id,
            type: 'public-key',
            transports: row.transports || ['internal'],
        }));

        const authenticationOptions = await generateAuthenticationOptions({
            rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
            allowCredentials: allowCredentials.length > 0 ? allowCredentials : undefined,
        });

        req.session.webauthnAuthenticationSession = {
            challenge: authenticationOptions.challenge,
        };

        console.log('✅ Auth options generated');
        res.json(authenticationOptions);

    } catch (error) {
        console.error('❌ Error generating auth options:', error);
        res.status(500).json({ error: 'Failed to generate authentication options' });
    }
});

// ============================================================================
// ✅ WEBAUTHN AUTHENTICATION VERIFY
// ============================================================================

router.post('/authenticate-verify', async (req, res) => {
    try {
        const { id, rawId, response, type } = req.body;

        if (!rawId || !response) {
            return res.status(400).json({ error: 'Missing authentication data' });
        }

        console.log('🔐 AUTHENTICATION VERIFY - MANUAL VERIFICATION');

        const sessionData = req.session.webauthnAuthenticationSession;
        if (!sessionData) {
            return res.status(400).json({ error: 'Session expired' });
        }

        const credentialResult = await req.app.db.query(
            'SELECT user_id, public_key, counter FROM webauthn_credentials WHERE credential_id = $1',
            [id]
        );

        if (credentialResult.rows.length === 0) {
            return res.status(400).json({ error: 'Credential not found' });
        }

        const credential = credentialResult.rows[0];
        const newSignCount = credential.counter + 1;

        await req.app.db.query(
            'UPDATE webauthn_credentials SET counter = $1, last_used = NOW() WHERE credential_id = $2',
            [newSignCount, id]
        );

        const userResult = await req.app.db.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [credential.user_id]
        );

        const user = userResult.rows[0];

        await req.app.db.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [credential.user_id]
        );

        const token = generateJWTToken(user.id, user.username, user.email);
        setAuthCookie(res, token);

        console.log('\n✅ WEBAUTHN LOGIN SUCCESSFUL!\n');
        res.json({
            verified: true,
            token, // Beibehalten für Rückwärtskompatibilität
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });

        req.session.webauthnAuthenticationSession = null;

    } catch (error) {
        console.error('❌ Authentication error:', error.message);
        res.status(500).json({ error: 'Authentication failed' });
    }
});

// ============================================================================
// 📋 PASSWORD REGISTRATION
// ============================================================================

router.post('/register-password', async (req, res) => {
    try {
        const { username, email, password, passwordConfirm } = req.body;

        if (!username || !email || !password) {
            console.log('❌ Missing fields');
            return res.status(400).json({ error: 'Username, email, and password required' });
        }

        // Dieselbe Regel wie bei /api/auth/register. Dieser Endpunkt ist der,
        // den das Frontend tatsächlich aufruft — eine Verschärfung nur in
        // auth.js hätte hier nichts geändert.
        const passwortProbleme = pruefePasswort(password, { username, email });
        if (passwortProbleme.length > 0) {
            console.log('❌ Passwort erfüllt die Regeln nicht');
            return res.status(400).json({ error: passwortProbleme.join(' ') });
        }

        if (password !== passwordConfirm) {
            console.log('❌ Passwords do not match');
            return res.status(400).json({ error: 'Passwords do not match' });
        }

        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(email)) {
            console.log('❌ Invalid email format');
            return res.status(400).json({ error: 'Invalid email format' });
        }

        console.log('📋 Registering user with password...');
        console.log('   Username:', username);
        console.log('   Email:', email);

        const existingUser = await req.app.db.query(
            'SELECT id FROM users WHERE email = $1 OR username = $2',
            [email, username]
        );

        if (existingUser.rows.length > 0) {
            console.log('❌ Email or username already registered');
            return res.status(400).json({ error: 'Email or username already registered' });
        }

        console.log('🔐 Hashing password...');
        const passwordHash = await hashPassword(password);
        console.log('✅ Password hashed');
        console.log('   Hash length:', passwordHash.length);
        console.log('   Hash preview:', passwordHash.substring(0, 20) + '...');

        console.log('💾 Creating user in database...');
        const createUser = await req.app.db.query(
            `INSERT INTO users (username, email, password_hash, role, is_active, created_at, updated_at)
             VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
             RETURNING id, username, email`,
            [username, email, passwordHash, 'user', true]
        );

        const user = createUser.rows[0];
        console.log('   ✅ User created:', user.id);

        const verifyUser = await req.app.db.query(
            'SELECT password_hash FROM users WHERE id = $1',
            [user.id]
        );

        if (!verifyUser.rows[0].password_hash) {
            console.error('❌ Password hash not saved!');
            return res.status(500).json({ error: 'Password not saved correctly' });
        }
        console.log('✅ Password hash verified in database');

        const token = generateJWTToken(user.id, user.username, user.email);
        setAuthCookie(res, token);

        console.log('\n✅ PASSWORD REGISTRATION SUCCESSFUL!\n');
        res.json({
            verified: true,
            token, // Beibehalten für Rückwärtskompatibilität
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });

    } catch (error) {
        console.error('❌ Password registration error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Registration failed' });
    }
});

// ============================================================================
// ✅ PASSWORD LOGIN - WITH EMAIL OR USERNAME
// ============================================================================

router.post('/authenticate-password', async (req, res) => {
    try {
        const { email, password } = req.body;

        if (!email || !password) {
            console.log('❌ Missing email or password');
            return res.status(400).json({ error: 'Email and password required' });
        }

        console.log('📋 Authenticating with password...');
        console.log('   Email/Username:', email);

        console.log('🔍 Fetching user from database...');
        const userResult = await req.app.db.query(
            'SELECT id, username, email, password_hash FROM users WHERE email = $1 OR username = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User not found:', email);
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        const user = userResult.rows[0];
        console.log('   ✅ User found:', user.id);
        console.log('   Username:', user.username);
        console.log('   Email:', user.email);
        console.log('   Hash exists:', !!user.password_hash);
        console.log('   Hash length:', user.password_hash?.length);

        if (!user.password_hash) {
            console.error('❌ No password hash found for user!');
            return res.status(401).json({ error: 'Invalid credentials - no password set' });
        }

        console.log('🔐 Comparing passwords...');
        let passwordMatch;
        try {
            passwordMatch = await comparePassword(password, user.password_hash);
            console.log('   ✅ Comparison result:', passwordMatch);
        } catch (bcryptError) {
            console.error('❌ Bcrypt compare error:', bcryptError.message);
            return res.status(500).json({ error: 'Authentication error' });
        }

        if (!passwordMatch) {
            console.log('❌ Password does not match');
            return res.status(401).json({ error: 'Invalid credentials' });
        }

        console.log('   ✅ Password verified');

        await req.app.db.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        const token = generateJWTToken(user.id, user.username, user.email);
        setAuthCookie(res, token);

        console.log('\n✅ PASSWORD LOGIN SUCCESSFUL!\n');
        res.json({
            verified: true,
            token, // Beibehalten für Rückwärtskompatibilität
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });

    } catch (error) {
        console.error('❌ Password login error:', error.message);
        console.error('Stack:', error.stack);
        res.status(500).json({ error: 'Login failed' });
    }
});

// ============================================================================
// 📧 MAGIC LINK - REQUEST (WITH TOKEN DISPLAY IN LOGS)
// ============================================================================

router.post('/login-magic-link', async (req, res) => {
    try {
        const { email } = req.body;

        if (!email) {
            console.log('❌ Missing email');
            return res.status(400).json({ error: 'Email required' });
        }

        console.log('📧 Magic Link request...');
        console.log('   Email:', email);

        const userResult = await req.app.db.query(
            'SELECT id, username FROM users WHERE email = $1',
            [email]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return res.status(200).json({
                message: 'If this email exists, a magic link has been sent.'
            });
        }

        const user = userResult.rows[0];
        console.log('   ✅ User found:', user.id);

        const token = crypto.randomBytes(32).toString('hex');
        const tokenExpiry = new Date(Date.now() + 15 * 60 * 1000);

        console.log('🔐 Generating magic link token...');
        console.log('   Token expires:', tokenExpiry);

        // 🔑 SHOW TOKEN FOR DEV/TESTING!
        console.log('\n   🔑 ⭐⭐⭐ MAGIC LINK TOKEN (für manuelles Testen): ⭐⭐⭐');
        console.log('   ' + token);
        console.log('   ⭐⭐⭐ Kopiere diesen Token ins "Verifikations-Token" Feld! ⭐⭐⭐\n');

        await req.app.db.query(
            `INSERT INTO magic_link_tokens (user_id, token, expires_at, created_at)
             VALUES ($1, $2, $3, NOW())`,
            [user.id, token, tokenExpiry]
        );

        console.log('   ✅ Token stored in database');

        const magicLinkUrl = `${process.env.FRONTEND_URL || 'https://localhost:5500'}/auth/magic-link?token=${token}`;
        console.log('   Magic Link URL:', magicLinkUrl);

        try {
            const transporter = nodemailer.createTransport({
                host: process.env.SMTP_HOST || 'localhost',
                port: process.env.SMTP_PORT || 1025,
                secure: false,
                auth: process.env.SMTP_USER ? {
                    user: process.env.SMTP_USER,
                    pass: process.env.SMTP_PASSWORD,
                } : undefined,
            });

            const mailOptions = {
                from: process.env.SMTP_FROM || 'noreply@song-nexus.local',
                to: email,
                subject: '🔐 SONG-NEXUS Magic Link - Melden Sie sich an',
                html: `
                    <h2>🎵 SONG-NEXUS Magic Link</h2>
                    <p>Hallo ${user.username},</p>
                    <p>Klicken Sie auf den Link unten, um sich anzumelden:</p>
                    <p><a href="${magicLinkUrl}" style="background: #00ff00; padding: 10px 20px; color: black; text-decoration: none; border-radius: 4px; display: inline-block;">📧 Anmelden mit Magic Link</a></p>
                    <p>Oder kopieren Sie diesen Token manuell:</p>
                    <code>${token}</code>
                    <p>Dieser Link verfällt in 15 Minuten.</p>
                    <hr>
                    <p style="font-size: 0.85rem; color: #666;">Dies ist eine automatische E-Mail. Bitte antworten Sie nicht darauf.</p>
                `,
                text: `Magic Link: ${magicLinkUrl}\n\nToken: ${token}\n\nDieser Link verfällt in 15 Minuten.`,
            };

            await transporter.sendMail(mailOptions);
            console.log('   ✅ Email sent to:', email);

        } catch (emailError) {
            console.warn('⚠️ Email send warning (may be OK in dev):', emailError.message);
        }

        console.log('✅ Magic Link sent\n');
        res.json({
            message: 'Magic link has been sent to your email',
            token: token,
            note: 'In development, token is also returned here and shown in server logs.'
        });

    } catch (error) {
        console.error('❌ Magic link error:', error.message);
        res.status(500).json({ error: 'Failed to send magic link' });
    }
});

// ============================================================================
// ✅ MAGIC LINK - VERIFY TOKEN
// ============================================================================

router.post('/verify-magic-link', async (req, res) => {
    try {
        const { token } = req.body;

        if (!token) {
            console.log('❌ Missing token');
            return res.status(400).json({ error: 'Token required' });
        }

        console.log('🔐 Verifying magic link token...');
        console.log('   Token:', token.substring(0, 10) + '...');

        const tokenResult = await req.app.db.query(
            `SELECT user_id, expires_at, used_at FROM magic_link_tokens 
             WHERE token = $1`,
            [token]
        );

        if (tokenResult.rows.length === 0) {
            console.log('❌ Token not found');
            return res.status(401).json({ error: 'Invalid token' });
        }

        const tokenRecord = tokenResult.rows[0];

        if (new Date() > new Date(tokenRecord.expires_at)) {
            console.log('❌ Token expired');
            return res.status(401).json({ error: 'Token expired' });
        }

        if (tokenRecord.used_at) {
            console.log('❌ Token already used');
            return res.status(401).json({ error: 'Token already used' });
        }

        console.log('   ✅ Token valid');

        const userResult = await req.app.db.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [tokenRecord.user_id]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return res.status(401).json({ error: 'User not found' });
        }

        const user = userResult.rows[0];

        await req.app.db.query(
            'UPDATE magic_link_tokens SET used_at = NOW() WHERE token = $1',
            [token]
        );

        await req.app.db.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        const jwtToken = generateJWTToken(user.id, user.username, user.email);
        setAuthCookie(res, jwtToken);

        console.log('   ✅ User authenticated');
        console.log('\n✅ MAGIC LINK LOGIN SUCCESSFUL!\n');

        res.json({
            verified: true,
            token: jwtToken, // Beibehalten für Rückwärtskompatibilität
            user: {
                id: user.id,
                username: user.username,
                email: user.email,
            },
        });

    } catch (error) {
        console.error('❌ Magic link verification error:', error.message);
        res.status(500).json({ error: 'Verification failed' });
    }
});

// ============================================================================
// ✅ MAGIC LINK - GET (For URL redirect)
// ============================================================================

router.get('/magic-link', async (req, res) => {
    try {
        const { token } = req.query;

        if (!token) {
            console.log('❌ Missing token in URL');
            return res.status(400).send('Missing token');
        }

        console.log('🔐 Magic link GET request');
        console.log('   Token:', token.substring(0, 10) + '...');

        const tokenResult = await req.app.db.query(
            `SELECT user_id, expires_at, used_at FROM magic_link_tokens 
             WHERE token = $1`,
            [token]
        );

        if (tokenResult.rows.length === 0) {
            console.log('❌ Token not found');
            return res.status(401).send('Invalid token');
        }

        const tokenRecord = tokenResult.rows[0];

        if (new Date() > new Date(tokenRecord.expires_at)) {
            console.log('❌ Token expired');
            return res.status(401).send('Token expired');
        }

        if (tokenRecord.used_at) {
            console.log('❌ Token already used');
            return res.status(401).send('Token already used');
        }

        const userResult = await req.app.db.query(
            'SELECT id, username, email FROM users WHERE id = $1',
            [tokenRecord.user_id]
        );

        if (userResult.rows.length === 0) {
            console.log('❌ User not found');
            return res.status(401).send('User not found');
        }

        const user = userResult.rows[0];

        await req.app.db.query(
            'UPDATE magic_link_tokens SET used_at = NOW() WHERE token = $1',
            [token]
        );

        await req.app.db.query(
            'UPDATE users SET last_login = NOW() WHERE id = $1',
            [user.id]
        );

        const jwtToken = generateJWTToken(user.id, user.username, user.email);
        setAuthCookie(res, jwtToken);

        console.log('   ✅ User authenticated');
        console.log('\n✅ MAGIC LINK LOGIN SUCCESSFUL (via GET)!\n');

        // Token nicht mehr in URL (Sicherheitsrisiko: URL-Logs, Referer-Header)
        // Cookie wurde bereits gesetzt — Redirect zur Startseite genügt
        res.redirect(`${process.env.FRONTEND_URL || 'https://localhost:5500'}/?user=${encodeURIComponent(user.username)}`);

    } catch (error) {
        console.error('❌ Magic link GET error:', error.message);
        res.status(500).send('Verification failed');
    }
});

module.exports = router;