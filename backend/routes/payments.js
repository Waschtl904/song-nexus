const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../db');
const { verifyToken } = require('../middleware/auth-middleware');
const router = express.Router();

// PayPal Client Setup
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET;

  if (process.env.PAYPAL_MODE === 'sandbox') {
    return new checkoutNodeJssdk.core.SandboxEnvironment(clientId, clientSecret);
  } else {
    return new checkoutNodeJssdk.core.LiveEnvironment(clientId, clientSecret);
  }
}

function client() {
  return new checkoutNodeJssdk.core.PayPalHttpClient(environment());
}

// ============================================================================
// 🔌 FEATURE-FLAG: PAYMENTS_ENABLED (Issue #8)
// ============================================================================
//
// Erlaubt den Soft-Launch: die Plattform geht mit Gratis-Tracks online,
// während PayPal-Live-Verifizierung (#11), Webhook (#12), AGB und
// Widerrufsbelehrung (#14) noch offen sind.
//
// Bewusst fail-closed: Zahlungen sind AUS, solange nicht ausdrücklich
// PAYMENTS_ENABLED=true gesetzt ist. Fehlt die Variable auf dem Server,
// wird kein Geld eingezogen. Bei einem Feature, das Zahlungen auslöst, ist
// ein vergessenes Env-Flag sonst genau der Fall, den man nicht will.
//
// Absichtlich NICHT gesperrt werden die lesenden Routen und der Download:
// bereits gekaufte Tracks müssen erreichbar bleiben, auch wenn der Verkauf
// zwischenzeitlich pausiert wird. Gesperrt ist nur, was neues Geld bewegt.
// ============================================================================

function paymentsEnabled() {
  // Bei jedem Aufruf neu lesen, damit Tests das Flag umschalten können.
  return process.env.PAYMENTS_ENABLED === 'true';
}

function requirePaymentsEnabled(req, res, next) {
  if (paymentsEnabled()) return next();

  console.warn(`🔌 Zahlung blockiert (PAYMENTS_ENABLED != true): ${req.method} ${req.originalUrl}`);
  return res.status(503).json({
    error: 'Zahlungen sind derzeit deaktiviert',
    code: 'PAYMENTS_DISABLED',
    message: 'Der Verkauf ist noch nicht freigeschaltet. Gratis-Tracks sind uneingeschränkt verfügbar.',
  });
}

console.log(
  paymentsEnabled()
    ? '💰 Zahlungen AKTIV (PAYMENTS_ENABLED=true)'
    : '🔌 Zahlungen DEAKTIVIERT – Soft-Launch-Modus (PAYMENTS_ENABLED != true)'
);

// ============================================================================
// 🔒 GET /api/payments/config - PayPal Config für Frontend
// ============================================================================

router.get('/config', (req, res) => {
  const enabled = paymentsEnabled();
  res.json({
    // Bei deaktivierten Zahlungen keine Client-ID ausliefern – es gibt keinen
    // Grund, sie preiszugeben, wenn ohnehin kein Checkout stattfinden kann.
    paypal_client_id: enabled ? process.env.PAYPAL_CLIENT_ID : null,
    paypal_mode: process.env.PAYPAL_MODE || 'sandbox',
    payments_enabled: enabled,
  });
});

// ============================================================================
// 💰 POST /api/payments/create-order - Create PayPal Order für Track
// ============================================================================

