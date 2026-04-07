'use strict';

/**
 * GET /api/geo
 *
 * Returns the visitor's country as one of three values:
 *   'US'    — United States
 *   'CA'    — Canada
 *   'OTHER' — anywhere else
 *
 * Detection relies on Vercel's built-in x-vercel-ip-country header (no cost,
 * no external API).  On localhost the header is absent; we return 'US' only
 * in that case so local development works without special configuration.
 */
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'private, no-store');

  const raw     = req.headers['x-vercel-ip-country'];
  const isLocal = !raw; // header absent → running on localhost
  const code    = isLocal ? 'US' : String(raw).toUpperCase();

  let country;
  if (code === 'US') {
    country = 'US';
  } else if (code === 'CA') {
    country = 'CA';
  } else {
    country = 'OTHER';
  }

  res.status(200).json({ country });
};
