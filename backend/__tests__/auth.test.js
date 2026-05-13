/**
 * Auth Route Tests
 * Testet: POST /api/auth/login, GET /api/auth/me
 *
 * Strategie: db.js (pool.query) wird gemockt.
 * Kein laufender Server, keine echte DB noetig.
 */

const request = require('supertest');

// --- Mock: DB-Pool ---
jest.mock('../db', () => ({
  pool: {
    query: jest.fn(),
  },
}));

// --- Mock: nodemailer ---
jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

// App nach den Mocks laden
let app;
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars';
  process.env.SESSION_SECRET = 'test-session-secret-minimum-32-chars';
  app = require('../app');
});

const { pool } = require('../db');

// ---------------------------------------------------------------------------
// POST /api/auth/login
// ---------------------------------------------------------------------------
describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('400 – fehlendes username-Feld', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ password: 'irgendwas' });
    expect(res.statusCode).toBe(400);
  });

  test('400 – fehlendes Passwort', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'test@example.com' });
    expect(res.statusCode).toBe(400);
  });

  test('401 – Benutzer nicht gefunden (leeres DB-Result)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nichtda@example.com', password: 'Passwort123!' });
    expect(res.statusCode).toBe(401);
  });

  test('401 – falsches Passwort', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('RichtigesPasswort', 10);
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        email: 'user@example.com',
        username: 'testuser',
        password_hash: hash,
        role: 'user',
        is_active: true,
      }],
    });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'FalschesPasswort' });
    expect(res.statusCode).toBe(401);
  });

  test('200 – erfolgreicher Login gibt Token zurueck', async () => {
    const bcrypt = require('bcryptjs');
    const hash = await bcrypt.hash('KorrektesPW123!', 10);
    // 1. Query: User laden
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 42,
        email: 'admin@songnexus.at',
        username: 'sebastian',
        password_hash: hash,
        role: 'admin',
        is_active: true,
      }],
    });
    // 2. Query: last_login UPDATE
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'sebastian', password: 'KorrektesPW123!' });

    expect([200, 201]).toContain(res.statusCode);
    const hasToken =
      res.body?.token ||
      res.body?.accessToken ||
      res.headers['set-cookie']?.some(c => c.includes('token'));
    expect(hasToken).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// GET /api/auth/me
// ---------------------------------------------------------------------------
describe('GET /api/auth/me', () => {
  test('401 – kein Token', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.statusCode).toBe(401);
  });

  test('403 – ungueltiger Token', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', 'Bearer diesistkeingueltigertoken');
    expect(res.statusCode).toBe(403);
  });
});