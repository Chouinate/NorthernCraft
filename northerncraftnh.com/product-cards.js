/**
 * NorthernCraft — Product Cards & Bundle Selection
 *
 * Desktop: click card → banner slides up, keep clicking to build a set.
 * Mobile:  click card → bottom-sheet modal with single-buy or Build a Set.
 *          Build a Set → slim banner with tier pills + cart icon button.
 */
(function () {
  'use strict';

  /* ─────────────────────────── pricing helpers ───────────────────────── */
  var TIERS = [
    { limit: 2,  price: 55,  name: 'Pair'     },
    { limit: 4,  price: 89,  name: 'Set of 4' },
    { limit: 6,  price: 119, name: 'Set of 6' },
    { limit: 12, price: 199, name: 'Full Wall' },
  ];
  var PRICE_MAP = [0, 35, 55, 75, 89, 104, 119, 136, 152, 167, 182, 191, 199];
  var SINGLE = 35;

  function bestTier(n) {
    for (var i = TIERS.length - 1; i >= 0; i--)
      if (n >= TIERS[i].limit) return TIERS[i];
    return null;
  }
  function calcPrice(n) {
    if (n <= 0) return 0;
    if (n <= 12) return PRICE_MAP[n];
    return Math.round(PRICE_MAP[12] / 12 * n);
  }
  function savePct(n) {
    if (!n) return 0;
    var exact = (1 - calcPrice(n) / (n * SINGLE)) * 100;
    return Math.floor(exact / 10) * 10;
  }
  function nextTier(n) {
    for (var i = 0; i < TIERS.length; i++)
      if (TIERS[i].limit > n) return TIERS[i];
    return null;
  }
  function isMobile() {
    return window.matchMedia && window.matchMedia('(max-width:768px)').matches;
  }

  /* ──────────────────────────────── state ───────────────────────────── */
  var activeProd = null;
  var selected   = [];
  var sheetCard  = null;  // card currently shown in mobile modal

  /* ──────────────────────────────── DOM refs ─────────────────────────── */
  var bar, barThumb, barName, barSpecs, barMsg, barAdd, barBack;
  var tierLabels = [];
  var sheet, sheetOverlay, sheetImg, sheetName, sheetSpecsEl, sheetPrice,
      sheetAddBtn, sheetBuildBtn;

  /* ──────────────────────────────── CSS ─────────────────────────────── */
  var CART_SVG =
    '<svg width="15" height="15" viewBox="0 0 16 16" fill="none" aria-hidden="true">' +
    '<path d="M1 1.5h2l1.8 7.5h7.4l1.8-6H4.6" stroke="currentColor" stroke-width="1.4"' +
    ' stroke-linecap="round" stroke-linejoin="round"/>' +
    '<circle cx="7" cy="13.5" r="1.1" fill="currentColor"/>' +
    '<circle cx="12" cy="13.5" r="1.1" fill="currentColor"/>' +
    '</svg>';

  var CSS = [

    /* nav cart */
    '.nav-cart-icon{background:none;border:none;cursor:pointer;',
    '  color:var(--charcoal);display:flex;align-items:center;padding:2px;transition:color .2s}',
    '.nav-cart-icon:hover{color:var(--mauve)}',

    /* ── bundle bar (desktop) ───────────────────────────────────────── */
    '#bundle-bar{',
    '  position:fixed;bottom:0;left:0;right:0;',
    '  background:var(--cream);',
    '  border-top:1px solid rgba(92,53,69,.12);',
    '  box-shadow:0 -4px 24px rgba(42,37,35,.1);',
    '  z-index:190;',
    '  display:grid;grid-template-columns:1fr auto 1fr;grid-template-rows:auto auto;align-items:center;',
    '  transform:translateY(100%);',
    '  transition:transform .3s cubic-bezier(.4,0,.2,1);',
    '}',
    '#bundle-bar.bb-on{transform:translateY(0)}',

    '#bb-prod{',
    '  display:flex;align-items:center;gap:16px;',
    '  padding:14px 26px 14px 18px;',
    '}',
    '#bb-img-wrap{width:72px;height:72px;flex-shrink:0;overflow:hidden;background:var(--panel)}',
    '#bb-img-wrap img{width:100%;height:100%;object-fit:cover;display:block}',
    '#bb-pname{font-family:var(--ff-serif);font-size:22px;font-weight:400;',
    '  color:var(--charcoal);margin:0 0 4px;line-height:1.1}',
    '#bb-pspecs{font-family:var(--ff-sans);font-size:11px;letter-spacing:.07em;',
    '  color:var(--mauve-dark);margin:0}',

    '#bb-tiers{',
    '  grid-column:2;grid-row:1;',
    '  display:flex;align-items:center;gap:8px;flex-wrap:wrap;',
    '  justify-content:center;padding:14px 32px 6px;',
    '}',
    '#bb-mid{',
    '  grid-column:2;grid-row:2;',
    '  display:flex;flex-direction:column;',
    '  align-items:center;justify-content:center;',
    '  padding:0 32px 14px;text-align:center;',
    '}',
    '#bb-prod{grid-row:1/3}',
    '#bb-acts{grid-column:3;grid-row:1/3}',

    '.bb-tier{',
    '  padding:7px 16px;',
    '  border:1.5px solid rgba(92,53,69,.16);',
    '  font-family:var(--ff-sans);font-size:11px;letter-spacing:.13em;',
    '  text-transform:uppercase;color:rgba(92,53,69,.45);',
    '  white-space:nowrap;pointer-events:none;user-select:none;',
    '  transition:border-color .2s,color .2s,background .2s;',
    '}',
    '.bb-tier.bb-reached{',
    '  border-color:var(--mauve-dark);color:var(--mauve-dark);',
    '  background:rgba(92,53,69,.05);',
    '}',
    '.bb-tier-num{display:none}',

    '#bb-hint{',
    '  font-family:var(--ff-sans);font-size:11px;letter-spacing:.13em;',
    '  text-transform:uppercase;color:var(--text-muted);',
    '  margin:0;text-align:center;',
    '}',

    '#bb-acts{',
    '  display:flex;flex-direction:column;align-items:stretch;',
    '  justify-content:center;gap:6px;',
    '  padding:10px 18px 10px 14px;',
    '  border-left:1px solid rgba(92,53,69,.08);',
    '  width:240px;margin-left:auto;',
    '}',
    '#bb-back{',
    '  background:none;border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:10px;letter-spacing:.18em;',
    '  text-transform:uppercase;color:var(--text-muted);',
    '  padding:0;transition:color .2s;text-align:center;',
    '}',
    '#bb-back:hover{color:var(--mauve-dark)}',
    '#bb-add{',
    '  background:var(--mauve-dark);color:#fff;border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:11px;letter-spacing:.18em;',
    '  text-transform:uppercase;padding:11px 14px;',
    '  white-space:nowrap;',
    '  transition:background .2s,opacity .2s;',
    '}',
    '#bb-add[disabled]{opacity:.35;cursor:not-allowed}',
    '#bb-add:not([disabled]):hover{background:var(--mauve)}',

    'body.bb-active{padding-bottom:86px}',

    /* ── product select circles ──────────────────────────────────────── */
    '.psc{',
    '  position:absolute;top:10px;right:10px;',
    '  width:24px;height:24px;border-radius:50%;',
    '  background:rgba(236,232,225,.88);',
    '  border:1.5px solid rgba(92,53,69,.32);',
    '  cursor:pointer;padding:0;',
    '  display:flex;align-items:center;justify-content:center;',
    '  opacity:0;pointer-events:none;z-index:3;',
    '  transition:opacity .2s,background .15s,border-color .15s;',
    '}',
    '.bb-active .psc{opacity:1;pointer-events:auto}',
    '.bb-active .product-card{cursor:pointer}',
    '.product-card.pc-sel .psc{background:var(--mauve-dark);border-color:var(--mauve-dark)}',
    '.psc path{opacity:0;transition:opacity .15s}',
    '.product-card.pc-sel .psc path{opacity:1}',

    /* ── mobile bottom-sheet modal ───────────────────────────────────── */
    '#bb-sheet-overlay{',
    '  display:none;position:fixed;inset:0;',
    '  background:rgba(42,37,35,.5);z-index:200;',
    '  opacity:0;pointer-events:none;',
    '  transition:opacity .25s;',
    '}',
    '#bb-sheet{',
    '  display:none;position:fixed;bottom:0;left:0;right:0;',
    '  box-sizing:border-box;max-width:100vw;',
    '  background:var(--cream);z-index:201;',
    '  border-radius:16px 16px 0 0;',
    '  transform:translateY(100%);',
    '  transition:transform .3s cubic-bezier(.4,0,.2,1);',
    '  max-height:92vh;',
    '  display:flex;flex-direction:column;',
    '}',
    '#bb-sheet.bb-on{transform:translateY(0)}',
    '#bb-sheet-overlay.bb-on{opacity:1;pointer-events:auto}',
    '#bb-sheet-handle{',
    '  flex-shrink:0;width:36px;height:4px;background:rgba(92,53,69,.2);',
    '  border-radius:2px;margin:14px auto 8px;cursor:grab;',
    '}',
    '#bb-sheet-body{',
    '  overflow-y:auto;-webkit-overflow-scrolling:touch;',
    '  padding:8px 20px 44px;',
    '}',
    '#bb-sheet-img{width:100%;aspect-ratio:1/1;object-fit:cover;display:block;margin-bottom:18px;}',
    '#bb-sheet-name{font-family:var(--ff-serif);font-size:30px;font-weight:400;',
    '  color:var(--charcoal);margin:0 0 5px;}',
    '#bb-sheet-specs{font-family:var(--ff-sans);font-size:11px;letter-spacing:.07em;',
    '  color:var(--mauve-dark);margin:0 0 6px;}',
    '#bb-sheet-price{font-family:var(--ff-serif);font-size:24px;',
    '  color:var(--charcoal);margin:0 0 22px;}',
    '#bb-sheet-add-btn{',
    '  display:block;width:100%;box-sizing:border-box;',
    '  background:var(--mauve-dark);color:#fff;border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:11px;letter-spacing:.18em;',
    '  text-transform:uppercase;padding:15px;margin-bottom:10px;',
    '  transition:background .2s;',
    '}',
    '#bb-sheet-add-btn:hover{background:var(--mauve)}',
    '#bb-sheet-build-btn{',
    '  display:block;width:100%;box-sizing:border-box;',
    '  background:none;border:1.5px solid rgba(92,53,69,.22);cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:11px;letter-spacing:.18em;',
    '  text-transform:uppercase;padding:14px;',
    '  color:var(--mauve-dark);transition:border-color .2s,background .2s;',
    '}',
    '#bb-sheet-build-btn:hover{background:rgba(92,53,69,.04);border-color:var(--mauve-dark)}',
    '#bb-sheet-build-sub{',
    '  font-family:var(--ff-sans);font-size:9px;letter-spacing:.1em;',
    '  text-transform:uppercase;color:var(--text-muted);',
    '  text-align:center;margin:9px 0 0;',
    '}',

    /* ── MOBILE ≤ 768px ──────────────────────────────────────────────── */
    '@media(max-width:768px){',

    /* show modal elements */
    '  #bb-sheet-overlay{display:block}',
    '  #bb-sheet{display:block}',

    /* slim single-row banner: tier pills + cart button */
    '  #bundle-bar{',
    '    display:flex;flex-direction:row;align-items:stretch;min-height:54px;',
    '  }',
    '  body.bb-active{padding-bottom:62px}',

    /* hide product info, hint, back button */
    '  #bb-prod,#bb-mid,#bb-back{display:none}',

    /* tiers: scrollable row filling width, centered when content fits */
    '  #bb-tiers{',
    '    flex:1;display:flex;flex-wrap:nowrap;',
    '    overflow-x:auto;-webkit-overflow-scrolling:touch;',
    '    align-items:center;justify-content:center;gap:6px;padding:0 12px;',
    '    scrollbar-width:none;',
    '    grid-column:unset;grid-row:unset;',
    '  }',
    '  #bb-tiers::-webkit-scrollbar{display:none}',
    '  .bb-tier{font-size:9px;padding:5px 10px;flex-shrink:0}',
    '  .bb-tier-name{display:none}',
    '  .bb-tier-num{display:inline}',

    /* actions: compact, full-height cart button */
    '  #bb-acts{',
    '    display:flex;flex-direction:row;align-items:stretch;',
    '    justify-content:flex-start;',
    '    padding:0;width:auto;margin-left:0;gap:0;',
    '    border-left:1px solid rgba(92,53,69,.1);',
    '    grid-column:unset;grid-row:unset;',
    '  }',
    '  #bb-add{',
    '    display:flex;align-items:center;justify-content:center;',
    '    gap:6px;padding:0 18px;font-size:13px;letter-spacing:.12em;',
    '    align-self:stretch;width:auto;',
    '  }',

    '}',

  ].join('\n');

  /* ──────────────────────────────── init ─────────────────────────────── */
  function init() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);

    /* ── desktop banner ── */
    bar = document.createElement('div');
    bar.id = 'bundle-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML =
      '<div id="bb-prod">' +
        '<div id="bb-img-wrap"><img id="bb-img" src="" alt=""></div>' +
        '<div>' +
          '<p id="bb-pname"></p>' +
          '<p id="bb-pspecs"></p>' +
        '</div>' +
      '</div>' +
      '<div id="bb-mid"><p id="bb-hint"></p></div>' +
      '<div id="bb-tiers"></div>' +
      '<div id="bb-acts">' +
        '<button id="bb-back">Back to grid</button>' +
        '<button id="bb-add" disabled type="button">Add to Cart</button>' +
      '</div>';

    document.body.appendChild(bar);

    barThumb = bar.querySelector('#bb-img');
    barName  = bar.querySelector('#bb-pname');
    barSpecs = bar.querySelector('#bb-pspecs');
    barMsg   = bar.querySelector('#bb-hint');
    barAdd   = bar.querySelector('#bb-add');
    barBack  = bar.querySelector('#bb-back');

    var tiersEl = bar.querySelector('#bb-tiers');
    TIERS.forEach(function (t) {
      var el = document.createElement('span');
      el.className = 'bb-tier';
      el.dataset.limit = t.limit;
      el.innerHTML =
        '<span class="bb-tier-name">' + t.name + '</span>' +
        '<span class="bb-tier-num">' + t.limit + '</span>' +
        '\u00a0\u00b7\u00a0$' + t.price;
      tiersEl.appendChild(el);
      tierLabels.push(el);
    });

    barBack.addEventListener('click', function () {
      var grid = document.getElementById('collection');
      if (grid) grid.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    barAdd.addEventListener('click', handleAdd);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') {
        if (sheet.classList.contains('bb-on')) hideModal();
        else deactivate();
      }
    });

    /* ── mobile bottom-sheet modal ── */
    sheetOverlay = document.createElement('div');
    sheetOverlay.id = 'bb-sheet-overlay';
    sheetOverlay.addEventListener('click', hideModal);

    sheet = document.createElement('div');
    sheet.id = 'bb-sheet';
    sheet.innerHTML =
      '<div id="bb-sheet-handle"></div>' +
      '<div id="bb-sheet-body">' +
        '<div id="bb-sheet-drag">' +
          '<img id="bb-sheet-img" src="" alt="">' +
          '<p id="bb-sheet-name"></p>' +
          '<p id="bb-sheet-specs">~8\u2033 Square<br>Beige &amp; Metallic Rose</p>' +
          '<p id="bb-sheet-price"></p>' +
        '</div>' +
        '<button id="bb-sheet-add-btn" type="button">Add to Cart</button>' +
        '<button id="bb-sheet-build-btn" type="button">Build a Set</button>' +
        '<p id="bb-sheet-build-sub">Up to 50% off when you build a set</p>' +
      '</div>';

    document.body.appendChild(sheetOverlay);
    document.body.appendChild(sheet);

    sheetImg      = sheet.querySelector('#bb-sheet-img');
    sheetName     = sheet.querySelector('#bb-sheet-name');
    sheetSpecsEl  = sheet.querySelector('#bb-sheet-specs');
    sheetPrice    = sheet.querySelector('#bb-sheet-price');
    sheetAddBtn   = sheet.querySelector('#bb-sheet-add-btn');
    sheetBuildBtn = sheet.querySelector('#bb-sheet-build-btn');

    sheetAddBtn.addEventListener('click', handleSheetAdd);
    sheetBuildBtn.addEventListener('click', handleSheetBuild);
    wireSheetSwipe();

    /* wire product cards */
    document.querySelectorAll('.product-card[data-id]').forEach(wireCard);
  }

  /* ── wire a card ──────────────────────────────────────────────────── */
  function wireCard(card) {
    var wrap = card.querySelector('.product-card-img');
    if (wrap) {
      var circle = document.createElement('button');
      circle.className = 'psc';
      circle.setAttribute('type', 'button');
      circle.setAttribute('aria-label', 'Select ' + (card.dataset.name || '') + ' for bundle');
      circle.innerHTML =
        '<svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">' +
        '<path d="M1 4l2.5 2.5L9 1" stroke="white" stroke-width="1.5"' +
        ' stroke-linecap="round" stroke-linejoin="round"/></svg>';
      wrap.appendChild(circle);
      circle.addEventListener('click', function (e) {
        e.stopPropagation();
        toggleCard(card);
      });
    }

    card.addEventListener('click', function () {
      if (isMobile()) {
        if (bar.classList.contains('bb-on')) {
          toggleCard(card);   // already in selection mode — just toggle
        } else {
          showModal(card);    // first tap — show modal
        }
      } else {
        if (bar.classList.contains('bb-on')) {
          toggleCard(card);
        } else {
          activate(card);
        }
      }
    });
  }

  /* ── mobile modal ─────────────────────────────────────────────────── */
  function lockScroll() {
    document.body.style.overflowY    = 'hidden';
    document.body.style.touchAction  = 'none';
  }
  function unlockScroll() {
    document.body.style.overflowY    = '';
    document.body.style.touchAction  = '';
  }

  function showModal(card) {
    sheetCard = card;
    sheetImg.src           = card.dataset.image || '';
    sheetImg.alt           = card.dataset.name  || '';
    sheetName.textContent  = card.dataset.name  || '';
    sheetPrice.textContent = '$' + (Number(card.dataset.price) || SINGLE);
    sheet.style.transition = '';
    sheet.style.transform  = '';
    sheetOverlay.classList.add('bb-on');
    sheet.classList.add('bb-on');
    lockScroll();
  }

  function hideModal() {
    sheetOverlay.classList.remove('bb-on');
    sheet.classList.remove('bb-on');
    sheet.style.transform = '';
    unlockScroll();
    sheetCard = null;
  }

  function wireSheetSwipe() {
    var dragZone  = sheet.querySelector('#bb-sheet-drag');
    var startY    = 0;
    var startTime = 0;
    var dy        = 0;
    var active    = false;

    dragZone.addEventListener('touchstart', function (e) {
      startY    = e.touches[0].clientY;
      startTime = Date.now();
      dy        = 0;
      active    = false;
      sheet.style.transition = 'none';
    }, { passive: true });

    dragZone.addEventListener('touchmove', function (e) {
      var delta = e.touches[0].clientY - startY;
      if (!active && delta > 8) active = true;
      if (!active) return;
      e.preventDefault();
      dy = Math.max(0, delta);
      sheet.style.transform = 'translateY(' + dy + 'px)';
    }, { passive: false });

    dragZone.addEventListener('touchend', function () {
      sheet.style.transition = '';
      var elapsed  = Date.now() - startTime;
      var velocity = dy / elapsed; // px/ms
      var fastFlick = velocity > 0.4 && dy > 20;
      var farEnough = dy > sheet.offsetHeight * 0.25;
      if (active && (fastFlick || farEnough)) {
        hideModal();
      } else {
        sheet.style.transform = 'translateY(0)';
      }
      dy     = 0;
      active = false;
    });

    sheetOverlay.addEventListener('touchmove', function (e) {
      e.preventDefault();
    }, { passive: false });
  }

  function handleSheetAdd() {
    if (!sheetCard || typeof window.addToCart !== 'function') return;
    window.addToCart(
      sheetCard.dataset.id,
      sheetCard.dataset.name,
      Number(sheetCard.dataset.price) || SINGLE,
      sheetCard.dataset.image || ''
    );
    hideModal();
    var icon = document.getElementById('cart-icon');
    if (icon) icon.click();
  }

  function handleSheetBuild() {
    var card = sheetCard;
    hideModal();
    activate(card);   // enters selection mode, adds this card
  }

  /* ── activate (enter selection mode) ─────────────────────────────── */
  function activate(card) {
    selected.forEach(function (c) { c.classList.remove('pc-sel'); });
    selected = [card];
    card.classList.add('pc-sel');

    activeProd = {
      id:    card.dataset.id,
      name:  card.dataset.name,
      price: Number(card.dataset.price) || SINGLE,
      image: card.dataset.image || '',
    };

    barThumb.src = activeProd.image;
    barThumb.alt = activeProd.name;
    barName.textContent = activeProd.name;
    barSpecs.innerHTML = '~8\u2033 Square<br>Beige &amp; Metallic Rose';

    bar.classList.add('bb-on');
    bar.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bb-active');
    updateBar();
  }

  /* ── toggle a card ────────────────────────────────────────────────── */
  function toggleCard(card) {
    var i = selected.indexOf(card);
    if (i >= 0) {
      selected.splice(i, 1);
      card.classList.remove('pc-sel');
      if (selected.length === 0) { deactivate(); return; }
      var show = selected[selected.length - 1];
      barThumb.src = show.dataset.image || '';
      barThumb.alt = show.dataset.name  || '';
      barName.textContent = show.dataset.name || '';
    } else {
      selected.push(card);
      card.classList.add('pc-sel');
      barThumb.src = card.dataset.image || '';
      barThumb.alt = card.dataset.name  || '';
      barName.textContent = card.dataset.name || '';
    }
    updateBar();
  }

  /* ── update bar state ─────────────────────────────────────────────── */
  function updateBar() {
    var n     = selected.length;
    var cur   = bestTier(n);
    var nxt   = nextTier(n);
    var price = calcPrice(n);

    tierLabels.forEach(function (el) {
      el.classList.toggle('bb-reached', !!(cur && parseInt(el.dataset.limit, 10) <= cur.limit));
    });

    if (nxt) {
      var need = nxt.limit - n;
      barMsg.textContent = 'Add\u00a0' + need + '\u00a0more to save\u00a0' + savePct(nxt.limit) + '%+';
    } else if (n > 0) {
      barMsg.textContent = savePct(n) + '%+\u00a0off';
    } else {
      barMsg.textContent = '';
    }

    if (n > 0) {
      if (isMobile()) {
        barAdd.innerHTML = CART_SVG + '\u00a0$' + price;
      } else {
        barAdd.textContent = 'Add to Cart\u00a0\u00b7\u00a0$' + price;
      }
      barAdd.disabled = false;
    } else {
      if (isMobile()) {
        barAdd.innerHTML = CART_SVG;
      } else {
        barAdd.textContent = 'Add to Cart';
      }
      barAdd.disabled = true;
    }
  }

  /* ── deactivate ───────────────────────────────────────────────────── */
  function deactivate() {
    selected.forEach(function (c) { c.classList.remove('pc-sel'); });
    selected   = [];
    activeProd = null;
    document.body.classList.remove('bb-active');
    bar.classList.remove('bb-on');
    bar.setAttribute('aria-hidden', 'true');
  }

  /* ── add to cart (banner) ─────────────────────────────────────────── */
  function handleAdd() {
    if (!selected.length || typeof window.addToCart !== 'function') return;

    if (selected.length === 1) {
      window.addToCart(activeProd.id, activeProd.name, SINGLE, activeProd.image);
    } else {
      var newNames = selected.map(function (c) { return c.dataset.name; });
      var img0     = selected[0].dataset.image || '';
      var cart     = typeof window.getCart === 'function' ? window.getCart() : [];
      var mNames = [], mCount = 0, mImg = img0;

      cart.forEach(function (item) {
        if (item.meta && item.meta.bundleCount) {
          mNames  = mNames.concat(item.name.replace(/^[^\u00b7]+\u00b7\s*/, '').split(' \u00b7 '));
          mCount += item.meta.bundleCount * item.quantity;
          if (!mImg && item.image) mImg = item.image;
          window.removeFromCart(item.id);
        }
      });

      mNames  = mNames.concat(newNames);
      mCount += newNames.length;

      var tier  = bestTier(mCount);
      var price = calcPrice(mCount);
      var disc  = savePct(mCount);
      var next  = nextTier(mCount);
      var id    = 'bundle-' + mCount + '-' + Date.now();
      var tname = tier ? tier.name : 'Bundle';
      var hint  = next
        ? 'Add ' + (next.limit - mCount) + ' more to save ' + savePct(next.limit) + '%'
        : '';

      window.addToCart(id, tname + ' \u00b7 ' + mNames.join(' \u00b7 '), price, mImg, {
        bundleCount: mCount,
        discountPct: disc,
        nextHint:    hint,
      });
    }

    deactivate();
    var icon = document.getElementById('cart-icon');
    if (icon) icon.click();
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
