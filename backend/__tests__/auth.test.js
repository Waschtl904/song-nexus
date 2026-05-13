/**
 * Auth Route Tests
 * Testet: POST /api/auth/login
 *
 * Voraussetzung: TEST_DATABASE_URL in backend/.env.test
 * Die Tests laufen gegen eine echte (Test-)DB oder koennen
 * db.js mocken – hier wird db.js gemockt, damit keine
 * echte DB-Verbindung benoetigt wird.
 */

const request = require('supertest');

// --- Mock: DB-Modul ---
// Verhindert echte PostgreSQL-Verbindungen beim Testen.
// Einzelne Tests koennen pool.query per jest.fn() ueberschreiben.
jest.mock('../db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// --- Mock: nodemailer (wird in magic-link-Routen benoetigt) ---
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

// App NACH den Mocks laden
let app;
beforeAll(() => {
  // NODE_ENV auf test setzen damit server.js keinen HTTPS-Listener startet
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars';
  // eslint-disable-next-line global-require
  app = require('../server');
});

const { pool } = require('../db');

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('400 – fehlende E-Mail', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'irgendwas' });

    expect(res.statusCode).toBe(400);
  });

  test('400 – fehlendes Passwort', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'test@example.com' });

    expect(res.statusCode).toBe(400);
  });

  test('401 – Benutzer nicht gefunden (DB gibt leeres Result)', async () => {
    // DB-Mock: kein User in der Tabelle
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'nichtda@example.com', password: 'Passwort123!' });

    expect(res.statusCode).toBe(401);
  });

  test('401 – falsches Passwort (bcrypt schlaegt fehl)', async () => {
    const bcrypt = require('bcryptjs');
    // Echter bcrypt-Hash fuer 'RichtigesPasswort'
    const hash = await bcrypt.hash('RichtigesPasswort', 10);

    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        email: 'user@example.com',
        password_hash: hash,
        role: 'user',
        is_active: true,
      }],
    });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'user@example.com', password: 'FalschesPasswort' });

    expect(res.statusCode).toBe(401);
  });

  test('200 – erfolgreicher Login gibt Token zurueck', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('KorrektesPW123!', 10);

    // Erster Query: User laden
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 42,
        email: 'admin@songnexus.at',
        password_hash: hash,
        role: 'admin',
        is_active: true,
        username: 'sebastian',
      }],
    });
    // Zweiter Query: last_login updaten (fire-and-forget, kein Rueckgabewert noetig)
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ email: 'admin@songnexus.at', password: 'KorrektesPW123!' });

    // Entweder 200 (Token im Body) oder 204/302 je nach Implementierung
    expect([200, 201]).toContain(res.statusCode);
    // Token muss im Response-Body oder Cookie vorhanden sein
    const hasToken =
      res.body?.token ||
      res.body?.accessToken ||
      res.headers['set-cookie']?.some(c => c.includes('token'));
    expect(hasToken).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me  (geschuetzte Route – braucht gueltigen JWT)
// ---------------------------------------------------------------------------
describe('GET /api/auth/me', () => {
  test('401 – kein Token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('401 – ungültiger Token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer diesistkeingueltigertoken');
    expect(res.statusCode).toBe(401);
  });
});
