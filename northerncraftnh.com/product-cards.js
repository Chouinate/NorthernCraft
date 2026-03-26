/**
 * NorthernCraft Product Cards + Bundle Selection
 *
 * Single piece flow:
 *   Click a .product-card body → opens modal at $35 with Add to Cart / Buy Now.
 *
 * Bundle flow:
 *   Click a .bundle-card[data-bundle-limit] → scrolls to collection, circles appear
 *   on every product card. Click circles to select up to the bundle limit.
 *   Sticky bar shows progress and activates "Add to Cart" once limit is reached.
 *
 * Full Wall:
 *   .bundle-card[data-bundle-inquire] → opens mailto inquiry.
 */
(function () {
  'use strict';

  // ── Styles ──────────────────────────────────────────────────────────────────
  var CSS = [

    /* ── Nav cart icon ── */
    '.nav-cart-icon {',
    '  background: none; border: none; cursor: pointer;',
    '  color: var(--charcoal);',
    '  display: flex; align-items: center; padding: 2px;',
    '  transition: color 0.2s;',
    '}',
    '.nav-cart-icon:hover { color: var(--mauve); }',

    /* ── Product overlay ── */
    '.nc-prod-overlay {',
    '  position: fixed; inset: 0;',
    '  background: rgba(42,37,35,0.55);',
    '  z-index: 198;',
    '  display: flex; align-items: center; justify-content: center;',
    '  padding: 20px;',
    '  opacity: 0; pointer-events: none;',
    '  transition: opacity 0.22s ease;',
    '}',
    '.nc-prod-overlay.nc-open { opacity: 1; pointer-events: auto; }',

    /* ── Modal panel ── */
    '.nc-prod-modal {',
    '  background: var(--cream);',
    '  display: flex; gap: 0;',
    '  width: 100%; max-width: 460px;',
    '  position: relative;',
    '  transform: translateY(10px); opacity: 0;',
    '  transition: transform 0.25s ease, opacity 0.25s ease;',
    '}',
    '.nc-prod-overlay.nc-open .nc-prod-modal { transform: translateY(0); opacity: 1; }',

    /* ── Close button ── */
    '.nc-prod-close {',
    '  position: absolute; top: 12px; right: 14px;',
    '  background: none; border: none; cursor: pointer;',
    '  color: var(--text-muted); padding: 4px;',
    '  display: flex; align-items: center; justify-content: center;',
    '  line-height: 0; transition: color 0.2s; z-index: 1;',
    '}',
    '.nc-prod-close:hover { color: var(--charcoal); }',

    /* ── Image column ── */
    '.nc-prod-img-wrap {',
    '  width: 200px; flex-shrink: 0;',
    '  aspect-ratio: 1/1; background: var(--panel); overflow: hidden;',
    '}',
    '.nc-prod-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }',

    /* ── Details column ── */
    '.nc-prod-details {',
    '  flex: 1; display: flex; flex-direction: column;',
    '  justify-content: center; padding: 36px 32px 36px 28px;',
    '}',
    '.nc-prod-name {',
    '  font-family: var(--ff-serif);',
    '  font-size: 30px; font-weight: 400;',
    '  color: var(--charcoal); letter-spacing: 0.03em; margin: 0 0 8px;',
    '}',
    '.nc-prod-price {',
    '  font-family: var(--ff-sans);',
    '  font-size: 11px; font-weight: 400;',
    '  letter-spacing: 0.08em; color: var(--mauve-dark); margin: 0 0 20px;',
    '}',

    /* ── Action buttons ── */
    '.nc-prod-actions { display: flex; flex-direction: column; gap: 10px; }',

    '.nc-prod-btn {',
    '  width: 100%; padding: 12px 16px;',
    '  font-family: var(--ff-sans);',
    '  font-size: 10px; font-weight: 400;',
    '  letter-spacing: 0.2em; text-transform: uppercase;',
    '  cursor: pointer;',
    '  transition: background 0.2s, color 0.2s, border-color 0.2s;',
    '}',
    '.nc-prod-btn-cart {',
    '  background: var(--mauve-dark); color: #fff; border: none;',
    '}',
    '.nc-prod-btn-cart:hover { background: var(--mauve); }',

    /* ── Upsell link ── */
    '.nc-prod-upsell {',
    '  background: none; border: none; cursor: pointer; padding: 0;',
    '  font-family: var(--ff-sans);',
    '  font-size: 9px; letter-spacing: 0.16em;',
    '  color: var(--text-muted); text-align: center;',
    '  text-decoration: underline; text-underline-offset: 3px;',
    '  transition: color 0.2s;',
    '}',
    '.nc-prod-upsell:hover { color: var(--mauve-dark); }',

    /* ── Modal mobile ── */
    '@media (max-width: 560px) {',
    '  .nc-prod-modal { flex-direction: column; max-width: 360px; }',
    '  .nc-prod-img-wrap { width: 100%; aspect-ratio: 4/3; }',
    '  .nc-prod-details { padding: 24px 24px 28px; }',
    '}',

    /* ── Bundle selection circles ── */
    '.product-select-circle {',
    '  position: absolute; top: 10px; right: 10px;',
    '  width: 24px; height: 24px; border-radius: 50%;',
    '  background: rgba(236,232,225,0.88);',
    '  border: 1.5px solid rgba(92,53,69,0.32);',
    '  cursor: pointer; padding: 0;',
    '  display: flex; align-items: center; justify-content: center;',
    '  opacity: 0; pointer-events: none;',
    '  transition: opacity 0.2s, background 0.15s, border-color 0.15s;',
    '  z-index: 3;',
    '}',
    '.bundle-mode-active .product-select-circle {',
    '  opacity: 1; pointer-events: auto;',
    '}',
    '.bundle-mode-active .product-card { cursor: pointer; }',
    '.product-card.pc-selected .product-select-circle {',
    '  background: var(--mauve-dark); border-color: var(--mauve-dark);',
    '}',
    '.product-select-circle path { opacity: 0; transition: opacity 0.15s; }',
    '.product-card.pc-selected .product-select-circle path { opacity: 1; }',

    /* ── Bundle bar ── */
    '#bundle-bar {',
    '  position: fixed; bottom: 0; left: 0; right: 0;',
    '  background: var(--cream);',
    '  border-top: 1px solid rgba(92,53,69,0.1);',
    '  padding: 14px 56px;',
    '  display: flex; align-items: center; gap: 20px; flex-wrap: wrap;',
    '  z-index: 95;',
    '  transform: translateY(100%);',
    '  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);',
    '  box-shadow: 0 -4px 24px rgba(42,37,35,0.07);',
    '}',
    '#bundle-bar.bb-visible { transform: translateY(0); }',
    '#bb-cancel {',
    '  background: none; border: none; padding: 4px 6px;',
    '  cursor: pointer; color: var(--text-muted);',
    '  display: flex; align-items: center; line-height: 0;',
    '  transition: color 0.2s; flex-shrink: 0;',
    '}',
    '#bb-cancel:hover { color: var(--mauve-dark); }',
    '#bb-title {',
    '  font-family: var(--ff-sans);',
    '  font-size: 10px; font-weight: 400;',
    '  letter-spacing: 0.2em; text-transform: uppercase;',
    '  color: var(--mauve-dark); flex-shrink: 0;',
    '}',
    '.bb-sep { color: var(--panel); font-size: 18px; flex-shrink: 0; line-height: 1; }',
    '#bb-dots { display: flex; gap: 5px; align-items: center; flex-shrink: 0; }',
    '.bb-dot {',
    '  width: 7px; height: 7px; border-radius: 50%;',
    '  border: 1.5px solid rgba(92,53,69,0.4);',
    '  background: transparent;',
    '  transition: background 0.15s, border-color 0.15s;',
    '}',
    '.bb-dot.bb-dot--filled { background: var(--mauve-dark); border-color: var(--mauve-dark); }',
    '#bb-count {',
    '  font-family: var(--ff-sans);',
    '  font-size: 10px; letter-spacing: 0.14em;',
    '  color: var(--text-muted); text-transform: uppercase; flex: 1;',
    '}',
    '#bb-add {',
    '  background: var(--mauve-dark); color: #fff; border: none;',
    '  font-family: var(--ff-sans);',
    '  font-size: 10px; font-weight: 400;',
    '  letter-spacing: 0.2em; text-transform: uppercase;',
    '  padding: 13px 28px; cursor: pointer; flex-shrink: 0;',
    '  transition: background 0.2s, opacity 0.2s;',
    '}',
    '#bb-add[disabled] { opacity: 0.35; cursor: not-allowed; }',
    '#bb-add:not([disabled]):hover { background: var(--mauve); }',
    '#bb-hint {',
    '  width: 100%; text-align: center; margin-top: 6px;',
    '  font-family: var(--ff-sans);',
    '  font-size: 9px; letter-spacing: 0.14em; text-transform: uppercase;',
    '  color: #9e9098;',
    '}',
    'body.bundle-mode-active { padding-bottom: 80px; }',
    '#bb-scroll {',
    '  background: none; border: none; padding: 4px 6px;',
    '  cursor: pointer; color: var(--text-muted);',
    '  font-family: var(--ff-sans);',
    '  font-size: 9px; letter-spacing: 0.18em; text-transform: uppercase;',
    '  display: flex; align-items: center; gap: 5px; flex-shrink: 0;',
    '  transition: color 0.2s; white-space: nowrap;',
    '}',
    '#bb-scroll:hover { color: var(--mauve-dark); }',
    '@media (max-width: 768px) {',
    '  #bundle-bar { padding: 12px 20px; gap: 12px; }',
    '  #bb-scroll span { display: none; }',
    '}',

  ].join('\n');

  // ── Bundle state ─────────────────────────────────────────────────────────────
  var bundleLimit = 0;
  var bundlePrice = 0;
  var bundleTitle = '';
  var selectedCards = [];
  var bundleBar, bbTitle, bbDots, bbCount, bbAdd, bbHint;

  var BUNDLE_TIERS = [
    { limit: 2,  price: 55,  name: 'Pair' },
    { limit: 4,  price: 89,  name: 'Set of 4' },
    { limit: 6,  price: 119, name: 'Set of 6' },
    { limit: 12, price: 199, name: 'Full Wall' },
  ];
  var SINGLE_PRICE = 35;

  // Highest tier the count qualifies for
  function _bestTier(count) {
    for (var t = BUNDLE_TIERS.length - 1; t >= 0; t--) {
      if (count >= BUNDLE_TIERS[t].limit) return BUNDLE_TIERS[t];
    }
    return null;
  }

  // Best bundle rate + $35 per item above that tier's limit
  function _calcPrice(count) {
    var tier = _bestTier(count);
    if (!tier) return count * SINGLE_PRICE;
    return tier.price + (count - tier.limit) * SINGLE_PRICE;
  }

  // Savings % vs buying each piece at single price
  function _discountPct(count) {
    if (count === 0) return 0;
    return Math.round((1 - _calcPrice(count) / (count * SINGLE_PRICE)) * 100);
  }

  // Next tier above the current count
  function _nextTier(count) {
    for (var t = 0; t < BUNDLE_TIERS.length; t++) {
      if (BUNDLE_TIERS[t].limit > count) return BUNDLE_TIERS[t];
    }
    return null;
  }


  // ── Modal state ──────────────────────────────────────────────────────────────
  var overlay, imgEl, nameEl, priceEl;
  var currentProduct = null;

  // ── Init ────────────────────────────────────────────────────────────────────
  function _init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Build product modal overlay
    overlay = document.createElement('div');
    overlay.className = 'nc-prod-overlay';
    overlay.setAttribute('aria-hidden', 'true');
    overlay.innerHTML = [
      '<div class="nc-prod-modal" role="dialog" aria-modal="true" aria-label="Product">',
      '  <button class="nc-prod-close" aria-label="Close">',
      '    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"',
      '         stroke="currentColor" stroke-width="1.5" stroke-linecap="round">',
      '      <line x1="4" y1="4" x2="16" y2="16"/>',
      '      <line x1="16" y1="4" x2="4" y2="16"/>',
      '    </svg>',
      '  </button>',
      '  <div class="nc-prod-img-wrap"><img class="nc-prod-img" src="" alt=""></div>',
      '  <div class="nc-prod-details">',
      '    <h3 class="nc-prod-name"></h3>',
      '    <p class="nc-prod-price"></p>',
      '    <div class="nc-prod-actions">',
      '      <button class="nc-prod-btn nc-prod-btn-cart">Add to Cart</button>',
      '      <button class="nc-prod-upsell" type="button">Make it a pair for $55</button>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');
    document.body.appendChild(overlay);

    imgEl   = overlay.querySelector('.nc-prod-img');
    nameEl  = overlay.querySelector('.nc-prod-name');
    priceEl = overlay.querySelector('.nc-prod-price');

    overlay.addEventListener('click', function (e) { if (e.target === overlay) _close(); });
    overlay.querySelector('.nc-prod-close').addEventListener('click', _close);
    overlay.querySelector('.nc-prod-btn-cart').addEventListener('click', _handleAddToCart);
    overlay.querySelector('.nc-prod-upsell').addEventListener('click', function () {
      var sourceId = currentProduct && currentProduct.id;
      _close();
      _activateBundle(2, 55, 'Pair');
      if (sourceId) {
        var card = document.querySelector('.product-card[data-id="' + sourceId + '"]');
        if (card) _toggleBundleSelect(card);
      }
    });
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('nc-open')) _close();
    });

    // Build bundle selection bar
    bundleBar = document.createElement('div');
    bundleBar.id = 'bundle-bar';
    bundleBar.setAttribute('aria-hidden', 'true');
    bundleBar.innerHTML = [
      '<button id="bb-cancel" aria-label="Cancel bundle selection">',
      '  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"',
      '       stroke="currentColor" stroke-width="1.5" stroke-linecap="round">',
      '    <line x1="2" y1="2" x2="10" y2="10"/>',
      '    <line x1="10" y1="2" x2="2" y2="10"/>',
      '  </svg>',
      '</button>',
      '<span id="bb-title"></span>',
      '<span class="bb-sep" aria-hidden="true">\u00b7</span>',
      '<span id="bb-dots" aria-hidden="true"></span>',
      '<span id="bb-count"></span>',
      '<button id="bb-scroll" aria-label="Scroll to grid">',
      '  <svg width="12" height="12" viewBox="0 0 12 12" fill="none"',
      '       stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round">',
      '    <polyline points="2,8 6,4 10,8"/>',
      '  </svg>',
      '  <span>Back to grid</span>',
      '</button>',
      '<button id="bb-add" disabled type="button"></button>',
      '<span id="bb-hint"></span>',
    ].join('');
    document.body.appendChild(bundleBar);

    bbTitle = document.getElementById('bb-title');
    bbDots  = document.getElementById('bb-dots');
    bbCount = document.getElementById('bb-count');
    bbAdd   = document.getElementById('bb-add');
    bbHint  = document.getElementById('bb-hint');

    document.getElementById('bb-cancel').addEventListener('click', _deactivateBundle);
    document.getElementById('bb-scroll').addEventListener('click', function () {
      var coll = document.getElementById('collection');
      if (coll) coll.scrollIntoView({ behavior: 'smooth' });
    });
    bbAdd.addEventListener('click', _handleBundleAddToCart);

    // Wire bundle cards (Pair / Set of 4 / Set of 6)
    document.querySelectorAll('.bundle-card[data-bundle-limit]').forEach(function (card) {
      card.addEventListener('click', function () {
        var limit = parseInt(card.dataset.bundleLimit, 10);
        var price = parseInt(card.dataset.bundlePrice, 10);
        var name  = card.querySelector('.bundle-card-name').textContent.trim();
        _activateBundle(limit, price, name);
      });
    });

    // Wire product cards — add circles, handle single vs. bundle clicks
    document.querySelectorAll('.product-card[data-id]').forEach(function (card) {
      // Inject select circle into the image wrapper
      var imgWrap = card.querySelector('.product-card-img');
      if (imgWrap) {
        var circle = document.createElement('button');
        circle.className = 'product-select-circle';
        circle.setAttribute('aria-label', 'Select ' + card.dataset.name + ' for bundle');
        circle.setAttribute('type', 'button');
        circle.innerHTML = [
          '<svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">',
          '  <path d="M1 4l2.5 2.5L9 1" stroke="white" stroke-width="1.5"',
          '        stroke-linecap="round" stroke-linejoin="round"/>',
          '</svg>',
        ].join('');
        imgWrap.appendChild(circle);

        circle.addEventListener('click', function (e) {
          e.stopPropagation(); // don't open single-product modal
          if (bundleLimit > 0) _toggleBundleSelect(card);
        });
      }

      // Card body click → toggle bundle selection or open single-piece modal
      card.addEventListener('click', function () {
        if (bundleLimit > 0) {
          _toggleBundleSelect(card);
        } else {
          _open({
            id:    card.dataset.id,
            name:  card.dataset.name,
            price: Number(card.dataset.price),
            image: card.dataset.image,
          });
        }
      });
    });
  }

  // ── Bundle logic ─────────────────────────────────────────────────────────────
  function _activateBundle(limit, price, title) {
    // Clear any previous selection
    selectedCards.forEach(function (c) { c.classList.remove('pc-selected'); });
    selectedCards = [];

    bundleLimit = limit;
    bundlePrice = price;
    bundleTitle = title;

    document.body.classList.add('bundle-mode-active');
    bbTitle.textContent = title;
    _updateBundleBar();
    bundleBar.setAttribute('aria-hidden', 'false');
    bundleBar.classList.add('bb-visible');

    var coll = document.getElementById('collection');
    if (coll) coll.scrollIntoView({ behavior: 'smooth' });
  }

  function _deactivateBundle() {
    selectedCards.forEach(function (c) { c.classList.remove('pc-selected'); });
    selectedCards = [];
    bundleLimit = 0;
    document.body.classList.remove('bundle-mode-active');
    bundleBar.classList.remove('bb-visible');
    bundleBar.setAttribute('aria-hidden', 'true');
  }

  function _toggleBundleSelect(card) {
    var idx = selectedCards.indexOf(card);
    if (idx >= 0) {
      selectedCards.splice(idx, 1);
      card.classList.remove('pc-selected');
    } else {
      selectedCards.push(card);
      card.classList.add('pc-selected');
    }
    _updateBundleBar();
  }

  function _updateBundleBar() {
    var count = selectedCards.length;
    var tier  = _bestTier(count);
    var next  = _nextTier(count);
    var price = _calcPrice(count);
    var disc  = _discountPct(count);

    // Title: current best tier name, or initial title if none qualifies yet
    bbTitle.textContent = tier ? tier.name : bundleTitle;

    // Progress dots up to bundleLimit (initial activation tier)
    bbDots.innerHTML = '';
    for (var i = 0; i < bundleLimit; i++) {
      var dot = document.createElement('span');
      dot.className = 'bb-dot' + (i < count ? ' bb-dot--filled' : '');
      bbDots.appendChild(dot);
    }

    // Count label with current discount %
    if (count === 0) {
      bbCount.textContent = 'Select ' + bundleLimit + ' to start';
    } else if (disc > 0) {
      bbCount.textContent = count + ' selected \u00b7 ' + disc + '% off';
    } else {
      bbCount.textContent = count + ' selected';
    }

    // CTA button text + state
    if (count >= bundleLimit) {
      bbAdd.textContent = 'Add to Cart \u00b7 $' + price;
      bbAdd.disabled = false;
    } else {
      bbAdd.textContent = 'Select ' + (bundleLimit - count) + ' more';
      bbAdd.disabled = true;
    }

    // Next-tier hint: always show when there's a next tier
    if (next) {
      var nextDisc = _discountPct(next.limit);
      bbHint.textContent = 'Add ' + (next.limit - count) + ' more to save ' + nextDisc + '%';
    } else {
      bbHint.textContent = '';
    }
  }

  function _handleBundleAddToCart() {
    if (selectedCards.length < bundleLimit || typeof window.addToCart !== 'function') return;

    var newNames = selectedCards.map(function (c) { return c.dataset.name; });
    var firstImg = selectedCards[0].dataset.image || '';

    // Merge any existing bundle items in the cart into this one
    var existingCart  = typeof window.getCart === 'function' ? window.getCart() : [];
    var mergedNames   = [];
    var mergedCount   = 0;
    var mergedImg     = firstImg;

    existingCart.forEach(function (item) {
      if (item.meta && item.meta.bundleCount) {
        // Strip "Tier · " prefix and split back into individual piece names
        var stripped = item.name.replace(/^[^\u00b7]+\u00b7\s*/, '');
        mergedNames  = mergedNames.concat(stripped.split(' \u00b7 '));
        mergedCount += item.meta.bundleCount * item.quantity;
        if (!mergedImg && item.image) mergedImg = item.image;
        window.removeFromCart(item.id);
      }
    });

    // Append current selection
    mergedNames  = mergedNames.concat(newNames);
    mergedCount += newNames.length;

    var count    = mergedCount;
    var tier     = _bestTier(count);
    var price    = _calcPrice(count);
    var disc     = _discountPct(count);
    var next     = _nextTier(count);
    var bundleId = 'bundle-' + count + '-' + Date.now();
    var tierName = tier ? tier.name : bundleTitle;
    var nextHint = next
      ? ('Add ' + (next.limit - count) + ' more to save ' + _discountPct(next.limit) + '%')
      : '';
    window.addToCart(bundleId, tierName + ' \u00b7 ' + mergedNames.join(' \u00b7 '), price, mergedImg, {
      bundleCount: count,
      discountPct: disc,
      nextHint: nextHint,
    });
    _deactivateBundle();
    var cartIcon = document.getElementById('cart-icon');
    if (cartIcon) cartIcon.click();
  }

  // ── Modal open / close ───────────────────────────────────────────────────────
  function _open(product) {
    currentProduct = product;
    imgEl.src = product.image;
    imgEl.alt = product.name;
    nameEl.textContent = product.name;
    priceEl.textContent = '$' + (Number.isInteger(product.price) ? product.price : product.price.toFixed(2))
      + ' \u00b7 ~8\u2033 square \u00b7 Beige & Metallic Rose';
    overlay.classList.add('nc-open');
    overlay.setAttribute('aria-hidden', 'false');
    document.body.style.overflow = 'hidden';
    overlay.querySelector('.nc-prod-close').focus();
  }

  function _close() {
    overlay.classList.remove('nc-open');
    overlay.setAttribute('aria-hidden', 'true');
    document.body.style.overflow = '';
    currentProduct = null;
  }

  // ── Single piece actions ─────────────────────────────────────────────────────
  function _handleAddToCart() {
    if (!currentProduct || typeof window.addToCart !== 'function') return;
    window.addToCart(currentProduct.id, currentProduct.name, currentProduct.price, currentProduct.image);
    _close();
    var cartIcon = document.getElementById('cart-icon');
    if (cartIcon) cartIcon.click();
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
