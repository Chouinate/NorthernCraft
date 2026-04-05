/**
 * NorthernCraft PayPal Checkout
 *
 * Fetches the PayPal Client ID from the server (never hardcoded), loads the
 * PayPal JS SDK dynamically, and renders a PayPal button below the Stripe
 * button inside #checkout-buttons.
 *
 * Requires (loaded before this script):
 *   cart.js              — exposes getCart(), getCartTotal(), clearCart()
 *   stripe-checkout.js   — injects .nc-pay-success / .nc-pay-error styles
 *
 * Optional — reuses the same server-URL config as stripe-checkout.js:
 *   <script>window.STRIPE_SERVER_URL = 'http://localhost:3000';</script>
 */
(function () {
  'use strict';

  var SERVER = (window.STRIPE_SERVER_URL || '').replace(/\/$/, '');

  // ── Styles ──────────────────────────────────────────────────────────────────
  // .nc-pay-success / .nc-pay-success-sub are already injected by
  // stripe-checkout.js; we re-declare them here for standalone resilience.
  var CSS = [
    /* Divider between Stripe and PayPal */
    '.nc-paypal-divider {',
    '  display: flex;',
    '  align-items: center;',
    '  gap: 14px;',
    '  margin: 20px 0 16px;',
    '  color: #9e9098;',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 9px;',
    '  letter-spacing: 0.22em;',
    '  text-transform: uppercase;',
    '  white-space: nowrap;',
    '}',
    '.nc-paypal-divider::before,',
    '.nc-paypal-divider::after {',
    '  content: "";',
    '  flex: 1;',
    '  height: 1px;',
    '  background: #d9d4cc;',
    '}',

    /* PayPal button wrapper */
    '#nc-paypal-btn { max-width: 400px; }',

    /* Error/cancel message — mirrors .nc-pay-error from stripe-checkout.js */
    '.nc-paypal-msg {',
    '  font-family: "Montserrat", sans-serif;',
    '  font-size: 10px;',
    '  letter-spacing: 0.12em;',
    '  color: #8f6070;',
    '  margin-top: 10px;',
    '}',
    '.nc-paypal-msg.nc-paypal-cancel {',
    '  color: #7a6f68;',
    '}',

    /* Order-complete overlay popup (mirrors stripe-checkout.js) */
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
  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function _getContainer() {
    return document.querySelector('.nc-cart-pay-area') ||
           document.getElementById('checkout-buttons');
  }

  function _showMsg(text, isCancelStyle) {
    var container = _getContainer();
    if (!container) return;
    var el = container.querySelector('.nc-paypal-msg');
    if (!el) {
      el = document.createElement('p');
      container.appendChild(el);
    }
    el.className = 'nc-paypal-msg' + (isCancelStyle ? ' nc-paypal-cancel' : '');
    el.textContent = text;
  }

  function _clearMsg() {
    var container = _getContainer();
    if (!container) return;
    var el = container.querySelector('.nc-paypal-msg');
    if (el) el.remove();
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

  // ── SDK loader ───────────────────────────────────────────────────────────────
  function _loadPayPalSDK(clientId) {
    return new Promise(function (resolve, reject) {
      var script = document.createElement('script');
      script.src =
        'https://www.paypal.com/sdk/js' +
        '?client-id=' + encodeURIComponent(clientId) +
        '&currency=USD' +
        '&intent=capture';
      script.crossOrigin = 'anonymous';
      script.onload  = resolve;
      script.onerror = function () { reject(new Error('PayPal SDK failed to load.')); };
      document.head.appendChild(script);
    });
  }

  // ── Render PayPal button ─────────────────────────────────────────────────────
  function _renderButton() {
    var container = _getContainer();
    if (!container) return;

    if (typeof paypal === 'undefined') {
      console.warn('[PayPal] SDK not available.');
      return;
    }

    // Render into #nc-paypal-mount if present (keeps PayPal above the Stripe button),
    // falling back to #checkout-buttons for backwards compatibility.
    var mountTarget = document.getElementById('nc-paypal-mount') || container;

    var btnWrap = document.createElement('div');
    btnWrap.id = 'nc-paypal-btn';
    mountTarget.appendChild(btnWrap);

    paypal.Buttons({
      style: {
        layout: 'vertical',
        color:  'gold',
        shape:  'rect',
        label:  'paypal',
        height: 45,
      },

      // ── Build the order from the live cart ───────────────────────────────────
      createOrder: function (data, actions) {
        _clearMsg();

        var items = typeof window.getCart      === 'function' ? window.getCart()      : [];
        var total = typeof window.getCartTotal === 'function' ? window.getCartTotal() : 0;

        if (!items.length) {
          _showMsg('Your cart is empty.', false);
          return Promise.reject(new Error('Cart is empty.'));
        }

        // Round every value consistently to avoid PayPal amount-mismatch errors.
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

        // Use recomputed itemTotal so breakdown matches (avoids floating-point drift).
        var orderTotal = (Math.round(itemTotal * 100) / 100).toFixed(2);

        return actions.order.create({
          purchase_units: [{
            amount: {
              currency_code: 'USD',
              value: orderTotal,
              breakdown: {
                item_total: { currency_code: 'USD', value: orderTotal },
              },
            },
            items: lineItems,
          }],
        });
      },

      // ── Payment approved: capture and show thank-you ─────────────────────────
      onApprove: function (data, actions) {
        return actions.order.capture().then(function (details) {
          var email =
            details.payer && details.payer.email_address
              ? details.payer.email_address
              : '';
          if (typeof window.clearCart === 'function') window.clearCart();
          _showOrderCompletePopup(email);
        });
      },

      // ── Customer closed the PayPal window ────────────────────────────────────
      onCancel: function () {
        _showMsg('Payment cancelled \u2014 your cart has been saved.', true);
      },

      // ── SDK or network error ─────────────────────────────────────────────────
      onError: function (err) {
        console.error('[PayPal]', err);
        _showMsg('Something went wrong with PayPal. Please try again or pay with card.', false);
      },

    }).render('#nc-paypal-btn');
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  _injectStyles();

  function _boot() {
    // window.PAYPAL_CLIENT_ID can be set in the page to bypass the server fetch:
    //   <script>window.PAYPAL_CLIENT_ID = 'YOUR_CLIENT_ID_HERE';</script>
    if (window.PAYPAL_CLIENT_ID) {
      _loadPayPalSDK(window.PAYPAL_CLIENT_ID)
        .then(_renderButton)
        .catch(function (err) {
          console.warn('[PayPal] SDK load failed:', err.message);
        });
      return;
    }

    // Fall back to fetching the client ID from the server.
    fetch(SERVER + '/paypal-client-id')
      .then(function (res) { return res.json(); })
      .then(function (data) {
        if (data.error || !data.clientId) {
          throw new Error(data.error || 'No PayPal client ID returned from server.');
        }
        return _loadPayPalSDK(data.clientId);
      })
      .then(function () {
        _renderButton();
      })
      .catch(function (err) {
        // Fail silently in the UI — the Stripe button remains fully functional.
        console.warn('[PayPal] Button not rendered:', err.message);
      });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _boot);
  } else {
    _boot();
  }

})();