router.post('/create-order', requirePaymentsEnabled, verifyToken, [
  body('track_id').isInt().withMessage('Track ID must be an integer'),
  // price ist optional und NICHT maßgeblich. Der Preis kommt aus
  // tracks.price_eur. Schickt der Client dennoch einen Wert, muss er passen —
  // sonst 400 mit PRICE_MISMATCH. Das macht eine Manipulation sichtbar,
  // statt sie still zu überschreiben.
  body('price').optional().isFloat({ min: 0.01, max: 100 }).withMessage('Invalid price'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { track_id, price } = req.body;
  const userId = req.user.id;

  try {
    // 1️⃣ Track laden — MIT Preis.
    //
    // Vorher wurden nur id, name und artist geladen und der Preis aus
    // req.body übernommen. Damit bestimmte der Browser, was ein Song kostet:
    // ein Aufruf mit price 0.01 für einen Track zu 4.99 wurde angenommen.
    // Der Validator prüfte nur die Spanne 0.01 bis 100, nicht die
    // Übereinstimmung mit dem Track.
    //
    // Preise gehören serverseitig bestimmt. Alles andere ist eine
    // Vertrauensgrenze an der falschen Stelle.
    const trackResult = await pool.query(
      'SELECT id, name, artist, price_eur, is_free, is_published, is_deleted FROM tracks WHERE id = $1',
      [track_id]
    );

    if (trackResult.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const track = trackResult.rows[0];

    if (track.is_deleted === true) {
      return res.status(404).json({ error: 'Track not found' });
    }

    // Nicht veröffentlichte Tracks lassen sich nicht kaufen.
    if (track.is_published !== true) {
      return res.status(400).json({ error: 'Track ist nicht zum Verkauf freigegeben' });
    }

    // Ein Gratis-Track hat keinen Kaufvorgang.
    if (track.is_free === true) {
      return res.status(400).json({ error: 'Dieser Track ist kostenlos' });
    }

    // Der maßgebliche Preis, ausschließlich aus der Datenbank.
    const serverPreis = Number(track.price_eur);

    if (!Number.isFinite(serverPreis) || serverPreis <= 0) {
      console.error(`❌ Track ${track_id} hat keinen brauchbaren Preis: ${track.price_eur}`);
      return res.status(409).json({ error: 'Für diesen Track ist kein Preis hinterlegt' });
    }

    // Falls der Client einen Preis mitgeschickt hat, muss er passen. Ein
    // stiller Austausch würde eine Manipulation verschleiern; eine klare
    // Ablehnung macht sie sichtbar.
    if (price !== undefined && price !== null) {
      const clientPreis = Number(price);
      if (!Number.isFinite(clientPreis) || Math.abs(clientPreis - serverPreis) > 0.005) {
        console.warn(`⚠️ Preis vom Client (${price}) weicht vom Serverpreis (${serverPreis}) ab — abgelehnt`);
        return res.status(400).json({
          error: 'Preis stimmt nicht mit dem Track überein',
          code: 'PRICE_MISMATCH',
          expected: serverPreis.toFixed(2)
        });
      }
    }

    // 2️⃣ Check if already purchased
    const purchaseCheck = await pool.query(
      'SELECT id FROM purchases WHERE user_id = $1 AND track_id = $2',
      [userId, track_id]
    );

    if (purchaseCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Track already purchased' });
    }

    const preisText = serverPreis.toFixed(2);
    console.log(`💰 PayPal-Bestellung: €${preisText} für "${track.name}" (Benutzer ${userId})`);

    // 3️⃣ Create PayPal Order
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: preisText,
          breakdown: {
            item_total: { currency_code: 'EUR', value: preisText },
          },
        },
        items: [{
          name: `🎵 ${track.name} - ${track.artist}`,
          unit_amount: { currency_code: 'EUR', value: preisText },
          quantity: '1',
          sku: `TRACK_${track_id}`,
          category: 'DIGITAL_GOODS',
        }],
        description: `Digital music track purchase`,
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
        brand_name: 'Song-Nexus',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
        locale: 'de-DE',
      },
    });

    const orderResponse = await client().execute(request);
    const orderId = orderResponse.result.id;

    // 4️⃣ Save order to DB
    const orderResult = await pool.query(
      `INSERT INTO orders (user_id, track_id, paypal_order_id, amount, currency, description, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [userId, track_id, orderId, serverPreis, 'EUR', `Track: ${track.name}`, 'CREATED']
    );

    const dbOrderId = orderResult.rows[0].id;

    console.log(`✅ PayPal order created: ${orderId} (DB ID: ${dbOrderId})`);
    res.json({
      order_id: orderId,
      status: 'CREATED',
      track_id: track_id,
      price: serverPreis
    });
  } catch (err) {
    console.error('❌ PayPal create-order error:', err.message);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// ============================================================================
// ✅ POST /api/payments/capture-order/:orderId - Capture Payment
// ============================================================================

// Kein body('track_id')-Validator mehr: Welcher Track freigeschaltet wird,
// steht in der Bestellung und wird nicht mehr vom Client bestimmt.
router.post('/capture-order/:orderId', requirePaymentsEnabled, verifyToken, [
  body('track_id').optional().isInt(),
], async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    console.log(`✅ Capturing order: ${orderId} for user ${userId}`);

    // 1️⃣ Bestellung laden — MIT track_id.
    //
    // Vorher kam die track_id aus req.body und wurde ungeprüft in purchases
    // eingetragen. Geprüft wurde nur, ob die PayPal-Bestellung zum
    // angemeldeten Benutzer gehört. Damit waren bezahltes und
    // freigeschaltetes Produkt nicht miteinander verbunden: günstigen Track
    // bestellen, bezahlen, beim Freischalten die ID eines teureren Tracks
    // senden.
    //
    // Maßgeblich ist ab jetzt ausschließlich orders.track_id, festgeschrieben
    // beim Anlegen der Bestellung.
    const orderCheck = await pool.query(
      'SELECT id, amount, track_id, status FROM orders WHERE paypal_order_id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Order not found or unauthorized' });
    }

    const order = orderCheck.rows[0];
    const track_id = order.track_id;

    // Bestellungen von vor der Einführung dieser Spalte haben keine
    // Zuordnung. Sie hier zu raten wäre schlimmer, als abzulehnen.
    if (track_id === null || track_id === undefined) {
      console.error(`❌ Bestellung ${orderId} hat keine track_id — kann nicht freigeschaltet werden`);
      return res.status(409).json({
        error: 'Dieser Bestellung ist kein Track zugeordnet. Bitte neu bestellen.',
        code: 'ORDER_WITHOUT_TRACK'
      });
    }

    // Falls der Client dennoch eine track_id mitschickt und sie abweicht,
    // wird das protokolliert. Sie wird nicht verwendet — aber ein solcher
    // Aufruf ist ein Hinweis auf einen Manipulationsversuch oder einen
    // veralteten Client.
    if (req.body?.track_id !== undefined && Number(req.body.track_id) !== Number(track_id)) {
      console.warn(`⚠️ Client wollte Track ${req.body.track_id} freischalten, bestellt war ${track_id} — Bestellung ist maßgeblich`);
    }

    // Doppeltes Freischalten derselben Bestellung verhindern.
    if (order.status === 'COMPLETED') {
      return res.status(409).json({ error: 'Diese Bestellung wurde bereits abgeschlossen', code: 'ALREADY_COMPLETED' });
    }

    // 2️⃣ Capture at PayPal
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});

    const captureResponse = await client().execute(request);

    // 3️⃣ Check PayPal response
    if (captureResponse.result.status === 'COMPLETED') {
      const paypalPayerId = captureResponse.result.payer?.email_address || null;
      const transactionId = captureResponse.result.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

      // 4️⃣ Start transaction
      const client_db = await pool.connect();

      try {
        await client_db.query('BEGIN');

        // Update order
        await client_db.query(
          `UPDATE orders
           SET status = $1, completed_at = NOW(), paypal_payer_email = $2, transaction_id = $3
           WHERE paypal_order_id = $4`,
          ['COMPLETED', paypalPayerId, transactionId, orderId]
        );

        // Create purchase record - NOW LINKED TO ORDER!
        await client_db.query(
          `INSERT INTO purchases (user_id, track_id, order_id, purchased_at, license_type)
           VALUES ($1, $2, $3, NOW(), 'personal')
           ON CONFLICT DO NOTHING`,
          [userId, track_id, order.id]
        );

        // Update track play count
        await client_db.query(
          `UPDATE tracks
           SET play_count = COALESCE(play_count, 0)
           WHERE id = $1`,
          [track_id]
        );

        await client_db.query('COMMIT');
      } catch (err) {
        await client_db.query('ROLLBACK');
        throw err;
      } finally {
        client_db.release();
      }

      console.log(`✅ Payment completed: Order ${orderId}, Transaction ${transactionId}`);
      res.json({
        status: 'COMPLETED',
        message: 'Payment successful - Track unlocked!',
        transaction_id: transactionId,
        track_id: track_id,
      });
    } else {
      // Payment failed
      await pool.query(
        'UPDATE orders SET status = $1 WHERE paypal_order_id = $2',
        [captureResponse.result.status || 'FAILED', orderId]
      );

      console.error(`❌ Payment failed: ${captureResponse.result.status}`);
      res.status(400).json({
        error: 'Payment not completed',
        status: captureResponse.result.status,
      });
    }
  } catch (err) {
    console.error('❌ PayPal capture-order error:', err.message);
    res.status(500).json({ error: 'Failed to capture PayPal order' });
  }
});

// ============================================================================
// 🎵 GET /api/payments/user-purchases - Get user's purchased tracks
// ============================================================================

router.get('/user-purchases', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        p.id, p.track_id, t.name, t.artist, t.audio_filename,
        p.purchased_at, p.license_type, p.order_id
       FROM purchases p
       JOIN tracks t ON p.track_id = t.id
       WHERE p.user_id = $1
       ORDER BY p.purchased_at DESC`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ User purchases error:', err);
    res.status(500).json({ error: 'Failed to fetch purchases' });
  }
});

