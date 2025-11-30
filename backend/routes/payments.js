const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../server');
const { verifyToken } = require('./auth');

const router = express.Router();

// PayPal Client Setup
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_CLIENT_SECRET; // ✅ FIX: War vorher PAYPAL_SECRET

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
// 💰 POST /api/payments/create-order
// ============================================================================

router.post('/create-order', verifyToken, [
  body('amount').isFloat({ min: 0.01, max: 10000 }).withMessage('Invalid amount'),
  body('description').trim().isLength({ min: 1, max: 200 }),
  body('track_id').optional().isInt(),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, description, track_id } = req.body;
  const userId = req.user.id;

  try {
    console.log(`💰 Creating PayPal order: €${amount} for user ${userId}`);

    const request = new checkoutNodeJssdk.orders.OrdersCreateRequest();
    request.prefer("return=representation");
    request.requestBody({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: 'EUR',
          value: amount.toString(),
          breakdown: {
            item_total: { currency_code: 'EUR', value: amount.toString() },
          },
        },
        items: [{
          name: description,
          unit_amount: { currency_code: 'EUR', value: amount.toString() },
          quantity: '1',
          sku: track_id ? `TRACK_${track_id}` : 'SONG_NEXUS',
        }],
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
        brand_name: 'Song-Nexus',
        landing_page: 'BILLING',
        user_action: 'PAY_NOW',
      },
    });

    const orderResponse = await client().execute(request);
    const orderId = orderResponse.result.id;

    // Save order to DB
    await pool.query(
      `INSERT INTO orders (user_id, paypal_order_id, amount, currency, description, status) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [userId, orderId, amount, 'EUR', description, 'CREATED']
    );

    console.log(`✅ Order created: ${orderId}`);
    res.json({ id: orderId, status: 'CREATED' });
  } catch (err) {
    console.error('❌ PayPal create-order error:', err.message);
    res.status(500).json({ error: 'Failed to create PayPal order' });
  }
});

// ============================================================================
// ✅ POST /api/payments/capture-order/:orderId
// ============================================================================

router.post('/capture-order/:orderId', verifyToken, async (req, res) => {
  const { orderId } = req.params;
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

    // 2️⃣ Capture order bei PayPal
    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const captureResponse = await client().execute(request);

    // 3️⃣ Check PayPal response status
    if (captureResponse.result.status === 'COMPLETED') {
      const paypalPayerId = captureResponse.result.payer?.email_address || null;
      const transactionId = captureResponse.result.purchase_units?.[0]?.payments?.captures?.[0]?.id || null;

      // 4️⃣ Update order in DB
      await pool.query(
        `UPDATE orders 
         SET status = $1, completed_at = NOW(), paypal_payer_email = $2, transaction_id = $3
         WHERE paypal_order_id = $4`,
        ['COMPLETED', paypalPayerId, transactionId, orderId]
      );

      console.log(`✅ Order completed: ${orderId}`);
      res.json({
        status: 'COMPLETED',
        message: 'Payment successful',
        transaction_id: transactionId,
      });
    } else {
      // Order nicht erfolgreich
      await pool.query(
        'UPDATE orders SET status = $1 WHERE paypal_order_id = $2',
        [captureResponse.result.status || 'FAILED', orderId]
      );

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
// 📋 GET /api/payments/history - User Payment History
// ============================================================================

router.get('/history', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT 
        o.id, o.paypal_order_id, o.amount, o.currency, o.status, 
        o.created_at, o.completed_at, o.description
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
        SUM(CASE WHEN status = 'COMPLETED' THEN amount ELSE 0 END) as total_spent,
        AVG(CASE WHEN status = 'COMPLETED' THEN amount ELSE NULL END) as avg_purchase
       FROM orders
       WHERE user_id = $1`,
      [req.user.id]
    );

    res.json(result.rows[0]);
  } catch (err) {
    console.error('❌ Payment stats error:', err);
    res.status(500).json({ error: 'Failed to fetch payment stats' });
  }
});

module.exports = router;