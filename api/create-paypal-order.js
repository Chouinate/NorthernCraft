'use strict';

/**
 * POST /api/create-paypal-order
 *
 * Creates a PayPal order server-side using authoritative prices derived from
 * item IDs.  Prices supplied by the client are ignored entirely.
 *
 * Required environment variables (set in Vercel dashboard):
 *   PayPal_ClientID  — PayPal REST API client ID
 *   PayPal_Secret    — PayPal REST API secret
 *
 * Optional:
 *   PAYPAL_BASE_URL  — defaults to https://api-m.paypal.com
 *                      Use https://api-m.sandbox.paypal.com for testing.
 *
 * Returns: { orderID }
 */

const { canonicalUnitAmountCents } = require('./_prices');

const PAYPAL_BASE_URL = (process.env.PAYPAL_BASE_URL || 'https://api-m.paypal.com').replace(/\/$/, '');

async function getAccessToken() {
  const clientId = process.env.PayPal_ClientID;
  const secret   = process.env.PayPal_Secret;
  if (!clientId || !secret) {
    throw new Error('PayPal credentials are not configured on the server.');
  }

  const res = await fetch(PAYPAL_BASE_URL + '/v1/oauth2/token', {
    method: 'POST',
    headers: {
      'Authorization': 'Basic ' + Buffer.from(clientId + ':' + secret).toString('base64'),
      'Content-Type':  'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error_description || 'PayPal authentication failed.');
  return data.access_token;
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed.' });

  const { items } = req.body;

  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Cart is empty.' });
  }

  // Reject any item whose id we cannot price server-side.
  for (const item of items) {
    if (canonicalUnitAmountCents(item) === null) {
      return res.status(400).json({ error: `Unknown item: ${String(item.id)}` });
    }
  }

  // Build PayPal line items using server-authoritative prices.
  let itemTotalCents = 0;
  const lineItems = items.map(item => {
    const unitCents = canonicalUnitAmountCents(item);
    const qty       = Math.max(1, parseInt(item.quantity, 10) || 1);
    itemTotalCents += unitCents * qty;
    return {
      name:        String(item.name).substring(0, 127),
      unit_amount: { currency_code: 'USD', value: (unitCents / 100).toFixed(2) },
      quantity:    String(qty),
    };
  });

  const totalValue = (itemTotalCents / 100).toFixed(2);

  try {
    const accessToken = await getAccessToken();

    const orderRes = await fetch(PAYPAL_BASE_URL + '/v2/checkout/orders', {
      method: 'POST',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'USD',
            value:         totalValue,
            breakdown: {
              item_total: { currency_code: 'USD', value: totalValue },
            },
          },
          items: lineItems,
        }],
      }),
    });

    const orderData = await orderRes.json();
    if (!orderRes.ok) {
      throw new Error(orderData.message || 'PayPal order creation failed.');
    }

    res.json({ orderID: orderData.id });
  } catch (err) {
    console.error('[/create-paypal-order]', err.message);
    res.status(500).json({ error: err.message });
  }
};
