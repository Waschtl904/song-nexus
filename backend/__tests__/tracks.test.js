/**
 * Tracks Route Tests
 * Testet:
 *   GET /api/tracks              - Oeffentliche Trackliste (Pagination)
 *   GET /api/tracks/:id          - Einzelner Track
 *   GET /api/tracks/audio/:file  - Audio-Zugriffsschutz (KERN-SECURITY)
 *   GET /api/tracks/genres/list  - Genre-Liste
 *
 * Sicherheits-Schwerpunkt: /audio/:filename
 *   - Gratistrack              -> immer vollstaendig
 *   - Premium + kein Token     -> nur Preview (206)
 *   - Premium + kein Kauf      -> nur Preview (206)
 *   - Premium + Kauf vorhanden -> vollstaendige Datei
 */

// --- ENV VOR ALLEM (JWT-Timing-Fix) ---
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars';
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-chars';
process.env.PAYPAL_CLIENT_ID = 'test-client-id';
process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
process.env.PAYPAL_MODE = 'sandbox';
process.env.FRONTEND_URL = 'http://localhost:3000';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// --- Mocks ---

jest.mock('../db', () => ({
  pool: { query: jest.fn() },
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

// fs mocken: Jest erlaubt keine Out-of-Scope-Variablen in jest.mock().
// Loesung: require('stream') INNERHALB der Factory (erlaubt), kein Readable-Import oben.
jest.mock('fs', () => {
  // mockReadable mit 'mock'-Prefix: von Jest explizit erlaubt
  const mockReadableFactory = () => {
    const { Readable } = require('stream');
    const r = new Readable({ read() {} });
    r.push(null);
    return r;
  };
  return {
    existsSync: jest.fn().mockReturnValue(true),
    statSync: jest.fn().mockReturnValue({ size: 5_000_000 }),
    createReadStream: jest.fn().mockImplementation(mockReadableFactory),
  };
});

// --- App + DB laden ---
const app = require('../app');
const { pool } = require('../db');

function makeToken(user = { id: 1, role: 'user', email: 'test@example.com', username: 'testuser' }) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const userToken = makeToken();

// ---------------------------------------------------------------------------
// GET /api/tracks  (oeffentlich, Pagination)
// ---------------------------------------------------------------------------
describe('GET /api/tracks', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - liefert Track-Liste mit Pagination-Metadaten', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Song A', artist: 'Artist A', genre: 'Techno', price_eur: '1.99', is_free: false },
          { id: 2, name: 'Song B', artist: 'Artist B', genre: 'House',  price_eur: '0.00', is_free: true  },
        ],
      });

    const res = await request(app).get('/api/tracks');
    expect(res.statusCode).toBe(200);
    expect(res.body.success).toBe(true);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toHaveProperty('total');
    expect(res.body.pagination).toHaveProperty('totalPages');
  });

  test('200 - leere Liste wenn keine Tracks vorhanden', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '0' }] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app).get('/api/tracks');
    expect(res.statusCode).toBe(200);
    expect(res.body.data).toHaveLength(0);
    expect(res.body.pagination.total).toBe(0);
  });

  test('200 - Suche per Query-Parameter wird weitergegeben', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '1' }] })
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Findme', artist: 'X' }] });

    const res = await request(app).get('/api/tracks?search=Findme');
    expect(res.statusCode).toBe(200);
    expect(res.body.metadata.search).toBe('Findme');
  });
});

// ---------------------------------------------------------------------------
// GET /api/tracks/:id  (oeffentlich)
// ---------------------------------------------------------------------------
describe('GET /api/tracks/:id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - liefert Track-Details', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 7, name: 'Testsong', artist: 'DJ Test', genre: 'Techno',
               price_eur: '1.99', is_free: false, is_published: true }],
    });
    const res = await request(app).get('/api/tracks/7');
    expect(res.statusCode).toBe(200);
    expect(res.body.name).toBe('Testsong');
  });

  test('404 - Track nicht gefunden', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/tracks/999');
    expect(res.statusCode).toBe(404);
  });
});

