const express = require('express');
const { body, validationResult } = require('express-validator');
const { pool } = require('../server');
const auth = require('./auth');

const router = express.Router();

// Paypal Client Setup
const checkoutNodeJssdk = require('@paypal/checkout-server-sdk');

function environment() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const clientSecret = process.env.PAYPAL_SECRET;

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
// 💰 CREATE ORDER (Frontend → Backend → Paypal)
// ============================================================================

router.post('/create-order', auth.verifyToken, [
  body('amount').isFloat({ min: 0.01, max: 10000 }).withMessage('Invalid amount'),
  body('description').trim().isLength({ min: 1, max: 200 }),
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { amount, description } = req.body;
  const userId = req.user.id;

  try {
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
        }],
      }],
      application_context: {
        return_url: `${process.env.FRONTEND_URL}/payment-success`,
        cancel_url: `${process.env.FRONTEND_URL}/payment-cancel`,
      },
    });

    const orderResponse = await client().execute(request);
    const orderId = orderResponse.result.id;

    // Save order to DB
    await pool.query(
      'INSERT INTO orders (user_id, paypal_order_id, amount, description, status) VALUES ($1, $2, $3, $4, $5)',
      [userId, orderId, amount, description, 'CREATED']
    );

    res.json({ id: orderId });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to create order' });
  }
});

// ============================================================================
// ✅ CAPTURE ORDER (Paypal → Backend → DB)
// ============================================================================

router.post('/capture-order/:orderId', auth.verifyToken, async (req, res) => {
  const { orderId } = req.params;
  const userId = req.user.id;

  try {
    // Verify order belongs to user
    const orderCheck = await pool.query(
      'SELECT id FROM orders WHERE paypal_order_id = $1 AND user_id = $2',
      [orderId, userId]
    );

    if (orderCheck.rows.length === 0) {
      return res.status(403).json({ error: 'Order not found or unauthorized' });
    }

    const request = new checkoutNodeJssdk.orders.OrdersCaptureRequest(orderId);
    request.requestBody({});
    const captureResponse = await client().execute(request);

    if (captureResponse.result.status === 'COMPLETED') {
      // Update order in DB
      await pool.query(
        'UPDATE orders SET status = $1, completed_at = NOW() WHERE paypal_order_id = $2',
        ['COMPLETED', orderId]
      );

      res.json({ status: 'COMPLETED', message: 'Payment successful' });
    } else {
      res.status(400).json({ error: 'Payment not completed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to capture order' });
  }
});

module.exports = router;
