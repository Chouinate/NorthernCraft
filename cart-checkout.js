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
    '  background: rgba(30,24,22,0.85);',
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
    '  display: block; width: 100%; margin-top: 10px;',
    '}',

    /* ── Payment picker modal ── */
    '.nc-picker-inner { max-width: 400px; padding: 52px 28px 32px; }',
    '.nc-picker-title {',
    '  font-family: "Cormorant Garamond", Georgia, serif;',
    '  font-size: 20px; font-weight: 400; color: #2a2523;',
    '  letter-spacing: 0.04em; margin: 0 0 20px; text-align: center;',
    '}',
    '.nc-picker-option {',
    '  display: flex; flex-direction: column; align-items: flex-start;',
    '  width: 100%; background: #fff; border: 1px solid #cbc5bc;',
    '  cursor: pointer; padding: 14px 16px; margin-bottom: 8px;',
    '  transition: border-color 0.2s; text-align: left;',
    '}',
    '.nc-picker-option:last-child { margin-bottom: 0; }',
    '.nc-picker-option:hover { border-color: #5c3545; }',
    '.nc-picker-option-label {',
    '  font-family: "Montserrat", sans-serif; font-size: 10px;',
    '  font-weight: 600; letter-spacing: 0.14em; text-transform: uppercase; color: #2a2523;',
    '}',
    '.nc-picker-option-sub {',
    '  font-family: "Montserrat", sans-serif; font-size: 9px;',
    '  letter-spacing: 0.10em; color: #9e9098; margin-top: 3px;',
    '}',
    '.nc-picker-option-brand { padding: 0; border-color: transparent; }',
    '.nc-picker-option-brand svg { display: block; width: 100%; height: auto; border-radius: 2px; }',

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

    /* ── International shipping notice ── */
    '.nc-intl-notice {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px; line-height: 1.7; letter-spacing: 0.06em;',
    '  color: #7a6f68; text-align: center;',
    '  padding: 16px 4px 0;',
    '}',
    '.nc-intl-notice a {',
    '  color: #5c3545; text-decoration: none;',
    '}',
    '.nc-intl-notice a:hover { text-decoration: underline; }',

  ].join('\n');

  // ── Helpers ─────────────────────────────────────────────────────────────────
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;')
      .replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

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
        if (data.status === 'complete') {
          if (typeof window.clearCart === 'function') window.clearCart();
          var email = data.customer_email || '';
          _showOrderCompletePopup(email);

        } else if (data.status === 'open') {
          // User returned without paying — nothing to show; cart is still intact
        } else {
          var btnsEl = document.getElementById('checkout-buttons');
          if (btnsEl) {
            var p = document.createElement('p');
            p.className = 'nc-pay-error';
            p.textContent = 'Payment could not be confirmed. Please contact us.';
            btnsEl.appendChild(p);
          }
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

    var itemCount = items.reduce(function (sum, i) {
      var qty        = parseInt(i.quantity, 10) || 1;
      var bundleSize = (i.meta && i.meta.bundleCount) ? i.meta.bundleCount : 1;
      return sum + (qty * bundleSize);
    }, 0);

    if (btnEl) { btnEl.disabled = true; btnEl.textContent = '\u2026'; }

    var body = {
      items:      items,
      itemCount:  itemCount,
      country:    window.NC_COUNTRY || 'US',
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

  // ── Payment picker modal ─────────────────────────────────────────────────────
  function _openPaymentPickerModal() {
    var existing = document.getElementById('nc-payment-picker-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'nc-payment-picker-modal';
    modal.className = 'nc-stripe-modal';

    var inner = document.createElement('div');
    inner.className = 'nc-stripe-modal-inner nc-picker-inner';

    var closeBtn = document.createElement('button');
    closeBtn.className = 'nc-stripe-modal-close';
    closeBtn.setAttribute('aria-label', 'Close');
    closeBtn.innerHTML = '&#x2715;';
    closeBtn.addEventListener('click', function () {
      modal.remove();
      document.body.style.overflow = '';
    });

    var title = document.createElement('p');
    title.className = 'nc-picker-title';
    title.textContent = 'How would you like to pay?';

    inner.appendChild(closeBtn);
    inner.appendChild(title);

    var GOOGLE_PAY_SVG =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 52" role="img" aria-label="Google Pay">' +
        '<rect width="280" height="52" rx="4" fill="#fff" stroke="#dadce0" stroke-width="1"/>' +
        // Google G
        '<path d="M122.5 26c0-1-.1-1.9-.3-2.8H112v5.3h5.9c-.3 1.4-1 2.6-2.2 3.4v2.8h3.5c2.1-1.9 3.3-4.8 3.3-8.7z" fill="#4285F4"/>' +
        '<path d="M112 35.5c3 0 5.5-1 7.3-2.7l-3.5-2.8c-1 .7-2.3 1.1-3.8 1.1-2.9 0-5.4-2-6.3-4.6h-3.6v2.9c1.8 3.6 5.5 6.1 9.9 6.1z" fill="#34A853"/>' +
        '<path d="M105.7 26.5c-.2-.7-.4-1.5-.4-2.3s.1-1.6.4-2.3v-2.9h-3.6c-.8 1.6-1.2 3.3-1.2 5.2s.4 3.6 1.2 5.2l3.6-2.9z" fill="#FBBC04"/>' +
        '<path d="M112 19.6c1.6 0 3.1.6 4.2 1.7l3.2-3.2c-1.9-1.8-4.5-2.9-7.4-2.9-4.4 0-8.1 2.5-9.9 6.1l3.6 2.9c.9-2.7 3.4-4.6 6.3-4.6z" fill="#EA4335"/>' +
        // "Pay" text
        '<text x="126" y="33" font-family="\'Roboto\',Arial,sans-serif" font-size="22" font-weight="500" fill="#3c4043">Pay</text>' +
      '</svg>';

    var KLARNA_SVG =
      '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 52" role="img" aria-label="Klarna">' +
        '<rect width="280" height="52" rx="4" fill="#FFB3C7"/>' +
        // Klarna wordmark — lowercase, bold, black
        '<text x="140" y="35" font-family="\'Helvetica Neue\',Arial,sans-serif" font-size="26" font-weight="700" fill="#000" text-anchor="middle" letter-spacing="-0.5">klarna</text>' +
      '</svg>';

    var methods = [
      { label: 'Credit / Debit Card',  sub: 'Visa, Mastercard, Amex & more', types: ['card'] },
      { label: 'Google Pay', brandSvg: GOOGLE_PAY_SVG, types: ['card'] },
      { label: 'Klarna',   brandSvg: KLARNA_SVG,   types: ['klarna'] },
    ];

    methods.forEach(function (m) {
      var btn = document.createElement('button');
      if (m.brandSvg) {
        btn.className = 'nc-picker-option nc-picker-option-brand';
        btn.setAttribute('aria-label', m.label);
        btn.innerHTML = m.brandSvg;
      } else {
        btn.className = 'nc-picker-option';
        btn.innerHTML =
          '<span class="nc-picker-option-label">' + m.label + '</span>' +
          '<span class="nc-picker-option-sub">' + m.sub + '</span>';
      }
      btn.addEventListener('click', function () {
        modal.remove();
        document.body.style.overflow = '';
        _startStripeCheckout(m.types, null, m.label);
      });
      inner.appendChild(btn);
    });

    modal.appendChild(inner);
    modal.addEventListener('click', function (e) {
      if (e.target === modal) { modal.remove(); document.body.style.overflow = ''; }
    });

    document.body.appendChild(modal);
    document.body.style.overflow = 'hidden';
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
            _showOrderCompletePopup(email);
          });
        },

        onCancel: function () {},

        onError: function (err) {
          console.error('[cart-checkout/paypal]', err);
          _showCartError('PayPal payment failed. Please try again or choose another method.');
        },

      }).render('#nc-cart-paypal-btn');
    }

    // Divider + single checkout button
    if (hasStripe) {
      var btn = document.createElement('button');
      btn.className = 'nc-cart-checkout-btn';
      btn.textContent = 'More Ways to Pay';
      btn.addEventListener('click', function () {
        _startStripeCheckout(null, btn, 'More Ways to Pay');
      });
      payArea.appendChild(btn);

      // Payment brand icons
      var badges = document.createElement('img');
      badges.src = 'Payments.png';
      badges.alt = 'Accepted payment methods: Google Pay, Apple Pay, Stripe, Klarna, Visa, Mastercard, Discover, Amex';
      badges.className = 'nc-cart-pay-badges';
      payArea.appendChild(badges);
    }

  }

  // ── International duties notice ──────────────────────────────────────────
  function _renderIntlNotice(payArea) {
    var notice = document.createElement('p');
    notice.className = 'nc-intl-notice';
    notice.textContent =
      'Heads up — your country may collect import duties or taxes on delivery. ' +
      'These aren’t included in your total.';
    payArea.appendChild(notice);
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

    // Wait for cart.js to resolve the visitor's country (fetched from /api/geo),
    // then decide whether to show payment options or an international notice.
    // Poll for up to GEO_POLL_TIMEOUT_MS (cart.js fetch usually resolves in < 200ms).
    var GEO_POLL_INTERVAL_MS = 50;
    var GEO_POLL_TIMEOUT_MS  = 2000;
    var geoReady = window.NC_COUNTRY
      ? Promise.resolve(window.NC_COUNTRY)
      : new Promise(function (resolve) {
          var elapsed = 0;
          var poll = setInterval(function () {
            elapsed += GEO_POLL_INTERVAL_MS;
            if (window.NC_COUNTRY || elapsed >= GEO_POLL_TIMEOUT_MS) {
              clearInterval(poll);
              resolve(window.NC_COUNTRY || 'US');
            }
          }, GEO_POLL_INTERVAL_MS);
        });

    geoReady.then(function (country) {
      // Load Stripe and PayPal in parallel; degrade gracefully if either fails
      var stripeReady = _loadStripe().then(function () { return true; })
                                     .catch(function () { return false; });
      var paypalReady = (function () {
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
          if (country !== 'US') _renderIntlNotice(payArea);
        }
      });
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
