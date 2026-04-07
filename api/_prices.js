'use strict';

/* ── Server-authoritative price catalogue ────────────────────────────────────
   Shared by create-checkout-session.js and create-paypal-order.js.
   Prices are NEVER sourced from the client request.

   Single tiles: every product is $35.
   Bundles:      price is index-based on tile count.
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

module.exports = { SINGLE_PRICE_CENTS, BUNDLE_PRICE_MAP_CENTS, KNOWN_PRODUCT_IDS, canonicalUnitAmountCents };
