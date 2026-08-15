/**
 * Payments Route Tests
 * Testet: GET /config, POST /create-order, GET /user-purchases, GET /history, GET /stats
 *
 * WICHTIG: process.env muss VOR allen jest.mock() und require() Aufrufen gesetzt werden,
 * damit auth-middleware.js den richtigen JWT_SECRET bekommt.
 */

// --- ENV ZUERST (vor allem anderen) ---
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-jwt-secret-minimum-32-characters-long';
process.env.JWT_REFRESH_SECRET = 'test-refresh-secret-minimum-32-chars';
process.env.SESSION_SECRET = 'test-session-secret-minimum-32-chars';
process.env.PAYPAL_CLIENT_ID = 'test-client-id';
process.env.PAYPAL_CLIENT_SECRET = 'test-client-secret';
process.env.PAYPAL_MODE = 'sandbox';
process.env.FRONTEND_URL = 'http://localhost:3000';
// Issue #8: Zahlungen sind fail-closed. Die bestehenden Tests pruefen den
// aktiven Zustand, deshalb hier ausdruecklich einschalten. Der deaktivierte
// Zustand hat einen eigenen describe-Block am Dateiende.
process.env.PAYMENTS_ENABLED = 'true';

const request = require('supertest');
const jwt = require('jsonwebtoken');

// --- Mocks ---

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

// --- App laden (nach env + mocks) ---
const app = require('../app');
const { pool } = require('../db');
const paypal = require('@paypal/checkout-server-sdk');

// Hilfsfunktion: gueltigen JWT erstellen
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

  test('200 – meldet payments_enabled: true wenn aktiv', async () => {
    const res = await request(app).get('/api/payments/config');
    expect(res.body.payments_enabled).toBe(true);
    expect(res.body.paypal_client_id).toBe('test-client-id');
  });
});

// ---------------------------------------------------------------------------
// POST /api/payments/create-order
// ---------------------------------------------------------------------------
describe('POST /api/payments/create-order', () => {
  beforeEach(() => { jest.clearAllMocks(); pool.query.mockReset(); });

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

  // Fruehere Erwartung: fehlender price -> 400.
  //
  // Dieser Vertrag gilt nicht mehr. Der Preis kommt aus tracks.price_eur, ein
  // fehlender Wert im Anfragekoerper ist also der NORMALFALL. Ein Client, der
  // den Preis mitschickt, ist der Sonderfall - und wird geprueft, siehe
  // "SICHERHEIT: Preisautoritaet liegt beim Server" weiter unten.
  test('400 – unbrauchbarer price (Text statt Zahl)', async () => {
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 'geschenkt' });
    expect(res.statusCode).toBe(400);
  });

  test('404 – Track existiert nicht', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 999, price: 1.99 });
    expect(res.statusCode).toBe(404);
  });

  test('400 – Track bereits gekauft', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Testsong', artist: 'Artist', price_eur: '1.99', is_free: false, is_published: true, is_deleted: false }] })
      .mockResolvedValueOnce({ rows: [{ id: 5 }] });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 1.99 });
    expect(res.statusCode).toBe(400);
    expect(res.body.error).toMatch(/already purchased/i);
  });

  test('200 – Order erfolgreich erstellt', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [{ id: 1, name: 'Testsong', artist: 'Artist', price_eur: '1.99', is_free: false, is_published: true, is_deleted: false }] })
      .mockResolvedValueOnce({ rows: [] })
      .mockResolvedValueOnce({ rows: [{ id: 42 }] });

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
// ============================================================================
// SICHERHEIT: der Preis wird vom Server bestimmt
// ============================================================================
// Vorher stammte der Preis aus req.body und wanderte unveraendert in die
// PayPal-Bestellung und in orders.amount. Der Validator pruefte nur die
// Spanne 0.01 bis 100, nicht die Uebereinstimmung mit dem Track. Ein Aufruf
// mit price 0.01 fuer einen Track zu 4.99 wurde angenommen.
describe('SICHERHEIT: Preisautoritaet liegt beim Server', () => {
  beforeEach(() => { jest.clearAllMocks(); pool.query.mockReset(); });

  const track = {
    id: 1, name: 'Testsong', artist: 'Artist',
    price_eur: '4.99', is_free: false, is_published: true, is_deleted: false,
  };

  test('400 - manipulierter Preis (0.01 statt 4.99) wird abgewiesen', async () => {
    pool.query.mockResolvedValueOnce({ rows: [track] });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 0.01 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('PRICE_MISMATCH');
    expect(res.body.expected).toBe('4.99');
  });

  test('400 - auch ein zu HOHER Preis wird abgewiesen', async () => {
    pool.query.mockResolvedValueOnce({ rows: [track] });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 99 });
    expect(res.statusCode).toBe(400);
    expect(res.body.code).toBe('PRICE_MISMATCH');
  });

  test('400 - Gratis-Track kann nicht gekauft werden', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...track, is_free: true }] });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 4.99 });
    expect(res.statusCode).toBe(400);
  });

  test('400 - nicht veroeffentlichter Track kann nicht gekauft werden', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...track, is_published: false }] });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1, price: 4.99 });
    expect(res.statusCode).toBe(400);
  });

  test('409 - Track ohne hinterlegten Preis', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...track, price_eur: null }] });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1 });
    expect(res.statusCode).toBe(409);
  });

  test('200 - ohne Preisangabe des Clients wird der Serverpreis verwendet', async () => {
    pool.query
      .mockResolvedValueOnce({ rows: [track] })      // Track
      .mockResolvedValueOnce({ rows: [] })           // kein Kauf vorhanden
      .mockResolvedValueOnce({ rows: [{ id: 42 }] }); // INSERT INTO orders
    paypal._mockExecute.mockResolvedValueOnce({ result: { id: 'PAYPAL-ORDER-PREIS' } });
    const res = await request(app)
      .post('/api/payments/create-order')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 1 });
    expect(res.statusCode).toBe(200);
    expect(res.body.price).toBe(4.99);

    // Der INSERT muss den Serverpreis und die track_id enthalten
    const insert = pool.query.mock.calls.find(c => /INSERT INTO orders/.test(c[0]));
    expect(insert).toBeDefined();
    expect(insert[0]).toMatch(/track_id/);
    expect(insert[1]).toContain(4.99);
    expect(insert[1]).toContain(1);
  });
});

