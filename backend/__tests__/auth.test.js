/**
 * Auth Route Tests
 * Testet:
 *   POST /api/auth/register       - Registrierung
 *   POST /api/auth/login           - Login (Passwort)
 *   POST /api/auth/verify          - JWT-Token prüfen
 *   GET  /api/auth/me              - Eigenes Profil abrufen
 *   POST /api/auth/logout          - Logout
 *   POST /api/auth/refresh-token   - Token erneuern
 */

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars';
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-chars';
process.env.PAYPAL_CLIENT_ID = 'test-client-id';
process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
process.env.PAYPAL_MODE = 'sandbox';
process.env.FRONTEND_URL = 'http://localhost:3000';
process.env.BCRYPT_ROUNDS = '4'; // schnell im Test

const request = require('supertest');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// ---------------------------------------------------------------------------
// Mocks  (ALLE vor dem ersten require('../app')!)
// ---------------------------------------------------------------------------

jest.mock('../db', () => ({
  pool: { query: jest.fn(), end: jest.fn().mockResolvedValue(undefined) },
}));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

jest.mock('@paypal/checkout-server-sdk', () => ({
  core: {
    SandboxEnvironment: jest.fn(),
    LiveEnvironment: jest.fn(),
    PayPalHttpClient: jest.fn().mockImplementation(() => ({ execute: jest.fn() })),
  },
  orders: {
    OrdersCreateRequest: jest.fn(),
    OrdersCaptureRequest: jest.fn(),
  },
}));

jest.mock('../middleware/cache-middleware', () => ({
  cacheMiddleware: jest.fn(() => (req, res, next) => next()),
  clearCache: jest.fn(),
  clearCacheKey: jest.fn(),
  cache: {
    get: jest.fn(),
    set: jest.fn(),
    del: jest.fn(),
    keys: jest.fn(() => []),
    flushAll: jest.fn(),
  },
}));

jest.mock('compression', () => () => (req, res, next) => next());

jest.mock('fs', () => ({
  existsSync: jest.fn().mockReturnValue(true),
  statSync: () => ({ size: 1000 }),
  createReadStream: jest.fn(),
}));

// ---------------------------------------------------------------------------
// App + DB-Pool importieren (nach allen Mocks)
// ---------------------------------------------------------------------------
const app = require('../app');
const { pool } = require('../db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Erzeugt ein gültiges JWT für einen Test-User.
 */
function makeToken(user = { id: 1, role: 'user', email: 'test@example.com', username: 'testuser' }) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

/**
 * Erzeugt ein bcrypt-Hash-Passwort für Tests (4 Rounds = schnell).
 */
async function makeHash(plain) {
  return bcrypt.hash(plain, 4);
}

// ---------------------------------------------------------------------------
// Tear down: DB-Pool schließen damit Jest sauber beendet
// ---------------------------------------------------------------------------
afterAll(async () => {
  await pool.end();
});

// ===========================================================================
// POST /api/auth/register
// ===========================================================================
describe('POST /api/auth/register', () => {
  beforeEach(() => jest.clearAllMocks());

  test('201 - erfolgreiche Registrierung liefert user + token', async () => {
    // User existiert noch nicht
    pool.query
      .mockResolvedValueOnce({ rows: [] })  // existingUser-Check
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'neu@example.com', username: 'neuer', role: 'user' }],
      });  // INSERT RETURNING

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'neu@example.com', password: 'geheim123', username: 'neuer' });

    expect(res.statusCode).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ email: 'neu@example.com', username: 'neuer', role: 'user' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('400 - E-Mail bereits vergeben', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 99 }] }); // existingUser-Check findet User

    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'doppelt@example.com', password: 'geheim123', username: 'jemand' });

    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already exists/i);
  });

  test('400 - fehlende Pflichtfelder (kein Passwort)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', username: 'ohnepass' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  test('400 - Passwort zu kurz (< 8 Zeichen)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'kurz', username: 'jemand' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  test('400 - Username zu kurz (< 3 Zeichen)', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'test@example.com', password: 'geheim123', username: 'ab' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  test('400 - ungültige E-Mail', async () => {
    const res = await request(app)
      .post('/api/auth/register')
      .send({ email: 'kein-email', password: 'geheim123', username: 'jemand' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });
});

// ===========================================================================
// POST /api/auth/login
// ===========================================================================
describe('POST /api/auth/login', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - erfolgreicher Login liefert user + token', async () => {
    const hash = await makeHash('richtigesPasswort');

    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 1, email: 'user@example.com', username: 'testuser', password_hash: hash, role: 'user', is_active: true }],
      })  // SELECT user
      .mockResolvedValueOnce({ rows: [] });  // UPDATE last_login

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'richtigesPasswort' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toMatchObject({ username: 'testuser', role: 'user' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('401 - falsches Passwort', async () => {
    const hash = await makeHash('richtigesPasswort');

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 1, email: 'user@example.com', username: 'testuser', password_hash: hash, role: 'user', is_active: true }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'falschesPasswort' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/i);
  });

  test('401 - User existiert nicht', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'gibts-nicht', password: 'egal' });

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/Invalid credentials/i);
  });

  test('400 - leere Felder (kein Passwort)', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser' });

    expect(res.statusCode).toBe(400);
    expect(res.body).toHaveProperty('errors');
  });

  test('200 - Login auch per E-Mail möglich', async () => {
    const hash = await makeHash('geheim123');

    pool.query
      .mockResolvedValueOnce({
        rows: [{ id: 2, email: 'user@example.com', username: 'emailuser', password_hash: hash, role: 'user', is_active: true }],
      })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'user@example.com', password: 'geheim123' });

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
  });
});

