const jwt = require('jsonwebtoken');
const { randomBytes, randomUUID, createHash } = require('node:crypto');
const { pool } = require('../db');
const ACCESS_SECONDS = 900;
const SESSION_SECONDS = 7 * 86400;
const digest = value => createHash('sha256').update(value).digest('hex');
const cookieOptions = path => ({ path, httpOnly: true, secure: true, sameSite: 'lax' });
function deny(code = 'SESSION_INVALID') { return Object.assign(new Error('Authentication required'), { status: 403, code }); }
function generateJWT(user, sid) {
    if (!Number.isInteger(user.token_version) || !sid) throw deny();
    return jwt.sign({ id: user.id, token_version: user.token_version, sid }, process.env.JWT_SECRET,
        { algorithm: 'HS256', expiresIn: ACCESS_SECONDS, issuer: 'song-nexus', audience: 'song-nexus' });
}
function setCookies(res, user, sid, refresh) {
    res.set('Cache-Control', 'private, no-store');
    res.cookie('auth_token', generateJWT(user, sid), { ...cookieOptions('/'), maxAge: ACCESS_SECONDS * 1000 });
    res.cookie('refresh_token', refresh, { ...cookieOptions('/api/auth'), maxAge: SESSION_SECONDS * 1000 });
}
function clearAuthCookie(res) {
    res.clearCookie('auth_token', cookieOptions('/'));
    res.clearCookie('refresh_token', cookieOptions('/api/auth'));
    res.set('Cache-Control', 'private, no-store');
}
async function createLogin(user, res, db = pool) {
    if (!Number.isInteger(user.token_version)) throw deny();
    const sid = randomUUID(), refresh = randomBytes(32).toString('hex');
    // INSERT SELECT reads the current account version, not a prior login snapshot.
    const result = await db.query(`INSERT INTO auth_sessions(id,user_id,token_version,refresh_hash,expires_at)
        SELECT $1,id,token_version,$3,now()+interval '7 days' FROM users WHERE id=$2 AND is_active=true AND token_version=$4
        RETURNING user_id AS id, token_version`, [sid, user.id, digest(refresh), user.token_version]);
    if (!result.rows.length) throw deny('ACCOUNT_DISABLED');
    setCookies(res, result.rows[0], sid, refresh);
}
async function verifyAccessToken(token, db = pool) {
    let claim;
    try { claim = jwt.verify(token, process.env.JWT_SECRET, {
        algorithms: ['HS256'], issuer: 'song-nexus', audience: 'song-nexus',
    }); } catch { throw deny(); }
    if (!Number.isInteger(claim.id) || claim.id < 1 || !Number.isInteger(claim.token_version)
        || typeof claim.sid !== 'string' || !/^[0-9a-f-]{36}$/.test(claim.sid)) throw deny();
    const result = await db.query(`SELECT u.id,u.username,u.email,u.role,u.is_active,u.token_version
        FROM users u JOIN auth_sessions s ON s.user_id=u.id
        WHERE u.id=$1 AND s.id=$2 AND s.expires_at>now()
          AND s.token_version=u.token_version`, [claim.id, claim.sid]);
    const user = result.rows[0];
    if (!user || user.is_active !== true || user.token_version !== claim.token_version) throw deny();
    return { ...user, sid: claim.sid };
}
async function refreshLogin(req, res) {
    const old = req.cookies?.refresh_token;
    if (typeof old !== 'string' || !/^[a-f0-9]{64}$/.test(old)) throw deny();
    const refresh = randomBytes(32).toString('hex');
    // A concurrent reuse cannot match after the first UPDATE acquires the row lock.
    const result = await pool.query(`UPDATE auth_sessions s SET refresh_hash=$2
        FROM users u WHERE s.refresh_hash=$1 AND s.user_id=u.id AND u.is_active=true
        AND s.token_version=u.token_version AND s.expires_at>now()
        RETURNING s.id AS sid,u.id,u.token_version,u.username,u.email,u.role`, [digest(old), digest(refresh)]);
    if (!result.rows.length) throw deny();
    const user = result.rows[0];
    setCookies(res, user, user.sid, refresh);
    return { id: user.id, username: user.username, email: user.email, role: user.role };
}
async function logout(req, res, all = false) {
    if (all) await pool.query('UPDATE users SET token_version=token_version+1 WHERE id=$1', [req.user.id]);
    else if (req.cookies?.refresh_token) await pool.query('DELETE FROM auth_sessions WHERE refresh_hash=$1', [digest(req.cookies.refresh_token)]);
    else {
        let user = req.user;
        const token = req.cookies?.auth_token || /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
        if (!user && token) {
            try { user = await verifyAccessToken(token); }
            catch (error) { if (!error.status) throw error; }
        }
        if (user?.sid) await pool.query('DELETE FROM auth_sessions WHERE id=$1', [user.sid]);
    }
    clearAuthCookie(res);
}
module.exports = { createLogin, verifyAccessToken, generateJWT, refreshLogin, logout, clearAuthCookie, digest };
