const { randomBytes } = require('node:crypto');
const { pool } = require('../db');
const { digest } = require('./auth-session');
async function putChallenge(req, purpose, challenge, context = {}) {
    // Mark the session used so the persistent session cookie is issued.
    req.session.webauthn = true;
    await pool.query(`INSERT INTO webauthn_challenges(session_id,purpose,challenge,context,expires_at)
        VALUES ($1,$2,$3,$4,now()+interval '5 minutes')
        ON CONFLICT(session_id,purpose) DO UPDATE SET challenge=$3,context=$4,expires_at=now()+interval '5 minutes'`,
        [req.sessionID, purpose, challenge, context]);
    await new Promise((resolve, reject) => req.session.save(error => error ? reject(error) : resolve()));
}
async function consumeChallenge(req, purpose) {
    const result = await pool.query(`DELETE FROM webauthn_challenges
        WHERE session_id=$1 AND purpose=$2 AND expires_at>now() RETURNING challenge,context`, [req.sessionID, purpose]);
    return result.rows[0];
}
async function createAccountLink(userId, purpose) {
    const token = randomBytes(32).toString('hex');
    const result = await pool.query(`INSERT INTO account_links(token_hash,user_id,purpose,token_version,expires_at)
        SELECT $1,id,$3,token_version,now()+interval '15 minutes' FROM users WHERE id=$2 AND is_active=true
        RETURNING user_id`, [digest(token), userId, purpose]);
    return result.rows.length ? token : null;
}
async function consumeAccountLink(token, purpose, db = pool) {
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
    const result = await db.query(`DELETE FROM account_links l USING users u
        WHERE l.token_hash=$1 AND l.purpose=$2 AND l.user_id=u.id AND u.is_active=true
        AND l.token_version=u.token_version AND l.expires_at>now()
        RETURNING u.id,u.username,u.email,u.role,u.token_version`, [digest(token), purpose]);
    return result.rows[0];
}
async function pruneSecurityState() {
    for (const table of ['auth_sessions', 'webauthn_challenges', 'download_tokens', 'account_links'])
        await pool.query(`DELETE FROM ${table} WHERE expires_at < now()`);
}
module.exports = { putChallenge, consumeChallenge, createAccountLink, consumeAccountLink, pruneSecurityState };