// ============================================================================
// SICHERHEIT: welcher Track freigeschaltet wird, steht in der Bestellung
// ============================================================================
// Der Capture-Schritt war bisher ueberhaupt nicht getestet.
//
// Vorher kam die track_id aus req.body und wurde ungeprueft in purchases
// eingetragen; geprueft wurde nur, ob die PayPal-Bestellung zum angemeldeten
// Benutzer gehoert. Bezahltes und freigeschaltetes Produkt waren damit nicht
// verbunden: guenstigen Track bestellen, bezahlen, beim Freischalten die ID
// eines teureren Tracks senden.
describe('SICHERHEIT: capture-order nimmt die track_id aus der Bestellung', () => {
  const { _mockClient } = require('../db');

  beforeEach(() => {
    jest.clearAllMocks();
    pool.query.mockReset();
    _mockClient.query.mockReset();
    _mockClient.query.mockResolvedValue({ rows: [] });
  });

  function paypalErfolgreich() {
    paypal._mockExecute.mockResolvedValueOnce({
      result: {
        status: 'COMPLETED',
        payer: { email_address: 'kaeufer@example.org' },
        purchase_units: [{ payments: { captures: [{ id: 'TXN-1' }] } }],
      },
    });
  }

  test('der Client kann kein anderes Produkt unterschieben', async () => {
    // Bestellt war Track 1. Der Client behauptet beim Freischalten Track 999.
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 42, amount: '1.99', track_id: 1, status: 'CREATED' }],
    });
    paypalErfolgreich();

    const res = await request(app)
      .post('/api/payments/capture-order/PAYPAL-ORDER-123')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 999 });

    expect(res.statusCode).toBe(200);
    // Freigeschaltet wird 1, nicht 999
    expect(res.body.track_id).toBe(1);

    const insert = _mockClient.query.mock.calls.find(c => /INSERT INTO purchases/.test(c[0]));
    expect(insert).toBeDefined();
    expect(insert[1]).toContain(1);
    expect(insert[1]).not.toContain(999);
  });

  test('ohne track_id im Anfragekoerper funktioniert es genauso', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 42, amount: '1.99', track_id: 7, status: 'CREATED' }],
    });
    paypalErfolgreich();

    const res = await request(app)
      .post('/api/payments/capture-order/PAYPAL-ORDER-123')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.statusCode).toBe(200);
    expect(res.body.track_id).toBe(7);
  });

  test('409 - Bestellung ohne track_id wird nicht freigeschaltet', async () => {
    // Altbestand von vor der Migration
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 42, amount: '1.99', track_id: null, status: 'CREATED' }],
    });

    const res = await request(app)
      .post('/api/payments/capture-order/PAYPAL-ORDER-123')
      .set('Authorization', `Bearer ${userToken}`)
      .send({ track_id: 5 });

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('ORDER_WITHOUT_TRACK');
    // Es darf gar nicht erst bei PayPal abgebucht werden
    expect(paypal._mockExecute).not.toHaveBeenCalled();
  });

  test('409 - eine bereits abgeschlossene Bestellung wird nicht erneut freigeschaltet', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ id: 42, amount: '1.99', track_id: 1, status: 'COMPLETED' }],
    });

    const res = await request(app)
      .post('/api/payments/capture-order/PAYPAL-ORDER-123')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.statusCode).toBe(409);
    expect(res.body.code).toBe('ALREADY_COMPLETED');
    expect(paypal._mockExecute).not.toHaveBeenCalled();
  });

  test('403 - fremde Bestellung', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/payments/capture-order/FREMDE-ORDER')
      .set('Authorization', `Bearer ${userToken}`)
      .send({});

    expect(res.statusCode).toBe(403);
    expect(paypal._mockExecute).not.toHaveBeenCalled();
  });
});

