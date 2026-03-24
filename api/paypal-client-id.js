'use strict';

module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'GET') return res.status(405).json({ error: 'Method not allowed.' });

  const clientId = process.env.PAYPAL_CLIENT_ID;
  if (!clientId) {
    return res.status(500).json({ error: 'PAYPAL_CLIENT_ID is not set on the server.' });
  }
  res.json({ clientId });
};
