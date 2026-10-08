const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const request = require('supertest');
let pool, engine, app, user;
const enabled = !!(process.env.TEST_DATABASE_URL || process.env.PGLITE_TEST_MODULE);
if (!enabled) throw new Error('Integration requires a disposable TEST_DATABASE_URL or local PGLITE_TEST_MODULE');
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'synthetic-integration-secret-at-least-32-chars';
process.env.SESSION_SECRET = 'different-synthetic-session-secret-at-least-32-chars';
process.env.PAYMENTS_ENABLED = 'false';
process.env.BCRYPT_ROUNDS = '4';
process.env.WEBAUTHN_RP_ID = 'localhost';
process.env.WEBAUTHN_ORIGIN = 'https://localhost:5500';
let auth, state;
before(async () => {
    if (process.env.PGLITE_TEST_MODULE) {
        const { PGlite } = require(process.env.PGLITE_TEST_MODULE);
        engine = new PGlite();
        const query = (sql, params, callback) => {
            const promise = params ? engine.query(sql, params) : engine.exec(sql).then(rows => rows.at(-1));
            if (callback) { promise.then(r => callback(null, r), callback); return; }
            return promise;
        };
        pool = { query, connect: async () => ({ query, release() {} }), on() {}, end: () => engine.close() };
    } else {
        const url = new URL(process.env.TEST_DATABASE_URL);
        assert.ok(['localhost','127.0.0.1','[::1]'].includes(url.hostname) && url.pathname.endsWith('_test'), 'Disposable local test database only');
        pool = new (require('pg').Pool)({ connectionString: url.href });
    }
    await pool.query('DROP SCHEMA public CASCADE; CREATE SCHEMA public');
    await pool.query(fs.readFileSync(path.join(__dirname, '../../schema_clean.sql'), 'utf8'));
    // Idempotent bootstrap on an already populated schema must also succeed.
    await pool.query(fs.readFileSync(path.join(__dirname, '../../schema_clean.sql'), 'utf8'));
    const { migrate } = require('../scripts/migrate');
    // PGlite has no advisory-lock implementation; genuine PostgreSQL CI exercises it.
    const migrationClient = await pool.connect();
    const originalQuery = migrationClient.query.bind(migrationClient);
    if (engine) migrationClient.query = (sql, values) => /pg_advisory_/.test(sql)
        ? Promise.resolve({ rows: [] }) : originalQuery(sql, values);
    await migrate(migrationClient); await migrate(migrationClient); migrationClient.release();
    require.cache[require.resolve('../db')] = { id: require.resolve('../db'), filename: require.resolve('../db'), loaded: true, exports: { pool } };
    auth = require('../utils/auth-session'); state = require('../utils/security-state');
    app = require('../app').createApp({ consoleLogging: false });
});
after(async () => { app?.locals.dispose(); await pool?.end(); });
beforeEach(async () => {
    await pool.query('TRUNCATE users CASCADE');
    await pool.query('TRUNCATE web_sessions, webauthn_challenges');
    const hash = await require('bcryptjs').hash('correct-horse-battery-staple', 4);
    user = (await pool.query(`INSERT INTO users(username,email,password_hash,role,is_active)
        VALUES('fixture','fixture@example.test',$1,'user',true) RETURNING *`, [hash])).rows[0];
});
const post = (url, payload) => request(app).post(url).set('Origin', 'https://localhost:5500').send(payload || {});
function cookies(response) { return response.headers['set-cookie'].map(x => x.split(';')[0]); }
function cookieValue(list, name) { return list.find(c => c.startsWith(name+'=')).slice(name.length+1); }
async function login() {
    const res = await post('/api/auth/login', { username: 'fixture', password: 'correct-horse-battery-staple' });
    assert.equal(res.status, 200); assert.equal(res.body.token, undefined);
    assert.ok(res.headers['set-cookie'].every(c => /HttpOnly/.test(c)));
    return cookies(res);
}
test('password login and legacy alias use cookies and current account data', async () => {
    const saved = await login();
    const res = await request(app).get('/api/auth/me').set('Cookie', saved);
    assert.equal(res.status,200); assert.equal(res.body.user.id,user.id);
    assert.equal(res.body.user.password_hash,undefined);
    const alias = await post('/api/auth/webauthn/authenticate-password', { email: user.email, password: 'correct-horse-battery-staple' });
    assert.equal(alias.status,200); assert.equal(alias.body.token,undefined);
});
for (const [name, sql] of [
    ['password', "UPDATE users SET password_hash='changed' WHERE id=$1"],
    ['role', "UPDATE users SET role='admin' WHERE id=$1"],
    ['disabled', 'UPDATE users SET is_active=false WHERE id=$1'],
]) test(`${name} change rejects access and refresh immediately`, async () => {
    const saved = await login(); await pool.query(sql,[user.id]);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie',saved)).status,403);
    assert.equal((await post('/api/auth/refresh-token').set('Cookie',saved)).status,403);
    assert.equal((await pool.query('SELECT token_version FROM users WHERE id=$1',[user.id])).rows[0].token_version,2);
});
test('deleted account and unversioned legacy JWT cannot authenticate', async () => {
    const saved=await login(); await pool.query('DELETE FROM users WHERE id=$1',[user.id]);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie',saved)).status,403);
    const legacy=require('jsonwebtoken').sign({id:user.id,role:'admin'},process.env.JWT_SECRET);
    assert.equal((await request(app).get('/api/auth/me').set('Authorization','Bearer '+legacy)).status,403);
});
test('database outage is fail-closed 503', async () => {
    const saved=await login(); const original=pool.query;
    pool.query=()=>Promise.reject(new Error('synthetic outage'));
    try { assert.equal((await request(app).get('/api/auth/me').set('Cookie',saved)).status,503); }
    finally { pool.query=original; }
});
test('logout revokes one session; logout-all revokes every device', async () => {
    const first=await login(), second=await login();
    assert.equal((await post('/api/auth/logout').set('Cookie',first)).status,200);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie',first)).status,403);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie',second)).status,200);
    assert.equal((await post('/api/auth/logout-all').set('Cookie',second)).status,200);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie',second)).status,403);
});
test('concurrent refresh has one winner and never returns credentials in JSON', async () => {
    const saved=await login();
    const replies=await Promise.all([post('/api/auth/refresh-token').set('Cookie',saved),post('/api/auth/refresh-token').set('Cookie',saved)]);
    assert.deepEqual(replies.map(r=>r.status).sort(),[200,403]);
    const winner=replies.find(r=>r.status===200); assert.equal(winner.body.token,undefined);
    assert.notEqual(cookieValue(cookies(winner),'refresh_token'),cookieValue(saved,'refresh_token'));
});
test('password check snapshot cannot create a session after concurrent password change', async () => {
    await pool.query("UPDATE users SET password_hash='changed' WHERE id=$1",[user.id]);
    await assert.rejects(auth.createLogin(user,{cookie(){ throw new Error('must not issue'); }}),/Authentication required/);
});
test('magic links are hashed, active-account-bound and single-use; GET never logs in', async () => {
    const token=await state.createAccountLink(user.id,'login');
    const stored=(await pool.query('SELECT token_hash FROM account_links')).rows[0];
    assert.notEqual(stored.token_hash,token);
    const results=await Promise.all([state.consumeAccountLink(token,'login'),state.consumeAccountLink(token,'login')]);
    assert.equal(results.filter(Boolean).length,1);
    assert.equal((await request(app).get('/api/auth/webauthn/magic-link?token='+token)).headers['set-cookie'],undefined);
    const second=await state.createAccountLink(user.id,'login');
    await pool.query('UPDATE users SET is_active=false WHERE id=$1',[user.id]);
    assert.equal(await state.consumeAccountLink(second,'login'),undefined);
});
test('reset transaction consumes link, changes hash and revokes all sessions', async () => {
    const saved=await login(), token=await state.createAccountLink(user.id,'reset');
    const res=await post('/api/auth/password-reset/confirm',{token,newPassword:'another-correct-battery-staple'});
    assert.equal(res.status,200);
    assert.equal((await request(app).get('/api/auth/me').set('Cookie',saved)).status,403);
    assert.equal((await post('/api/auth/password-reset/confirm',{token,newPassword:'yet-another-correct-staple'})).status,400);
});
test('challenge persists across application recreation; only one concurrent consumer wins', async () => {
    const first=await post('/api/auth/webauthn/authenticate-options').set('X-Forwarded-Proto','https');
    assert.equal(first.status,200); assert.equal(first.body.allowCredentials,undefined);
    const sid=(await pool.query('SELECT session_id FROM webauthn_challenges')).rows[0].session_id;
    app.locals.dispose(); app=require('../app').createApp({consoleLogging:false});
    const results=await Promise.all([state.consumeChallenge({sessionID:sid},'authenticate'),state.consumeChallenge({sessionID:sid},'authenticate')]);
    assert.equal(results.filter(Boolean).length,1); assert.equal(results.find(Boolean).challenge,first.body.challenge);
});
async function signedAssertion(challenge, change={}) {
    const { privateKey,publicKey }=crypto.generateKeyPairSync('ec',{namedCurve:'prime256v1'});
    const jwk=publicKey.export({format:'jwk'}), id=crypto.randomBytes(16).toString('base64url');
    const cose=require('cbor').encode(new Map([[1,2],[3,-7],[-1,1],[-2,Buffer.from(jwk.x,'base64url')],[-3,Buffer.from(jwk.y,'base64url')]]));
    await pool.query(`INSERT INTO webauthn_credentials(user_id,credential_id,public_key,counter,transports) VALUES($1,$2,$3,0,'{}')`,[user.id,id,cose]);
    const clientData=Buffer.from(JSON.stringify({type:'webauthn.get',challenge:change.challenge||challenge,origin:change.origin||'https://localhost:5500',crossOrigin:false}));
    const authData=Buffer.concat([crypto.createHash('sha256').update(change.rpID||'localhost').digest(),Buffer.from([change.flags ?? 5]),Buffer.from([0,0,0,1])]);
    const signature=crypto.sign('sha256',Buffer.concat([authData,crypto.createHash('sha256').update(clientData).digest()]),privateKey);
    if(change.signature) signature[signature.length-1]^=1;
    return { id,rawId:id,type:'public-key',response:{clientDataJSON:clientData.toString('base64url'),authenticatorData:authData.toString('base64url'),signature:signature.toString('base64url')} };
}
for (const [label, change] of [['valid',{}],['signature',{signature:true}],['origin',{origin:'https://other.example'}],['challenge',{challenge:'wrong'}],['rpID',{rpID:'other.example'}],['user verification',{flags:1}]])
 test(`WebAuthn real verifier: ${label}`,async()=>{
    const options=await post('/api/auth/webauthn/authenticate-options').set('X-Forwarded-Proto','https');
    assert.equal(options.status,200);
    const assertion=await signedAssertion(options.body.challenge,change);
    const saved=cookies(options);
    const result=await post('/api/auth/webauthn/authenticate-verify',assertion).set('Cookie',saved).set('X-Forwarded-Proto','https');
    assert.equal(result.status,label==='valid'?200:400,JSON.stringify(result.body));
    const count=Number((await pool.query('SELECT count(*) FROM auth_sessions')).rows[0].count);
    assert.equal(count,label==='valid'?1:0);
    assert.equal((await post('/api/auth/webauthn/authenticate-verify',assertion).set('Cookie',saved)).status,400);
 });
test('download token survives app recreation and is consumed once with account/purchase recheck',async()=>{
    const saved=await login();
    const track=(await pool.query(`INSERT INTO tracks(name,artist,audio_filename,is_free,is_published,is_deleted) VALUES('fixture','synthetic','integration.mp3',false,true,false) RETURNING id`)).rows[0];
    await pool.query('INSERT INTO purchases(user_id,track_id) VALUES($1,$2)',[user.id,track.id]);
    const granted=await request(app).get('/api/payments/download/'+track.id).set('Cookie',saved);assert.equal(granted.status,200);
    const file=path.join(__dirname,'../public/audio/integration.mp3');fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,'SYNTHETIC AUDIO');
    try {
        app.locals.dispose();app=require('../app').createApp({consoleLogging:false});
        const results=await Promise.all([request(app).get(granted.body.download_url).set('Cookie',saved),request(app).get(granted.body.download_url).set('Cookie',saved)]);
        assert.deepEqual(results.map(r=>r.status).sort(),[200,403]);
        const winner=results.find(r=>r.status===200);assert.equal(winner.headers['cache-control'],'private, no-store');
    } finally { fs.unlinkSync(file); }
});
