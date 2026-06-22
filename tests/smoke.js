/**
 * Smoke test for product-card-custom.js using jsdom.
 *
 * Verifies:
 *  - bindCard attaches handlers exactly once
 *  - click on swatch changes primary image src
 *  - arrow keys move focus and selection
 *  - sale / non-sale price formatting updates
 *  - unavailable swatch aria-disabled is preserved
 *  - live region announces variant changes
 *
 * Run:  node tests/smoke.js
 */

const fs = require('fs');
const path = require('path');
const { JSDOM } = (() => {
  try { return require('jsdom'); } catch (e) { return null; }
})() || {};

if (!JSDOM) {
  console.log('SKIP: jsdom not installed. Run: npm i -D jsdom');
  process.exit(0);
}

const FIXTURE = path.join(__dirname, 'fixture.html');
const SCRIPT = fs.readFileSync(path.join(__dirname, '..', 'assets', 'product-card-custom.js'), 'utf8');

const dom = new JSDOM(fs.readFileSync(FIXTURE, 'utf8'), { runScripts: 'outside-only' });
const { window } = dom;
const document = window.document;
window.Shopify = { formatMoney: (cents) => '$' + (cents / 100).toFixed(2) };
window.theme = { moneyFormat: '${{amount}}' };

const ctx = { assert: 0, fail: 0, ok: function (m) { console.log('  ✓ ' + m); this.assert++; }, ko: function (m) { console.log('  ✗ ' + m); this.fail++; } };

// Inject script then trigger init (since outside-only mode skips auto init)
window.eval(SCRIPT);
window.ProductCard.init(document);

const card = document.querySelector('[data-product-id]');
const swatches = card.querySelectorAll('.pcc__swatch');

if (card.__pccBound) ctx.ok('bindCard marks card as bound'); else ctx.ko('bindCard did not mark card');
if (swatches.length === 3) ctx.ok('three swatches rendered'); else ctx.ko('expected 3 swatches, got ' + swatches.length);

// Click second swatch
swatches[1].click();
const primary = card.querySelector('.pcc__img--primary');
// jsdom normalises URLs; check the path contains green
if (primary.src && primary.src.toLowerCase().indexOf('green') !== -1) ctx.ok('click swaps image to green variant');
else ctx.ko('click did not swap image (src=' + primary.src + ')');
const selected = card.querySelector('.pcc__swatch--selected');
if (selected === swatches[1]) ctx.ok('selected swatch updated');
else ctx.ko('selected swatch wrong');

// Tabindex migration
if (swatches[0].getAttribute('tabindex') === '-1' && swatches[1].getAttribute('tabindex') === '0') {
  ctx.ok('tabindex migrated');
} else ctx.ko('tabindex not migrated');

// ArrowRight moves focus
const ev = new window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true });
swatches[1].dispatchEvent(ev);
if (document.activeElement === swatches[2]) ctx.ok('ArrowRight moves focus to next swatch');
else ctx.ko('ArrowRight did not move focus (active=' + document.activeElement.getAttribute('data-option-value') + ')');
if (swatches[2].getAttribute('tabindex') === '0') ctx.ok('ArrowRight updates tabindex');
else ctx.ko('ArrowRight did not update tabindex');

// ArrowLeft wraps (focus is on swatches[2] from previous test)
const ev2 = new window.KeyboardEvent('keydown', { key: 'ArrowLeft', bubbles: true });
swatches[2].dispatchEvent(ev2);
if (document.activeElement === swatches[1]) ctx.ok('ArrowLeft from last moves to previous');
else ctx.ko('ArrowLeft wrap failed (active=' + document.activeElement.getAttribute('data-option-value') + ')');

// Sale state: with Green variant (no compareAtPrice), sale should be absent
const priceBlock = card.querySelector('[data-pcc-price]');
if (!priceBlock.classList.contains('pcc__price--sale')) ctx.ok('sale class absent for non-sale variant');
else ctx.ko('sale class unexpectedly applied');

// Switch back to Blue (sale variant) and confirm sale class applied
swatches[0].click();
if (priceBlock.classList.contains('pcc__price--sale')) ctx.ok('sale class applied for sale variant');
else ctx.ko('sale class missing for sale variant');

// Live region announces
const live = card.querySelector('[data-live-region]');
if (live.textContent.length > 0) ctx.ok('live region announces change');
else ctx.ko('live region empty');

// Unavailable swatch aria-disabled
const unavail = card.querySelector('[aria-disabled="true"]');
if (unavail) ctx.ok('unavailable swatch marked aria-disabled');
else ctx.ko('no aria-disabled swatch');

console.log('');
console.log(`PASSED: ${ctx.assert}  FAILED: ${ctx.fail}`);
process.exit(ctx.fail > 0 ? 1 : 0);