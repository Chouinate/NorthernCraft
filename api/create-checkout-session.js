'use strict';
const Stripe = require('stripe');
const { canonicalUnitAmountCents } = require('./_prices');
const { usRateCents, canadaRateCents } = require('./_shipping');

function shippingOptions(itemCount, country) {
  if (country === 'CA') {
    const canadaCents = canadaRateCents(itemCount);
    return [
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

  // Default: US
  const usCents = usRateCents(itemCount);
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
  ];
}

/* ── Handler ──────────────────────────────────────────────────────────────── */
module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const { items, itemCount, country, return_url, payment_method_types } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  if (!return_url || typeof return_url !== 'string') {
    return res.status(400).json({ error: 'return_url is required.' });
  }

  if (country === 'OTHER') {
    return res.status(400).json({ error: 'Shipping is not available in your region.' });
  }
  const resolvedCountry = country === 'CA' ? 'CA' : 'US';

  // Reject any item whose id we cannot price server-side.
  for (const item of items) {
    if (canonicalUnitAmountCents(item) === null) {
      return res.status(400).json({ error: `Unknown item: ${String(item.id)}` });
    }
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
        unit_amount: canonicalUnitAmountCents(item), // server-authoritative; client price ignored
      },
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
    }));

    const sessionParams = {
      ui_mode:  'embedded',
      mode:     'payment',
      line_items,
      return_url,
      billing_address_collection:  'required',
      shipping_address_collection: { allowed_countries: [resolvedCountry] },
      shipping_options:            shippingOptions(totalItems, resolvedCountry),
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
