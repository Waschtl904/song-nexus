/**
 * Tracks Route Tests
 * Testet:
 *   GET /api/tracks              - Oeffentliche Trackliste (Pagination)
 *   GET /api/tracks/:id          - Einzelner Track
 *   GET /api/tracks/audio/:file  - Audio-Zugriffsschutz (KERN-SECURITY)
 *   GET /api/tracks/genres/list  - Genre-Liste
 */

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

// ---------------------------------------------------------------------------
// fs-Mock v4
//
// Das "aborted"-Problem entsteht weil:
//   1. serveFullFile/servePreview setzen Content-Length (z.B. 5_000_000)
//   2. createReadStream liefert unseren 64-Byte-Mock-Stream
//   3. Node.js http-Stack erwartet 5_000_000 Bytes, bekommt 64
//   4. Verbindung wird als unvollstaendig abgebrochen -> supertest: "aborted"
//
// Loesung: Der Stream sendet GENAU so viele Bytes wie im Content-Length-Header
// angegeben wird. Dazu liest der Stream beim ersten read() aus res.getHeader()
// wie viele Bytes erwartet werden, und schickt genau diese Menge (in Chunks).
//
// Da res-Objekt in createReadStream() nicht verfuegbar ist, nutzen wir einen
// Trick: wir wrappen res.setHeader() und res.status() per Middleware, die den
// erwarteten Content-Length-Wert in einem Kontext-Objekt ablegt. createReadStream
// schaut diesen Wert nach und pusht genau die richtige Bytezahl.
//
// Einfachere Alternative die genauso funktioniert:
// Wir patchen den Prototype von ServerResponse so, dass pipe() sofort end()
// aufruft, anstatt auf Daten zu warten.
// ---------------------------------------------------------------------------
jest.mock('fs', () => {
  const { Readable } = require('stream');

  const MOCK_SIZE = 5_000_000;

  // makeStream(n): Readable-Stream der genau n Bytes ausgibt und dann EOF.
  // Maximal 1 MB pro Chunk um Stack-Overflows zu vermeiden.
  const makeStream = (bytes = 64) => {
    const CHUNK = Math.min(bytes, 1024 * 64); // max 64 KB pro Chunk
    let remaining = bytes;
    return new Readable({
      read() {
        if (remaining <= 0) {
          this.push(null);
          return;
        }
        const size = Math.min(CHUNK, remaining);
        remaining -= size;
        this.push(Buffer.alloc(size));
        if (remaining <= 0) this.push(null);
      },
    });
  };

  // Globaler Kontext: wird von unserem Middleware (siehe unten) gesetzt
  // bevor createReadStream aufgerufen wird.
  global.__mockContentLength = 64;

  return {
    existsSync: jest.fn().mockReturnValue(true),
    statSync: () => ({ size: MOCK_SIZE }),
    createReadStream: jest.fn().mockImplementation((_path, opts) => {
      // Wenn start/end angegeben: genau (end - start + 1) Bytes senden
      if (opts && typeof opts.start === 'number' && typeof opts.end === 'number') {
        return makeStream(opts.end - opts.start + 1);
      }
      // Kein Range: Content-Length aus globalem Kontext lesen
      return makeStream(global.__mockContentLength || MOCK_SIZE);
    }),
  };
});

// ---------------------------------------------------------------------------
// Middleware-Patch: setzt global.__mockContentLength sobald Content-Length
// auf der Response gesetzt wird. Muss VOR app-Middleware eingehaengt werden.
// ---------------------------------------------------------------------------
const http = require('http');
const origSetHeader = http.ServerResponse.prototype.setHeader;
http.ServerResponse.prototype.setHeader = function (name, value) {
  if (name.toLowerCase() === 'content-length') {
    global.__mockContentLength = parseInt(value, 10) || 64;
  }
  return origSetHeader.call(this, name, value);
};

// ---------------------------------------------------------------------------
// App + DB-Pool importieren (nach allen Mocks)
// ---------------------------------------------------------------------------
const app = require('../app');
const { pool } = require('../db');

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function makeToken(
  user = { id: 1, role: 'user', email: 'test@example.com', username: 'testuser' }
) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}
const userToken = makeToken();

