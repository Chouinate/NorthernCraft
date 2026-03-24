'use strict';
require('dotenv').config();

/**
 * NorthernCraft checkout server
 *
 * Required environment variable:
 *   STRIPE_SECRET_KEY   — your Stripe secret key (never hardcoded)
 *
 * Optional:
 *   PORT                — defaults to 3000
 *
 * Start:
 *   STRIPE_SECRET_KEY=sk_live_... node server.js
 */

const express = require('express');
const cors    = require('cors');
const Stripe  = require('stripe');

// ── Guard ────────────────────────────────────────────────────────────────────
if (!process.env.STRIPE_SECRET_KEY) {
  console.error('ERROR: STRIPE_SECRET_KEY environment variable is not set.');
  process.exit(1);
}

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
const app    = express();

// ── Middleware ───────────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());

// ── POST /create-checkout-session ────────────────────────────────────────────
app.post('/create-checkout-session', async (req, res) => {
  try {
    const { items, return_url, payment_method_types } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Cart is empty.' });
    }
    if (!return_url || typeof return_url !== 'string') {
      return res.status(400).json({ error: 'return_url is required.' });
    }

    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: String(item.name),
          ...(item.image ? { images: [String(item.image)] } : {}),
        },
        unit_amount: Math.round(Number(item.price) * 100), // dollars → cents
      },
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
    }));

    const sessionParams = {
      ui_mode:    'embedded',
      mode:       'payment',
      line_items,
      return_url,
    };
    sessionParams.payment_method_types = (Array.isArray(payment_method_types) && payment_method_types.length > 0)
      ? payment_method_types
      : ['card', 'klarna', 'afterpay_clearpay', 'cashapp', 'us_bank_account'];
    const session = await stripe.checkout.sessions.create(sessionParams);

    res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('[/create-checkout-session]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /session-status ───────────────────────────────────────────────────────
// Called by the frontend after Stripe redirects back to confirm payment status.
app.get('/session-status', async (req, res) => {
  try {
    const { session_id } = req.query;
    if (!session_id) {
      return res.status(400).json({ error: 'Missing session_id.' });
    }

    const session = await stripe.checkout.sessions.retrieve(session_id);
    res.json({
      status:         session.status,                        // 'open' | 'complete' | 'expired'
      customer_email: session.customer_details?.email || null,
    });
  } catch (err) {
    console.error('[/session-status]', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /paypal-client-id ────────────────────────────────────────────────────
// Returns the PayPal publishable client ID to the frontend so it is never
// embedded in static source files.
app.get('/paypal-client-id', (req, res) => {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'PAYPAL_CLIENT_ID is not set on the server.' });
  }
  res.json({ clientId });
});

// ── Listen ───────────────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`NorthernCraft checkout server listening on port ${PORT}`);
});
