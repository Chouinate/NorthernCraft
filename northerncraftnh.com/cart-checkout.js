/**
 * NorthernCraft Cart Checkout
 *
 * Renders four payment options inside the cart drawer's .nc-cart-pay-area:
 *
 *   PayPal  — PayPal SDK button (popup flow, no page redirect)
 *   Klarna  — Stripe embedded checkout  (payment_method_types: ['klarna'])
 *   Afterpay — Stripe embedded checkout (payment_method_types: ['afterpay_clearpay'])
 *   Card    — Stripe embedded checkout  (payment_method_types: ['card'])
 *
 * On Stripe approval the embedded form redirects back with ?session_id=…;
 * this script handles that return and shows the thank-you message.
 *
 * Requires (loaded before this script):
 *   cart.js  — exposes getCart(), getCartTotal(), clearCart(),
 *               openCart(), closeCart()
 *
 * Optional — set before loading to point at your server:
 *   <script>window.STRIPE_SERVER_URL = 'http://localhost:3000';</script>
 */
(function () {
  'use strict';

  var SERVER     = (window.STRIPE_SERVER_URL || '').replace(/\/$/, '');
  var STRIPE_PK  = 'pk_live_51TEHZaChIqZnLnt9FvtaiVA62udYtyrAP7Xlebh4w8iqGd4lhzI7xho6uSa806lT3GJUm1idP5BRIKjteqVdGJhx00gHoOw86G';

  // ── Styles ──────────────────────────────────────────────────────────────────
  var CSS = [

    /* PayPal button wrapper */
    '#nc-cart-paypal-btn { margin-bottom: 14px; }',

    /* "or pay with" divider */
    '.nc-cart-pay-divider {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 12px;',
    '  margin-bottom: 12px;',
    '  color: #9e9098;',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 9px;',
    '  letter-spacing: 0.22em;',
    '  text-transform: uppercase;',
    '}',
    '.nc-cart-pay-divider::before,',
    '.nc-cart-pay-divider::after {',
    '  content: "";',
    '  flex: 1;',
    '  height: 1px;',
    '  background: #d9d4cc;',
    '}',

    /* Stripe method buttons row */
    '.nc-cart-method-row {',
    '  display: grid;',
    '  grid-template-columns: repeat(3, 1fr);',
    '  gap: 8px;',
    '}',
    '.nc-cart-method-btn {',
    '  background: #fff;',
    '  border: 1px solid #cbc5bc;',
    '  cursor: pointer;',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 9px;',
    '  font-weight: 500;',
    '  letter-spacing: 0.14em;',
    '  text-transform: uppercase;',
    '  color: #2a2523;',
    '  padding: 11px 6px;',
    '  transition: border-color 0.2s, color 0.2s, background 0.2s;',
    '  white-space: nowrap;',
    '}',
    '.nc-cart-method-btn:hover:not(:disabled) {',
    '  border-color: #5c3545;',
    '  color: #5c3545;',
    '}',
    '.nc-cart-method-btn:disabled { opacity: 0.55; cursor: default; }',

    /* Stripe container — hidden until needed */
    '#stripe-checkout-container:empty { display: none; }',

    /* Thank-you styles (mirrors paypal-checkout.js; harmless duplicate) */
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
    '.nc-pay-error {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px;',
    '  letter-spacing: 0.12em;',
    '  color: #8f6070;',
    '  margin-top: 12px;',
    '}',

    /* ── Modal overlay ── */
    '.nc-stripe-modal {',
    '  position: fixed; inset: 0; z-index: 9999;',
    '  background: rgba(30,24,22,0.65);',
    '  display: flex; align-items: center; justify-content: center;',
    '  padding: 20px;',
    '}',
    '.nc-stripe-modal-inner {',
    '  background: #fff;',
    '  width: 100%; max-width: 540px; max-height: 92vh;',
    '  overflow-y: auto; position: relative;',
    '  padding: 52px 20px 28px; border-radius: 2px;',
    '}',
    '.nc-stripe-modal-close {',
    '  position: absolute; top: 14px; right: 14px;',
    '  background: none; border: none; cursor: pointer;',
    '  font-size: 18px; line-height: 1; padding: 4px 8px;',
    '  color: #9e9098;',
    '}',
    '.nc-stripe-modal-close:hover { color: #2a2523; }',

    /* ── Single checkout button ── */
    '.nc-cart-checkout-btn {',
    '  display: block; width: 100%;',
    '  background: #2a2523; color: #fff; border: none; cursor: pointer;',
    '  font-family: "Montserrat", sans-serif; font-size: 10px; font-weight: 600;',
    '  letter-spacing: 0.22em; text-transform: uppercase;',
    '  padding: 15px 20px; transition: background 0.2s;',
    '}',
    '.nc-cart-checkout-btn:hover:not(:disabled) { background: #5c3545; }',
    '.nc-cart-checkout-btn:disabled { opacity: 0.55; cursor: default; }',

    /* ── Payment brand icons row ── */
    '.nc-cart-pay-badges {',
    '  display: flex; flex-wrap: wrap; gap: 5px;',
    '  margin-top: 10px; justify-content: center; align-items: center;',
    '}',

  ].join('\n');

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  function _showCartError(msg) {
    var el = document.querySelector('.nc-cart-footer .nc-cart-checkout-error');
    if (el) { el.textContent = msg; el.style.display = ''; }
  }

  function _clearCartError() {
    var el = document.querySelector('.nc-cart-footer .nc-cart-checkout-error');
    if (el) el.style.display = 'none';
  }

  function _buildReturnUrl() {
    var base   = window.location.origin + window.location.pathname;
    var qs     = new URLSearchParams(window.location.search);
    qs.delete('session_id');
    var prefix = qs.toString() ? '?' + qs.toString() + '&' : '?';
    return base + prefix + 'session_id={CHECKOUT_SESSION_ID}';
  }

  // ── Checkout modal ───────────────────────────────────────────────────────────
  function _openCheckoutModal() {
    var existing = document.getElementById('nc-stripe-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'nc-stripe-modal';
    modal.className = 'nc-stripe-modal';

    var inner = document.createElement('div');
    inner.className = 'nc-stripe-modal-inner';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'nc-stripe-modal-close';
    closeBtn.setAttribute('aria-label', 'Close checkout');
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.addEventListener('click', _closeCheckoutModal);

    var container = document.createElement('div');
    container.id = 'stripe-checkout-container';

    inner.appendChild(closeBtn);
    inner.appendChild(container);
    modal.appendChild(inner);

    modal.addEventListener('click', function (e) {
      if (e.target === modal) _closeCheckoutModal();
    });

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
  }

  function _closeCheckoutModal() {
    if (_activeCheckout) {
      _activeCheckout.destroy();
      _activeCheckout = null;
    }
    var modal = document.getElementById('nc-stripe-modal');
    if (modal) modal.remove();
    document.body.style.overflow = '';
  }

  // ── SDK loaders ─────────────────────────────────────────────────────────────
  function _loadStripe() {
    return new Promise(function (resolve, reject) {
      if (typeof Stripe !== 'undefined') { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://js.stripe.com/v3/';
      s.onload  = resolve;
      s.onerror = function () { reject(new Error('Stripe.js failed to load.')); };
      document.head.appendChild(s);
    });
  }

  function _loadPayPal(clientId) {
    return new Promise(function (resolve, reject) {
      if (typeof paypal !== 'undefined') { resolve(); return; }
      var s = document.createElement('script');
      s.src = 'https://www.paypal.com/sdk/js'
            + '?client-id=' + encodeURIComponent(clientId)
            + '&currency=USD&intent=capture'
            + '&disable-funding=paylater,card,credit';
      s.onload  = resolve;
      s.onerror = function () { reject(new Error('PayPal SDK failed to load.')); };
      document.head.appendChild(s);
    });
  }

  // ── Stripe return handler (runs on page load if ?session_id present) ─────────
  function _handleStripeReturn(sessionId) {
    // Remove session_id from URL without reloading
    var url = new URL(window.location.href);
    url.searchParams.delete('session_id');
    window.history.replaceState({}, '', url.toString());

    var stripeContainer = document.getElementById('stripe-checkout-container');
    if (stripeContainer) stripeContainer.innerHTML = '';

    fetch(SERVER + '/session-status?session_id=' + encodeURIComponent(sessionId))
      .then(function (res) { return res.json(); })
      .then(function (data) {
        var btnsEl = document.getElementById('checkout-buttons');
        if (!btnsEl) return;

        if (data.status === 'complete') {
          if (typeof window.clearCart === 'function') window.clearCart();
          var email = data.customer_email ? _esc(data.customer_email) : 'your email';
          btnsEl.innerHTML =
            '<p class="nc-pay-success">Thank you for your order!</p>' +
            '<p class="nc-pay-success-sub">Confirmation will be sent to ' + email + '</p>';

          var checkoutEl = document.getElementById('checkout');
          if (checkoutEl) {
            checkoutEl.style.display = '';
            checkoutEl.scrollIntoView({ behavior: 'smooth' });
          }

        } else if (data.status === 'open') {
          // User returned without paying — nothing to show; cart is still intact
        } else {
          var p = document.createElement('p');
          p.className = 'nc-pay-error';
          p.textContent = 'Payment could not be confirmed. Please contact us.';
          btnsEl.appendChild(p);
        }
      })
      .catch(function () {
        var btnsEl = document.getElementById('checkout-buttons');
        if (!btnsEl) return;
        var p = document.createElement('p');
        p.className = 'nc-pay-error';
        p.textContent = 'Could not verify payment. Please contact us.';
        btnsEl.appendChild(p);
      });
  }

  // ── Stripe checkout flow ─────────────────────────────────────────────────────
  var _activeCheckout = null;

  function _startStripeCheckout(methodTypes, btnEl, btnLabel) {
    _clearCartError();

    var items = typeof window.getCart === 'function' ? window.getCart() : [];
    if (!items.length) {
      _showCartError('Your cart is empty.');
      return;
    }

    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '\u2026'; }

    var body = {
      items:      items,
      return_url: _buildReturnUrl(),
    };
    if (methodTypes) body.payment_method_types = methodTypes;

    fetch(SERVER + '/create-checkout-session', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify(body),
    })
      .then(function (res) {
        return res.json().then(function (data) {
          if (!res.ok) throw new Error(data.error || ('Server error ' + res.status));
          return data;
        });
      })
      .then(function (data) {
        if (data.error) throw new Error(data.error);

        // Init Stripe first — only open the modal once the form is ready
        var stripe = Stripe(STRIPE_PK);
        return stripe.initEmbeddedCheckout({ clientSecret: data.clientSecret })
          .then(function (checkout) {
            _openCheckoutModal();
            if (typeof window.closeCart === 'function') window.closeCart();

            var container = document.getElementById('stripe-checkout-container');
            if (!container) throw new Error('#stripe-checkout-container not found.');

            _activeCheckout = checkout;
            checkout.mount('#stripe-checkout-container');
            if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnLabel; }
          });
      })
      .catch(function (err) {
        console.error('[cart-checkout/stripe]', err.message);
        _closeCheckoutModal();
        if (btnEl) { btnEl.disabled = false; btnEl.textContent = btnLabel; }
        _showCartError(err.message || 'Something went wrong. Please try again.');
      });
  }

  // ── Render payment options ───────────────────────────────────────────────────
  function _renderPaymentOptions(payArea, hasPayPal, hasStripe) {
    // PayPal button (rendered by SDK)
    if (hasPayPal) {
      var paypalWrap = document.createElement('div');
      paypalWrap.id = 'nc-cart-paypal-btn';
      payArea.appendChild(paypalWrap);

      paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'paypal', height: 42 },

        createOrder: function (data, actions) {
          _clearCartError();
          var items = typeof window.getCart      === 'function' ? window.getCart()      : [];
          var total = typeof window.getCartTotal === 'function' ? window.getCartTotal() : 0;

          if (!items.length) return Promise.reject(new Error('Cart is empty.'));

          var itemTotal = 0;
          var lineItems = items.map(function (item) {
            var unit = Math.round(Number(item.price) * 100) / 100;
            var qty  = Math.max(1, parseInt(item.quantity, 10) || 1);
            itemTotal += unit * qty;
            return {
              name:        String(item.name).substring(0, 127),
              unit_amount: { currency_code: 'USD', value: unit.toFixed(2) },
              quantity:    String(qty),
            };
          });
          var orderTotal = (Math.round(itemTotal * 100) / 100).toFixed(2);

          return actions.order.create({
            purchase_units: [{
              amount: {
                currency_code: 'USD',
                value: orderTotal,
                breakdown: { item_total: { currency_code: 'USD', value: orderTotal } },
              },
              items: lineItems,
            }],
          });
        },

        onApprove: function (data, actions) {
          return actions.order.capture().then(function (details) {
            var email = details.payer && details.payer.email_address
              ? details.payer.email_address : '';
            if (typeof window.clearCart  === 'function') window.clearCart();
            if (typeof window.closeCart  === 'function') window.closeCart();

            // Show thank-you in the on-page checkout area
            var btnsEl = document.getElementById('checkout-buttons');
            var checkoutEl = document.getElementById('checkout');
            if (checkoutEl) {
              checkoutEl.style.padding = '80px 56px';
              checkoutEl.scrollIntoView({ behavior: 'smooth' });
            }
            if (btnsEl) {
              btnsEl.innerHTML =
                '<p class="nc-pay-success">Thank you for your order!</p>' +
                '<p class="nc-pay-success-sub">Confirmation will be sent to ' +
                _esc(email || 'your email') + '</p>';
            }
          });
        },

        onCancel: function () {
          _showCartError('Payment cancelled \u2014 your cart is saved.');
        },

        onError: function (err) {
          console.error('[cart-checkout/paypal]', err);
          _showCartError('PayPal payment failed. Please try again or choose another method.');
        },

      }).render('#nc-cart-paypal-btn');
    }

    // Divider + single checkout button
    if (hasStripe) {
      if (hasPayPal) {
        var divider = document.createElement('div');
        divider.className = 'nc-cart-pay-divider';
        divider.textContent = 'or pay with card';
        payArea.appendChild(divider);
      }

      var btn = document.createElement('button');
      btn.className = 'nc-cart-checkout-btn';
      btn.textContent = 'Checkout Securely';
      btn.addEventListener('click', function () {
        // null = no method restriction; Stripe shows all enabled methods
        _startStripeCheckout(null, btn, 'Checkout Securely');
      });
      payArea.appendChild(btn);

      // Payment brand icons
      var badges = document.createElement('div');
      badges.className = 'nc-cart-pay-badges';
      badges.innerHTML =
        // Visa
        '<svg width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" aria-label="Visa">' +
          '<rect width="38" height="24" rx="3" fill="#1a1f71"/>' +
          '<text x="19" y="17" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="11" font-weight="bold" font-style="italic">VISA</text>' +
        '</svg>' +
        // Mastercard
        '<svg width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" aria-label="Mastercard">' +
          '<rect width="38" height="24" rx="3" fill="#f2f2f2"/>' +
          '<circle cx="15" cy="12" r="7" fill="#eb001b"/>' +
          '<circle cx="23" cy="12" r="7" fill="#f79e1b"/>' +
          '<path d="M19 6.8a7 7 0 0 1 0 10.4A7 7 0 0 1 19 6.8z" fill="#ff5f00"/>' +
        '</svg>' +
        // Amex
        '<svg width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" aria-label="American Express">' +
          '<rect width="38" height="24" rx="3" fill="#016fcf"/>' +
          '<text x="19" y="16" text-anchor="middle" fill="#fff" font-family="Arial,sans-serif" font-size="8" font-weight="bold" letter-spacing="0.5">AMEX</text>' +
        '</svg>' +
        // Klarna
        '<svg width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" aria-label="Klarna">' +
          '<rect width="38" height="24" rx="3" fill="#ffb3c7"/>' +
          '<text x="19" y="17" text-anchor="middle" fill="#000" font-family="Arial,sans-serif" font-size="12" font-weight="bold">K</text>' +
        '</svg>' +
        // Afterpay
        '<svg width="38" height="24" viewBox="0 0 38 24" xmlns="http://www.w3.org/2000/svg" aria-label="Afterpay">' +
          '<rect width="38" height="24" rx="3" fill="#b2fce4"/>' +
          '<text x="19" y="15" text-anchor="middle" fill="#000" font-family="Arial,sans-serif" font-size="5.5" font-weight="bold" letter-spacing="0.3">AFTERPAY</text>' +
        '</svg>';
      payArea.appendChild(badges);
    }

  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  function _init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Handle Stripe redirect return
    var sessionId = new URLSearchParams(window.location.search).get('session_id');
    if (sessionId) _handleStripeReturn(sessionId);

    var payArea = document.querySelector('.nc-cart-pay-area');
    if (!payArea) return;

    // Load Stripe and PayPal in parallel; degrade gracefully if either fails
    var stripeReady  = _loadStripe().then(function () { return true; })
                                    .catch(function () { return false; });
    var paypalReady  = (function () {
      if (window.PAYPAL_CLIENT_ID) {
        return _loadPayPal(window.PAYPAL_CLIENT_ID)
          .then(function () { return true; })
          .catch(function (e) { console.warn('[cart-checkout/paypal]', e.message); return false; });
      }
      return fetch(SERVER + '/paypal-client-id')
        .then(function (r) { return r.json(); })
        .then(function (d) {
          if (!d.clientId) throw new Error('No PayPal client ID');
          return _loadPayPal(d.clientId);
        })
        .then(function () { return true; })
        .catch(function (e) {
          console.warn('[cart-checkout/paypal]', e.message);
          return false;
        });
    }());

    Promise.all([stripeReady, paypalReady]).then(function (results) {
      var hasStripe = results[0];
      var hasPayPal = results[1];
      if (hasStripe || hasPayPal) {
        _renderPaymentOptions(payArea, hasPayPal, hasStripe);
      }
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
