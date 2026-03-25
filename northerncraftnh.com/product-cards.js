/**
 * NorthernCraft Product Cards
 *
 * Listens for clicks on .product-card[data-id] elements, shows a modal
 * with the product image, name, and price, and offers two actions:
 *
 *   Add to Cart — calls addToCart() then opens the cart drawer
 *   Buy Now     — calls addToCart() then scrolls to #checkout
 *
 * Also injects CSS for the nav cart icon button.
 *
 * Required data attributes on each .product-card:
 *   data-id      unique product slug
 *   data-name    display name
 *   data-price   numeric price (e.g. "29")
 *   data-image   relative image path
 */
(function () {
  'use strict';

  // ── Styles ──────────────────────────────────────────────────────────────────
  var CSS = [

    /* ── Nav cart icon ── */
    '.nav-cart-icon {',
    '  background: none;',
    '  border: none;',
    '  cursor: pointer;',
    '  color: var(--charcoal, #2a2523);',
    '  display: flex;',
    '  align-items: center;',
    '  padding: 2px;',
    '  transition: color 0.2s;',
    '}',
    '.nav-cart-icon:hover { color: var(--mauve, #7b4f5c); }',

    /* ── Product overlay ── */
    '.nc-prod-overlay {',
    '  position: fixed;',
    '  inset: 0;',
    '  background: rgba(42, 37, 35, 0.55);',
    '  z-index: 198;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  padding: 20px;',
    '  opacity: 0;',
    '  pointer-events: none;',
    '  transition: opacity 0.22s ease;',
    '}',
    '.nc-prod-overlay.nc-open {',
    '  opacity: 1;',
    '  pointer-events: auto;',
    '}',

    /* ── Modal panel ── */
    '.nc-prod-modal {',
    '  background: #ece8e1;',
    '  display: flex;',
    '  gap: 0;',
    '  width: 100%;',
    '  max-width: 520px;',
    '  position: relative;',
    '  transform: translateY(10px);',
    '  opacity: 0;',
    '  transition: transform 0.25s ease, opacity 0.25s ease;',
    '}',
    '.nc-prod-overlay.nc-open .nc-prod-modal {',
    '  transform: translateY(0);',
    '  opacity: 1;',
    '}',

    /* ── Close button ── */
    '.nc-prod-close {',
    '  position: absolute;',
    '  top: 12px;',
    '  right: 14px;',
    '  background: none;',
    '  border: none;',
    '  cursor: pointer;',
    '  color: #7a6f68;',
    '  padding: 4px;',
    '  display: flex;',
    '  align-items: center;',
    '  justify-content: center;',
    '  line-height: 0;',
    '  transition: color 0.2s;',
    '  z-index: 1;',
    '}',
    '.nc-prod-close:hover { color: #2a2523; }',

    /* ── Image column ── */
    '.nc-prod-img-wrap {',
    '  width: 220px;',
    '  flex-shrink: 0;',
    '  aspect-ratio: 1/1;',
    '  background: #cbc5bc;',
    '  overflow: hidden;',
    '}',
    '.nc-prod-img-wrap img {',
    '  width: 100%;',
    '  height: 100%;',
    '  object-fit: cover;',
    '  display: block;',
    '}',

    /* ── Details column ── */
    '.nc-prod-details {',
    '  flex: 1;',
    '  display: flex;',
    '  flex-direction: column;',
    '  justify-content: center;',
    '  padding: 36px 32px 36px 28px;',
    '}',
    '.nc-prod-label {',
    '  font-family: \'Montserrat\', sans-serif;',
    '  font-size: 9px;',
    '  letter-spacing: 0.28em;',
    '  text-transform: uppercase;',
    '  color: #9e9098;',
    '  margin: 0 0 10px;',
    '}',
    '.nc-prod-name {',
    '  font-family: \'Cormorant Garamond\', Georgia, serif;',
    '  font-size: 30px;',
    '  font-weight: 400;',
    '  color: #2a2523;',
    '  letter-spacing: 0.03em;',
    '  margin: 0 0 10px;',
    '}',
    '.nc-prod-price {',
    '  font-family: \'Montserrat\', sans-serif;',
    '  font-size: 13px;',
    '  font-weight: 400;',
    '  letter-spacing: 0.1em;',
    '  color: #5c3545;',
    '  margin: 0 0 28px;',
    '}',

    /* ── Action buttons ── */
    '.nc-prod-actions {',
    '  display: flex;',
    '  flex-direction: column;',
    '  gap: 10px;',
    '}',
    '.nc-prod-btn {',
    '  width: 100%;',
    '  padding: 12px 16px;',
    '  font-family: \'Montserrat\', sans-serif;',
    '  font-size: 10px;',
    '  font-weight: 400;',
    '  letter-spacing: 0.2em;',
    '  text-transform: uppercase;',
    '  cursor: pointer;',
    '  transition: background 0.2s, color 0.2s, border-color 0.2s;',
    '}',
    '.nc-prod-specs {',
    '  font-family: \'Montserrat\', sans-serif;',
    '  font-size: 11px;',
    '  font-weight: 300;',
    '  letter-spacing: 0.08em;',
    '  color: #7a6f68;',
    '  margin: 0 0 20px;',
    '}',
    '.nc-prod-btn-cart {',
    '  background: #5c3545;',
    '  color: #fff;',
    '  border: 1px solid #5c3545;',
    '}',
    '.nc-prod-btn-cart:hover { background: #7b4f5c; border-color: #7b4f5c; }',
    '.nc-prod-btn-buy {',
    '  background: transparent;',
    '  color: #5c3545;',
    '  border: 1px solid #5c3545;',
    '}',
    '.nc-prod-btn-buy:hover { background: #e8e2db; }',

    /* ── Mobile ── */
    '@media (max-width: 560px) {',
    '  .nc-prod-modal { flex-direction: column; max-width: 360px; }',
    '  .nc-prod-img-wrap { width: 100%; aspect-ratio: 4/3; }',
    '  .nc-prod-details { padding: 24px 24px 28px; }',
    '}',

  ].join('\n');

  // ── State ───────────────────────────────────────────────────────────────────
  var overlay, imgEl, nameEl, priceEl;
  var currentProduct = null;

  // ── Init ────────────────────────────────────────────────────────────────────
  function _init() {
    var style = document.createElement('style');
    style.textContent = CSS;
    document.head.appendChild(style);

    // Build overlay + modal
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
      '  <div class="nc-prod-img-wrap">',
      '    <img class="nc-prod-img" src="" alt="">',
      '  </div>',
      '  <div class="nc-prod-details">',
      '    <p class="nc-prod-label">Shop</p>',
      '    <h3 class="nc-prod-name"></h3>',
      '    <p class="nc-prod-price"></p>',
      '    <p class="nc-prod-specs">~8\u2033 square \u00B7 Beige &amp; Metallic Rose</p>',
      '    <div class="nc-prod-actions">',
      '      <button class="nc-prod-btn nc-prod-btn-cart">Add to Cart</button>',
      '      <button class="nc-prod-btn nc-prod-btn-buy">Buy Now</button>',
      '    </div>',
      '  </div>',
      '</div>',
    ].join('');

    document.body.appendChild(overlay);

    imgEl   = overlay.querySelector('.nc-prod-img');
    nameEl  = overlay.querySelector('.nc-prod-name');
    priceEl = overlay.querySelector('.nc-prod-price');

    // Close on backdrop click
    overlay.addEventListener('click', function (e) {
      if (e.target === overlay) _close();
    });
    overlay.querySelector('.nc-prod-close').addEventListener('click', _close);

    // Buttons
    overlay.querySelector('.nc-prod-btn-cart').addEventListener('click', _handleAddToCart);
    overlay.querySelector('.nc-prod-btn-buy').addEventListener('click', _handleBuyNow);

    // Escape key
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && overlay.classList.contains('nc-open')) _close();
    });

    // Wire product cards
    document.querySelectorAll('.product-card[data-id]').forEach(function (card) {
      card.addEventListener('click', function () {
        _open({
          id:    card.dataset.id,
          name:  card.dataset.name,
          price: Number(card.dataset.price),
          image: card.dataset.image,
        });
      });
    });
  }

  // ── Modal open / close ───────────────────────────────────────────────────────
  function _open(product) {
    currentProduct = product;
    imgEl.src = product.image;
    imgEl.alt = product.name;
    nameEl.textContent = product.name;
    priceEl.textContent = '$' + (Number.isInteger(product.price) ? product.price : product.price.toFixed(2));

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

  // ── Actions ─────────────────────────────────────────────────────────────────
  function _handleAddToCart() {
    if (!currentProduct || typeof window.addToCart !== 'function') return;
    window.addToCart(currentProduct.id, currentProduct.name, currentProduct.price, currentProduct.image);
    _close();
    // Open the slide-out cart drawer via the nav icon
    var cartIcon = document.getElementById('cart-icon');
    if (cartIcon) cartIcon.click();
  }

  function _handleBuyNow() {
    if (!currentProduct || typeof window.addToCart !== 'function') return;
    window.addToCart(currentProduct.id, currentProduct.name, currentProduct.price, currentProduct.image);
    _close();
    var checkout = document.getElementById('checkout');
    if (checkout) checkout.scrollIntoView({ behavior: 'smooth' });
  }

  // ── Boot ────────────────────────────────────────────────────────────────────
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', _init);
  } else {
    _init();
  }

})();