// ============================================================================
// 📋 GET /api/payments/history - Payment Order History
// ============================================================================

router.get('/history', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        o.id, o.paypal_order_id, o.amount, o.currency, o.status,
        o.created_at, o.completed_at, o.description, o.transaction_id
       FROM orders o
       WHERE o.user_id = $1
       ORDER BY o.created_at DESC
       LIMIT 50`,
      [req.user.id]
    );

    res.json(result.rows);
  } catch (err) {
    console.error('❌ Payment history error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// ============================================================================
// 💰 GET /api/payments/stats - Payment Statistics
// ============================================================================

router.get('/stats', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT
        COUNT(DISTINCT CASE WHEN status = 'COMPLETED' THEN id END) as completed_payments,
        COUNT(DISTINCT CASE WHEN status = 'FAILED' THEN id END) as failed_payments,
        SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END)::numeric(10,2) as total_spent,
        ROUND(AVG(CASE WHEN status = 'COMPLETED' THEN amount ELSE NULL END)::numeric, 2) as avg_purchase,
        (SELECT COUNT(*) FROM purchases WHERE user_id = $1) as total_tracks_purchased
       FROM orders
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0] || {
      completed_payments: 0,
      failed_payments: 0,
      total_spent: '0.00',
      avg_purchase: null,
      total_tracks_purchased: 0
    });
  } catch (err) {
    console.error('❌ Payment stats error:', err);
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
});

// ============================================================================
// ⬇️  GET /api/payments/download/:trackId - Sicherer Datei-Download
// ============================================================================
// Nur für eingeloggte User, die den Track gekauft haben.
// Generiert einen temporären signierten Token (10 Min) und leitet weiter.

const crypto = require('crypto');

// Einfacher In-Memory Token Store (reicht für Single-Server; für Multi-Server → Redis)
const downloadTokens = new Map();

// Aufräumen: abgelaufene Tokens alle 5 Minuten entfernen
//
// .unref() ist hier entscheidend: ohne den Aufruf hält der Timer die Node-
// Event-Loop dauerhaft offen. Folge war, dass `jest --detectOpenHandles` nicht
// mehr zurückkehrt – in CI lief der Test-Job in den Timeout, obwohl alle 59
// Tests nach rund 25 Sekunden grün waren.
//
// unref() sagt Node: dieser Timer ist kein Grund, den Prozess am Leben zu
// halten. Im laufenden Server ändert sich nichts, weil dort der HTTP-Listener
// die Event-Loop offen hält und das Intervall wie gewohnt feuert.
//
// Der eigentliche Konstruktionsfehler bleibt Issue #13: die Tokens liegen im
// Prozessspeicher und sind nach jedem Restart verloren.
const downloadTokenCleanup = setInterval(() => {
  const now = Date.now();
  for (const [token, data] of downloadTokens.entries()) {
    if (data.expiresAt < now) downloadTokens.delete(token);
  }
}, 5 * 60 * 1000);

downloadTokenCleanup.unref();

router.get('/download/:trackId', verifyToken, async (req, res) => {
  const trackId = parseInt(req.params.trackId);
  const userId  = req.user.id;

  if (isNaN(trackId)) return res.status(400).json({ error: 'Ungültige Track-ID' });

  try {
    // 1️⃣ Kaufprüfung
    const purchaseResult = await pool.query(
      `SELECT p.id, t.audio_filename, t.name, t.artist
       FROM purchases p
       JOIN tracks t ON t.id = p.track_id
       WHERE p.user_id = $1 AND p.track_id = $2
       LIMIT 1`,
      [userId, trackId]
    );

    if (purchaseResult.rows.length === 0) {
      return res.status(403).json({ error: 'Kein Kaufnachweis für diesen Track' });
    }

    const { audio_filename, name, artist } = purchaseResult.rows[0];

    // 2️⃣ Signierten Einmal-Token generieren (gültig 10 Minuten)
    const token = crypto.randomBytes(32).toString('hex');
    downloadTokens.set(token, {
      userId,
      trackId,
      audio_filename,
      trackName: `${artist} - ${name}`,
      expiresAt: Date.now() + 10 * 60 * 1000,
    });

    console.log(`⬇️  Download-Token erstellt: User ${userId} → Track ${trackId} (${audio_filename})`);

    res.json({
      download_url: `/api/payments/download-file/${token}`,
      expires_in:   600,
      track_name:   `${artist} - ${name}`,
    });
  } catch (err) {
    console.error('❌ Download token error:', err);
    res.status(500).json({ error: 'Serverfehler beim Download' });
  }
});

// ============================================================================
// ⬇️  GET /api/payments/download-file/:token - Dateiauslieferung via Token
// ============================================================================
// Kein Auth-Header nötig — Token ist der Beweis. Einmalig verwendbar.

const path_mod = require('path');
const fs_mod   = require('fs');

router.get('/download-file/:token', async (req, res) => {
  const { token } = req.params;
  const tokenData = downloadTokens.get(token);

  if (!tokenData) {
    return res.status(403).send('Download-Link ungültig oder abgelaufen.');
  }

  if (tokenData.expiresAt < Date.now()) {
    downloadTokens.delete(token);
    return res.status(403).send('Download-Link abgelaufen. Bitte neu anfordern.');
  }

  // Token sofort löschen — Einmalverwendung
  downloadTokens.delete(token);

  const filepath = path_mod.join(__dirname, '../public/audio', tokenData.audio_filename);

  if (!fs_mod.existsSync(filepath)) {
    console.error(`❌ Audiodatei nicht gefunden: ${filepath}`);
    return res.status(404).send('Audiodatei nicht gefunden.');
  }

  // Sicherer Dateiname für den Browser
  const safeFilename = tokenData.trackName
    .replace(/[^a-zA-Z0-9\s\-_.äöüÄÖÜß]/g, '')
    .replace(/\s+/g, '_')
    .substring(0, 100) + '.mp3';

  const stat = fs_mod.statSync(filepath);

  console.log(`⬇️  Download: "${safeFilename}" für User ${tokenData.userId}`);

  res.setHeader('Content-Disposition', `attachment; filename="${safeFilename}"`);
  res.setHeader('Content-Type', 'audio/mpeg');
  res.setHeader('Content-Length', stat.size);
  res.setHeader('Cache-Control', 'private, no-store');
  res.setHeader('X-Content-Type-Options', 'nosniff');

  fs_mod.createReadStream(filepath).pipe(res);
});

module.exports = router;

// ============================================================================
// 📖 DATABASE SCHEMA REFERENCE
// ============================================================================
/*
ORDERS TABLE:
- id: integer (PRIMARY KEY)
- user_id: integer (FK → users)
- paypal_order_id: varchar
- amount: numeric(10,2)
- currency: varchar (EUR, USD, etc.)
- status: varchar (CREATED, COMPLETED, FAILED, etc.)
- description: text
- transaction_id: varchar (PayPal transaction ID)
- paypal_payer_email: varchar (PayPal payer email)
- created_at: timestamp - Default: CURRENT_TIMESTAMP
- completed_at: timestamp
- updated_at: timestamp - Default: CURRENT_TIMESTAMP

PURCHASES TABLE:
- id: integer (PRIMARY KEY)
- user_id: integer (FK → users)
- track_id: integer (FK → tracks)
- order_id: integer (FK → orders) ← NOW LINKED!
- license_type: varchar - Default: 'personal'
- purchased_at: timestamp - Default: CURRENT_TIMESTAMP
- expires_at: timestamp

IMPORTANT:
✅ Middleware: verifyToken (from auth-middleware)
✅ All queries use parameterized statements ($1, $2, etc.)
✅ Transactions ensure data consistency (BEGIN/COMMIT/ROLLBACK)
✅ purchases.order_id now links to orders.id
✅ license_type default changed to 'personal'
✅ Error handling for PayPal API failures
*/