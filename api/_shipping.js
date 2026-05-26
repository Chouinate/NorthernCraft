'use strict';

/* ── Server-authoritative shipping rate catalogue ────────────────────────────
   Shared by create-checkout-session.js, create-paypal-order.js,
   and patch-paypal-order.js.

   Each frame weighs ~0.5 lb packaged (frame + insert + mailer/padding).
   Rates are set ~5% above typical PirateShip commercial USPS rates.
   USPS First Class Package International max: 4.4 lb (≤ 8 items).
   Above that, Priority Mail International applies (9–12 items).
   Verify heavy tiers (≤6 lb, >6 lb) at https://app.pirateship.com/get-rates

   US:   1 item = $7  |  2+ items = free shipping
   CA:   weight-based tiers (USPS FCPI / PMI)
   EU:   UK + Europe, weight-based tiers
   AP:   Australia, NZ, Japan, Korea, Singapore, HK, Taiwan, SE Asia
   INTL: Rest of world

   Weight → item count (0.5 lb each):
     ≤1.0 lb = 1–2 items   FCPI (cheap)
     ≤2.0 lb = 3–4 items   FCPI
     ≤3.0 lb = 5–6 items   FCPI
     ≤4.0 lb = 7–8 items   FCPI (last tier before PMI)
     ≤6.0 lb = 9–12 items  PMI  (verify on PirateShip)
     >6.0 lb = 13+ items   PMI heavy
─────────────────────────────────────────────────────────────────────────── */

const ITEM_WEIGHT_LB = 0.5;

const EU_COUNTRIES = new Set([
  'GB','IE','FR','DE','IT','ES','PT','NL','BE','AT','CH','LU',
  'SE','NO','DK','FI','IS','LI',
  'PL','CZ','SK','HU','RO','BG','HR','SI','EE','LV','LT','MT','CY',
  'GR','AL','RS','BA','ME','MK','MD','UA',
  'AD','MC','SM',
]);

const AP_COUNTRIES = new Set([
  'AU','NZ','JP','KR','SG','HK','TW','MO',
  'MY','TH','PH','ID','VN',
]);

const INTL_COUNTRIES = new Set([
  'MX','BR','AR','CL','CO','PE','UY','PY','EC','BO','GT','CR','PA',
  'DO','JM','TT','BB','BS','NI','HN','SV','HT',
  'ZA','NG','KE','GH','TZ','UG','MA','EG','CI',
  'IL','AE','SA','QA','KW','BH','OM','JO','LB','TR',
  'IN','PK','BD','LK','NP',
]);

// Full list passed to Stripe shipping_address_collection.allowed_countries
const ALLOWED_COUNTRIES = [
  'US', 'CA',
  ...EU_COUNTRIES,
  ...AP_COUNTRIES,
  ...INTL_COUNTRIES,
];

function countryToZone(code) {
  if (!code || code === 'US') return 'US';
  if (code === 'CA')           return 'CA';
  if (EU_COUNTRIES.has(code))  return 'EU';
  if (AP_COUNTRIES.has(code))  return 'AP';
  return 'INTL';
}

function usRateCents(itemCount) {
  return itemCount >= 2 ? 0 : 700;
}

// Canada — USPS FCPI (1–8 items), PMI for 9+
function canadaRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 1200;  // 1–2 items
  if (w <= 2.0) return 1500;  // 3–4 items
  if (w <= 3.0) return 1900;  // 5–6 items
  if (w <= 4.0) return 2600;  // 7–8 items
  if (w <= 6.0) return 5000;  // 9–12 items (PMI — verify on PirateShip)
  return 7000;                 // 13+ items
}

// UK + Europe — USPS FCPI (1–8 items), PMI for 9+
function euRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 1900;  // 1–2 items
  if (w <= 2.0) return 2300;  // 3–4 items
  if (w <= 3.0) return 2700;  // 5–6 items
  if (w <= 4.0) return 3200;  // 7–8 items  (last FCPI tier)
  if (w <= 6.0) return 6500;  // 9–12 items (PMI — verify on PirateShip)
  return 8500;                 // 13+ items
}

// Asia-Pacific — USPS FCPI (1–8 items), PMI for 9+
function apRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 2000;  // 1–2 items
  if (w <= 2.0) return 2500;  // 3–4 items
  if (w <= 3.0) return 3000;  // 5–6 items
  if (w <= 4.0) return 3600;  // 7–8 items  (last FCPI tier)
  if (w <= 6.0) return 8000;  // 9–12 items (PMI — verify on PirateShip)
  return 10000;                // 13+ items
}

// Rest of world — USPS FCPI (1–8 items), PMI for 9+
function intlRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 2200;  // 1–2 items
  if (w <= 2.0) return 2700;  // 3–4 items
  if (w <= 3.0) return 3300;  // 5–6 items
  if (w <= 4.0) return 3900;  // 7–8 items  (last FCPI tier)
  if (w <= 6.0) return 9000;  // 9–12 items (PMI — verify on PirateShip)
  return 11000;                // 13+ items
}

function shippingCents(itemCount, countryCode) {
  switch (countryToZone(countryCode)) {
    case 'CA':   return canadaRateCents(itemCount);
    case 'EU':   return euRateCents(itemCount);
    case 'AP':   return apRateCents(itemCount);
    case 'INTL': return intlRateCents(itemCount);
    default:     return usRateCents(itemCount);
  }
}

module.exports = { usRateCents, canadaRateCents, shippingCents, countryToZone, ALLOWED_COUNTRIES };
