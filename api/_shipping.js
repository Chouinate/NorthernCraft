'use strict';

/* ── Server-authoritative shipping rate catalogue ────────────────────────────
   Shared by create-checkout-session.js and create-paypal-order.js.

   Each item weighs 0.6 lb.
   US:     1 item = $7   |   2+ items = free
   Canada: weight-based (matches Google Merchant config)
     0.0–1.0 lb  (1 item)   = $12
     1.1–2.0 lbs (2–3 items) = $15
     2.1–3.0 lbs (4–5 items) = $19
     3.1–4.0 lbs (6 items)   = $26
     4.1+ lbs    (7+ items)  = $50
─────────────────────────────────────────────────────────────────────────── */
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

/**
 * Returns the shipping amount in cents for the given item count and country.
 * country must be 'US' or 'CA'; anything else is treated as 'US'.
 */
function shippingCents(itemCount, country) {
  return country === 'CA' ? canadaRateCents(itemCount) : usRateCents(itemCount);
}

module.exports = { usRateCents, canadaRateCents, shippingCents };
