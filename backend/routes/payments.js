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
// 🔒 GET /api/payments/config - PayPal Config für Frontend
// ============================================================================

router.get('/config', (req, res) => {
  res.json({
    paypal_client_id: process.env.PAYPAL_CLIENT_ID,
    paypal_mode: process.env.PAYPAL_MODE || 'sandbox',
  });
});

// ============================================================================
// 💰 POST /api/payments/create-order - Create PayPal Order für Track
// ============================================================================

router.post('/create-order', verifyToken, [
  body('track_id').isInt().withMessage('Track ID must be an integer'),
  body('price').isFloat({ min: 0.01, max: 100 }).withMessage('Invalid price'),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { track_id, price } = req.body;
  const userId = req.user.id;

  try {
    // 1️⃣ Verify track exists
    const trackResult = await pool.query(
      'SELECT id, name, artist FROM tracks WHERE id = $1',
      [track_id]
    );

    if (trackResult.rows.length === 0) {
      return res.status(404).json({ error: 'Track not found' });
    }

    const track = trackResult.rows[0];

    // 2️⃣ Check if already purchased
    const purchaseCheck = await pool.query(
      'SELECT id FROM purchases WHERE user_id = $1 AND track_id = $2',
      [userId, track_id]
    );

    if (purchaseCheck.rows.length > 0) {
      return res.status(400).json({ error: 'Track already purchased' });
    }

    console.log(`💰 Creating PayPal order: €${price} for track "${track.name}" (user ${userId})`);

    // 3️⃣ Create PayPal Order
    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: price.toString(),
          breakdown: {
            item_total: { currency_code: 'EUR', value: price.toString() },
          },
        },
        items: [{
          name: `🎵 ${track.name} - ${track.artist}`,
          unit_amount: { currency_code: 'EUR', value: price.toString() },
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
      `INSERT INTO orders (user_id, paypal_order_id, amount, currency, description, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id`,
      [userId, orderId, price, 'EUR', `Track: ${track.name}`, 'CREATED']
    );

    const dbOrderId = orderResult.rows[0].id;

    console.log(`✅ PayPal order created: ${orderId} (DB ID: ${dbOrderId})`);
    res.json({
      order_id: orderId,
      status: 'CREATED',
      track_id: track_id,
      price: price
    });
  } catch (err) {
    console.error('❌ PayPal create-order error:', err.message);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// ============================================================================
// ✅ POST /api/payments/capture-order/:orderId - Capture Payment
// ============================================================================

router.post('/capture-order/:orderId', verifyToken, [
  body('track_id').isInt().withMessage('Track ID required'),
], async (req, res) => {
  const { orderId } = req.params;
  const { track_id } = req.body;
  const userId = req.user.id;

  try {
    console.log(`✅ Capturing order: ${orderId} for user ${userId}`);

    // 1️⃣ Verify order belongs to user
    const orderCheck = await pool.query(
      'SELECT id, amount FROM orders WHERE paypal_order_id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Order not found or unauthorized' });
    }

    const order = orderCheck.rows[0];

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