function resetFsMocks() {
  const fs = require('fs');
  const { Readable } = require('stream');

  fs.existsSync.mockReturnValue(true);

  fs.createReadStream.mockImplementation((_path, opts) => {
    if (opts && typeof opts.start === 'number' && typeof opts.end === 'number') {
      const bytes = opts.end - opts.start + 1;
      const CHUNK = Math.min(bytes, 1024 * 64);
      let remaining = bytes;
      return new Readable({
        read() {
          if (remaining <= 0) { this.push(null); return; }
          const size = Math.min(CHUNK, remaining);
          remaining -= size;
          this.push(Buffer.alloc(size));
          if (remaining <= 0) this.push(null);
        },
      });
    }
    const bytes = global.__mockContentLength || 64;
    return new Readable({
      read() {
        this.push(Buffer.alloc(bytes));
        this.push(null);
      },
    });
  });
}

// ---------------------------------------------------------------------------
// GET /api/tracks
// ---------------------------------------------------------------------------
describe('GET /api/tracks', () => {
  beforeEach(() => jest.clearAllMocks());

  test('200 - liefert Track-Liste mit Pagination-Metadaten', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ total: '2' }] })
      .mockResolvedValueOnce({
        rows: [
          { id: 1, name: 'Song A', artist: 'Artist A', genre: 'Techno', price_eur: '1.99', is_free: false },
          { id: 2, name: 'Song B', artist: 'Artist B', genre: 'House',  price_eur: '0.00', is_free: true },
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
// GET /api/tracks/:id
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
// GET /api/tracks/genres/list
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
  beforeEach(() => {
    jest.clearAllMocks();
    resetFsMocks();
    global.__mockContentLength = 64;
  });

  const freeTrack    = { id: 1, is_free: true,  free_preview_duration: 40, duration_seconds: 180 };
  const premiumTrack = { id: 2, is_free: false, free_preview_duration: 40, duration_seconds: 240 };

  test('SECURITY: Gratis-Track ohne Range-Header -> 200 (volle Datei)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [freeTrack] });
    const res = await request(app).get('/api/tracks/audio/free-song.mp3');
    expect(res.statusCode).toBe(200);
  });

  test('SECURITY: Gratis-Track mit Range-Header -> 206', async () => {
    pool.query.mockResolvedValueOnce({ rows: [freeTrack] });
    const res = await request(app)
      .get('/api/tracks/audio/free-song.mp3')
      .set('Range', 'bytes=0-');
    expect(res.statusCode).toBe(206);
    expect(res.headers['content-range']).toMatch(/bytes 0-4999999\/5000000/);
  });

  test('SECURITY: Premium-Track ohne Token -> nur Preview (206)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [premiumTrack] });
    const res = await request(app).get('/api/tracks/audio/premium-song.mp3');
    expect(res.statusCode).toBe(206);
    const match = res.headers['content-range'].match(/bytes 0-(\d+)\//);
    expect(match).not.toBeNull();
    expect(parseInt(match[1])).toBeLessThan(4_999_999);
  });

  test('SECURITY: Premium-Track mit Token aber OHNE Kauf -> nur Preview', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [premiumTrack] })
      .mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/tracks/audio/premium-song.mp3')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(206);
    const match = res.headers['content-range'].match(/bytes 0-(\d+)\//);
    expect(parseInt(match[1])).toBeLessThan(4_999_999);
  });

  test('SECURITY: Premium-Track mit Token UND Kauf -> volle Datei (200)', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [premiumTrack] })
      .mockResolvedValueOnce({ rows: [{ id: 99 }] });
    const res = await request(app)
      .get('/api/tracks/audio/premium-song.mp3')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
  });

  test('SECURITY: Ungueltiger Token -> wie kein Token (Preview, 206)', async () => {
    pool.query.mockResolvedValueOnce({ rows: [premiumTrack] });
    const res = await request(app)
      .get('/api/tracks/audio/premium-song.mp3')
      .set('Authorization', 'Bearer invalid.token.value');
    expect(res.statusCode).toBe(206);
    const match = res.headers['content-range'].match(/bytes 0-(\d+)\//);
    expect(parseInt(match[1])).toBeLessThan(4_999_999);
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
