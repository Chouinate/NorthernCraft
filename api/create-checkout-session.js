'use strict';
const Stripe = require('stripe');
const { canonicalUnitAmountCents } = require('./_prices');
const { shippingCents, countryToZone, ALLOWED_COUNTRIES } = require('./_shipping');

function shippingOptions(itemCount, countryCode) {
  const zone  = countryToZone(countryCode);
  const cents = shippingCents(itemCount, countryCode);

  const ZONE_LABELS = {
    US:   { name: cents === 0 ? 'Free Shipping (US)' : 'Standard Shipping (US)',       min: 5,  max: 10 },
    CA:   { name: 'Standard Shipping (Canada)',                                          min: 10, max: 21 },
    EU:   { name: 'Standard Shipping (UK & Europe)',                                     min: 10, max: 21 },
    AP:   { name: 'Standard Shipping (Asia-Pacific)',                                    min: 14, max: 28 },
    INTL: { name: 'Standard Shipping (International)',                                   min: 14, max: 28 },
  };

  const label = ZONE_LABELS[zone] || ZONE_LABELS.INTL;

  return [
    {
      shipping_rate_data: {
        type:         'fixed_amount',
        fixed_amount: { amount: cents, currency: 'usd' },
        display_name: label.name,
        delivery_estimate: {
          minimum: { unit: 'business_day', value: label.min },
          maximum: { unit: 'business_day', value: label.max },
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

  const countryCode = (typeof country === 'string' && country.match(/^[A-Z]{2}$/))
    ? country
    : 'US';

  // Reject any item whose id we cannot price server-side.
  for (const item of items) {
    if (canonicalUnitAmountCents(item) === null) {
      return res.status(400).json({ error: `Unknown item: ${String(item.id)}` });
    }
  }

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
        unit_amount: canonicalUnitAmountCents(item),
      },
      quantity: Math.max(1, parseInt(item.quantity, 10) || 1),
    }));

    const sessionParams = {
      ui_mode:  'embedded',
      mode:     'payment',
      line_items,
      return_url,
      billing_address_collection:  'required',
      shipping_address_collection: { allowed_countries: ALLOWED_COUNTRIES },
      shipping_options:            shippingOptions(totalItems, countryCode),
    };

    if (Array.isArray(payment_method_types) && payment_method_types.length > 0) {
      sessionParams.payment_method_types = payment_method_types;
    }

    const session = await stripe.checkout.sessions.create(sessionParams);
    res.json({ clientSecret: session.client_secret });
  } catch (err) {
    console.error('[/create-checkout-session]', err.message);
    res.status(500).json({ error: err.message });
  }
};
