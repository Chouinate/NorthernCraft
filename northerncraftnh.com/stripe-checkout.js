/**
 * NorthernCraft Stripe Embedded Checkout
 *
 * Requires:
 *   1. Stripe.js loaded before this script:
 *      <script src="https://js.stripe.com/v3/"></script>
 *   2. cart.js loaded before this script (exposes getCart, clearCart)
 *   3. Elements in your HTML:
 *      <div id="checkout-buttons"></div>
 *      <div id="stripe-checkout-container"></div>
 *
 * Optional — set before loading this script to point at your server:
 *   <script>window.STRIPE_SERVER_URL = 'http://localhost:3000';</script>
 */
(function () {
  'use strict';

  var PK = 'pk_live_51TEHZaChIqZnLnt9FvtaiVA62udYtyrAP7Xlebh4w8iqGd4lhzI7xho6uSa806lT3GJUm1idP5BRIKjteqVdGJhx00gHoOw86G';
  var SERVER = (window.STRIPE_SERVER_URL || '').replace(/\/$/, '');

  // ── Payment method logos (inline SVG, aria-hidden, ~14 px tall when rendered) ──
  var _LOGOS_HTML = [

    // Visa
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 18">' +
      '<rect width="52" height="18" rx="2" fill="#1A1F71"/>' +
      '<text x="5" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="900" font-size="13" fill="#fff" letter-spacing="1.5">VISA</text>' +
    '</svg>',

    // Mastercard (two overlapping circles)
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 38 24">' +
      '<circle cx="14" cy="12" r="10" fill="#EB001B"/>' +
      '<circle cx="24" cy="12" r="10" fill="#F79E1B"/>' +
    '</svg>',

    // Amex
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 18">' +
      '<rect width="52" height="18" rx="2" fill="#2E77BC"/>' +
      '<text x="5" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="700" font-size="11" fill="#fff" letter-spacing="0.5">AMEX</text>' +
    '</svg>',

    // Apple Pay
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 74 18">' +
      '<rect width="74" height="18" rx="2" fill="#000"/>' +
      // Simplified Apple logo glyph (body + leaf)
      '<path fill="#fff" d="' +
        'M16.8 5.7c-.3-.4-.9-.7-1.5-.7-.7 0-1.1.4-1.6.4-.5 0-1-.4-1.6-.4-' +
        '.5 0-1.1.3-1.4.8-1.3 1.8-.3 5 1 6.7.4.6.8 1.2 1.4 1.2.5 0 .8-.3 1.4-.3.6 0 ' +
        '.9.3 1.5.3.6 0 1-.6 1.4-1.2.4-.6.6-1.3.7-1.4 0 0-1.8-.7-1.8-2.5 0-1.6 1.3-2.3 ' +
        '1.3-2.4-.7-1-1.8-1-1.8-1zm-1.1-1.9c.5-.6.8-1.4.8-2.2-.5 0-1.2.4-1.6.9-.4.5-.8 ' +
        '1.3-.7 2 .5 0 1-.3 1.5-.7z' +
      '"/>' +
      '<text x="22" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-size="11" fill="#fff">Apple Pay</text>' +
    '</svg>',

    // Google Pay
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 18">' +
      '<rect width="64" height="18" rx="2" fill="#fff" stroke="#e0e0e0" stroke-width="1"/>' +
      // Coloured G
      '<text x="6" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="700" font-size="11" fill="#4285F4">G</text>' +
      '<text x="16" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-size="11" fill="#5F6368">Pay</text>' +
    '</svg>',

    // Afterpay
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 72 18">' +
      '<rect width="72" height="18" rx="2" fill="#B2FCE4"/>' +
      '<text x="5" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="700" font-size="9" fill="#000" letter-spacing="0.4">afterpay</text>' +
    '</svg>',

    // Klarna
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 18">' +
      '<rect width="52" height="18" rx="9" fill="#FFB3C7"/>' +
      '<text x="9" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="700" font-size="10" fill="#000">Klarna</text>' +
    '</svg>',

  ].join('');

  // ── Styles ──────────────────────────────────────────────────────────────────
  var CSS = [
    '.nc-pay-btn {',
    '  display: block;',
    '  width: 100%;',
    '  max-width: 400px;',
    '  background: #5c3545;',
    '  color: #fff;',
    '  border: none;',
    '  cursor: pointer;',
    '  padding: 14px 20px 12px;',
    '  transition: background 0.2s;',
    '  text-align: center;',
    '}',
    '.nc-pay-btn:hover:not(:disabled) { background: #7b4f5c; }',
    '.nc-pay-btn:disabled { opacity: 0.6; cursor: default; }',
    '.nc-pay-btn-label {',
    '  display: block;',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px;',
    '  font-weight: 400;',
    '  letter-spacing: 0.2em;',
    '  text-transform: uppercase;',
    '  margin-bottom: 10px;',
    '}',
    '.nc-pay-btn-logos {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  flex-wrap: wrap;',
    '  gap: 5px;',
    '}',
    '.nc-pay-btn-logos svg { height: 14px; width: auto; display: block; }',

    '.nc-pay-error {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px;',
    '  letter-spacing: 0.12em;',
    '  color: #8f6070;',
    '  margin-top: 12px;',
    '}',

    '.nc-pay-success {',
    '  font-family: "Cormorant Garamond", Georgia, serif;',
    '  font-size: 22px;',
    '  font-weight: 400;',
    '  color: #2a2523;',
    '  letter-spacing: 0.04em;',
    '  margin: 0 0 8px;',
    '}',
    '.nc-pay-success-sub {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px;',
    '  letter-spacing: 0.18em;',
    '  text-transform: uppercase;',
    '  color: #7a6f68;',
    '  margin: 0;',
    '}',

    '#stripe-checkout-container { margin-top: 24px; }',
  ].join('\n');

  function _injectStyles() {
    var el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function _buildReturnUrl() {
    var base = window.location.origin + window.location.pathname;
    var qs = new URLSearchParams(window.location.search);
    qs.delete('session_id');
    var prefix = qs.toString() ? '?' + qs.toString() + '&' : '?';
    return base + prefix + 'session_id={CHECKOUT_SESSION_ID}';
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _showError(container, msg) {
    var existing = container.querySelector('.nc-pay-error');
    if (!existing) {
      existing = document.createElement('p');
      existing.className = 'nc-pay-error';
      container.appendChild(existing);
    }
    existing.textContent = msg;
  }

  function _clearError(container) {
    var el = container.querySelector('.nc-pay-error');
    if (el) el.remove();
  }

  // ── Init "More Ways to Pay" button ───────────────────────────────────────────
  function _initButton() {
    var container = document.getElementById('checkout-buttons');
    if (!container) return;

    var btn = document.createElement('button');
    btn.className = 'nc-pay-btn';
    btn.style.marginTop = '12px';
    btn.innerHTML =
      '<span class="nc-pay-btn-label">More Ways to Pay</span>' +
      '<span class="nc-pay-btn-logos">' + _LOGOS_HTML + '</span>';
    container.appendChild(btn);

    btn.addEventListener('click', function () {
      _clearError(container);
      _startCheckout(btn, container);
    });
  }

  // ── Start checkout ───────────────────────────────────────────────────────────
  function _startCheckout(btn, container) {
    if (typeof window.getCart !== 'function') {
      _showError(container, 'Cart unavailable — please refresh the page.');
      return;
    }
    var items = window.getCart();
    if (!items || items.length === 0) {
      _showError(container, 'Your cart is empty.');
      return;
    }
    if (typeof Stripe === 'undefined') {
      _showError(container, 'Payment system failed to load — please refresh.');
      return;
    }

    btn.disabled = true;
    btn.querySelector('.nc-pay-btn-label').textContent = 'Loading\u2026';

    fetch(SERVER + '/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items, return_url: _buildReturnUrl() }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || ('Server error ' + res.status));
          return data;
        });
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error);

        var checkoutContainer = document.getElementById('stripe-checkout-container');
        if (!checkoutContainer) {
          throw new Error('#stripe-checkout-container not found in page.');
        }

        var stripe = Stripe(PK);
        return stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret })
          .then(function (checkout) {
            btn.style.display = 'none';
            checkout.mount('#stripe-checkout-container');
          });
      })
      .catch(function (err) {
        _showError(container, err.message || 'Something went wrong — please try again.');
        btn.disabled = false;
        btn.querySelector('.nc-pay-btn-label').textContent = 'More Ways to Pay';
      });
  }

  // ── Handle return after payment ──────────────────────────────────────────────
  function _handleReturn(sessionId) {
    // Clean session_id from URL immediately (no page reload)
    var url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.toString());

    var checkoutContainer = document.getElementById('stripe-checkout-container');
    if (checkoutContainer) checkoutContainer.innerHTML = '';

    fetch(SERVER + '/session-status?session_id=' + encodeURIComponent(sessionId))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var container = document.getElementById('checkout-buttons');
        if (!container) return;

        if (data.status === 'complete') {
          if (typeof window.clearCart === 'function') window.clearCart();
          var email = data.customer_email ? _esc(data.customer_email) : 'your email';
          container.innerHTML =
            '<p class="nc-pay-success">Thank you for your order!</p>' +
            '<p class="nc-pay-success-sub">Confirmation will be sent to ' + email + '</p>';

        } else if (data.status === 'open') {
          // Customer returned without completing payment — restore button
          _initButton();
        } else {
          _showError(container, 'Payment could not be confirmed. Please contact us.');
        }
      })
      .catch(function () {
        var container = document.getElementById('checkout-buttons');
        if (container) _showError(container, 'Could not verify payment. Please contact us.');
      });
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  _injectStyles();

  var sessionId = new URLSearchParams(window.location.search).get('session_id');

  function _boot() {
    if (sessionId) {
      _handleReturn(sessionId);
    } else {
      _initButton();
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

})();
