// ============================================================================
// 🔐 WEBAUTHN ROUTES v7.3 - MAGIC LINKS MIT DEDICATED TABELLE
// ============================================================================
// UPDATES:
// ✅ ip_address speichern
// ✅ user_agent speichern
// ✅ used_at setzen beim Verify
// ✅ Korrektes INSERT mit allen Spalten
// ============================================================================


const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const { pool } = require('../server');
const { generateJWT } = require('../middleware/auth-middleware');
const {
    generateRegistrationOptions,
    verifyRegistrationResponse,
    generateAuthenticationOptions,
    verifyAuthenticationResponse
} = require('@simplewebauthn/server');


// ============================================================================
// 🛠️ HELPER FUNCTIONS
// ============================================================================


/**
 * Base64URL encode (WebAuthn standard)
 */
function base64url(buf) {
    if (!buf) return '';
    // Handle both Buffer and Uint8Array and strings
    if (typeof buf === 'string') return buf; // Already encoded
    return Buffer.from(buf)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}


/**
 * Base64URL decode
 */
function base64urldecode(str) {
    str += new Array(5 - str.length % 4).join('=');
    return Buffer.from(str.replace(/-/g, '+').replace(/_/g, '/'), 'base64');
}


/**
 * Handle JSONB - PostgreSQL returns objects, not strings
 */
function parseCredential(credentialData) {
    if (typeof credentialData === 'string') {
        return JSON.parse(credentialData);
    }
    return credentialData;
}


/**
 * Get rpID from .env
 */
function getRPID() {
    const rpid = process.env.WEBAUTHN_RP_ID || 'localhost';
    console.log('✅ WebAuthn rpID:', rpid);
    return rpid;
}


/**
 * Get expected origin from .env
 */
function getExpectedOrigin() {
    const origin = process.env.WEBAUTHN_ORIGIN || 'https://localhost:5500';
    console.log('✅ WebAuthn origin:', origin);


    if (!origin.startsWith('http://') && !origin.startsWith('https://')) {
        throw new Error('Invalid WEBAUTHN_ORIGIN: muss mit http:// oder https:// starten');
    }
    return origin;
}


/**
 * Generate random challenge
 */
function generateChallenge() {
    return base64url(crypto.randomBytes(32));
}


/**
 * Generate magic link token
 */
function generateMagicLinkToken() {
    return crypto.randomBytes(32).toString('hex');
}


/**
 * Get client IP from request
 */
function getClientIP(req) {
    return req.headers['x-forwarded-for']?.split(',')[0].trim() ||
        req.socket.remoteAddress ||
        'unknown';
}


/**
 * Get user agent from request
 */
function getUserAgent(req) {
    return req.headers['user-agent'] || 'unknown';
}


/**
 * Clear ALL WebAuthn session data
 */
function clearWebauthnSession(session) {
    session.webauthnChallenge = null;
    session.webauthnUsername = null;
    session.webauthnEmail = null;
    session.webauthnUserId = null;
    session.authMethod = null;
    console.log('🧹 Session cleared completely');
}