// ---------------------------------------------------------------------------
// GET /api/tracks/genres/list  (oeffentlich)
// ---------------------------------------------------------------------------
describe('GET /api/tracks/genres/list', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - liefert Genre-Liste als Array', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ genre: 'Techno' }, { genre: 'House' }, { genre: 'Ambient' }],
    });
    const res = await request(app).get('/api/tracks/genres/list');
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body).toContain('Techno');
  });
});

// ---------------------------------------------------------------------------
// GET /api/tracks/audio/:filename  - SECURITY CORE
// ---------------------------------------------------------------------------
describe('GET /api/tracks/audio/:filename - Zugriffsschutz', () => {
  beforeEach(() => jest.clearAllMocks());

  const freeTrack    = { id: 1, is_free: true,  free_preview_duration: 40, duration_seconds: 180 };
  const premiumTrack = { id: 2, is_free: false, free_preview_duration: 40, duration_seconds: 240 };

  test('SECURITY: Gratis-Track - voller Zugriff ohne Token', async () => {
    pool.query.mockResolvedValueOnce({ rows: [freeTrack] });

    const res = await request(app).get('/api/tracks/audio/free-song.mp3');
    expect([200, 206]).toContain(res.statusCode);
    const range = res.headers['content-range'];
    if (range) {
      expect(range).toMatch(/4999999/);
    }
  });

  test('SECURITY: Premium-Track ohne Token -> nur Preview', async () => {
    pool.query.mockResolvedValueOnce({ rows: [premiumTrack] });

    const res = await request(app).get('/api/tracks/audio/premium-song.mp3');
    expect(res.statusCode).toBe(206);
    const range = res.headers['content-range'];
    expect(range).toBeDefined();
    const endByte = parseInt(range.split('-')[1]);
    expect(endByte).toBeLessThan(4_999_999);
  });

  test('SECURITY: Premium-Track mit gueltigem Token aber OHNE Kauf -> nur Preview', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [premiumTrack] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .get('/api/tracks/audio/premium-song.mp3')
      .set('Authorization', `Bearer ${userToken}`);

    expect(res.statusCode).toBe(206);
    const endByte = parseInt(res.headers['content-range'].split('-')[1]);
    expect(endByte).toBeLessThan(4_999_999);
  });

  test('SECURITY: Premium-Track mit gueltigem Token UND Kauf -> vollstaendige Datei', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [premiumTrack] })
      .mockResolvedValueOnce({ rows: [{ id: 99 }] });

    const res = await request(app)
      .get('/api/tracks/audio/premium-song.mp3')
      .set('Authorization', `Bearer ${userToken}`);

    expect([200, 206]).toContain(res.statusCode);
    const range = res.headers['content-range'];
    if (range) {
      expect(range).toMatch(/4999999/);
    }
  });

  test('SECURITY: Ungueltiger Token -> wie kein Token behandelt (Preview)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [premiumTrack] });

    const res = await request(app)
      .get('/api/tracks/audio/premium-song.mp3')
      .set('Authorization', 'Bearer invalid.token.value');

    expect(res.statusCode).toBe(206);
    const endByte = parseInt(res.headers['content-range'].split('-')[1]);
    expect(endByte).toBeLessThan(4_999_999);
  });

  test('400 - leerer Filename nach Sanitisierung', async () => {
    const res = await request(app).get('/api/tracks/audio/%20');
    expect(res.statusCode).toBe(400);
  });

  test('404 - Audio-Datei existiert nicht im Filesystem', async () => {
    const fs = require('fs');
    fs.existsSync.mockReturnValueOnce(false);
    const res = await request(app).get('/api/tracks/audio/ghost.mp3');
    expect(res.statusCode).toBe(404);
  });
});
