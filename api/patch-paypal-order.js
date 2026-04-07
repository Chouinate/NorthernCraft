'use strict';

/**
 * POST /api/patch-paypal-order
 *
 * Updates the purchase-unit amount on an existing PayPal order when the buyer
 * changes their shipping address inside the PayPal popup.  Called from
 * paypal-checkout.js's onShippingAddressChange handler.
 *
 * Body: { orderID, country, totalItemCount }
 *   orderID        — PayPal order ID to patch
 *   country        — 'US' or 'CA'
 *   totalItemCount — total number of tiles (used to compute shipping)
 *   itemTotalCents — sum of line-item costs in cents (used to rebuild grand total)
 *
 * Returns: { ok: true }
 */

const { shippingCents } = require('./_shipping');

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

  const { orderID, country: rawCountry, totalItemCount, itemTotalCents } = req.body;

  if (!orderID || typeof orderID !== 'string') {
    return res.status(400).json({ error: 'orderID is required.' });
  }
  if (typeof totalItemCount !== 'number' || totalItemCount < 1) {
    return res.status(400).json({ error: 'totalItemCount is required.' });
  }
  if (typeof itemTotalCents !== 'number' || itemTotalCents < 0) {
    return res.status(400).json({ error: 'itemTotalCents is required.' });
  }

  const country        = rawCountry === 'CA' ? 'CA' : 'US';
  const shippingVal    = shippingCents(totalItemCount, country);
  const grandTotal     = ((itemTotalCents + shippingVal) / 100).toFixed(2);
  const itemTotalValue = (itemTotalCents / 100).toFixed(2);
  const shippingValue  = (shippingVal / 100).toFixed(2);

  try {
    const accessToken = await getAccessToken();

    const patchRes = await fetch(PAYPAL_BASE_URL + '/v2/checkout/orders/' + encodeURIComponent(orderID), {
      method: 'PATCH',
      headers: {
        'Authorization': 'Bearer ' + accessToken,
        'Content-Type':  'application/json',
      },
      body: JSON.stringify([
        {
          op:    'replace',
          path:  '/purchase_units/@reference_id==\'default\'/amount',
          value: {
            currency_code: 'USD',
            value:         grandTotal,
            breakdown: {
              item_total: { currency_code: 'USD', value: itemTotalValue },
              shipping:   { currency_code: 'USD', value: shippingValue },
            },
          },
        },
      ]),
    });

    if (!patchRes.ok) {
      const body = await patchRes.json().catch(() => ({}));
      throw new Error(body.message || ('PayPal PATCH failed: ' + patchRes.status));
    }

    res.json({ ok: true, country, grandTotal, shippingValue });
  } catch (err) {
    console.error('[/patch-paypal-order]', err.message);
    res.status(500).json({ error: err.message });
  }
};
