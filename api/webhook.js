'use strict';
/**
 * Stripe webhook — order notifications
 *
 * Required environment variables (set in Vercel dashboard):
 *   STRIPE_SECRET_KEY       — Stripe secret key
 *   STRIPE_WEBHOOK_SECRET   — from Stripe Dashboard → Webhooks → signing secret
 *   GMAIL_USER              — northerncraftnh@gmail.com
 *   GMAIL_APP_PASSWORD      — Gmail App Password
 *   NOTIFY_EMAIL            — nate@northerncraftnh.com
 *
 * Register this endpoint in Stripe Dashboard → Webhooks:
 *   URL: https://northerncraftnh.vercel.app/api/webhook
 *   Event: checkout.session.completed
 */

const Stripe     = require('stripe');
const nodemailer = require('nodemailer');

// Vercel: disable built-in body parser so we get the raw body for Stripe signature check
module.exports.config = { api: { bodyParser: false } };

async function getRawBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on('data', chunk => chunks.push(chunk));
    req.on('end',  () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

function formatAddress(addr) {
  if (!addr) return 'Not provided';
  return [addr.line1, addr.line2, addr.city, addr.state, addr.postal_code, addr.country]
    .filter(Boolean).join(', ');
}

function formatMoney(cents) {
  return '$' + (cents / 100).toFixed(2);
}

async function sendOrderEmail(session) {
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  const customer  = session.customer_details  || {};
  const shipping  = session.shipping_details  || {};
  const lineItems = session.line_items?.data   || [];

  const itemRows = lineItems.map(li =>
    `  • ${li.description || li.price?.product_data?.name || 'Item'} x${li.quantity}  ${formatMoney(li.amount_total)}`
  ).join('\n');

  const shippingRate = session.shipping_cost
    ? `${session.shipping_cost.shipping_rate_details?.display_name || 'Shipping'}  ${formatMoney(session.shipping_cost.amount_total)}`
    : 'N/A';

  const body = [
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    'NEW ORDER — Northern Craft NH',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
    '',
    `Session:  ${session.id}`,
    `Total:    ${formatMoney(session.amount_total)}`,
    '',
    '── Customer ──────────────────────────',
    `Name:   ${customer.name  || 'N/A'}`,
    `Email:  ${customer.email || 'N/A'}`,
    '',
    '── Ship to ───────────────────────────',
    `Name:    ${shipping.name || customer.name || 'N/A'}`,
    `Address: ${formatAddress(shipping.address)}`,
    '',
    '── Items ─────────────────────────────',
    itemRows || '  (expand line_items in webhook handler)',
    '',
    '── Shipping ──────────────────────────',
    `  ${shippingRate}`,
    '',
    '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
  ].join('\n');

  await transporter.sendMail({
    from:    `"Northern Craft NH" <${process.env.GMAIL_USER}>`,
    to:      process.env.NOTIFY_EMAIL,
    subject: `New Order — ${customer.name || customer.email || session.id}`,
    text:    body,
  });
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') return res.status(405).end();

  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  const rawBody = await getRawBody(req);
  const sig     = req.headers['stripe-signature'];

  let event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, sig, process.env.STRIPE_WEBHOOK_SECRET);
  } catch (err) {
    console.error('[webhook] signature verification failed:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === 'checkout.session.completed') {
    try {
      // Expand line_items to get item details in the notification
      const session = await stripe.checkout.sessions.retrieve(event.data.object.id, {
        expand: ['line_items', 'shipping_cost.shipping_rate'],
      });

      await sendOrderEmail(session);
      console.log('[webhook] order notification sent for', session.id);
    } catch (err) {
      // Don't return 500 — Stripe would retry. Log and move on.
      console.error('[webhook] failed to send notification:', err.message);
    }
  }

  res.json({ received: true });
};
