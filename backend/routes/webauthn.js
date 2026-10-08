const express = require('express');
const { randomBytes } = require('node:crypto');
const { generateRegistrationOptions, generateAuthenticationOptions,
    verifyRegistrationResponse, verifyAuthenticationResponse } = require('@simplewebauthn/server');
const { createLogin } = require('../utils/auth-session');
const { putChallenge, consumeChallenge, createAccountLink, consumeAccountLink } = require('../utils/security-state');
const { sendMagicLinkEmail } = require('../utils/mailer');
const router = express.Router();
router.use((req, res, next) => { res.set('Cache-Control', 'private, no-store'); next(); });
function credentialBytes(value) {
    // Older releases inserted base64url text into a bytea column. New writes
    // store the actual COSE bytes. Decode only the unambiguous old text format.
    const bytes = Buffer.isBuffer(value) || value instanceof Uint8Array ? Buffer.from(value) : Buffer.from(value, 'base64url');
    const text = bytes.toString('ascii');
    return new Uint8Array(/^[A-Za-z0-9_-]+$/.test(text) ? Buffer.from(text, 'base64url') : bytes);
}
function relyingParty() {
    const rpID = process.env.WEBAUTHN_RP_ID;
    const origin = process.env.WEBAUTHN_ORIGIN;
    if (process.env.NODE_ENV === 'production' && (!rpID || !origin)) throw new Error('WebAuthn configuration missing');
    return { rpID: rpID || 'localhost', origin: origin || 'https://localhost:5500' };
}
const publicUser = u => ({ id: u.id, username: u.username, email: u.email, role: u.role });
router.post('/register-options', async (req, res) => {
    const { username, email } = req.body;
    if (typeof username !== 'string' || username.length < 3 || username.length > 20
        || typeof email !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
        return res.status(400).json({ error: 'Valid username and email required' });
    try {
        const existing = await req.app.db.query('SELECT id FROM users WHERE email=$1 OR lower(username)=lower($2)', [email, username]);
        if (existing.rows.length) return res.status(400).json({ error: 'Account already exists' });
        const { rpID } = relyingParty();
        const options = await generateRegistrationOptions({ rpID, rpName: 'SONG-NEXUS',
            userName: username, userID: randomBytes(32), attestationType: 'none',
            authenticatorSelection: { residentKey: 'required', userVerification: 'required' } });
        await putChallenge(req, 'register', options.challenge, { username, email });
        res.json(options);
    } catch { res.status(503).json({ error: 'Registration unavailable' }); }
});
router.post('/register-verify', async (req, res) => {
    let client;
    try {
        const state = await consumeChallenge(req, 'register');
        if (!state) return res.status(400).json({ error: 'Challenge expired or used' });
        const { rpID, origin } = relyingParty();
        let verification;
        try { verification = await verifyRegistrationResponse({ response: req.body,
            expectedChallenge: state.challenge, expectedOrigin: origin, expectedRPID: rpID,
            requireUserVerification: true }); }
        catch { return res.status(400).json({ error: 'Invalid registration' }); }
        if (!verification.verified) return res.status(400).json({ error: 'Invalid registration' });
        const credential = verification.registrationInfo.credential;
        client = await req.app.db.connect();
        await client.query('BEGIN');
        const result = await client.query(`INSERT INTO users(username,email,password_hash,role,is_active)
            VALUES($1,$2,$3,'user',true) RETURNING id,username,email,role,token_version`,
            [state.context.username, state.context.email, '!passkey-only']);
        const user = result.rows[0];
        await client.query(`INSERT INTO webauthn_credentials(user_id,credential_id,public_key,counter,transports,created_at)
            VALUES($1,$2,$3,$4,$5,now())`,
            [user.id, credential.id, Buffer.from(credential.publicKey), credential.counter, credential.transports || []]);
        await client.query('COMMIT');
        await createLogin(user, res);
        res.json({ verified: true, user: publicUser(user) });
    } catch { if (client) await client.query('ROLLBACK'); res.status(503).json({ error: 'Registration unavailable' }); }
    finally { client?.release(); }
});
router.post('/authenticate-options', async (req, res) => {
    try {
        const { rpID } = relyingParty();
        // Discoverable credentials avoid publishing the entire credential directory.
        const options = await generateAuthenticationOptions({ rpID, userVerification: 'required' });
        await putChallenge(req, 'authenticate', options.challenge);
        res.json(options);
    } catch { res.status(503).json({ error: 'Authentication unavailable' }); }
});
router.post('/authenticate-verify', async (req, res) => {
    try {
        const state = await consumeChallenge(req, 'authenticate');
        if (!state) return res.status(400).json({ error: 'Challenge expired or used' });
        const found = await req.app.db.query(`SELECT c.public_key,c.counter,c.transports,u.id,u.username,u.email,u.role,u.token_version
            FROM webauthn_credentials c JOIN users u ON u.id=c.user_id
            WHERE c.credential_id=$1 AND u.is_active=true`, [req.body.id]);
        const user = found.rows[0];
        if (!user) return res.status(400).json({ error: 'Invalid authentication' });
        const { rpID, origin } = relyingParty();
        let verification;
        try { verification = await verifyAuthenticationResponse({ response: req.body,
            expectedChallenge: state.challenge, expectedOrigin: origin, expectedRPID: rpID,
            requireUserVerification: true,
            credential: { id: req.body.id, publicKey: credentialBytes(user.public_key),
                counter: Number(user.counter), transports: user.transports || [] } }); }
        catch { return res.status(400).json({ error: 'Invalid authentication' }); }
        if (!verification.verified) return res.status(400).json({ error: 'Invalid authentication' });
        const updated = await req.app.db.query(`UPDATE webauthn_credentials SET counter=$1,last_used=now()
            WHERE credential_id=$2 AND counter=$3 RETURNING user_id`,
            [verification.authenticationInfo.newCounter, req.body.id, user.counter]);
        if (!updated.rows.length) return res.status(400).json({ error: 'Authentication already used' });
        await createLogin(user, res);
        res.json({ verified: true, user: publicUser(user) });
    } catch { res.status(503).json({ error: 'Authentication unavailable' }); }
});
// Keep legacy URLs while using exactly the same password rules and account checks.
const passwordRouter = require('./auth');
router.post('/register-password', (req, res, next) => { req.url = '/register'; passwordRouter(req, res, next); });
router.post('/authenticate-password', (req, res, next) => {
    req.body.username = req.body.username || req.body.email;
    req.url = '/login'; passwordRouter(req, res, next);
});
router.post('/login-magic-link', async (req, res) => {
    try {
        if (typeof req.body.email === 'string') {
            const found = await req.app.db.query('SELECT id,email FROM users WHERE email=$1 AND is_active=true', [req.body.email]);
            if (found.rows.length) {
                const token = await createAccountLink(found.rows[0].id, 'login');
                if (token) await sendMagicLinkEmail(found.rows[0].email, token, process.env.FRONTEND_URL || 'https://localhost:5500');
            }
        }
    } catch { console.error('Login link delivery failed'); }
    res.json({ message: 'Falls ein aktives Konto existiert, wurde der Link versandt.' });
});
router.post('/verify-magic-link', async (req, res) => {
    try {
        const user = await consumeAccountLink(req.body.token, 'login');
        if (!user) return res.status(401).json({ error: 'Invalid link' });
        await createLogin(user, res);
        res.json({ user: publicUser(user) });
    } catch { res.status(503).json({ error: 'Authentication unavailable' }); }
});
// Link scanners must not consume credentials or establish a session with GET.
router.get('/magic-link', (req, res) => res.redirect(303, '/auth.html'));
module.exports = router;
