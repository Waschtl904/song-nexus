/** Issue #47: echte Produktionsverdrahtung, ohne PostgreSQL/SMTP/PayPal. */
const fs = require('fs');
const path = require('path');
const os = require('os');
const { spawnSync } = require('child_process');
const request = require('supertest');

jest.mock('../db', () => ({
  pool: { query: jest.fn(), end: jest.fn().mockResolvedValue() },
}));
jest.mock('../utils/mailer', () => ({
  verifyMailer: jest.fn().mockResolvedValue(),
  sendPasswordResetEmail: jest.fn(),
}));
jest.mock('rotating-file-stream', () => ({
  createStream: jest.fn(() => {
    const { PassThrough } = require('stream');
    const stream = new PassThrough();
    stream.resume();
    return stream;
  }),
}));

const { createApp } = require('../app');
const { createServer, startServer } = require('../server');
const { pool } = require('../db');
const { verifyMailer } = require('../utils/mailer');
const savedEnv = { ...process.env };
const ORIGIN = 'https://music.example';
let frontendPath;
let applications;

beforeAll(() => {
  frontendPath = fs.mkdtempSync(path.join(os.tmpdir(), 'song-nexus-frontend-'));
  fs.writeFileSync(path.join(frontendPath, 'index.html'), '<h1>synthetic frontend</h1>');
  fs.writeFileSync(path.join(frontendPath, 'fixture.css'), 'body { color: blue; }');
});

beforeEach(() => {
  process.env.NODE_ENV = 'production';
  process.env.USE_HTTPS = 'false';
  process.env.SESSION_SECRET = 'synthetic-session-secret-for-tests-only';
  process.env.JWT_SECRET = 'synthetic-access-secret-for-tests-only';
  process.env.JWT_REFRESH_SECRET = 'synthetic-refresh-secret-for-tests-only';
  process.env.ALLOWED_ORIGINS = ORIGIN;
  process.env.FRONTEND_URL = ORIGIN;
  process.env.PAYMENTS_ENABLED = 'false';
  applications = [];
  pool.query.mockReset().mockResolvedValue({ rows: [], rowCount: 0 });
  require('../middleware/cache-middleware').cache.flushAll();
  verifyMailer.mockClear();
});

afterEach(async () => {
  for (const { app, server } of applications) {
    if (server.listening) await new Promise((resolve) => server.close(resolve));
    app.locals.dispose();
  }
  jest.restoreAllMocks();
  for (const key of Object.keys(process.env)) if (!(key in savedEnv)) delete process.env[key];
  Object.assign(process.env, savedEnv);
});

afterAll(() => fs.rmSync(frontendPath, { recursive: true, force: true }));

function production() {
  const application = createServer({ frontendPath, consoleLogging: false });
  applications.push(application);
  return application;
}

test('Import des Startmoduls startet weder App, DB, Mailer noch Listener', () => {
  const result = spawnSync(process.execPath, ['-e', `
    require('./server');
    for (const file of ['./app', './db', './utils/mailer']) {
      if (require.cache[require.resolve(file)]) throw new Error('Import side effect: ' + file);
    }
  `], {
    cwd: path.join(__dirname, '..'), timeout: 5000,
    env: { ...process.env, USE_HTTPS: 'true', SESSION_SECRET: '' }, encoding: 'utf8',
  });
  expect(result.error).toBeUndefined();
  expect(result.status).toBe(0);
});

test('Server verwendet die gemeinsame App und denselben Pool fuer WebAuthn', () => {
  const factory = jest.spyOn(require('../app'), 'createApp');
  const { app, server } = production();
  expect(factory).toHaveBeenCalledTimes(1);
  expect(factory.mock.results[0].value).toBe(app);
  expect(server.listeners('request')).toEqual([app]);
  expect(app.db).toBe(pool);
  expect(pool.query).not.toHaveBeenCalled();
  expect(verifyMailer).not.toHaveBeenCalled();
  expect(server.listening).toBe(false);
});

test.each(['SESSION_SECRET', 'JWT_SECRET', 'JWT_REFRESH_SECRET'])('Produktion verweigert fehlendes %s', (name) => {
  delete process.env[name];
  expect(() => createApp({ consoleLogging: false })).toThrow('secret configuration');
});

test('Produktion verweigert identische Session- und JWT-Secrets', () => {
  process.env.SESSION_SECRET = process.env.JWT_SECRET;
  expect(() => production()).toThrow('secret configuration');
});

