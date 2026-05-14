/**
 * Payments Route Tests
 * Testet: GET /config, POST /create-order, GET /user-purchases, GET /history, GET /stats
 *
 * Strategie:
 * - db.js (pool.query + pool.connect) wird gemockt
 * - @paypal/checkout-server-sdk wird gemockt (kein echter PayPal-Call)
 * - verifyToken wird via gueltigen JWT umgangen
 */

const request = require('supertest');
const jwt = require('jsonwebtoken');

// --- Mocks ZUERST (vor allen requires) ---

jest.mock('../db', () => {
  const mockClient = {
    query: jest.fn(),
    release: jest.fn(),
  };
  return {
    pool: {
      query: jest.fn(),
      connect: jest.fn().mockResolvedValue(mockClient),
    },
    _mockClient: mockClient,
  };
});

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({
    sendMail: jest.fn().mockResolvedValue({ messageId: 'test-id' }),
  })),
}));

jest.mock('@paypal/checkout-server-sdk', () => {
  const mockExecute = jest.fn();
  return {
    core: {
      SandboxEnvironment: jest.fn(),
      LiveEnvironment: jest.fn(),
      PayPalHttpClient: jest.fn().mockImplementation(() => ({ execute: mockExecute })),
    },
    orders: {
      OrdersCreateRequest: jest.fn().mockImplementation(() => ({
        prefer: jest.fn(),
        requestBody: jest.fn(),
      })),
      OrdersCaptureRequest: jest.fn().mockImplementation(() => ({
        requestBody: jest.fn(),
      })),
    },
    _mockExecute: mockExecute,
  };
});

// --- App + Hilfsmittel laden ---

let app;
beforeAll(() => {
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
  process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars';
  process.env.SESSION_SECRET = 'test-session-secret-minimum-32-chars';
  process.env.PAYPAL_CLIENT_ID = 'test-client-id';
  process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
  process.env.PAYPAL_MODE = 'sandbox';
  process.env.FRONTEND_URL = 'http://localhost:3000';
  app = require('../app');
});

const { pool } = require('../db');
const paypal = require('@paypal/checkout-server-sdk');

// Gueltiger JWT fuer einen normalen User und einen Admin
function makeToken(user = { id: 1, role: 'user', email: 'test@example.com', username: 'testuser' }) {
  return jwt.sign(user, process.env.JWT_SECRET, { expiresIn: '1h' });
}

const userToken = makeToken();
const adminToken = makeToken({ id: 99, role: 'admin', email: 'admin@example.com', username: 'admin' });

// ---------------------------------------------------------------------------
// GET /api/payments/config
// ---------------------------------------------------------------------------
describe('GET /api/payments/config', () => {
  test('200 – liefert paypal_client_id und mode', async () => {
    const res = await request(app).get('/api/payments/config');
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('paypal_client_id');
    expect(res.body).toHaveProperty('paypal_mode');
  });
});

// ---------------------------------------------------------------------------
// POST /api/payments/create-order
// ---------------------------------------------------------------------------
describe('POST /api/payments/create-order', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 – kein Token', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .send({ track_id: 1, price: 1.99 });
    expect(res.statusCode).toBe(401);
  });

  test('400 – fehlende track_id', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ price: 1.99 });
    expect(res.statusCode).toBe(400);
  });

  test('400 – fehlender price', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1 });
    expect(res.statusCode).toBe(400);
  });

  test('404 – Track existiert nicht', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] }); // Track nicht gefunden
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 999, price: 1.99 });
    expect(res.statusCode).toBe(404);
  });

  test('400 – Track bereits gekauft', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Testsong', artist: 'Artist' }] }) // Track gefunden
      .mockResolvedValueOnce({ rows: [{ id: 5 }] }); // bereits in purchases
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 1.99 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already purchased/i);
  });

  test('200 – Order erfolgreich erstellt', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Testsong', artist: 'Artist' }] }) // Track
      .mockResolvedValueOnce({ rows: [] })                                               // kein Kauf vorhanden
      .mockResolvedValueOnce({ rows: [{ id: 42 }] });                                   // INSERT order

    paypal._mockExecute.mockResolvedValueOnce({
      result: { id: 'PAYPAL-ORDER-123' },
    });

    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 1.99 });

    expect(res.statusCode).toBe(200);
    expect(res.body.order_id).toBe('PAYPAL-ORDER-123');
    expect(res.body.status).toBe('CREATED');
  });
});

// ---------------------------------------------------------------------------
// GET /api/payments/user-purchases
// ---------------------------------------------------------------------------
describe('GET /api/payments/user-purchases', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 – kein Token', async () => {
    const res = await request(app).get('/api/payments/user-purchases');
    expect(res.statusCode).toBe(401);
  });

  test('200 – leere Liste wenn keine Kaeufe', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .get('/api/payments/user-purchases')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
  });

  test('200 – gibt gekaufte Tracks zurueck', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        track_id: 7,
        name: 'Testsong',
        artist: 'Artist',
        audio_filename: 'song.mp3',
        purchased_at: new Date().toISOString(),
        license_type: 'personal',
        order_id: 42,
      }],
    });
    const res = await request(app)
      .get('/api/payments/user-purchases')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].name).toBe('Testsong');
  });
});

// ---------------------------------------------------------------------------
// GET /api/payments/history
// ---------------------------------------------------------------------------
describe('GET /api/payments/history', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 – kein Token', async () => {
    const res = await request(app).get('/api/payments/history');
    expect(res.statusCode).toBe(401);
  });

  test('200 – gibt Order-Historie zurueck', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 1,
        paypal_order_id: 'PAYPAL-123',
        amount: '1.99',
        currency: 'EUR',
        status: 'COMPLETED',
        created_at: new Date().toISOString(),
        completed_at: new Date().toISOString(),
        description: 'Track: Testsong',
        transaction_id: 'TXN-ABC',
      }],
    });
    const res = await request(app)
      .get('/api/payments/history')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body[0].status).toBe('COMPLETED');
  });
});

// ---------------------------------------------------------------------------
// GET /api/payments/stats
// ---------------------------------------------------------------------------
describe('GET /api/payments/stats', () => {
  beforeEach(() => jest.clearAllMocks());

  test('401 – kein Token', async () => {
    const res = await request(app).get('/api/payments/stats');
    expect(res.statusCode).toBe(401);
  });

  test('200 – gibt Statistiken zurueck', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        completed_payments: '3',
        failed_payments: '1',
        total_spent: '5.97',
        avg_purchase: '1.99',
        total_tracks_purchased: '3',
      }],
    });
    const res = await request(app)
      .get('/api/payments/stats')
      .set('Authorization', `Bearer ${userToken}`);
    expect(res.statusCode).toBe(200);
    expect(res.body).toHaveProperty('total_spent');
    expect(res.body).toHaveProperty('completed_payments');
  });
});
