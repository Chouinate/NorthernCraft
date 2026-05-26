'use strict';

/**
 * GET /api/geo
 *
 * Returns the visitor's ISO 3166-1 alpha-2 country code (e.g. 'US', 'GB', 'AU').
 * Falls back to 'US' on localhost (header absent) or if the header is malformed.
 *
 * Detection relies on Vercel's built-in x-vercel-ip-country header (no cost,
 * no external API).
 */
module.exports = (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Cache-Control', 'private, no-store');

  const raw     = req.headers['x-vercel-ip-country'];
  const isLocal = !raw;
  const country = isLocal
    ? 'US'
    : (String(raw).toUpperCase().match(/^[A-Z]{2}$/) ? String(raw).toUpperCase() : 'US');

  res.status(200).json({ country });
};