test('HTTP hinter nginx funktioniert ohne lokale mkcert-Dateien', async () => {
  const read = jest.spyOn(fs, 'readFileSync');
  const { server } = production();
  const res = await request(server).get('/').expect(200);
  expect(res.text).toContain('synthetic frontend');
  expect(read.mock.calls.some(([p]) => String(p).endsWith('.pem'))).toBe(false);
});

test('angefordertes HTTPS faellt bei fehlendem Schluessel nicht auf HTTP zurueck', () => {
  process.env.USE_HTTPS = 'true';
  const originalRead = fs.readFileSync;
  jest.spyOn(fs, 'readFileSync').mockImplementation((file, ...args) => {
    if (String(file).endsWith('localhost-key.pem')) throw new Error('synthetic missing key');
    return originalRead(file, ...args);
  });
  expect(() => production()).toThrow('synthetic missing key');
});

test('HTTPS liefert die App und setzt sichere Session-Cookies', async () => {
  const { cert, key } = await require('../utils/development-certificate').developmentCertificate();
  const originalRead = fs.readFileSync;
  jest.spyOn(fs, 'readFileSync').mockImplementation((file, ...args) => {
    if (String(file).endsWith('localhost-key.pem')) return key;
    if (String(file).endsWith('localhost.pem')) return cert;
    return originalRead(file, ...args);
  });
  process.env.USE_HTTPS = 'true';
  const { app, server } = production();
  app.get('/session-fixture', (req, res) => {
    req.session.synthetic = true;
    res.json({ secure: req.secure });
  });
  const res = await request(server).get('/session-fixture').ca(cert).expect(200);
  expect(res.body.secure).toBe(true);
  expect(res.headers['set-cookie'][0]).toMatch(/HttpOnly; Secure; SameSite=Lax/);
});

test('CSP mit wechselndem Nonce und HSTS stehen auf echten Frontend-Antworten', async () => {
  const { server } = production();
  const first = await request(server).get('/').expect(200);
  const second = await request(server).get('/fixture.css').expect(200);
  expect(first.headers['content-security-policy']).toMatch(/script-src 'self' 'nonce-[a-f0-9]+'/);
  expect(first.headers['content-security-policy']).not.toBe(second.headers['content-security-policy']);
  expect(first.headers['strict-transport-security']).toContain('max-age=300');
  expect(first.headers['x-powered-by']).toBeUndefined();
  expect(first.headers['x-content-type-options']).toBe('nosniff');
});

test('alte statische Audio-URL bleibt trotz echter Datei unter backend/public/audio 404', async () => {
  const dir = path.join(__dirname, '../public/audio');
  fs.mkdirSync(dir, { recursive: true });
  const file = path.join(dir, `regression-${process.pid}.mp3`);
  fs.writeFileSync(file, 'SYNTHETIC PREMIUM BYTES');
  try {
    const { server } = production();
    const res = await request(server).get(`/public/audio/${path.basename(file)}`).expect(404);
    expect(res.text).not.toContain('SYNTHETIC PREMIUM BYTES');
  } finally {
    fs.unlinkSync(file);
  }
});

test('erlaubter Produktions-Origin erhaelt CORS samt Credentials', async () => {
  const { server } = production();
  const res = await request(server).get('/').set('Origin', ORIGIN).expect(200);
  expect(res.headers['access-control-allow-origin']).toBe(ORIGIN);
  expect(res.headers['access-control-allow-credentials']).toBe('true');
});

test.each(['https://foreign.example', 'https://localhost:5500'])('fremder Origin %s erhaelt keine CORS-Freigabe', async (origin) => {
  const { server } = production();
  const res = await request(server).get('/').set('Origin', origin).expect(200);
  expect(res.headers['access-control-allow-origin']).toBeUndefined();
});

test('CORS-Preflight verwendet dieselbe Produktionsliste', async () => {
  const { server } = production();
  const allowed = await request(server).options('/api/csp-report').set('Origin', ORIGIN)
    .set('Access-Control-Request-Method', 'POST').expect(200);
  expect(allowed.headers['access-control-allow-origin']).toBe(ORIGIN);
  const denied = await request(server).options('/api/csp-report').set('Origin', 'https://foreign.example')
    .set('Access-Control-Request-Method', 'POST').expect(200);
  expect(denied.headers['access-control-allow-origin']).toBeUndefined();
});

