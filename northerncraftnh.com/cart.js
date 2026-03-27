/**
 * NorthernCraft Shopping Cart
 * Drop-in cart module — no external dependencies, no HTML/CSS file changes.
 * Attach to your page with:  <script src="cart.js"></script>
 *
 * Global API:
 *   addToCart(id, name, price, image)
 *   removeFromCart(id)
 *   updateQuantity(id, qty)
 *   getCart()
 *   clearCart()
 *   getCartTotal()
 */
(function () {
  'use strict';

  // ─── State ──────────────────────────────────────────────────────────────────
  const STORAGE_KEY = 'northerncraft_cart';
  let cart = [];

  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) cart = JSON.parse(saved);
  } catch (_) {
    cart = [];
  }

  function persist() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(cart)); } catch (_) {}
  }

  // ─── Public API ─────────────────────────────────────────────────────────────
  window.addToCart = function (id, name, price, image, meta) {
    id = String(id);
    const existing = cart.find(function (i) { return i.id === id; });
    if (existing) {
      existing.quantity += 1;
    } else {
      const item = { id: id, name: name, price: Number(price), quantity: 1, image: image || '' };
      if (meta && typeof meta === 'object') item.meta = meta;
      cart.push(item);
    }
    persist();
    _update();
  };

  window.removeFromCart = function (id) {
    id = String(id);
    cart = cart.filter(function (i) { return i.id !== id; });
    persist();
    _update();
  };

  window.updateQuantity = function (id, qty) {
    id = String(id);
    qty = parseInt(qty, 10);
    if (isNaN(qty) || qty < 1) {
      window.removeFromCart(id);
      return;
    }
    const item = cart.find(function (i) { return i.id === id; });
    if (item) {
      item.quantity = qty;
      persist();
      _update();
    }
  };

  window.getCart = function () { return cart.slice(); };

  window.clearCart = function () {
    cart = [];
    persist();
    _update();
  };

  window.getCartTotal = function () {
    return cart.reduce(function (sum, i) { return sum + i.price * i.quantity; }, 0);
  };

  // ─── Styles ─────────────────────────────────────────────────────────────────
  const CSS = `
    /* ── Overlay ── */
    .nc-cart-overlay {
      position: fixed;
      inset: 0;
      background: rgba(42, 37, 35, 0.48);
      z-index: 199;
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.3s ease;
    }
    .nc-cart-overlay.nc-open {
      opacity: 1;
      pointer-events: auto;
    }

    /* ── Drawer ── */
    .nc-cart-drawer {
      position: fixed;
      top: 0;
      right: 0;
      width: 400px;
      height: 100%;
      background: #ece8e1;
      z-index: 200;
      display: flex;
      flex-direction: column;
      transform: translateX(100%);
      transition: transform 0.35s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: -4px 0 32px rgba(42, 37, 35, 0.12);
    }
    .nc-cart-drawer.nc-open {
      transform: translateX(0);
    }

    /* ── Header ── */
    .nc-cart-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 24px 28px;
      border-bottom: 1px solid #d9d4cc;
      flex-shrink: 0;
    }
    .nc-cart-title {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 22px;
      font-weight: 400;
      color: #2a2523;
      letter-spacing: 0.04em;
      margin: 0;
    }
    .nc-cart-close {
      background: none;
      border: none;
      cursor: pointer;
      color: #7a6f68;
      padding: 4px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: color 0.2s;
      line-height: 0;
    }
    .nc-cart-close:hover { color: #2a2523; }

    /* ── Items list ── */
    .nc-cart-items {
      flex: 1;
      overflow-y: auto;
      overscroll-behavior: contain;
    }
    .nc-cart-empty {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      height: 100%;
      gap: 12px;
      color: #9e9098;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      letter-spacing: 0.22em;
      text-transform: uppercase;
    }
    .nc-cart-empty svg {
      opacity: 0.35;
    }

    /* ── Item row ── */
    .nc-cart-item {
      display: grid;
      grid-template-columns: 72px 1fr;
      grid-template-rows: auto auto;
      column-gap: 16px;
      row-gap: 10px;
      align-items: start;
      padding: 20px 28px;
      border-bottom: 1px solid #d9d4cc;
    }
    .nc-cart-item-img-wrap {
      grid-row: 1 / 3;
      width: 72px;
      height: 72px;
      background: #cbc5bc;
      overflow: hidden;
      flex-shrink: 0;
    }
    .nc-cart-item-img-wrap img {
      width: 100%;
      height: 100%;
      object-fit: cover;
      display: block;
    }
    .nc-cart-item-top {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 8px;
    }
    .nc-cart-item-name {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 16px;
      font-weight: 400;
      color: #180910;
      letter-spacing: 0.01em;
      line-height: 1.3;
      margin: 0;
    }
    .nc-cart-item-price {
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      font-weight: 500;
      color: #5c3545;
      letter-spacing: 0.06em;
      white-space: nowrap;
      padding-top: 2px;
    }
    .nc-cart-item-bottom {
      display: flex;
      align-items: center;
      gap: 14px;
    }

    /* ── Qty stepper ── */
    .nc-qty {
      display: flex;
      align-items: center;
      border: 1px solid #cbc5bc;
      background: #fff;
    }
    .nc-qty button {
      background: none;
      border: none;
      cursor: pointer;
      width: 28px;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-family: 'Montserrat', sans-serif;
      font-size: 15px;
      color: #7a6f68;
      padding: 0;
      line-height: 1;
      transition: color 0.2s, background 0.2s;
    }
    .nc-qty button:hover { color: #2a2523; background: #ece8e1; }
    .nc-qty-count {
      min-width: 28px;
      text-align: center;
      font-family: 'Montserrat', sans-serif;
      font-size: 11px;
      color: #2a2523;
      letter-spacing: 0.05em;
      user-select: none;
    }

    /* ── Bundle meta line ── */
    .nc-cart-item-meta {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      color: #9e9098;
      margin: 3px 0 0;
    }

    /* ── Remove link ── */
    .nc-cart-remove {
      background: none;
      border: none;
      cursor: pointer;
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      letter-spacing: 0.18em;
      text-transform: uppercase;
      color: #9e9098;
      padding: 0;
      transition: color 0.2s;
    }
    .nc-cart-remove:hover { color: #7b4f5c; }

    /* ── Footer ── */
    .nc-cart-checkout-error {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      letter-spacing: 0.12em;
      color: #f5f0eb;
      background: #8b2e2e;
      padding: 8px 12px;
      margin-bottom: 14px;
      text-align: center;
    }
    .nc-cart-footer {
      padding: 20px 28px 28px;
      border-top: 1px solid #d9d4cc;
      background: #ece8e1;
      flex-shrink: 0;
    }
    .nc-cart-shipping-notice {
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      font-weight: 500;
      letter-spacing: 0.16em;
      text-transform: uppercase;
      text-align: right;
      margin-top: 5px;
      display: flex;
      align-items: center;
      justify-content: flex-end;
      gap: 5px;
      position: relative;
    }
    .nc-cart-shipping-notice.earned { color: #3a6b3a; }
    .nc-cart-shipping-notice.promo  { color: #9a9088; }
    .nc-ship-info-btn {
      display: inline-flex; align-items: center; justify-content: center;
      width: 13px; height: 13px; border-radius: 50%;
      border: 1.5px solid currentColor;
      font-size: 8px; font-style: italic; font-family: Georgia, serif;
      cursor: pointer; background: none; padding: 0; line-height: 1;
      color: inherit; flex-shrink: 0;
      transition: opacity .15s;
    }
    .nc-ship-info-btn:hover { opacity: .7; }
    .nc-ship-info-popup {
      display: none;
      position: absolute; bottom: calc(100% + 7px); right: 0;
      background: #2a2523; color: rgba(255,255,255,.85);
      font-family: 'Montserrat', sans-serif;
      font-size: 9px; letter-spacing: .1em;
      text-transform: none; font-weight: 400;
      padding: 8px 12px; white-space: nowrap;
      pointer-events: none; z-index: 10;
    }
    .nc-ship-info-popup::after {
      content: ''; position: absolute; top: 100%; right: 14px;
      border: 5px solid transparent;
      border-top-color: #2a2523;
    }
    .nc-ship-info-popup.visible { display: block; }
    .nc-cart-total-row {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      margin-bottom: 18px;
    }
    .nc-cart-total-label {
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 0.22em;
      text-transform: uppercase;
      color: #7a6f68;
    }
    .nc-cart-total-amount {
      font-family: 'Cormorant Garamond', Georgia, serif;
      font-size: 26px;
      color: #2a2523;
      letter-spacing: 0.02em;
    }
    .nc-cart-checkout {
      display: block;
      width: 100%;
      background: #5c3545;
      color: #fff;
      border: none;
      cursor: pointer;
      font-family: 'Montserrat', sans-serif;
      font-size: 10px;
      font-weight: 400;
      letter-spacing: 0.2em;
      text-transform: uppercase;
      padding: 14px 28px;
      transition: background 0.2s;
      text-align: center;
    }
    .nc-cart-checkout:hover { background: #7b4f5c; }

    /* ── Badge ── */
    .nc-cart-badge {
      position: absolute;
      top: -6px;
      right: -8px;
      background: #5c3545;
      color: #fff;
      font-family: 'Montserrat', sans-serif;
      font-size: 9px;
      font-weight: 500;
      min-width: 17px;
      height: 17px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      pointer-events: none;
      line-height: 1;
      padding: 0 3px;
    }
    .nc-cart-badge[data-hidden="true"] { display: none; }

    /* ── Mobile ── */
    @media (max-width: 480px) {
      .nc-cart-drawer { width: 100%; }
      .nc-cart-header { padding: 20px 20px; }
      .nc-cart-item  { padding: 16px 20px; }
      .nc-cart-footer { padding: 16px 20px 24px; }
    }
  `;

  // ─── DOM Elements ────────────────────────────────────────────────────────────
  let overlay, drawer, itemsList, totalEl, shippingNoticeEl, badge;
  let _isUS = true; // default true until geo check resolves

  // Detect country via free IP API; hide shipping notice for non-US visitors
  fetch('https://ipapi.co/country_code/')
    .then(function (r) { return r.text(); })
    .then(function (code) {
      _isUS = code.trim() === 'US';
      _updateShippingNotice();
    })
    .catch(function () { /* network error — keep default true */ });

  function _init() {
    const styleEl = document.createElement('style');
    styleEl.textContent = CSS;
    document.head.appendChild(styleEl);

    // Overlay
    overlay = document.createElement('div');
    overlay.className = 'nc-cart-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.addEventListener('click', _close);

    // Drawer
    drawer = document.createElement('div');
    drawer.className = 'nc-cart-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Shopping cart');
    drawer.innerHTML = [
      '<div class="nc-cart-header">',
      '  <h2 class="nc-cart-title">Your Cart</h2>',
      '  <button class="nc-cart-close" aria-label="Close cart">',
      '    <svg width="20" height="20" viewBox="0 0 20 20" fill="none"',
      '         stroke="currentColor" stroke-width="1.5" stroke-linecap="round">',
      '      <line x1="4" y1="4" x2="16" y2="16"/>',
      '      <line x1="16" y1="4" x2="4" y2="16"/>',
      '    </svg>',
      '  </button>',
      '</div>',
      '<div class="nc-cart-items" role="list"></div>',
      '<div class="nc-cart-footer">',
      '  <div class="nc-cart-checkout-error" style="display:none"></div>',
      '  <div class="nc-cart-total-row">',
      '    <span class="nc-cart-total-label">Total</span>',
      '    <span class="nc-cart-total-amount"></span>',
      '  </div>',
      '  <div class="nc-cart-shipping-notice" style="display:none"></div>',
      '  <div class="nc-cart-pay-area">',
      '    <div id="nc-paypal-mount"></div>',
      '  </div>',
      '</div>'
    ].join('');

    drawer.querySelector('.nc-cart-close').addEventListener('click', _close);

    itemsList        = drawer.querySelector('.nc-cart-items');
    totalEl          = drawer.querySelector('.nc-cart-total-amount');
    shippingNoticeEl = drawer.querySelector('.nc-cart-shipping-notice');

    document.body.appendChild(overlay);
    document.body.appendChild(drawer);

    // Badge + click on #cart-icon
    const icon = document.getElementById('cart-icon');
    if (icon) {
      const cs = window.getComputedStyle(icon);
      if (cs.position === 'static') icon.style.position = 'relative';

      badge = document.createElement('span');
      badge.className = 'nc-cart-badge';
      badge.setAttribute('aria-hidden', 'true');
      icon.appendChild(badge);
      icon.addEventListener('click', _open);
    }

    // Escape key closes
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') _close();
    });

    _update();
  }

  // ─── Drawer open / close ─────────────────────────────────────────────────────
  function _open() {
    var scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
    document.body.style.paddingRight = scrollbarWidth + 'px';
    document.body.style.overflow = 'hidden';
    overlay.classList.add('nc-open');
    drawer.classList.add('nc-open');
    drawer.querySelector('.nc-cart-close').focus();
  }

  function _close() {
    overlay.classList.remove('nc-open');
    drawer.classList.remove('nc-open');
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  // ─── Rendering ───────────────────────────────────────────────────────────────
  function _fmt(n) {
    return '$' + Number(n).toFixed(2);
  }

  function _esc(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function _renderItems() {
    if (!itemsList) return;

    if (cart.length === 0) {
      itemsList.innerHTML = [
        '<div class="nc-cart-empty">',
        '  <svg width="44" height="44" viewBox="0 0 44 44" fill="none"',
        '       stroke="#7a6f68" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
        '    <path d="M6 8h4.5l2.7 14.4A2 2 0 0 0 15.1 24h16.8a2 2 0 0 0 1.95-1.56L36 12H12"/>',
        '    <circle cx="17" cy="35" r="2"/>',
        '    <circle cx="31" cy="35" r="2"/>',
        '  </svg>',
        '  <span>Your cart is empty</span>',
        '</div>'
      ].join('');
      return;
    }

    itemsList.innerHTML = cart.map(function (item) {
      const imgInner = item.image
        ? '<img src="' + _esc(item.image) + '" alt="' + _esc(item.name) + '" loading="lazy">'
        : '';
      // Build meta line for bundle items (% saved + next tier hint)
      var metaLine = '';
      if (item.meta && item.meta.bundleCount) {
        var metaParts = [];
        if (item.meta.discountPct > 0) metaParts.push('Saving ' + item.meta.discountPct + '%');
        if (item.meta.nextHint)        metaParts.push(item.meta.nextHint);
        if (metaParts.length) {
          metaLine = '<p class="nc-cart-item-meta">' + _esc(metaParts.join(' \u00b7 ')) + '</p>';
        }
      }
      return [
        '<div class="nc-cart-item" data-id="' + _esc(item.id) + '" role="listitem">',
        '  <div class="nc-cart-item-img-wrap">' + imgInner + '</div>',
        '  <div class="nc-cart-item-top">',
        '    <p class="nc-cart-item-name">' + _esc(item.name) + '</p>',
        '    <span class="nc-cart-item-price">' + _fmt(item.price * item.quantity) + '</span>',
        '  </div>',
        metaLine,
        '  <div class="nc-cart-item-bottom">',
        '    <div class="nc-qty" role="group" aria-label="Quantity">',
        '      <button class="nc-qty-dec" aria-label="Decrease quantity">\u2212</button>',
        '      <span class="nc-qty-count" aria-live="polite">' + item.quantity + '</span>',
        '      <button class="nc-qty-inc" aria-label="Increase quantity">+</button>',
        '    </div>',
        '    <button class="nc-cart-remove" aria-label="Remove ' + _esc(item.name) + '">Remove</button>',
        '  </div>',
        '</div>'
      ].join('');
    }).join('');

    // Wire up events on the newly rendered rows
    itemsList.querySelectorAll('.nc-cart-item').forEach(function (row) {
      const id = row.dataset.id;
      row.querySelector('.nc-qty-dec').addEventListener('click', function () {
        const it = cart.find(function (i) { return i.id === id; });
        if (it) window.updateQuantity(id, it.quantity - 1);
      });
      row.querySelector('.nc-qty-inc').addEventListener('click', function () {
        const it = cart.find(function (i) { return i.id === id; });
        if (it) window.updateQuantity(id, it.quantity + 1);
      });
      row.querySelector('.nc-cart-remove').addEventListener('click', function () {
        window.removeFromCart(id);
      });
    });
  }

  function _updateBadge() {
    if (!badge) return;
    const count = cart.reduce(function (s, i) { return s + i.quantity; }, 0);
    badge.textContent = count > 99 ? '99+' : String(count);
    badge.dataset.hidden = count === 0 ? 'true' : 'false';
  }

  function _makeInfoBtn() {
    var popup = document.createElement('span');
    popup.className = 'nc-ship-info-popup';
    popup.textContent = 'Applies to shipping within the United States only.';

    var btn = document.createElement('button');
    btn.className = 'nc-ship-info-btn';
    btn.setAttribute('type', 'button');
    btn.setAttribute('aria-label', 'Shipping info');
    btn.textContent = 'i';
    btn.appendChild(popup);

    btn.addEventListener('click', function (e) {
      e.stopPropagation();
      popup.classList.toggle('visible');
    });
    document.addEventListener('click', function () {
      popup.classList.remove('visible');
    }, { capture: true });

    return btn;
  }

  function _updateShippingNotice() {
    if (!shippingNoticeEl) return;
    if (!_isUS) { shippingNoticeEl.style.display = 'none'; return; }
    const totalQty = cart.reduce(function (s, i) {
      return s + (i.meta && i.meta.bundleCount ? i.meta.bundleCount * i.quantity : i.quantity);
    }, 0);
    if (totalQty === 0) {
      shippingNoticeEl.style.display = 'none';
    } else if (totalQty >= 2) {
      shippingNoticeEl.style.display = '';
      shippingNoticeEl.className = 'nc-cart-shipping-notice earned';
      shippingNoticeEl.innerHTML = '';
      shippingNoticeEl.appendChild(document.createTextNode('\u2713 Free shipping applied'));
      shippingNoticeEl.appendChild(_makeInfoBtn());
    } else {
      shippingNoticeEl.style.display = '';
      shippingNoticeEl.className = 'nc-cart-shipping-notice promo';
      shippingNoticeEl.innerHTML = '';
      shippingNoticeEl.appendChild(document.createTextNode('Free shipping when you buy 2 or more'));
      shippingNoticeEl.appendChild(_makeInfoBtn());
    }
  }

  function _update() {
    _renderItems();
    if (totalEl) totalEl.textContent = _fmt(window.getCartTotal());
    _updateShippingNotice();
    _updateBadge();
  }

  // ─── Public drawer controls (used by cart-checkout.js) ──────────────────────
  window.openCart  = _open;
  window.closeCart = _close;

  // ─── Boot ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }
})();
