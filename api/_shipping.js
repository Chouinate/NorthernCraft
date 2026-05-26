'use strict';

/* ── Server-authoritative shipping rate catalogue ────────────────────────────
   Shared by create-checkout-session.js, create-paypal-order.js,
   and patch-paypal-order.js.

   Each item is billed at 1.0 lb (conservative; covers packaging weight).
   Rates are set ~5% above typical PirateShip commercial USPS rates.
   Verify periodically at https://app.pirateship.com/get-rates

   US:   1 item = $7  |  2+ items = free shipping
   CA:   weight-based tiers (USPS First Class Package International)
   EU:   UK + Europe, weight-based tiers
   AP:   Australia, NZ, Japan, Korea, Singapore, HK, Taiwan, SE Asia
   INTL: Rest of world
─────────────────────────────────────────────────────────────────────────── */

const ITEM_WEIGHT_LB = 1.0;

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

function canadaRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 1200;
  if (w <= 2.0) return 1500;
  if (w <= 3.0) return 1900;
  if (w <= 4.0) return 2600;
  return 5000;
}

// UK + Europe — USPS FCPI commercial × ~1.05
// 5+ lb shifts to Priority Mail International
function euRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 1800;
  if (w <= 2.0) return 2300;
  if (w <= 3.0) return 2800;
  if (w <= 4.0) return 3300;
  return 5500;
}

// Asia-Pacific — USPS FCPI commercial × ~1.05
function apRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 2100;
  if (w <= 2.0) return 2600;
  if (w <= 3.0) return 3200;
  if (w <= 4.0) return 3800;
  return 6200;
}

// Rest of world — USPS FCPI commercial × ~1.05
function intlRateCents(itemCount) {
  const w = itemCount * ITEM_WEIGHT_LB;
  if (w <= 1.0) return 2300;
  if (w <= 2.0) return 2900;
  if (w <= 3.0) return 3500;
  if (w <= 4.0) return 4100;
  return 6500;
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
