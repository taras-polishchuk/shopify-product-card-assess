/**
 * Product Card — variant swap, accessibility, progressive enhancement.
 *
 * Public API: window.ProductCard.init(root)
 * Re-runs on Shopify theme editor events so merchants see live updates.
 */

(function () {
  'use strict';

  var SELECTORS = {
    card: '[data-product-id]',
    data: '[data-pcc-data]',
    swatches: '[data-pcc-swatches]',
    radioGroup: '[data-pcc-radiogroup]',
    swatch: '.pcc__swatch',
    primaryImg: '.pcc__img--primary',
    secondaryImg: '.pcc__img--secondary',
    badge: '.pcc__badge',
    priceBlock: '[data-pcc-price]',
    priceCurrent: '[data-pcc-current-amount]',
    priceCompare: '[data-pcc-compare-amount]',
    priceCompareWrap: '[data-pcc-compare]',
    liveRegion: '[data-live-region]',
  };

  function parseCardData(card) {
    var node = card.querySelector(SELECTORS.data);
    if (!node) return null;
    try {
      return JSON.parse(node.textContent);
    } catch (err) {
      console.warn('ProductCard: invalid JSON in data block', err);
      return null;
    }
  }

  function formatMoney(amount, currency) {
    try {
      if (window.Shopify && window.Shopify.formatMoney) {
        return window.Shopify.formatMoney(amount, window.theme && window.theme.moneyFormat ? window.theme.moneyFormat : '${{amount}}');
      }
    } catch (e) {
      /* fall through */
    }
    var n = (amount / 100).toFixed(2);
    return '$' + n;
  }

  function findVariantById(data, variantId) {
    if (!data || !data.variants) return null;
    var numericId = typeof variantId === 'string' ? parseInt(variantId, 10) : variantId;
    for (var i = 0; i < data.variants.length; i++) {
      if (Number(data.variants[i].id) === Number(numericId)) return data.variants[i];
    }
    return null;
  }

  function updateImages(card, variant, data) {
    var primary = card.querySelector(SELECTORS.primaryImg);
    if (!primary) return;
    if (variant && variant.featuredMedia) {
      primary.src = variant.featuredMedia;
      if (variant.featuredMediaAlt) primary.alt = variant.featuredMediaAlt;
    } else if (data && data.variants && data.variants.length > 0) {
      var first = data.variants[0];
      if (first.featuredMedia) {
        primary.src = first.featuredMedia;
        if (first.featuredMediaAlt) primary.alt = first.featuredMediaAlt;
      }
    }
  }

  function updatePrice(card, variant) {
    var block = card.querySelector(SELECTORS.priceBlock);
    if (!block) return;
    var current = block.querySelector(SELECTORS.priceCurrent);
    var compare = block.querySelector(SELECTORS.priceCompare);
    var compareWrap = block.querySelector(SELECTORS.priceCompareWrap);
    if (!current) return;

    if (variant && typeof variant.price === 'number') {
      current.textContent = formatMoney(variant.price, variant.priceCurrency);
      if (variant.compareAtPrice > variant.price) {
        if (compare) compare.textContent = formatMoney(variant.compareAtPrice, variant.priceCurrency);
        if (compareWrap) compareWrap.style.display = '';
        block.classList.add('pcc__price--sale');
        var cur = block.querySelector('[data-pcc-current]');
        if (cur) cur.classList.add('pcc__price-current--sale');
      } else {
        if (compareWrap) compareWrap.style.display = 'none';
        block.classList.remove('pcc__price--sale');
        var cur2 = block.querySelector('[data-pcc-current]');
        if (cur2) cur2.classList.remove('pcc__price-current--sale');
      }
    }
  }

  function updateBadge(card, variant) {
    var badge = card.querySelector(SELECTORS.badge);
    if (!badge) return;
    var onSale = variant && variant.compareAtPrice > variant.price && variant.available;
    var soldOut = variant && !variant.available;

    if (onSale) {
      badge.classList.remove('pcc__badge--hidden');
      badge.classList.remove('pcc__badge--soldout');
      badge.classList.add('pcc__badge--sale');
      badge.textContent = 'On Sale!';
    } else if (soldOut) {
      badge.classList.remove('pcc__badge--hidden');
      badge.classList.remove('pcc__badge--sale');
      badge.classList.add('pcc__badge--soldout');
      badge.textContent = 'Sold out';
    } else {
      badge.classList.add('pcc__badge--hidden');
    }
  }

  function announce(card, variant, data) {
    var live = card.querySelector(SELECTORS.liveRegion);
    if (!live) return;
    if (!variant) return;
    var msg = data.title + ' — ' + variant.title;
    if (!variant.available) msg += ' (unavailable)';
    live.textContent = msg;
  }

  function selectVariant(card, variantId, opts) {
    opts = opts || {};
    var data = parseCardData(card);
    if (!data) return;

    var variant = findVariantById(data, variantId);
    if (!variant) return;

    var swatches = card.querySelectorAll(SELECTORS.swatch);
    Array.prototype.forEach.call(swatches, function (sw) {
      var isMatch = String(sw.getAttribute('data-variant-id')) === String(variantId);
      sw.classList.toggle('pcc__swatch--selected', isMatch);
      sw.setAttribute('aria-checked', isMatch ? 'true' : 'false');
      sw.setAttribute('tabindex', isMatch ? '0' : '-1');
    });

    updateImages(card, variant, data);
    updatePrice(card, variant);
    updateBadge(card, variant);

    card.setAttribute('data-current-variant-id', String(variantId));

    if (!opts.silent) announce(card, variant, data);
  }

  function moveFocus(card, direction) {
    var swatches = card.querySelectorAll(SELECTORS.swatch);
    if (swatches.length === 0) return;
    var currentIdx = -1;
    for (var i = 0; i < swatches.length; i++) {
      if (swatches[i].getAttribute('tabindex') === '0') currentIdx = i;
    }
    if (currentIdx < 0) currentIdx = 0;
    var next = currentIdx + direction;
    if (next < 0) next = swatches.length - 1;
    if (next >= swatches.length) next = 0;
    swatches[next].focus();
    selectVariant(card, swatches[next].getAttribute('data-variant-id'), { silent: true });
  }

  function bindCard(card) {
    if (card.__pccBound) return;
    card.__pccBound = true;

    var swatches = card.querySelectorAll(SELECTORS.swatch);
    Array.prototype.forEach.call(swatches, function (sw) {
      sw.addEventListener('click', function (e) {
        e.preventDefault();
        if (sw.getAttribute('aria-disabled') === 'true') return;
        selectVariant(card, sw.getAttribute('data-variant-id'));
      });
      sw.addEventListener('keydown', function (e) {
        var k = e.key;
        if (k === 'ArrowRight' || k === 'ArrowDown') {
          e.preventDefault();
          moveFocus(card, 1);
        } else if (k === 'ArrowLeft' || k === 'ArrowUp') {
          e.preventDefault();
          moveFocus(card, -1);
        } else if (k === 'Home') {
          e.preventDefault();
          var list = card.querySelectorAll(SELECTORS.swatch);
          if (list[0]) {
            list[0].focus();
            selectVariant(card, list[0].getAttribute('data-variant-id'), { silent: true });
          }
        } else if (k === 'End') {
          e.preventDefault();
          var list2 = card.querySelectorAll(SELECTORS.swatch);
          if (list2[list2.length - 1]) {
            list2[list2.length - 1].focus();
            selectVariant(card, list2[list2.length - 1].getAttribute('data-variant-id'), { silent: true });
          }
        } else if (k === ' ' || k === 'Enter') {
          e.preventDefault();
          if (sw.getAttribute('aria-disabled') === 'true') return;
          selectVariant(card, sw.getAttribute('data-variant-id'));
        }
      });
    });
  }

  function initAll() {
    var cards = document.querySelectorAll(SELECTORS.card);
    Array.prototype.forEach.call(cards, bindCard);
  }

  function init(root) {
    var scope = root || document;
    var cards = scope.querySelectorAll ? scope.querySelectorAll(SELECTORS.card) : [];
    Array.prototype.forEach.call(cards, bindCard);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initAll);
  } else {
    initAll();
  }

  document.addEventListener('shopify:section:load', function (e) {
    if (e.target && e.target.querySelectorAll) init(e.target);
  });
  document.addEventListener('shopify:section:unload', function () {
    /* no teardown needed for vanilla handlers */
  });
  document.addEventListener('shopify:block:select', initAll);

  window.ProductCard = { init: init, initAll: initAll, selectVariant: selectVariant };
})();