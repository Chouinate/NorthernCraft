/**
 * NorthernCraft — Product Cards & Bundle Selection
 *
 * DESKTOP  Click product → compact 3-zone bar slides up.
 *          Tier buttons in centre; clicking one highlights it and
 *          enables multi-select on the grid above.
 *
 * MOBILE   Click product → full-height tier-list sheet slides up.
 *          Clicking a tier collapses the sheet to a thin progress bar
 *          so the grid is visible for card-tapping.
 */
(function () {
  'use strict';

  /* ─────────────────────────── pricing helpers ───────────────────────── */
  var TIERS = [
    { limit: 2,  price: 55,  name: 'Pair'      },
    { limit: 4,  price: 89,  name: 'Set of 4'  },
    { limit: 6,  price: 119, name: 'Set of 6'  },
    { limit: 12, price: 199, name: 'Full Wall'  },
  ];
  var SINGLE = 35;

  function bestTier(n) {
    for (var i = TIERS.length - 1; i >= 0; i--)
      if (n >= TIERS[i].limit) return TIERS[i];
    return null;
  }
  function calcPrice(n) {
    var t = bestTier(n);
    return t ? t.price + (n - t.limit) * SINGLE : n * SINGLE;
  }
  function savePct(n) {
    if (!n) return 0;
    return Math.round((1 - calcPrice(n) / (n * SINGLE)) * 100);
  }
  function nextTier(n) {
    for (var i = 0; i < TIERS.length; i++)
      if (TIERS[i].limit > n) return TIERS[i];
    return null;
  }

  /* ──────────────────────────────── state ───────────────────────────── */
  var activeProd  = null;   // { id, name, price, image, card }
  var activeTier  = null;   // null = "Just This One"; else TIERS entry
  var selected    = [];     // selected .product-card elements

  /* ──────────────────────────────── DOM refs ─────────────────────────── */
  var backdrop, bar, prog;
  var barThumb, barName, barSpecs;
  var barTiersEl, barMsg;
  var barAdd, barBack;
  var progInfo, progAdd, progChange;
  var tierBtns = [];

  /* ──────────────────────────────── CSS ─────────────────────────────── */
  var CSS = [

    /* nav cart */
    '.nav-cart-icon{background:none;border:none;cursor:pointer;color:var(--charcoal);display:flex;align-items:center;padding:2px;transition:color .2s}',
    '.nav-cart-icon:hover{color:var(--mauve)}',

    /* backdrop — mobile only */
    '#bb-backdrop{position:fixed;inset:0;background:rgba(42,37,35,.45);z-index:189;opacity:0;pointer-events:none;transition:opacity .25s}',
    '#bb-backdrop.bb-on{opacity:1;pointer-events:auto}',

    /* ── main bar ──────────────────────────────────────────────────── */
    '#bundle-bar{',
    '  position:fixed;bottom:0;left:0;right:0;',
    '  background:var(--cream);',
    '  border-top:1px solid rgba(92,53,69,.12);',
    '  box-shadow:0 -4px 24px rgba(42,37,35,.1);',
    '  z-index:190;',
    '  display:flex;align-items:stretch;',
    '  transform:translateY(100%);',
    '  transition:transform .3s cubic-bezier(.4,0,.2,1);',
    '}',
    '#bundle-bar.bb-on{transform:translateY(0)}',

    /* close — mobile only */
    '#bb-close{display:none;position:absolute;top:12px;right:14px;',
    '  background:none;border:none;cursor:pointer;',
    '  color:var(--text-muted);padding:4px;line-height:0;transition:color .2s}',
    '#bb-close:hover{color:var(--charcoal)}',

    /* zone: left – product info */
    '#bb-prod{',
    '  display:flex;align-items:center;gap:14px;',
    '  padding:14px 24px 14px 18px;',
    '  flex-shrink:0;border-right:1px solid rgba(92,53,69,.08);',
    '  min-width:190px;max-width:240px;',
    '}',
    '#bb-img-wrap{width:54px;height:54px;flex-shrink:0;overflow:hidden;background:var(--panel)}',
    '#bb-img-wrap img{width:100%;height:100%;object-fit:cover;display:block}',
    '#bb-pname{font-family:var(--ff-serif);font-size:18px;font-weight:400;',
    '  color:var(--charcoal);margin:0 0 3px;line-height:1.1}',
    '#bb-pspecs{font-family:var(--ff-sans);font-size:9px;letter-spacing:.1em;',
    '  color:var(--mauve-dark);margin:0}',

    /* zone: mid – tiers + message */
    '#bb-mid{flex:1;display:flex;flex-direction:column;align-items:center;',
    '  justify-content:center;gap:7px;padding:10px 20px}',
    '#bb-tiers{display:flex;gap:5px;flex-wrap:wrap;justify-content:center}',
    '#bb-msg{font-family:var(--ff-sans);font-size:9px;letter-spacing:.14em;',
    '  text-transform:uppercase;color:var(--text-muted);margin:0;text-align:center}',

    /* tier buttons — desktop pill */
    '.bb-tier{padding:7px 13px;background:none;',
    '  border:1.5px solid rgba(92,53,69,.2);cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:9px;letter-spacing:.16em;',
    '  text-transform:uppercase;color:var(--charcoal);white-space:nowrap;',
    '  display:flex;align-items:center;gap:5px;',
    '  transition:border-color .15s,background .15s,color .15s}',
    '.bb-tier:hover{border-color:var(--mauve-dark);background:rgba(92,53,69,.04)}',
    '.bb-tier.bb-active{background:var(--mauve-dark);border-color:var(--mauve-dark);color:#fff}',
    '.bb-dot{display:none}',        /* radio dot — mobile only */
    '.bb-save{display:none}',       /* save % — mobile only */
    '.bb-tier-sep{opacity:.5}',
    '.bb-single{display:none}',     /* "Just this one" — mobile only */

    /* zone: right – actions */
    '#bb-acts{display:flex;flex-direction:column;align-items:stretch;',
    '  justify-content:center;gap:7px;',
    '  padding:10px 20px 10px 16px;',
    '  flex-shrink:0;border-left:1px solid rgba(92,53,69,.08);min-width:180px}',
    '#bb-back{background:none;border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:9px;letter-spacing:.18em;',
    '  text-transform:uppercase;color:var(--text-muted);',
    '  padding:6px 0;transition:color .2s;text-align:center}',
    '#bb-back:hover{color:var(--mauve-dark)}',
    '#bb-add{background:var(--mauve-dark);color:#fff;border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:10px;letter-spacing:.18em;',
    '  text-transform:uppercase;padding:12px 14px;',
    '  transition:background .2s,opacity .2s}',
    '#bb-add[disabled]{opacity:.35;cursor:not-allowed}',
    '#bb-add:not([disabled]):hover{background:var(--mauve)}',

    /* body padding so grid doesn't hide behind bar */
    'body.bb-active{padding-bottom:88px}',

    /* ── mobile progress bar (shown when tier active on mobile) ──────── */
    '#bb-prog{',
    '  position:fixed;bottom:0;left:0;right:0;',
    '  background:var(--mauve-dark);color:#fff;',
    '  z-index:190;',
    '  display:flex;align-items:center;gap:0;',
    '  height:52px;',
    '  transform:translateY(100%);',
    '  transition:transform .3s cubic-bezier(.4,0,.2,1);',
    '}',
    '#bb-prog.bb-on{transform:translateY(0)}',
    '#bp-cancel{background:none;border:none;cursor:pointer;',
    '  color:rgba(255,255,255,.7);padding:0 16px;height:100%;',
    '  display:flex;align-items:center;line-height:0;transition:color .2s;flex-shrink:0}',
    '#bp-cancel:hover{color:#fff}',
    '#bp-info{flex:1;font-family:var(--ff-sans);font-size:9px;letter-spacing:.16em;',
    '  text-transform:uppercase;color:rgba(255,255,255,.9);padding:0 8px}',
    '#bp-change{background:none;border:1px solid rgba(255,255,255,.35);cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:9px;letter-spacing:.14em;',
    '  text-transform:uppercase;color:rgba(255,255,255,.8);',
    '  padding:6px 12px;margin-right:8px;flex-shrink:0;transition:border-color .15s}',
    '#bp-change:hover{border-color:rgba(255,255,255,.7);color:#fff}',
    '#bp-add{background:var(--cream);color:var(--mauve-dark);border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:9px;letter-spacing:.16em;',
    '  text-transform:uppercase;padding:0 18px;height:100%;',
    '  flex-shrink:0;transition:opacity .2s}',
    '#bp-add[disabled]{opacity:.4;cursor:not-allowed}',

    /* ── product select circles ──────────────────────────────────────── */
    '.psc{position:absolute;top:10px;right:10px;width:24px;height:24px;',
    '  border-radius:50%;background:rgba(236,232,225,.88);',
    '  border:1.5px solid rgba(92,53,69,.32);cursor:pointer;padding:0;',
    '  display:flex;align-items:center;justify-content:center;',
    '  opacity:0;pointer-events:none;z-index:3;',
    '  transition:opacity .2s,background .15s,border-color .15s}',
    '.bb-selecting .psc{opacity:1;pointer-events:auto}',
    '.bb-selecting .product-card{cursor:pointer}',
    '.product-card.pc-sel .psc{background:var(--mauve-dark);border-color:var(--mauve-dark)}',
    '.psc path{opacity:0;transition:opacity .15s}',
    '.product-card.pc-sel .psc path{opacity:1}',

    /* ── MOBILE ≤ 768px ──────────────────────────────────────────────── */
    '@media(max-width:768px){',

    /* backdrop on */
    '  #bb-backdrop{display:block}',

    /* bar becomes full-height sheet */
    '  #bundle-bar{flex-direction:column;align-items:stretch;',
    '    max-height:84vh;overflow-y:auto;-webkit-overflow-scrolling:touch}',
    '  body.bb-active{padding-bottom:0}',

    /* show close button */
    '  #bb-close{display:flex}',

    /* product info zone — full width, no right border */
    '  #bb-prod{border-right:none;border-bottom:1px solid rgba(92,53,69,.08);',
    '    padding:18px 52px 18px 18px;max-width:none;min-width:auto}',

    /* mid zone — full width, left-aligned column */
    '  #bb-mid{padding:0;align-items:stretch;gap:0}',
    '  #bb-tiers{flex-direction:column;gap:0}',
    '  #bb-msg{padding:12px 18px;text-align:left;border-bottom:1px solid rgba(92,53,69,.07)}',

    /* tier rows */
    '  .bb-tier{border:none;border-bottom:1px solid rgba(92,53,69,.07);',
    '    border-radius:0;width:100%;padding:17px 18px;',
    '    justify-content:flex-start;gap:12px;font-size:10px}',
    '  .bb-tier:hover{background:rgba(92,53,69,.04);border-color:rgba(92,53,69,.07)}',
    '  .bb-tier.bb-active{background:rgba(92,53,69,.06);color:var(--charcoal);border-color:rgba(92,53,69,.07)}',

    /* show dot, save %, single */
    '  .bb-dot{display:flex;width:16px;height:16px;border-radius:50%;flex-shrink:0;',
    '    border:1.5px solid rgba(92,53,69,.28);align-items:center;justify-content:center}',
    '  .bb-tier.bb-active .bb-dot{background:var(--mauve-dark);border-color:var(--mauve-dark)}',
    '  .bb-save{display:inline;margin-left:auto;font-size:9px;',
    '    letter-spacing:.12em;color:var(--text-muted)}',
    '  .bb-tier.bb-active .bb-save{color:var(--mauve-dark)}',
    '  .bb-single{display:flex}',
    '  .bb-tier-sep{display:none}',   /* hide · on mobile rows */

    /* actions zone — horizontal row at bottom */
    '  #bb-acts{flex-direction:row;border-left:none;',
    '    border-top:1px solid rgba(92,53,69,.08);',
    '    padding:12px 18px;gap:10px;min-width:auto}',
    '  #bb-back{border:1.5px solid rgba(92,53,69,.2);padding:12px 14px;flex-shrink:0}',
    '  #bb-add{flex:1;padding:14px}',

    '}',

  ].join('\n');

  /* ──────────────────────────────── init ─────────────────────────────── */
  function init() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);

    /* backdrop */
    backdrop = document.createElement('div');
    backdrop.id = 'bb-backdrop';
    document.body.appendChild(backdrop);
    backdrop.addEventListener('click', function () {
      if (activeTier) reOpenSheet(); else deactivate();
    });

    /* ── main bar ─────────────────────────────────────────────────── */
    bar = document.createElement('div');
    bar.id = 'bundle-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML =
      /* close btn */
      '<button id="bb-close" aria-label="Close">' +
        svg(18, 'M4 4l12 12M16 4L4 16') +
      '</button>' +

      /* left: product */
      '<div id="bb-prod">' +
        '<div id="bb-img-wrap"><img id="bb-img" src="" alt=""></div>' +
        '<div>' +
          '<p id="bb-pname"></p>' +
          '<p id="bb-pspecs"></p>' +
        '</div>' +
      '</div>' +

      /* mid: tiers + msg */
      '<div id="bb-mid">' +
        '<div id="bb-tiers"></div>' +
        '<p id="bb-msg"></p>' +
      '</div>' +

      /* right: actions */
      '<div id="bb-acts">' +
        '<button id="bb-back">Back to grid</button>' +
        '<button id="bb-add" disabled type="button">Add to Cart</button>' +
      '</div>';

    document.body.appendChild(bar);

    barThumb  = bar.querySelector('#bb-img');
    barName   = bar.querySelector('#bb-pname');
    barSpecs  = bar.querySelector('#bb-pspecs');
    barTiersEl = bar.querySelector('#bb-tiers');
    barMsg    = bar.querySelector('#bb-msg');
    barAdd    = bar.querySelector('#bb-add');
    barBack   = bar.querySelector('#bb-back');

    bar.querySelector('#bb-close').addEventListener('click', deactivate);
    barBack.addEventListener('click', deactivate);
    barAdd.addEventListener('click', handleAdd);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') deactivate();
    });

    /* build tier buttons — "Just This One" first (mobile only) */
    buildTierBtn(null);
    TIERS.forEach(buildTierBtn);
    tierBtns = Array.prototype.slice.call(barTiersEl.querySelectorAll('.bb-tier'));

    /* ── mobile progress bar ─────────────────────────────────────── */
    prog = document.createElement('div');
    prog.id = 'bb-prog';
    prog.setAttribute('aria-hidden', 'true');
    prog.innerHTML =
      '<button id="bp-cancel" aria-label="Cancel">' +
        svg(12, 'M2 2l8 8M10 2L2 10') +
      '</button>' +
      '<span id="bp-info"></span>' +
      '<button id="bp-change" type="button">Change</button>' +
      '<button id="bp-add" type="button" disabled>Add to Cart</button>';

    document.body.appendChild(prog);

    progInfo   = prog.querySelector('#bp-info');
    progAdd    = prog.querySelector('#bp-add');
    progChange = prog.querySelector('#bp-change');

    prog.querySelector('#bp-cancel').addEventListener('click', deactivate);
    progChange.addEventListener('click', reOpenSheet);
    progAdd.addEventListener('click', handleAdd);

    /* ── wire product cards ──────────────────────────────────────── */
    document.querySelectorAll('.product-card[data-id]').forEach(wireCard);
  }

  /* ── tier button factory ──────────────────────────────────────────── */
  function buildTierBtn(tier) {
    var isSingle = !tier;
    var name  = isSingle ? 'Just this one' : tier.name;
    var price = isSingle ? SINGLE : tier.price;
    var disc  = isSingle ? 0 : savePct(tier.limit);

    var btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'bb-tier' + (isSingle ? ' bb-single' : '');
    if (!isSingle) btn.dataset.limit = tier.limit;

    btn.innerHTML =
      '<span class="bb-dot"></span>' +
      '<span class="bb-tier-name">' + name + '</span>' +
      '<span class="bb-tier-sep">\u00b7</span>' +
      '<span class="bb-tier-price">$' + price + '</span>' +
      '<span class="bb-save">' + (disc ? 'Save\u00a0' + disc + '%' : '') + '</span>';

    btn.addEventListener('click', function () { selectTier(tier); });
    barTiersEl.appendChild(btn);
  }

  /* ── wire a product card ──────────────────────────────────────────── */
  function wireCard(card) {
    var wrap = card.querySelector('.product-card-img');
    if (wrap) {
      var circle = document.createElement('button');
      circle.className = 'psc';
      circle.setAttribute('aria-label', 'Select ' + (card.dataset.name || '') + ' for bundle');
      circle.setAttribute('type', 'button');
      circle.innerHTML =
        '<svg width="10" height="8" viewBox="0 0 10 8" fill="none" aria-hidden="true">' +
        '<path d="M1 4l2.5 2.5L9 1" stroke="white" stroke-width="1.5"' +
        ' stroke-linecap="round" stroke-linejoin="round"/></svg>';
      wrap.appendChild(circle);
      circle.addEventListener('click', function (e) {
        e.stopPropagation();
        if (activeTier) toggleCard(card);
      });
    }

    card.addEventListener('click', function () {
      /* in bundle-selecting mode: toggle this card */
      if (activeTier && document.body.classList.contains('bb-selecting')) {
        toggleCard(card);
      } else {
        /* open / reopen bar for this product */
        activate(card);
      }
    });
  }

  /* ── open bar for a product ───────────────────────────────────────── */
  function activate(card) {
    /* clear previous */
    selected.forEach(function (c) { c.classList.remove('pc-sel'); });
    selected = [card];
    card.classList.add('pc-sel');
    activeTier = null;

    activeProd = {
      id:    card.dataset.id,
      name:  card.dataset.name,
      price: Number(card.dataset.price) || SINGLE,
      image: card.dataset.image || '',
      card:  card,
    };

    barThumb.src = activeProd.image;
    barThumb.alt = activeProd.name;
    barName.textContent = activeProd.name;
    barSpecs.textContent =
      '$' + SINGLE + '\u00a0\u00b7\u00a0~8\u2033 square\u00a0\u00b7\u00a0Beige\u00a0&\u00a0Metallic Rose';

    highlightTier(null);
    updateBar();

    /* show */
    hideProg();
    bar.classList.add('bb-on');
    bar.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('bb-on');
    document.body.classList.add('bb-active');
  }

  /* ── tier clicked ─────────────────────────────────────────────────── */
  function selectTier(tier) {
    if (!tier) {
      /* "Just This One" on mobile */
      activeTier = null;
      document.body.classList.remove('bb-selecting');
      highlightTier(null);
      updateBar();
      return;
    }

    activeTier = tier;
    document.body.classList.add('bb-selecting');
    highlightTier(tier);
    updateBar();

    /* on mobile: collapse bar → show thin progress bar */
    if (isMobile()) {
      bar.classList.remove('bb-on');
      backdrop.classList.remove('bb-on');
      showProg();
    }
  }

  /* ── highlight active tier btn ────────────────────────────────────── */
  function highlightTier(tier) {
    tierBtns.forEach(function (btn) {
      var bl = btn.dataset.limit ? parseInt(btn.dataset.limit, 10) : null;
      var tl = tier ? tier.limit : null;
      btn.classList.toggle('bb-active', bl === tl);
    });
  }

  /* ── toggle a card in/out of selection ───────────────────────────── */
  function toggleCard(card) {
    var i = selected.indexOf(card);
    if (i >= 0) {
      selected.splice(i, 1);
      card.classList.remove('pc-sel');
    } else {
      selected.push(card);
      card.classList.add('pc-sel');
    }
    updateBar();
    if (isMobile() && prog.classList.contains('bb-on')) updateProg();
  }

  /* ── update bar text / button state ──────────────────────────────── */
  function updateBar() {
    var n = selected.length;

    if (!activeTier) {
      var nt = nextTier(1);
      barMsg.textContent = nt
        ? 'Add ' + (nt.limit - 1) + ' more to save ' + savePct(nt.limit) + '%'
        : '';
      barAdd.textContent = 'Add to Cart\u00a0\u00b7\u00a0$' + SINGLE;
      barAdd.disabled = false;
      return;
    }

    var rem = activeTier.limit - n;
    if (rem > 0) {
      barMsg.textContent = 'Select\u00a0' + rem + '\u00a0more to complete your\u00a0' + activeTier.name;
      barAdd.textContent = 'Select ' + rem + ' more';
      barAdd.disabled = true;
    } else {
      var ap = calcPrice(n), ad = savePct(n);
      barMsg.textContent = n + '\u00a0selected\u00a0\u00b7\u00a0' + ad + '%\u00a0off';
      barAdd.textContent = 'Add to Cart\u00a0\u00b7\u00a0$' + ap;
      barAdd.disabled = false;
    }
  }

  /* ── mobile progress bar helpers ─────────────────────────────────── */
  function showProg() {
    updateProg();
    prog.classList.add('bb-on');
    prog.setAttribute('aria-hidden', 'false');
    document.body.classList.add('bb-active');
  }

  function hideProg() {
    prog.classList.remove('bb-on');
    prog.setAttribute('aria-hidden', 'true');
  }

  function updateProg() {
    if (!activeTier) return;
    var n = selected.length, lim = activeTier.limit;
    var rem = lim - n;
    if (rem > 0) {
      progInfo.textContent = activeTier.name + '\u00a0\u00b7\u00a0' + n + '\u00a0of\u00a0' + lim + '\u00a0selected';
      progAdd.textContent  = rem + ' more';
      progAdd.disabled = true;
    } else {
      var ap = calcPrice(n);
      progInfo.textContent = activeTier.name + '\u00a0\u00b7\u00a0' + n + '\u00a0selected\u00a0\u00b7\u00a0' + savePct(n) + '%\u00a0off';
      progAdd.textContent  = '$' + ap;
      progAdd.disabled = false;
    }
  }

  /* ── re-open full sheet from progress bar ─────────────────────────── */
  function reOpenSheet() {
    hideProg();
    bar.classList.add('bb-on');
    bar.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('bb-on');
  }

  /* ── deactivate / close ───────────────────────────────────────────── */
  function deactivate() {
    selected.forEach(function (c) { c.classList.remove('pc-sel'); });
    selected    = [];
    activeTier  = null;
    activeProd  = null;
    document.body.classList.remove('bb-selecting', 'bb-active');
    bar.classList.remove('bb-on');
    bar.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('bb-on');
    hideProg();
    highlightTier(null);
  }

  /* ── add to cart ──────────────────────────────────────────────────── */
  function handleAdd() {
    if (!activeProd || typeof window.addToCart !== 'function') return;

    if (!activeTier) {
      window.addToCart(activeProd.id, activeProd.name, SINGLE, activeProd.image);
      deactivate();
    } else if (selected.length >= activeTier.limit) {
      doBundleCart();
    }

    var icon = document.getElementById('cart-icon');
    if (icon) icon.click();
  }

  function doBundleCart() {
    var newNames = selected.map(function (c) { return c.dataset.name; });
    var img0     = selected[0] ? (selected[0].dataset.image || '') : '';
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
    var tname = tier ? tier.name : activeTier.name;
    var hint  = next ? 'Add ' + (next.limit - mCount) + ' more to save ' + savePct(next.limit) + '%' : '';

    window.addToCart(id, tname + ' \u00b7 ' + mNames.join(' \u00b7 '), price, mImg, {
      bundleCount: mCount,
      discountPct: disc,
      nextHint:    hint,
    });
    deactivate();
  }

  /* ── util ─────────────────────────────────────────────────────────── */
  function isMobile() { return window.innerWidth <= 768; }

  function svg(size, paths) {
    var ps = paths.split('|').map(function (d) {
      return '<path d="' + d + '" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>';
    }).join('');
    return '<svg width="' + size + '" height="' + size + '" viewBox="0 0 ' + size + ' ' + size +
           '" fill="none" aria-hidden="true">' + ps + '</svg>';
  }

  /* ── boot ─────────────────────────────────────────────────────────── */
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

})();
