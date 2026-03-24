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

  // ── Styles ──────────────────────────────────────────────────────────────────
  var CSS = [
    '.nc-pay-btn {',
    '  display: inline-block;',
    '  background: #5c3545;',
    '  color: #fff;',
    '  border: none;',
    '  cursor: pointer;',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px;',
    '  font-weight: 400;',
    '  letter-spacing: 0.2em;',
    '  text-transform: uppercase;',
    '  padding: 14px 28px;',
    '  transition: background 0.2s;',
    '}',
    '.nc-pay-btn:hover:not(:disabled) { background: #7b4f5c; }',
    '.nc-pay-btn:disabled { opacity: 0.6; cursor: default; }',

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

  // ── Init "Pay with Card" button ──────────────────────────────────────────────
  function _initButton() {
    var container = document.getElementById('checkout-buttons');
    if (!container) return;

    var btn = document.createElement('button');
    btn.className = 'nc-pay-btn';
    btn.textContent = 'Pay with Card';
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
    btn.textContent = 'Loading\u2026';

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
        btn.textContent = 'Pay with Card';
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
