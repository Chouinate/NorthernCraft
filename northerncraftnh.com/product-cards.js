/**
 * NorthernCraft — Product Cards & Bundle Selection
 *
 * Click a product → compact bar slides up at bottom.
 * Tier price labels auto-highlight as more cards are selected.
 * "Add N more to save X%" hint updates live.
 * Add to Cart price = calcPrice(selected count).
 * No interactive tier switching — just keep clicking cards.
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
  var SINGLE = 35;

  function bestTier(n) {
    for (var i = TIERS.length - 1; i >= 0; i--)
      if (n >= TIERS[i].limit) return TIERS[i];
    return null;
  }
  function calcPrice(n) {
    var t = bestTier(n);
    return t ? Math.round(t.price / t.limit * n) : n * SINGLE;
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

  /* ──────────────────────────────── state ───────────────────────────── */
  var activeProd = null;   // { id, name, price, image, card }
  var selected   = [];     // selected .product-card elements

  /* ──────────────────────────────── DOM refs ─────────────────────────── */
  var bar, barThumb, barName, barSpecs, barMsg, barAdd, barBack;
  var tierLabels = [];   // .bb-tier span elements (display only)

  /* ──────────────────────────────── CSS ─────────────────────────────── */
  var CSS = [

    /* nav cart */
    '.nav-cart-icon{background:none;border:none;cursor:pointer;',
    '  color:var(--charcoal);display:flex;align-items:center;padding:2px;transition:color .2s}',
    '.nav-cart-icon:hover{color:var(--mauve)}',

    /* ── bundle bar ─────────────────────────────────────────────────── */
    '#bundle-bar{',
    '  position:fixed;bottom:0;left:0;right:0;',
    '  background:var(--cream);',
    '  border-top:1px solid rgba(92,53,69,.12);',
    '  box-shadow:0 -4px 24px rgba(42,37,35,.1);',
    '  z-index:190;',
    '  display:grid;grid-template-columns:1fr auto 1fr;align-items:center;',
    '  transform:translateY(100%);',
    '  transition:transform .3s cubic-bezier(.4,0,.2,1);',
    '}',
    '#bundle-bar.bb-on{transform:translateY(0)}',

    /* zone: product info */
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

    /* zone: tiers + hint — centre column of the 1fr auto 1fr grid */
    '#bb-mid{',
    '  display:flex;flex-direction:column;',
    '  align-items:center;justify-content:center;',
    '  gap:10px;padding:12px 32px;',
    '  text-align:center;',
    '}',
    '#bb-tiers{display:flex;align-items:center;gap:8px;flex-wrap:wrap;',
    '  justify-content:center;width:100%}',

    /* tier label — display only, not interactive */
    '.bb-tier{',
    '  padding:7px 16px;',
    '  border:1.5px solid rgba(92,53,69,.16);',
    '  font-family:var(--ff-sans);font-size:11px;letter-spacing:.13em;',
    '  text-transform:uppercase;color:rgba(92,53,69,.45);',
    '  white-space:nowrap;pointer-events:none;user-select:none;',
    '  transition:border-color .2s,color .2s,background .2s;',
    '}',
    /* tier auto-highlights when count reaches it */
    '.bb-tier.bb-reached{',
    '  border-color:var(--mauve-dark);color:var(--mauve-dark);',
    '  background:rgba(92,53,69,.05);',
    '}',

    '#bb-hint{',
    '  font-family:var(--ff-sans);font-size:11px;letter-spacing:.13em;',
    '  text-transform:uppercase;color:var(--text-muted);',
    '  margin:0;text-align:center;',
    '}',

    /* zone: actions — sits in right 1fr column, pushed to the right edge */
    '#bb-acts{',
    '  display:flex;flex-direction:column;align-items:stretch;',
    '  justify-content:center;gap:7px;',
    '  padding:10px 18px 10px 14px;',
    '  border-left:1px solid rgba(92,53,69,.08);',
    '  width:200px;margin-left:auto;',
    '}',
    '#bb-back{',
    '  background:none;border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:9px;letter-spacing:.18em;',
    '  text-transform:uppercase;color:var(--text-muted);',
    '  padding:5px 0;transition:color .2s;text-align:center;',
    '}',
    '#bb-back:hover{color:var(--mauve-dark)}',
    '#bb-add{',
    '  background:var(--mauve-dark);color:#fff;border:none;cursor:pointer;',
    '  font-family:var(--ff-sans);font-size:10px;letter-spacing:.18em;',
    '  text-transform:uppercase;padding:12px 14px;',
    '  transition:background .2s,opacity .2s;',
    '}',
    '#bb-add[disabled]{opacity:.35;cursor:not-allowed}',
    '#bb-add:not([disabled]):hover{background:var(--mauve)}',

    /* body padding so last grid cards don't hide behind bar */
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

    /* ── MOBILE ≤ 768px ──────────────────────────────────────────────── */
    '@media(max-width:768px){',

    /* bar stays compact but stacks into 2 rows */
    '  #bundle-bar{flex-wrap:wrap;padding:0}',
    '  body.bb-active{padding-bottom:108px}',

    /* product info — row 1 left */
    '  #bb-prod{',
    '    flex:1;border-right:none;',
    '    border-bottom:1px solid rgba(92,53,69,.08);',
    '    padding:12px 16px;min-width:0;',
    '  }',

    /* hint — row 1 right (inline with product) */
    '  #bb-mid{',
    '    flex:0 0 auto;',
    '    border-bottom:1px solid rgba(92,53,69,.08);',
    '    padding:12px 16px;align-items:flex-end;',
    '    justify-content:center;gap:4px;',
    '  }',
    '  #bb-tiers{gap:3px}',
    '  .bb-tier{font-size:8px;padding:4px 8px}',
    '  #bb-hint{text-align:right}',

    /* actions — row 2, full width */
    '  #bb-acts{',
    '    flex:0 0 100%;flex-direction:row;',
    '    border-left:none;border-top:1px solid rgba(92,53,69,.08);',
    '    padding:10px 16px;gap:10px;min-width:0;',
    '  }',
    '  #bb-back{border:1.5px solid rgba(92,53,69,.2);padding:10px 14px;flex-shrink:0}',
    '  #bb-add{flex:1;padding:12px}',

    '}',

  ].join('\n');

  /* ──────────────────────────────── init ─────────────────────────────── */
  function init() {
    var s = document.createElement('style');
    s.textContent = CSS;
    document.head.appendChild(s);

    /* build bar */
    bar = document.createElement('div');
    bar.id = 'bundle-bar';
    bar.setAttribute('aria-hidden', 'true');
    bar.innerHTML =
      /* left: product */
      '<div id="bb-prod">' +
        '<div id="bb-img-wrap"><img id="bb-img" src="" alt=""></div>' +
        '<div>' +
          '<p id="bb-pname"></p>' +
          '<p id="bb-pspecs"></p>' +
        '</div>' +
      '</div>' +

      /* mid: tier labels + hint */
      '<div id="bb-mid">' +
        '<div id="bb-tiers"></div>' +
        '<p id="bb-hint"></p>' +
      '</div>' +

      /* right: actions */
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

    /* build static tier labels */
    var tiersEl = bar.querySelector('#bb-tiers');
    TIERS.forEach(function (t) {
      var el = document.createElement('span');
      el.className = 'bb-tier';
      el.dataset.limit = t.limit;
      el.textContent = t.name + '\u00a0\u00b7\u00a0$' + t.price;
      tiersEl.appendChild(el);
      tierLabels.push(el);
    });

    barBack.addEventListener('click', deactivate);
    barAdd.addEventListener('click', handleAdd);
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') deactivate();
    });

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
      if (bar.classList.contains('bb-on')) {
        toggleCard(card);
      } else {
        activate(card);
      }
    });
  }

  /* ── open bar for a product ───────────────────────────────────────── */
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
      /* banner shows the last remaining selection, or first if none */
      var show = selected[selected.length - 1] || card;
      barThumb.src = show.dataset.image || '';
      barThumb.alt = show.dataset.name || '';
      barName.textContent = show.dataset.name || '';
    } else {
      selected.push(card);
      card.classList.add('pc-sel');
      /* banner updates to the newly added card */
      barThumb.src = card.dataset.image || '';
      barThumb.alt = card.dataset.name || '';
      barName.textContent = card.dataset.name || '';
    }
    updateBar();
  }

  /* ── update bar state ─────────────────────────────────────────────── */
  function updateBar() {
    var n   = selected.length;
    var cur = bestTier(n);
    var nxt = nextTier(n);
    var price = calcPrice(n);

    /* auto-highlight earned tiers */
    tierLabels.forEach(function (el) {
      el.classList.toggle('bb-reached', !!(cur && parseInt(el.dataset.limit, 10) <= cur.limit));
    });

    /* hint text */
    if (nxt) {
      var need = nxt.limit - n;
      barMsg.textContent =
        'Add\u00a0' + need + '\u00a0more to save\u00a0' + savePct(nxt.limit) + '%+';
    } else if (n > 0) {
      barMsg.textContent = savePct(n) + '%+\u00a0off';
    } else {
      barMsg.textContent = '';
    }

    /* add to cart button */
    if (n > 0) {
      barAdd.textContent = 'Add to Cart\u00a0\u00b7\u00a0$' + price;
      barAdd.disabled = false;
    } else {
      barAdd.textContent = 'Add to Cart';
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

  /* ── add to cart ──────────────────────────────────────────────────── */
  function handleAdd() {
    if (!selected.length || typeof window.addToCart !== 'function') return;

    if (selected.length === 1) {
      /* single item */
      window.addToCart(activeProd.id, activeProd.name, SINGLE, activeProd.image);
    } else {
      /* bundle — merge with any existing bundle in cart */
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
