'use strict';
const Stripe = require('stripe');

/* ── Shipping rate lookup ────────────────────────────────────────────────────
   Each item weighs 0.6 lb.
   US:     1 item = $7   |   2+ items = free
   Canada: weight-based (matches Google Merchant config)
     0.0–1.0 lb  (1 item)   = $12
     1.1–2.0 lbs (2–3 items) = $15
     2.1–3.0 lbs (4–5 items) = $19
     3.1–4.0 lbs (6 items)   = $26
     4.1+ lbs    (7+ items)  = $50
──────────────────────────────────────────────────────────────────────────── */
const ITEM_WEIGHT_LB = 0.6;

function usRateCents(itemCount) {
  return itemCount >= 2 ? 0 : 700;
}

function canadaRateCents(itemCount) {
  const weight = itemCount * ITEM_WEIGHT_LB;
  if (weight <= 1.0) return 1200;
  if (weight <= 2.0) return 1500;
  if (weight <= 3.0) return 1900;
  if (weight <= 4.0) return 2600;
  return 5000;
}

function shippingOptions(itemCount) {
  const usCents     = usRateCents(itemCount);
  const canadaCents = canadaRateCents(itemCount);

  return [
    {
      shipping_rate_data: {
        type:         'fixed_amount',
        fixed_amount: { amount: usCents, currency: 'usd' },
        display_name: usCents === 0 ? 'Free Shipping (US)' : 'Standard Shipping (US)',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 5 },
          maximum: { unit: 'business_day', value: 10 },
        },
      },
    },
    {
      shipping_rate_data: {
        type:         'fixed_amount',
        fixed_amount: { amount: canadaCents, currency: 'usd' },
        display_name: 'Standard Shipping (Canada)',
        delivery_estimate: {
          minimum: { unit: 'business_day', value: 10 },
          maximum: { unit: 'business_day', value: 21 },
        },
      },
    },
  ];
}

/* ── Handler ──────────────────────────────────────────────────────────────── */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const stripe = new Stripe(process.env.Stripe_Secret || process.env.STRIPE_SECRET_KEY);
  const { items, itemCount, return_url, payment_method_types } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  if (!return_url || typeof return_url !== 'string') {
    return res.status(400).json({ error: 'return_url is required.' });
  }

  // Total item count — use explicit value from client, fall back to summing quantities
  const totalItems = Number.isInteger(itemCount) && itemCount > 0
    ? itemCount
    : items.reduce((sum, i) => sum + (parseInt(i.quantity, 10) || 1), 0);

  try {
    const line_items = items.map(item => ({
      price_data: {
        currency: 'usd',
        product_data: {
          name: String(item.name),
          ...(item.image ? { images: [String(item.image)] } : {}),
        },
        unit_amount: Math.round(Number(item.price) * 100),
      },
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
    }));

    const sessionParams = {
      ui_mode:  'embedded',
      mode:     'payment',
      line_items,
      return_url,
      billing_address_collection:  'required',
      shipping_address_collection: { allowed_countries: ['US', 'CA'] },
      shipping_options:            shippingOptions(totalItems),
    };

    if (Array.isArray(payment_method_types) && payment_method_types.length > 0) {
      sessionParams.payment_method_types = payment_method_types;
    }
    // automatic_payment_methods is the default in newer Stripe API versions — no need to set it

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('[/create-checkout-session]', err.message);
    res.status(500).json({ error: err.message });
  }
};
