'use strict';
const Stripe = require('stripe');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const stripe = new Stripe(process.env.Stripe_Secret);
  const { items, return_url, payment_method_types } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }
  if (!return_url || typeof return_url !== 'string') {
    return res.status(400).json({ error: 'return_url is required.' });
  }

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
      ui_mode:   'embedded',
      mode:      'payment',
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
};
