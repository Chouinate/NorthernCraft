'use strict';
const Stripe = require('stripe');

/* ── Server-authoritative price catalogue ────────────────────────────────────
   Prices are NEVER taken from the client request.  The server derives the
   correct unit amount from the item id alone.

   Single tiles: every product is $35.
   Bundles:      price is index-based on tile count (same map as cart.js).
──────────────────────────────────────────────────────────────────────────── */
const SINGLE_PRICE_CENTS = 3500; // $35.00

// BUNDLE_PRICE_MAP_CENTS[n] = total price in cents for a bundle of n tiles.
const BUNDLE_PRICE_MAP_CENTS = [
  0,     // 0 tiles  (unused)
  3500,  // 1 tile   $35
  5500,  // 2 tiles  $55
  7500,  // 3 tiles  $75
  8900,  // 4 tiles  $89
  10400, // 5 tiles  $104
  11900, // 6 tiles  $119
  13600, // 7 tiles  $136
  15200, // 8 tiles  $152
  16700, // 9 tiles  $167
  18200, // 10 tiles $182
  19100, // 11 tiles $191
  19900, // 12 tiles $199
];

const KNOWN_PRODUCT_IDS = new Set([
  'solstice', 'bloom',   'petal',   'quarry',
  'meadow',   'summit',  'grove',   'flora',
  'north',    'blossom', 'rosette', 'flare',
]);

/**
 * Returns the canonical unit amount in cents for a cart item, derived from
 * its id.  Returns null when the id is unrecognised.
 *
 * Single product ids (e.g. "solstice")  → always SINGLE_PRICE_CENTS.
 * Bundle ids (format "bundle-{n}-{ts}") → BUNDLE_PRICE_MAP_CENTS[n], or a
 * proportional rate for n > 12.
 */
function canonicalUnitAmountCents(item) {
  const id = String(item.id || '');

  if (KNOWN_PRODUCT_IDS.has(id)) return SINGLE_PRICE_CENTS;

  const m = id.match(/^bundle-(\d+)-\d+$/);
  if (m) {
    const n = parseInt(m[1], 10);
    if (n >= 1 && n < BUNDLE_PRICE_MAP_CENTS.length) return BUNDLE_PRICE_MAP_CENTS[n];
    if (n >= BUNDLE_PRICE_MAP_CENTS.length) {
      // Proportional extension beyond 12 tiles (same logic as product-cards.js)
      const maxN = BUNDLE_PRICE_MAP_CENTS.length - 1;
      return Math.round((BUNDLE_PRICE_MAP_CENTS[maxN] / maxN) * n);
    }
  }

  return null; // unknown item id
}

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

  const stripe = new Stripe(process.env.Stripe_Secret || process.env.STRIPE_SECRET_KEY);
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