test.each([
  ['post', '/api/csp-report'], ['post', '/api/admin/tracks/upload'],
  ['put', '/api/design-system/1'], ['delete', '/api/play-history/user/1'],
  ['post', '/api/payments/create-order'],
])('Cross-site %s %s scheitert vor dem Handler', async (method, url) => {
  const { server } = production();
  const res = await request(server)[method](url).set('Origin', ORIGIN)
    .set('Sec-Fetch-Site', 'cross-site').send({}).expect(403);
  expect(res.body.code).toBe('CSRF_CROSS_SITE');
  expect(pool.query).not.toHaveBeenCalled();
});

test('fehlende Herkunft wird auch im Serverpfad abgelehnt', async () => {
  const { server } = production();
  // Leerer eigener Header verhindert die automatische Test-Origin aus jest.setup.
  const res = await request(server).post('/api/csp-report').set('Origin', '').send({}).expect(403);
  expect(res.body.code).toBe('CSRF_NO_SOURCE');
});

test('erlaubte Herkunft erreicht den Produktionshandler', async () => {
  const { server } = production();
  await request(server).post('/api/csp-report').set('Origin', ORIGIN).send({}).expect(204);
});

test('allgemeines Produktionsbudget erlaubt 30 Anfragen, die 31. liefert 429', async () => {
  const { server } = production();
  // Explizit lauschen: supertest darf nicht zwischen Requests server.close()
  // ausloesen und dadurch die zum Server gehoerenden Ressourcen freigeben.
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  for (let i = 0; i < 30; i++) await request(server).get('/api/not-found').expect(404);
  const res = await request(server).get('/api/not-found').expect(429);
  expect(res.body.limit).toBe(30);
  expect(Number(res.headers['retry-after'])).toBeGreaterThan(0);
});

test('Loginbudget ist eigenstaendig, streng und nach dem Zeitfenster wieder frei', async () => {
  const { server } = production();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  let now = Date.now();
  jest.spyOn(Date, 'now').mockImplementation(() => now);
  for (let i = 0; i < 6; i++) await request(server).get('/api/not-found').expect(404);
  for (let i = 0; i < 5; i++) {
    await request(server).post('/api/auth/login').set('Origin', ORIGIN).send({}).expect(400);
  }
  const res = await request(server).post('/api/auth/login').set('Origin', ORIGIN).send({}).expect(429);
  expect(res.body.limit).toBe(5);
  now += 60001;
  await request(server).post('/api/auth/login').set('Origin', ORIGIN).send({}).expect(400);
});

test('App-Instanzen teilen keine Ratenzaehler', async () => {
  const a = production(); const b = production();
  for (let i = 0; i < 6; i++) await request(a.server).post('/api/auth/login').set('Origin', ORIGIN).send({});
  await request(a.server).post('/api/auth/login').set('Origin', ORIGIN).send({}).expect(429);
  await request(b.server).post('/api/auth/login').set('Origin', ORIGIN).send({}).expect(400);
});

test.each(['/api/cache/stats', '/api/admin/herkunft/vorgaben', '/api/users/profile'])('vormals getrennte geschuetzte Route %s ist eingebunden', async (url) => {
  const { server } = production();
  await request(server).get(url).expect(401);
});

test('Design-System liest ueber denselben App-Pool', async () => {
  const { server } = production();
  const res = await request(server).get('/api/design-system');
  expect(res.status).toBe(200);
  expect(pool.query).toHaveBeenCalledWith(expect.stringContaining('design_system'));
});

test('Blog-Handler und statische Fehlerantwort kommen aus der gemeinsamen App', async () => {
  const exists = fs.existsSync;
  const blogPath = path.join(__dirname, '../public/blog/posts.json');
  jest.spyOn(fs, 'existsSync').mockImplementation((file) => file === blogPath ? false : exists(file));
  const { server } = production();
  const blog = await request(server).get('/api/blog/posts.json').expect(404);
  expect(blog.body).toEqual({ error: 'Posts file not found' });
  expect(blog.headers['content-type']).toContain('application/json');
  const missing = await request(server).get('/missing-asset.css').expect(404);
  expect(missing.headers['content-security-policy']).toBeDefined();
});

test('echter Startpfad: Warmup, Mailer, Listener; keine DEBUG-Abfrage in Produktion', async () => {
  process.env.HOST = '127.0.0.1';
  process.env.PORT = '0';
  const application = await startServer();
  applications.push(application);
  expect(application.server.listening).toBe(true);
  expect(pool.query.mock.calls).toEqual([['SELECT NOW()']]);
  expect(verifyMailer).toHaveBeenCalledTimes(1);
  await request(application.server).get('/api/users/profile').expect(401);
});
