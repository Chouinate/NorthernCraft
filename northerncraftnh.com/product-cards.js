/**
 * NorthernCraft Product Cards + Bundle Selection
 *
 * Single piece flow:
 *   Click a .product-card body → product sheet slides up from bottom
 *   showing product info + tier options. "Just this one" adds at $35.
 *
 * Bundle flow:
 *   Click any tier row in the sheet → sheet closes, checkboxes appear
 *   on product cards, sticky progress bar shows at bottom.
 *   The clicked product is auto-selected as item #1.
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

    /* ── Product sheet backdrop ── */
    '#ps-backdrop {',
    '  position: fixed; inset: 0;',
    '  background: rgba(42,37,35,0.45);',
    '  z-index: 189;',
    '  opacity: 0; pointer-events: none;',
    '  transition: opacity 0.25s ease;',
    '}',
    '#ps-backdrop.ps-open { opacity: 1; pointer-events: auto; }',

    /* ── Product sheet panel ── */
    '#product-sheet {',
    '  position: fixed; bottom: 0; left: 0; right: 0;',
    '  background: var(--cream);',
    '  z-index: 190;',
    '  max-height: 78vh;',
    '  overflow-y: auto;',
    '  -webkit-overflow-scrolling: touch;',
    '  border-top: 1px solid rgba(92,53,69,0.12);',
    '  box-shadow: 0 -8px 40px rgba(42,37,35,0.12);',
    '  transform: translateY(100%);',
    '  transition: transform 0.3s cubic-bezier(0.4,0,0.2,1);',
    '  padding-bottom: env(safe-area-inset-bottom, 0);',
    '}',
    '#product-sheet.ps-open { transform: translateY(0); }',

    /* ── Sheet header (product info + close) ── */
    '#ps-header {',
    '  display: flex; align-items: center;',
    '  justify-content: space-between;',
    '  padding: 24px 56px 20px;',
    '  border-bottom: 1px solid rgba(92,53,69,0.08);',
    '  gap: 16px;',
    '}',
    '#ps-product { display: flex; align-items: center; gap: 20px; min-width: 0; }',
    '#ps-img-wrap {',
    '  width: 64px; height: 64px; flex-shrink: 0;',
    '  overflow: hidden; background: var(--panel);',
    '}',
    '#ps-img-wrap img { width: 100%; height: 100%; object-fit: cover; display: block; }',
    '#ps-name {',
    '  font-family: var(--ff-serif);',
    '  font-size: 22px; font-weight: 400;',
    '  color: var(--charcoal); margin: 0 0 4px; line-height: 1.1;',
    '}',
    '#ps-specs {',
    '  font-family: var(--ff-sans);',
    '  font-size: 10px; letter-spacing: 0.09em;',
    '  color: var(--mauve-dark); margin: 0;',
    '}',
    '#ps-close {',
    '  background: none; border: none; cursor: pointer;',
    '  color: var(--text-muted); padding: 6px;',
    '  line-height: 0; transition: color 0.2s; flex-shrink: 0;',
    '}',
    '#ps-close:hover { color: var(--charcoal); }',

    /* ── Tier rows ── */
    '#ps-tiers { padding: 8px 0; }',
    '.ps-tier {',
    '  width: 100%; display: flex; align-items: center;',
    '  padding: 15px 56px;',
    '  background: none; border: none; cursor: pointer;',
    '  text-align: left; gap: 14px;',
    '  transition: background 0.15s;',
    '}',
    '.ps-tier:hover { background: rgba(92,53,69,0.045); }',
    '.ps-tier-dot {',
    '  width: 15px; height: 15px; border-radius: 50%; flex-shrink: 0;',
    '  border: 1.5px solid rgba(92,53,69,0.28);',
    '}',
    '.ps-tier-name {',
    '  font-family: var(--ff-sans);',
    '  font-size: 10px; letter-spacing: 0.18em;',
    '  text-transform: uppercase;',
    '  color: var(--charcoal); flex: 1;',
    '}',
    '.ps-tier-price {',
    '  font-family: var(--ff-sans);',
    '  font-size: 13px; letter-spacing: 0.04em;',
    '  color: var(--mauve-dark); margin-right: 10px;',
    '}',
    '.ps-tier-save {',
    '  font-family: var(--ff-sans);',
    '  font-size: 9px; letter-spacing: 0.14em;',
    '  text-transform: uppercase; color: var(--text-muted);',
    '  min-width: 56px; text-align: right;',
    '}',
    '.ps-tier-single { border-bottom: 1px solid rgba(92,53,69,0.08); }',

    /* ── Shipping note ── */
    '#ps-footer {',
    '  text-align: center;',
    '  font-size: 9px; letter-spacing: 0.18em;',
    '  text-transform: uppercase; color: var(--text-muted);',
    '  padding: 16px 56px 28px;',
    '  border-top: 1px solid rgba(92,53,69,0.08);',
    '}',

    /* ── Mobile sheet ── */
    '@media (max-width: 768px) {',
    '  #ps-header { padding: 18px 20px 16px; gap: 12px; }',
    '  .ps-tier { padding: 17px 20px; }',
    '  #ps-footer { padding: 14px 20px 24px; }',
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

  function _bestTier(count) {
    for (var t = BUNDLE_TIERS.length - 1; t >= 0; t--) {
      if (count >= BUNDLE_TIERS[t].limit) return BUNDLE_TIERS[t];
    }
    return null;
  }

  function _calcPrice(count) {
    var tier = _bestTier(count);
    if (!tier) return count * SINGLE_PRICE;
    return tier.price + (count - tier.limit) * SINGLE_PRICE;
  }

  function _discountPct(count) {
    if (count === 0) return 0;
    return Math.round((1 - _calcPrice(count) / (count * SINGLE_PRICE)) * 100);
  }

  function _nextTier(count) {
    for (var t = 0; t < BUNDLE_TIERS.length; t++) {
      if (BUNDLE_TIERS[t].limit > count) return BUNDLE_TIERS[t];
    }
    return null;
  }

  // ── Sheet state ───────────────────────────────────────────────────────────
  var backdrop, sheet, psImg, psName, psSpecs, psTiers;
  var sheetProduct = null;

  // ── Init ────────────────────────────────────────────────────────────────────
  function _init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // ── Build backdrop ──
    backdrop = document.createElement('div');
    backdrop.id = 'ps-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', _closeSheet);

    // ── Build product sheet ──
    sheet = document.createElement('div');
    sheet.id = 'product-sheet';
    sheet.setAttribute('aria-hidden', 'true');
    sheet.innerHTML = [
      '<div id="ps-header">',
      '  <div id="ps-product">',
      '    <div id="ps-img-wrap"><img id="ps-img" src="" alt=""></div>',
      '    <div>',
      '      <p id="ps-name"></p>',
      '      <p id="ps-specs"></p>',
      '    </div>',
      '  </div>',
      '  <button id="ps-close" aria-label="Close">',
      '    <svg width="18" height="18" viewBox="0 0 20 20" fill="none"',
      '         stroke="currentColor" stroke-width="1.5" stroke-linecap="round">',
      '      <line x1="4" y1="4" x2="16" y2="16"/>',
      '      <line x1="16" y1="4" x2="4" y2="16"/>',
      '    </svg>',
      '  </button>',
      '</div>',
      '<div id="ps-tiers"></div>',
      '<p id="ps-footer">Free shipping on every set</p>',
    ].join('');
    document.body.appendChild(sheet);

    psImg   = sheet.querySelector('#ps-img');
    psName  = sheet.querySelector('#ps-name');
    psSpecs = sheet.querySelector('#ps-specs');
    psTiers = sheet.querySelector('#ps-tiers');

    sheet.querySelector('#ps-close').addEventListener('click', _closeSheet);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && sheet.classList.contains('ps-open')) _closeSheet();
    });

    // ── Build bundle bar ──
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

    // ── Wire product cards ──
    document.querySelectorAll('.product-card[data-id]').forEach(function (card) {
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
          e.stopPropagation();
          if (bundleLimit > 0) _toggleBundleSelect(card);
        });
      }

      card.addEventListener('click', function () {
        if (bundleLimit > 0) {
          _toggleBundleSelect(card);
        } else {
          _openSheet({
            id:    card.dataset.id,
            name:  card.dataset.name,
            price: Number(card.dataset.price),
            image: card.dataset.image,
            card:  card,
          });
        }
      });
    });
  }

  // ── Product sheet ─────────────────────────────────────────────────────────
  function _openSheet(product) {
    sheetProduct = product;

    psImg.src = product.image || '';
    psImg.alt = product.name;
    psName.textContent = product.name;
    psSpecs.textContent = '$' + product.price + ' \u00b7 ~8\u2033 square \u00b7 Beige & Metallic Rose';

    // Build tier rows
    psTiers.innerHTML = '';

    // Single item row
    var singleBtn = document.createElement('button');
    singleBtn.className = 'ps-tier ps-tier-single';
    singleBtn.setAttribute('type', 'button');
    singleBtn.innerHTML =
      '<span class="ps-tier-dot"></span>' +
      '<span class="ps-tier-name">Just this one</span>' +
      '<span class="ps-tier-price">$' + SINGLE_PRICE + '</span>' +
      '<span class="ps-tier-save"></span>';
    singleBtn.addEventListener('click', function () {
      if (typeof window.addToCart === 'function') {
        window.addToCart(product.id, product.name, product.price, product.image);
      }
      _closeSheet();
      var cartIcon = document.getElementById('cart-icon');
      if (cartIcon) cartIcon.click();
    });
    psTiers.appendChild(singleBtn);

    // Bundle tier rows
    BUNDLE_TIERS.forEach(function (tier) {
      var disc = _discountPct(tier.limit);
      var btn = document.createElement('button');
      btn.className = 'ps-tier';
      btn.setAttribute('type', 'button');
      btn.innerHTML =
        '<span class="ps-tier-dot"></span>' +
        '<span class="ps-tier-name">' + tier.name + '</span>' +
        '<span class="ps-tier-price">$' + tier.price + '</span>' +
        '<span class="ps-tier-save">Save ' + disc + '%</span>';
      btn.addEventListener('click', function () {
        var srcCard = product.card;
        _closeSheet();
        _activateBundle(tier.limit, tier.price, tier.name);
        if (srcCard) _toggleBundleSelect(srcCard);
      });
      psTiers.appendChild(btn);
    });

    sheet.classList.add('ps-open');
    sheet.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('ps-open');
  }

  function _closeSheet() {
    sheet.classList.remove('ps-open');
    sheet.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('ps-open');
    sheetProduct = null;
  }

  // ── Bundle logic ─────────────────────────────────────────────────────────────
  function _activateBundle(limit, price, title) {
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

    bbTitle.textContent = tier ? tier.name : bundleTitle;

    bbDots.innerHTML = '';
    for (var i = 0; i < bundleLimit; i++) {
      var dot = document.createElement('span');
      dot.className = 'bb-dot' + (i < count ? ' bb-dot--filled' : '');
      bbDots.appendChild(dot);
    }

    if (count === 0) {
      bbCount.textContent = 'Select ' + bundleLimit + ' to start';
    } else if (disc > 0) {
      bbCount.textContent = count + ' selected \u00b7 ' + disc + '% off';
    } else {
      bbCount.textContent = count + ' selected';
    }

    if (count >= bundleLimit) {
      bbAdd.textContent = 'Add to Cart \u00b7 $' + price;
      bbAdd.disabled = false;
    } else {
      bbAdd.textContent = 'Select ' + (bundleLimit - count) + ' more';
      bbAdd.disabled = true;
    }

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

    var existingCart = typeof window.getCart === 'function' ? window.getCart() : [];
    var mergedNames  = [];
    var mergedCount  = 0;
    var mergedImg    = firstImg;

    existingCart.forEach(function (item) {
      if (item.meta && item.meta.bundleCount) {
        var stripped = item.name.replace(/^[^\u00b7]+\u00b7\s*/, '');
        mergedNames  = mergedNames.concat(stripped.split(' \u00b7 '));
        mergedCount += item.meta.bundleCount * item.quantity;
        if (!mergedImg && item.image) mergedImg = item.image;
        window.removeFromCart(item.id);
      }
    });

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

  // ── Boot ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
