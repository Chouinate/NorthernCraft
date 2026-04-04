/**
 * NorthernCraft Stripe Embedded Checkout
 *
 * Requires:
 *   1. Stripe.js loaded before this script:
 *      <script src="https://js.stripe.com/v3/"></script>
 *   2. cart.js loaded before this script (exposes getCart, clearCart, closeCart)
 *   3. Elements in your HTML:
 *      <div id="checkout-buttons"></div>        ← receives loading/error/success messages
 *      <div id="stripe-checkout-container"></div> ← Stripe embedded form mounts here
 *
 * The "More Ways to Pay" button renders inside .nc-cart-pay-area (the cart drawer).
 * Clicking it closes the cart, scrolls to #checkout, then launches the Stripe form.
 *
 * Optional — set before loading this script to point at your server:
 *   <script>window.STRIPE_SERVER_URL = 'http://localhost:3000';</script>
 */
(function () {
  'use strict';

  var PK = 'pk_test_51TEHZaChIqZnLnt9pV24fyuZswtM6AS2nmjoD6QvozIEbTnK4seeL7oDCLVQ8HfZXjFa5R5Dz70XG6QMWWurHgVA001V7OH0C9';
  var SERVER = (window.STRIPE_SERVER_URL || '').replace(/\/$/, '');

  // ── Payment method logos — symbol-only, ~14 px tall when rendered ─────────────
  var _LOGOS_HTML = [

    // Visa — "VISA" is the logo mark
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 34 18">' +
      '<rect width="34" height="18" rx="2" fill="#1A1F71"/>' +
      '<text x="4" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="900" font-size="11" fill="#fff" letter-spacing="1">VISA</text>' +
    '</svg>',

    // Mastercard — two overlapping circles
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 30 18">' +
      '<circle cx="10" cy="9" r="9" fill="#EB001B"/>' +
      '<circle cx="20" cy="9" r="9" fill="#F79E1B"/>' +
    '</svg>',

    // Amex — "AMEX" is the logo mark
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 36 18">' +
      '<rect width="36" height="18" rx="2" fill="#2E77BC"/>' +
      '<text x="3" y="13" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="700" font-size="10" fill="#fff" letter-spacing="0.3">AMEX</text>' +
    '</svg>',

    // Apple Pay — Apple logo only (no text), white on black
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18">' +
      '<rect width="14" height="18" rx="2" fill="#000"/>' +
      '<g transform="translate(-10,-1) scale(1.2)">' +
        '<path fill="#fff" d="M16.8 5.7c-.3-.4-.9-.7-1.5-.7-.7 0-1.1.4-1.6.4-.5 0-1-.4-1.6-.4' +
          '-.5 0-1.1.3-1.4.8-1.3 1.8-.3 5 1 6.7.4.6.8 1.2 1.4 1.2.5 0 .8-.3 1.4-.3.6 0' +
          ' .9.3 1.5.3.6 0 1-.6 1.4-1.2.4-.6.6-1.3.7-1.4 0 0-1.8-.7-1.8-2.5 0-1.6 1.3-2.3' +
          ' 1.3-2.4-.7-1-1.8-1-1.8-1zm-1.1-1.9c.5-.6.8-1.4.8-2.2-.5 0-1.2.4-1.6.9-.4.5-.8' +
          ' 1.3-.7 2 .5 0 1-.3 1.5-.7z"/>' +
      '</g>' +
    '</svg>',

    // Google Pay — "G" only in Google blue on white
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18">' +
      '<rect width="14" height="18" rx="2" fill="#fff" stroke="#e0e0e0" stroke-width="1"/>' +
      '<text x="2" y="14" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="700" font-size="13" fill="#4285F4">G</text>' +
    '</svg>',

    // Afterpay — "A" on mint
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18">' +
      '<rect width="14" height="18" rx="2" fill="#B2FCE4"/>' +
      '<text x="2" y="14" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="900" font-size="13" fill="#000">A</text>' +
    '</svg>',

    // Klarna — "K" on pink pill
    '<svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 14 18">' +
      '<rect width="14" height="18" rx="7" fill="#FFB3C7"/>' +
      '<text x="3" y="14" font-family="Arial,Helvetica,sans-serif"' +
        ' font-weight="900" font-size="13" fill="#000">K</text>' +
    '</svg>',

  ].join('');

  // ── Styles ──────────────────────────────────────────────────────────────────
  var CSS = [
    /* More Ways to Pay button — lives in .nc-cart-pay-area */
    '.nc-pay-btn {',
    '  display: block;',
    '  width: 100%;',
    '  background: #5c3545;',
    '  color: #fff;',
    '  border: none;',
    '  cursor: pointer;',
    '  padding: 12px 16px 10px;',
    '  transition: background 0.2s;',
    '  text-align: center;',
    '}',
    '.nc-pay-btn:hover:not(:disabled) { background: #7b4f5c; }',
    '.nc-pay-btn:disabled { opacity: 0.6; cursor: default; }',

    /* Logos row — on top */
    '.nc-pay-btn-logos {',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  flex-wrap: wrap;',
    '  gap: 4px;',
    '  margin-bottom: 8px;',
    '}',
    '.nc-pay-btn-logos svg { height: 14px; width: auto; display: block; }',

    /* Label — on bottom */
    '.nc-pay-btn-label {',
    '  display: block;',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 9px;',
    '  font-weight: 400;',
    '  letter-spacing: 0.2em;',
    '  text-transform: uppercase;',
    '}',

    /* Error shown in #checkout-buttons on the main page */
    '.nc-pay-error {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px;',
    '  letter-spacing: 0.12em;',
    '  color: #8f6070;',
    '  margin-top: 12px;',
    '}',

    /* Loading indicator shown in #checkout-buttons while session creates */
    '.nc-pay-loading {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 9px;',
    '  letter-spacing: 0.2em;',
    '  text-transform: uppercase;',
    '  color: #7a6f68;',
    '  margin-top: 8px;',
    '}',

    /* Thank-you shown in #checkout-buttons after Stripe redirect */
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

    /* ── Order-complete popup ── */
    '.nc-thankyou-overlay {',
    '  position: fixed; inset: 0; z-index: 10000;',
    '  background: rgba(30,24,22,0.85);',
    '  display: flex; align-items: center; justify-content: center;',
    '  padding: 20px;',
    '}',
    '.nc-thankyou-box {',
    '  background: #ece8e1;',
    '  width: 100%; max-width: 440px;',
    '  padding: 52px 40px 44px;',
    '  position: relative; text-align: center; border-radius: 2px;',
    '}',
    '.nc-thankyou-close {',
    '  position: absolute; top: 14px; right: 14px;',
    '  background: none; border: none; cursor: pointer;',
    '  font-size: 18px; line-height: 1; padding: 4px 8px;',
    '  color: #9e9098; transition: color 0.2s;',
    '}',
    '.nc-thankyou-close:hover { color: #2a2523; }',
    '.nc-thankyou-title {',
    '  font-family: "Cormorant Garamond", Georgia, serif;',
    '  font-size: 28px; font-weight: 400;',
    '  color: #2a2523; letter-spacing: 0.04em; margin: 0 0 16px;',
    '}',
    '.nc-thankyou-sub {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px; letter-spacing: 0.18em;',
    '  text-transform: uppercase; color: #7a6f68; margin: 0;',
    '}',
    '.nc-thankyou-contact {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 11px; letter-spacing: 0.06em;',
    '  color: #7a6f68; margin: 20px 0 0; padding-top: 16px;',
    '  border-top: 1px solid #d9d4cc;',
    '}',
    '.nc-thankyou-contact a {',
    '  color: #5c3545; text-decoration: none;',
    '}',
    '.nc-thankyou-contact a:hover { text-decoration: underline; }',

  ].join('\n');

  function _injectStyles() {
    var el = document.createElement('style');
    el.textContent = CSS;
    document.head.appendChild(el);
  }

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function _showOrderCompletePopup(email) {
    var existing = document.getElementById('nc-thankyou-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'nc-thankyou-overlay';
    overlay.className = 'nc-thankyou-overlay';

    var box = document.createElement('div');
    box.className = 'nc-thankyou-box';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'nc-thankyou-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&times;';
    closeBtn.addEventListener('click', function () { overlay.remove(); });

    var title = document.createElement('p');
    title.className = 'nc-thankyou-title';
    title.textContent = 'Thank you for your order!';

    var sub = document.createElement('p');
    sub.className = 'nc-thankyou-sub';
    sub.textContent = 'Confirmation will be sent to ' + (email || 'your email');

    var contact = document.createElement('p');
    contact.className = 'nc-thankyou-contact';
    contact.innerHTML = 'Questions? <a href="mailto:nate@northerncraftnh.com">nate@northerncraftnh.com</a>';

    box.appendChild(closeBtn);
    box.appendChild(title);
    box.appendChild(sub);
    box.appendChild(contact);
    overlay.appendChild(box);
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
  }
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

  // ── Init "More Ways to Pay" button (renders in the cart drawer) ──────────────
  function _initButton() {
    var payArea = document.querySelector('.nc-cart-pay-area');
    if (!payArea) return;

    var btn = document.createElement('button');
    btn.className = 'nc-pay-btn';
    btn.innerHTML =
      '<span class="nc-pay-btn-logos">' + _LOGOS_HTML + '</span>' +
      '<span class="nc-pay-btn-label">More Ways to Pay</span>';
    payArea.appendChild(btn);

    btn.addEventListener('click', function () {
      if (btn.disabled) return;

      // Close the cart drawer, then scroll to checkout on the main page.
      if (typeof window.closeCart === 'function') window.closeCart();
      var checkoutSection = document.getElementById('checkout');
      if (checkoutSection) checkoutSection.scrollIntoView({ behavior: 'smooth' });

      _startCheckout();
    });
  }

  // ── Start checkout (shows loading + mounts form in #checkout-buttons area) ───
  var _inFlight = false;

  function _startCheckout() {
    if (_inFlight) return;

    var pageContainer = document.getElementById('checkout-buttons');
    if (!pageContainer) return;

    _clearError(pageContainer);

    if (typeof window.getCart !== 'function') {
      _showError(pageContainer, 'Cart unavailable — please refresh the page.');
      return;
    }
    var items = window.getCart();
    if (!items || items.length === 0) {
      _showError(pageContainer, 'Your cart is empty.');
      return;
    }

    var itemCount = items.reduce(function(sum, i) {
      var qty = parseInt(i.quantity, 10) || 1;
      var bundleSize = (i.meta && i.meta.bundleCount) ? i.meta.bundleCount : 1;
      return sum + (qty * bundleSize);
    }, 0);
    if (typeof Stripe === 'undefined') {
      _showError(pageContainer, 'Payment system failed to load — please refresh.');
      return;
    }

    _inFlight = true;

    var loadingEl = document.createElement('p');
    loadingEl.className = 'nc-pay-loading';
    loadingEl.textContent = 'Loading checkout\u2026';
    pageContainer.appendChild(loadingEl);

    fetch(SERVER + '/create-checkout-session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ items: items, itemCount: itemCount, return_url: _buildReturnUrl() }),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || ('Server error ' + res.status));
          return data;
        });
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error);

        if (loadingEl.parentNode) loadingEl.remove();

        var checkoutContainer = document.getElementById('stripe-checkout-container');
        if (!checkoutContainer) {
          throw new Error('#stripe-checkout-container not found in page.');
        }

        var stripe = Stripe(PK);
        return stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret })
          .then(function (checkout) {
            checkout.mount('#stripe-checkout-container');
            _inFlight = false;
          });
      })
      .catch(function (err) {
        if (loadingEl.parentNode) loadingEl.remove();
        _showError(pageContainer, err.message || 'Something went wrong — please try again.');
        _inFlight = false;
      });
  }

  // ── Handle return after payment ──────────────────────────────────────────────
  function _handleReturn(sessionId) {
    var url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.toString());

    var checkoutContainer = document.getElementById('stripe-checkout-container');
    if (checkoutContainer) checkoutContainer.innerHTML = '';

    fetch(SERVER + '/session-status?session_id=' + encodeURIComponent(sessionId))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.status === 'complete') {
          if (typeof window.clearCart === 'function') window.clearCart();
          var email = data.customer_email || '';
          _showOrderCompletePopup(email);

        } else {
          var container = document.getElementById('checkout-buttons');
          if (!container) return;
          if (data.status === 'open') {
            _initButton();
          } else {
            _showError(container, 'Payment could not be confirmed. Please contact us.');
          }
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