describe('GET /api/payments/user-purchases', () => {
  beforeEach(() => { jest.clearAllMocks(); pool.query.mockReset(); });

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
  beforeEach(() => { jest.clearAllMocks(); pool.query.mockReset(); });

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
  beforeEach(() => { jest.clearAllMocks(); pool.query.mockReset(); });

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


// ===========================================================================
// SOFT-LAUNCH: PAYMENTS_ENABLED (Issue #8)
// ===========================================================================
//
// Der Schalter muss serverseitig wirken, nicht nur in der UI. Ein Angreifer
// oder ein alter Browser-Tab kann die Endpunkte direkt aufrufen - Buttons
// ausblenden allein ist kein Schutz.
//
// Fail-closed: Zahlungen bleiben aus, solange nicht ausdruecklich
// PAYMENTS_ENABLED='true' gesetzt ist. Ein fehlendes oder falsch
// geschriebenes Env-Flag darf niemals versehentlich Geld bewegen.
// ===========================================================================
describe('SOFT-LAUNCH: PAYMENTS_ENABLED steuert den Verkauf', () => {
  let userToken;

  beforeAll(() => {
    userToken = jwt.sign(
      { id: 1, role: 'user', username: 'kaeufer', email: 'k@example.com' },
      process.env.JWT_SECRET
    );
  });

  afterEach(() => {
    process.env.PAYMENTS_ENABLED = 'true';
  });

  describe('wenn deaktiviert', () => {
    beforeEach(() => {
      process.env.PAYMENTS_ENABLED = 'false';
    });

    test('503 – create-order wird blockiert', async () => {
      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ track_id: 1, price: 1.99 });

      expect(res.statusCode).toBe(503);
      expect(res.body.code).toBe('PAYMENTS_DISABLED');
    });

    test('503 – capture-order wird blockiert', async () => {
      const res = await request(app)
        .post('/api/payments/capture-order/PAYPAL-ORDER-123')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ track_id: 1 });

      expect(res.statusCode).toBe(503);
      expect(res.body.code).toBe('PAYMENTS_DISABLED');
    });

    test('503 kommt VOR der Token-Pruefung – auch ohne Login kein Durchkommen', async () => {
      // Der Guard sitzt absichtlich vor verifyToken: die Antwort soll nicht
      // verraten, ob ein Login geholfen haette.
      const res = await request(app)
        .post('/api/payments/create-order')
        .send({ track_id: 1, price: 1.99 });

      expect(res.statusCode).toBe(503);
    });

    test('config meldet payments_enabled: false und keine Client-ID', async () => {
      const res = await request(app).get('/api/payments/config');
      expect(res.statusCode).toBe(200);
      expect(res.body.payments_enabled).toBe(false);
      expect(res.body.paypal_client_id).toBeNull();
    });

    test('lesende Routen bleiben erreichbar – bereits Gekauftes bleibt sichtbar', async () => {
      const { pool } = require('../db');
      pool.query.mockResolvedValueOnce({ rows: [] });

      const res = await request(app)
        .get('/api/payments/user-purchases')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.statusCode).toBe(200);
    });
  });

  describe('fail-closed bei unklarer Konfiguration', () => {
    test('503 – wenn PAYMENTS_ENABLED voellig fehlt', async () => {
      delete process.env.PAYMENTS_ENABLED;

      const res = await request(app)
        .post('/api/payments/create-order')
        .set('Authorization', `Bearer ${userToken}`)
        .send({ track_id: 1, price: 1.99 });

      expect(res.statusCode).toBe(503);
    });

    test("503 – 'TRUE', '1' und 'yes' gelten NICHT als aktiviert", async () => {
      for (const wert of ['TRUE', 'True', '1', 'yes', 'on', '']) {
        process.env.PAYMENTS_ENABLED = wert;

        const res = await request(app)
          .post('/api/payments/create-order')
          .set('Authorization', `Bearer ${userToken}`)
          .send({ track_id: 1, price: 1.99 });

        expect(res.statusCode).toBe(503);
      }
    });
  });
});