// ===========================================================================
// POST /api/auth/verify
// ===========================================================================
describe('POST /api/auth/verify', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - gültiger Token wird als valid bestätigt', async () => {
    const token = makeToken();

    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.valid).toBe(true);
    expect(res.body.user).toHaveProperty('id', 1);
  });

  test('401 - kein Token gesendet', async () => {
    const res = await request(app).post('/api/auth/verify');

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/No token/i);
  });

  test('403 - ungültiger Token', async () => {
    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', 'Bearer ungueltig.token.wert');

    expect(res.statusCode).toBe(403);
    expect(res.body.error).toMatch(/Invalid or expired/i);
  });

  test('403 - abgelaufener Token', async () => {
    const expiredToken = jwt.sign(
      { id: 1, role: 'user' },
      process.env.JWT_SECRET,
      { expiresIn: '-1s' }  // bereits abgelaufen
    );

    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(res.statusCode).toBe(403);
  });
});

// ===========================================================================
// GET /api/auth/me
// ===========================================================================
describe('GET /api/auth/me', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - gibt das eigene Profil zurück', async () => {
    const token = makeToken({ id: 5, role: 'user', email: 'ich@example.com', username: 'ichselbst' });

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 5, email: 'ich@example.com', username: 'ichselbst', role: 'user', is_active: true, created_at: new Date().toISOString() }],
    });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.user).toMatchObject({ id: 5, username: 'ichselbst' });
    expect(res.body.user).not.toHaveProperty('password_hash');
  });

  test('401 - kein Token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('404 - User in DB nicht mehr vorhanden (gelöschter Account)', async () => {
    const token = makeToken({ id: 999, role: 'user', email: 'ghost@example.com', username: 'ghost' });

    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(404);
    expect(res.body.error).toMatch(/User not found/i);
  });
});

// ===========================================================================
// POST /api/auth/logout
// ===========================================================================
describe('POST /api/auth/logout', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - Logout mit gültigem Token bestätigt', async () => {
    const token = makeToken();

    const res = await request(app)
      .post('/api/auth/logout')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.message).toMatch(/Logged out/i);
  });

  test('401 - Logout ohne Token schlägt fehl', async () => {
    const res = await request(app).post('/api/auth/logout');
    expect(res.statusCode).toBe(401);
  });
});

// ===========================================================================
// POST /api/auth/refresh-token
// ===========================================================================
describe('POST /api/auth/refresh-token', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - liefert neues Token für eingeloggten User', async () => {
    const token = makeToken({ id: 3, role: 'user', email: 'fresh@example.com', username: 'freshuser' });

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 3, email: 'fresh@example.com', username: 'freshuser', role: 'user' }],
    });

    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('token');
    // Neues Token muss ein gültiges JWT sein
    const decoded = jwt.verify(res.body.token, process.env.JWT_SECRET);
    expect(decoded).toHaveProperty('id', 3);
  });

  test('401 - kein Token beim Refresh', async () => {
    const res = await request(app).post('/api/auth/refresh-token');
    expect(res.statusCode).toBe(401);
  });

  test('401 - User in DB nicht mehr vorhanden', async () => {
    const token = makeToken({ id: 999, role: 'user', email: 'ghost@example.com', username: 'ghost' });

    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/refresh-token')
      .set('Authorization', `Bearer ${token}`);

    expect(res.statusCode).toBe(401);
    expect(res.body.error).toMatch(/User not found/i);
  });
});

// ===========================================================================
// SECURITY: Allgemeine Token-Sicherheit
// ===========================================================================
describe('SECURITY: Token-Manipulation', () => {
  test('403 - Token mit falschem Secret wird abgelehnt', async () => {
    const manipulierterToken = jwt.sign(
      { id: 1, role: 'admin' },
      'falsches-secret-das-nicht-stimmt'
    );

    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${manipulierterToken}`);

    expect(res.statusCode).toBe(403);
  });

  test('403 - Token mit role:admin aber falschem Secret hat keinen Admin-Zugriff', async () => {
    // Testet dass niemand sich durch Token-Manipulation Admin-Rechte erschleichen kann
    const manipulierterToken = jwt.sign(
      { id: 99, role: 'admin' },
      'ein-anderes-secret'
    );

    const res = await request(app)
      .post('/api/auth/verify')
      .set('Authorization', `Bearer ${manipulierterToken}`);

    expect(res.statusCode).toBe(403);
  });
});