// ============================================================================
// 📝 BIOMETRIC REGISTRATION - OPTIONS
// ============================================================================
router.post('/webauthn/register-options', async (req, res) => {
    try {
        const { username, email } = req.body;
        if (!username || !email) {
            return res.status(400).json({ error: 'Missing username or email' });
        }


        // Check if user already exists
        const existing = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'User already exists' });
        }


        const userID = crypto.randomBytes(16);
        const rpID = getRPID();


        const options = await generateRegistrationOptions({
            rpID: rpID,
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
        });


        // Store challenge in session
        req.session.webauthnChallenge = options.challenge;
        req.session.webauthnUsername = username;
        req.session.webauthnEmail = email;
        req.session.webauthnUserId = base64url(userID);
        req.session.authMethod = 'biometric';


        console.log('✅ Registration options generated for:', email);
        res.json(options);


    } catch (error) {
        console.error('❌ Register options error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 📝 BIOMETRIC REGISTRATION - VERIFY (v7.2 FIX!)
// ============================================================================
router.post('/webauthn/register-verify', async (req, res) => {
    try {
        const { webauthnChallenge, webauthnEmail, webauthnUsername } = req.session;


        if (!webauthnChallenge) {
            return res.status(400).json({
                error: 'Session expired or invalid',
                hint: 'Try registering again'
            });
        }


        const rpID = getRPID();
        const expectedOrigin = getExpectedOrigin();


        const verification = await verifyRegistrationResponse({
            response: req.body,
            expectedChallenge: webauthnChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID
        });


        if (!verification.verified) {
            console.error('❌ Biometric verification failed');
            return res.status(400).json({ error: 'Verification failed' });
        }


        console.log('✅ Biometric verification successful!');
        console.log('   verification.registrationInfo.credential:', verification.registrationInfo?.credential);


        // BUGFIX v7.2: credential.id contains the credentialID (already base64url encoded)
        // NOT verification.registrationInfo.credentialID!
        const credentialData = {
            credentialID: verification.registrationInfo?.credential?.id || '',
            credentialPublicKey: base64url(verification.registrationInfo?.credential?.publicKey),
            counter: verification.registrationInfo?.credential?.counter || 0,
            transports: verification.registrationInfo?.credential?.transports || []
        };


        console.log('📦 Credential Data:', {
            credentialID: credentialData.credentialID,
            credentialID_length: credentialData.credentialID?.length,
            credentialID_first50: credentialData.credentialID?.substring(0, 50) + '...',
            counter: credentialData.counter,
            transports: credentialData.transports
        });


        // Validate credentialID is not empty
        if (!credentialData.credentialID || credentialData.credentialID.length === 0) {
            console.error('❌ CRITICAL: credentialID is empty!');
            console.error('   verification.registrationInfo:', verification.registrationInfo);
            return res.status(500).json({
                error: 'Failed to extract credential ID from biometric device',
                debug: 'credentialID was empty'
            });
        }


        // Generate random password
        const hashedPassword = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 10);


        // Insert user
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, webauthn_credential, role, is_active)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, username, email, role`,
            [webauthnUsername, webauthnEmail, hashedPassword, JSON.stringify(credentialData), 'user', true]
        );


        const user = result.rows[0];


        // OPTIONAL: Also insert into webauthn_credentials table for v7.0+
        try {
            await pool.query(
                `INSERT INTO webauthn_credentials (user_id, credential_id, public_key, counter, transports)
         VALUES ($1, $2, $3, $4, $5)`,
                [user.id, credentialData.credentialID, credentialData.credentialPublicKey, credentialData.counter, JSON.stringify(credentialData.transports)]
            );
            console.log('✅ Credential stored in webauthn_credentials table');
        } catch (err) {
            console.warn('⚠️ webauthn_credentials table not available, using legacy storage');
        }


        // 🧹 CRITICAL FIX: Clear ALL session data BEFORE returning
        clearWebauthnSession(req.session);


        // Generate JWT
        const token = generateJWT(user);


        console.log('✅ Biometric registration successful:', webauthnEmail);
        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });


    } catch (error) {
        console.error('❌ Register verify error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 🔓 BIOMETRIC LOGIN - OPTIONS
// ============================================================================
router.post('/webauthn/authenticate-options', async (req, res) => {
    try {
        const rpID = getRPID();


        const options = await generateAuthenticationOptions({
            rpID: rpID,
            userVerification: 'preferred'
        });


        req.session.webauthnChallenge = options.challenge;
        req.session.authMethod = 'biometric';


        console.log('✅ Authentication options generated');
        res.json(options);


    } catch (error) {
        console.error('❌ Auth options error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 🔓 BIOMETRIC LOGIN - VERIFY
// ============================================================================
router.post('/webauthn/authenticate-verify', async (req, res) => {
    try {
        const { webauthnChallenge } = req.session;


        if (!webauthnChallenge) {
            console.error('❌ No challenge in session!');
            return res.status(400).json({ error: 'No challenge found. Try again.' });
        }


        console.log('🔍 Login Verify - searching for credential...');
        const clientRawId = base64url(req.body.rawId); // Normalize to base64url
        console.log('   Client rawId (normalized):', clientRawId?.substring(0, 50) + '...');


        // Find user by credential ID
        const usersResult = await pool.query(
            'SELECT id, username, email, role, webauthn_credential FROM users WHERE webauthn_credential IS NOT NULL'
        );


        console.log(`📋 Found ${usersResult.rows.length} users with biometric credentials`);


        let user = null;
        let dbCred = null;


        for (const row of usersResult.rows) {
            try {
                // BUGFIX: Handle both JSON strings and JSONB objects
                const cred = parseCredential(row.webauthn_credential);


                console.log(`   User ${row.id}:`, {
                    credentialID_length: cred.credentialID?.length,
                    credentialID_first50: cred.credentialID?.substring(0, 50),
                    hasCredentialID: !!cred.credentialID
                });


                // Compare both normalized
                if (String(cred.credentialID) === String(clientRawId)) {
                    console.log('   ✅ MATCH FOUND!');
                    user = row;
                    dbCred = cred;
                    break;
                }
            } catch (parseErr) {
                console.warn(`   ⚠️ Error parsing credential for user ${row.id}:`, parseErr.message);
            }
        }


        if (!user || !dbCred) {
            console.error('❌ User not found for credential');
            console.error('   Expected rawId:', clientRawId?.substring(0, 50) + '...');
            console.error('   No matching credentials found in database');
            return res.status(400).json({
                error: 'User not found',
                hint: 'No matching biometric credential found. Try registering again.'
            });
        }


        console.log('✅ User found:', user.email);


        const rpID = getRPID();
        const expectedOrigin = getExpectedOrigin();


        // Verify authentication
        const verification = await verifyAuthenticationResponse({
            response: req.body,
            expectedChallenge: webauthnChallenge,
            expectedOrigin: expectedOrigin,
            expectedRPID: rpID,
            credential: {
                id: dbCred.credentialID,
                publicKey: base64urldecode(dbCred.credentialPublicKey),
                counter: dbCred.counter,
                transports: dbCred.transports || []
            }
        });


        if (!verification.verified) {
            console.error('❌ Biometric authentication verification failed');
            return res.status(400).json({ error: 'Verification failed' });
        }


        console.log('✅ Verification successful!');


        // Update counter for replay attack prevention
        dbCred.counter = verification.authenticationInfo.newCounter;
        await pool.query(
            'UPDATE users SET webauthn_credential = $1, last_login = NOW() WHERE id = $2',
            [JSON.stringify(dbCred), user.id]
        );


        console.log('✅ Counter updated:', dbCred.counter);


        // 🧹 CRITICAL: Clear session
        clearWebauthnSession(req.session);


        // Generate JWT
        const token = generateJWT(user);


        console.log('✅ Biometric authentication successful:', user.email);
        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });


    } catch (error) {
        console.error('❌ Auth verify error:', error.message);
        console.error('   Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 🔐 PASSWORD-BASED REGISTRATION
// ============================================================================
router.post('/webauthn/register-password', async (req, res) => {
    try {
        const { username, email, password } = req.body;


        if (!username || !email || !password) {
            return res.status(400).json({ error: 'Missing required fields' });
        }


        if (password.length < 8) {
            return res.status(400).json({ error: 'Password must be at least 8 characters' });
        }


        // Check if user exists
        const existing = await pool.query(
            'SELECT id FROM users WHERE email = $1 OR LOWER(username) = LOWER($2)',
            [email, username]
        );


        if (existing.rows.length > 0) {
            return res.status(400).json({ error: 'Email or username already in use' });
        }


        // Hash password with bcrypt
        const bcryptRounds = parseInt(process.env.BCRYPT_ROUNDS || '10');
        const hashedPassword = await bcrypt.hash(password, bcryptRounds);


        // Insert user
        const result = await pool.query(
            `INSERT INTO users (username, email, password_hash, role, is_active)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, username, email, role`,
            [username, email, hashedPassword, 'user', true]
        );


        const user = result.rows[0];
        const token = generateJWT(user);


        console.log('✅ Password registration successful:', email);
        res.status(201).json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });


    } catch (error) {
        console.error('❌ Password registration error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 🔑 PASSWORD-BASED LOGIN
// ============================================================================
router.post('/webauthn/authenticate-password', async (req, res) => {
    try {
        const { username, password } = req.body;


        if (!username || !password) {
            return res.status(400).json({ error: 'Username and password required' });
        }


        console.log('🔐 Password login attempt:', username);


        // Find user
        const result = await pool.query(
            `SELECT id, username, email, role, password_hash, is_active
       FROM users
       WHERE (LOWER(username) = LOWER($1) OR email = $2) AND is_active = TRUE
       LIMIT 1`,
            [username, username]
        );


        if (result.rows.length === 0) {
            console.log('❌ User not found:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }


        const user = result.rows[0];
        console.log('✅ User found:', user.email);


        // Verify password with proper error handling
        let isValidPassword = false;
        try {
            isValidPassword = await bcrypt.compare(password, user.password_hash);
            console.log('✅ Bcrypt compare result:', isValidPassword);
        } catch (bcryptErr) {
            console.error('❌ Bcrypt error:', bcryptErr.message);
            return res.status(500).json({ error: 'Authentication error' });
        }


        if (!isValidPassword) {
            console.log('❌ Invalid password for user:', username);
            return res.status(401).json({ error: 'Invalid credentials' });
        }


        // Update last_login
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);


        // Generate JWT
        const token = generateJWT(user);


        console.log('✅ Password authentication successful:', user.email);
        res.json({
            success: true,
            token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });


    } catch (error) {
        console.error('❌ Password authentication error:', error.message);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 📧 MAGIC LINK - REQUEST v7.3
// ============================================================================
router.post('/webauthn/magic-link-request', async (req, res) => {
    try {
        const { email } = req.body;


        if (!email) {
            return res.status(400).json({ error: 'Email required' });
        }


        console.log('📧 Magic link request for:', email);


        // Get IP and User Agent
        const ipAddress = getClientIP(req);
        const userAgent = getUserAgent(req);
        console.log('   📍 IP:', ipAddress);
        console.log('   🌐 User-Agent:', userAgent);


        // Find or create user
        let userResult = await pool.query('SELECT id, username, email FROM users WHERE email = $1', [email]);
        let user;


        if (userResult.rows.length === 0) {
            console.log('   User does not exist, creating...');
            const tempUsername = `user_${Date.now()}`;
            const hashedPassword = await bcrypt.hash(crypto.randomBytes(20).toString('hex'), 10);


            const createResult = await pool.query(
                `INSERT INTO users (username, email, password_hash, role, is_active)
         VALUES ($1, $2, $3, $4, $5)
         RETURNING id, username, email`,
                [tempUsername, email, hashedPassword, 'user', true]
            );
            user = createResult.rows[0];
            console.log('   ✅ User created:', user.id);
        } else {
            user = userResult.rows[0];
            console.log('   ✅ User found:', user.id);
        }


        // Generate magic link token
        const token = generateMagicLinkToken();
        const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes


        // ============================================================================
        // 🎯 v7.3 FIX: Store in magic_links table with IP und User-Agent
        // ============================================================================
        try {
            const insertResult = await pool.query(
                `INSERT INTO magic_links 
                (user_id, token, expires_at, ip_address, user_agent, created_at, updated_at)
                VALUES ($1, $2, $3, $4, $5, NOW(), NOW())
                RETURNING id, token, expires_at, ip_address, user_agent`,
                [user.id, token, expiresAt, ipAddress, userAgent]
            );

            const storedLink = insertResult.rows[0];
            console.log('✅ Token stored in magic_links table');
            console.log('   ID:', storedLink.id);
            console.log('   Token:', storedLink.token.substring(0, 20) + '...');
            console.log('   Expires:', storedLink.expires_at);
            console.log('   IP:', storedLink.ip_address);
            console.log('   UA:', storedLink.user_agent.substring(0, 50) + '...');

        } catch (tableErr) {
            console.error('❌ Error storing in magic_links table:', tableErr.message);
            console.error('   Code:', tableErr.code);
            console.error('   Details:', tableErr.detail);

            // Fallback zu Session
            console.warn('⚠️ Fallback: Using session storage');
            req.session.magicLinkToken = token;
            req.session.magicLinkUserId = user.id;
            req.session.magicLinkExpiresAt = expiresAt;
            req.session.magicLinkIpAddress = ipAddress;
            req.session.magicLinkUserAgent = userAgent;
        }


        // In production: Send email with token
        const magicLink = `${getExpectedOrigin()}/auth/magic-link?token=${token}`;
        console.log('📧 Magic link generated:', magicLink);


        res.json({
            success: true,
            message: 'Magic link sent to email',
            debug: { magicLink, expiresAt, token, ipAddress, userAgent }
        });


    } catch (error) {
        console.error('❌ Magic link request error:', error.message);
        console.error('   Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 📧 MAGIC LINK - VERIFY v7.3
// ============================================================================
router.post('/webauthn/magic-link-verify', async (req, res) => {
    try {
        const { token } = req.body;


        if (!token) {
            return res.status(400).json({ error: 'Token required' });
        }


        console.log('🔗 Magic link verify - token:', token.substring(0, 20) + '...');


        // Get current IP and User Agent for optional verification
        const currentIP = getClientIP(req);
        const currentUA = getUserAgent(req);
        console.log('   Current IP:', currentIP);
        console.log('   Current UA:', currentUA.substring(0, 50) + '...');


        // ============================================================================
        // 🎯 v7.3 FIX: Read from dedicated magic_links table
        // ============================================================================
        let magicLink = null;
        let linkId = null;


        try {
            const dbResult = await pool.query(
                `SELECT id, user_id, expires_at, ip_address, user_agent, used_at 
                 FROM magic_links 
                 WHERE token = $1`,
                [token]
            );


            if (dbResult.rows.length > 0) {
                const dbLink = dbResult.rows[0];
                linkId = dbLink.id;

                console.log('📋 Link found in database:');
                console.log('   ID:', dbLink.id);
                console.log('   User ID:', dbLink.user_id);
                console.log('   Expires:', dbLink.expires_at);
                console.log('   Used at:', dbLink.used_at);


                // Check if already used
                if (dbLink.used_at !== null) {
                    console.error('❌ Token already used at:', dbLink.used_at);
                    return res.status(401).json({ error: 'Token already used' });
                }


                // Check if expired
                if (new Date(dbLink.expires_at) < new Date()) {
                    console.error('❌ Token expired');
                    return res.status(401).json({ error: 'Token expired' });
                }


                magicLink = {
                    user_id: dbLink.user_id,
                    ip_address: dbLink.ip_address,
                    user_agent: dbLink.user_agent
                };


                console.log('✅ Token is valid');
            }

        } catch (tableErr) {
            console.warn('⚠️ magic_links table error:', tableErr.message);

            // Fallback zu Session
            const { magicLinkToken, magicLinkUserId, magicLinkExpiresAt } = req.session;


            if (magicLinkToken && magicLinkToken === token) {
                if (new Date() <= new Date(magicLinkExpiresAt)) {
                    magicLink = {
                        user_id: magicLinkUserId,
                        ip_address: req.session.magicLinkIpAddress,
                        user_agent: req.session.magicLinkUserAgent
                    };
                    console.log('✅ Token found in session');
                } else {
                    console.error('❌ Token expired in session');
                    return res.status(401).json({ error: 'Token expired' });
                }
            }
        }


        if (!magicLink) {
            console.error('❌ Invalid or expired token');
            return res.status(401).json({ error: 'Invalid or expired token' });
        }


        // Get user
        const result = await pool.query(
            'SELECT id, username, email, role FROM users WHERE id = $1',
            [magicLink.user_id]
        );


        if (result.rows.length === 0) {
            return res.status(400).json({ error: 'User not found' });
        }


        const user = result.rows[0];
        console.log('✅ User found:', user.email);


        // ============================================================================
        // 🎯 v7.3 FIX: Set used_at BEFORE deleting (if using dedicated table)
        // ============================================================================
        if (linkId) {
            try {
                const updateResult = await pool.query(
                    `UPDATE magic_links 
                     SET used_at = NOW(), updated_at = NOW() 
                     WHERE id = $1 
                     RETURNING used_at, updated_at`,
                    [linkId]
                );

                console.log('✅ Token marked as used:');
                console.log('   used_at:', updateResult.rows[0].used_at);
                console.log('   updated_at:', updateResult.rows[0].updated_at);

            } catch (updateErr) {
                console.warn('⚠️ Could not mark token as used:', updateErr.message);
            }
        }


        // Update last_login
        await pool.query('UPDATE users SET last_login = NOW() WHERE id = $1', [user.id]);
        console.log('✅ User last_login updated');


        // 🧹 Clear all magic link session data
        req.session.magicLinkToken = null;
        req.session.magicLinkUserId = null;
        req.session.magicLinkExpiresAt = null;
        req.session.magicLinkIpAddress = null;
        req.session.magicLinkUserAgent = null;


        // Generate JWT
        const jwt_token = generateJWT(user);


        console.log('✅ Magic link authentication successful:', user.email);
        res.json({
            success: true,
            token: jwt_token,
            user: { id: user.id, username: user.username, email: user.email, role: user.role }
        });


    } catch (error) {
        console.error('❌ Magic link verify error:', error.message);
        console.error('   Stack:', error.stack);
        res.status(500).json({ error: error.message });
    }
});


// ============================================================================
// 🔗 LEGACY ALIASES (für Frontend Kompatibilität)
// ============================================================================


// /auth/login → /webauthn/authenticate-password
router.post('/login', async (req, res) => {
    const route = router.stack.find(r => r.route?.path === '/webauthn/authenticate-password');
    return route.route.stack[0].handle(req, res);
});


// /auth/send-magic-link → /webauthn/magic-link-request
router.post('/send-magic-link', async (req, res) => {
    const route = router.stack.find(r => r.route?.path === '/webauthn/magic-link-request');
    return route.route.stack[0].handle(req, res);
});


// ============================================================================
// 📤 EXPORTS
// ============================================================================


module.exports = router;