# Product Card — Shopify FE Technical Assessment

Production-quality Shopify product card component built from scratch against the FE Technical Assessment Figma specification.

## Live preview

Deployed to the `Dev` theme on `monoline-nzljgsz8.myshopify.com`. See `DEPLOYMENT.md` for the live preview URL.

## What's in this repo

```
shopify/
  product-card-implementation/
    theme-mono/                            # Shopify Dawn 15.4.1 starter, customized
      assets/
        product-card-custom.css            # Card + grid styles (design tokens)
        product-card-custom.js             # Variant swap, a11y, live region
      sections/
        featured-collection-custom.liquid  # Theme editor section wrapping the grid
      snippets/
        product-card-custom.liquid         # Card root + JSON data payload
        swatch-custom.liquid               # Color swatch radiogroup (a11y)
        price-custom.liquid                # Price block (compare + sale)
      templates/
        index.json                         # Homepage using featured-collection-custom
    snippets/         # canonical copies (synced from theme-mono for ergonomics)
    sections/         # canonical copies
    assets/           # canonical copies + fixtures/
    tests/
      fixture.html    # jsdom-rendered card with 3 variants (sale / non-sale / unavailable)
      smoke.js        # 12 behavioral assertions
    tools/            # (reserved for dev utilities)
    docs/             # (reserved for design notes)
    README.md
    DEPLOYMENT.md
    BLOCKERS.md
```

## Design tokens (extracted from Figma frame 1:38, "D/Product Tile")

| Token              | Value                                                          |
|--------------------|----------------------------------------------------------------|
| Card width         | 315 px                                                         |
| Card height        | 452 px (image 340 + info 112)                                  |
| Card radius        | 10 px                                                          |
| Card stroke        | `#E8E8E8`                                                      |
| Card gap (to info) | 15 px                                                          |
| Image aspect       | 315 / 340                                                      |
| Vendor             | Roboto Regular 14 / 16, `#111111`                              |
| Title              | Roboto Medium 16 / 18, `#0A4874`                               |
| Color count        | Avenir Next Medium 14 / 16.8, `#111111`                        |
| Price compare      | Roboto Regular 14 / 16, `#111111`, line-through                |
| Price sale         | Roboto Regular 14 / 16, `#FF0000`                              |
| Swatch dot         | 20×20 circle                                                  |
| Swatch gap         | 8 px                                                           |
| Swatch ring        | 24×24, 1 px stroke, `#0A4874` (selected state)                |
| Badge "On Sale!"   | Franklin Gothic ATF Medium 15 / 17.93, `#FF0000`, 1 px stroke, pill |

All tokens are CSS variables on `:root` in `assets/product-card-custom.css`. The whole component is mobile-first and uses CSS variables so a theme can override them globally.

## Architecture decisions

1. **Component-first, theme-deployed.** The card ships as three Liquid snippets (`product-card-custom`, `swatch-custom`, `price-custom`) consumed by one section (`featured-collection-custom`). Same pattern Shopify's own Dawn uses, so merchants get it in the theme editor out of the box.

2. **Progressive enhancement.** Server renders the variant that matches the URL (or the first available one). JS swaps variants on the client. Without JS, the swatches still link to the product page with `?variant=ID` and the price/image stay correct on first paint.

3. **Variant data is server-emitted as JSON inside the card.** One `<script type="application/json">` per card avoids round-trips to `/variants.js`. The JS reads it lazily on first interaction.

4. **Accessibility — WAI-ARIA radio pattern for swatches.** Roving `tabindex`, arrow-key navigation, Home/End jump, Space/Enter activate. The whole card is wrapped in `<article aria-labelledby>` so screen readers can jump between cards by heading. A live region (`aria-live="polite"`) announces variant changes.

5. **No layout shift on hover.** Image swap uses stacked absolutely-positioned `<img>` with opacity transition (200 ms-ish). Same image URL set serves both states so preloading the secondary on hover costs nothing.

6. **Image strategy.** Primary image uses `srcset` 400 / 600 / 800 with explicit `sizes`. Lazy by default, eager for the first card in a section. Secondary image is loaded eagerly but starts at `opacity: 0`.

7. **TailwindCSS is available via CDN** — the section includes a Tailwind Play CDN snippet in dev only. Production ships plain CSS so the card works without any build step. The card's own classes use BEM (`pcc__*`) to stay orthogonal to Tailwind utilities.

8. **State is local to the card.** No global event bus. Each card binds once (`card.__pccBound` flag) and unbinds via garbage collection when removed. Theme editor events (`shopify:section:load`, `shopify:block:select`) re-init cards in scope.

9. **Sale badge is conditionally rendered.** If `compare_at_price <= price`, the badge is not in the DOM at all (no hidden CSS leak). Sold-out variant uses a different badge class.

10. **Tokens vs. hard-coded values.** Every size, color, gap, font size, line height and weight lives in a CSS variable. Designers can retheme the card without touching Liquid or JS.

## How the variant-swap works

```
User clicks a swatch
  → JS: selectVariant(card, variantId)
    → updates aria-checked + tabindex on every swatch
    → updates .pcc__img--primary src (variant.featuredMedia)
    → updates price block (sale / non-sale, compare-at)
    → updates badge (on sale / sold out / hidden)
    → writes "Product — Color" to live region
```

The variant data is rendered once into a `<script type="application/json">` block at the bottom of the card:

```liquid
<script type="application/json" class="pcc__data" data-pcc-data>
  { "id": ..., "variants": [ { "id": ..., "price": 2000, "compareAtPrice": 2950, ... } ] }
</script>
```

This keeps the JS small (no schema parsing) and lets the same Liquid be rendered server-side or statically.

## Responsive behavior

| Breakpoint        | Grid columns            | Card width                |
|-------------------|-------------------------|---------------------------|
| < 750 px (mobile) | 1 or 2 (merchant choice)| fills column, max 315 px  |
| 750 – 989 px      | 2                      | half viewport             |
| ≥ 990 px (desktop)| 2, 3 or 4 (merchant)   | `315px` exactly           |

The section exposes both `columns_desktop` (2/3/4) and `columns_mobile` (1/2) as theme-editor settings.

## Setup / dev

```bash
cd theme-mono
shopify theme dev --store monoline-nzljgsz8.myshopify.com
# prints preview URL, watches files
```

## Tests

```bash
node tests/smoke.js
# 12 behavioral assertions (jsdom)
```

The fixture (`tests/fixture.html`) is a single card with three swatches:
- Blue — sale variant (compare $29.50 → $20.00)
- Green — non-sale variant
- Pink — unavailable variant (`aria-disabled="true"`)

## Assumptions

- The store uses **Dawn 15.4.1** as a base. Customizations are additive (3 snippets, 1 section, 2 assets); no Dawn file was modified.
- Fonts are loaded from system fallbacks in the CSS stack. Roboto / Avenir Next / Franklin Gothic ATF need to be added to `theme.liquid` if not already present (Dawn uses system-ui, so we ship a robust fallback chain).
- A swatch option named `Color` (or `Colour`) drives the variant chooser. Products without a color option render without a swatch row (no broken UI).
- The featured-collection section is a focused implementation of the card; it does not replicate Dawn's full `featured-collection` section (slider, quick-add, etc.).

## Known limitations

- **Tailwind CDN only.** TailwindCSS is referenced as a dev-mode CDN fallback. Production-grade builds would compile Tailwind into `assets/tailwind.css` at the theme level — out of scope for this card.
- **Font availability.** If Roboto / Avenir Next / Franklin Gothic ATF are not loaded by the active theme, the fallback stack kicks in (`Helvetica Neue`, Arial, sans-serif). The visual will shift slightly.
- **Color option detection** is naive: the first option whose name lowercases to `color` or `colour`. Products using different naming (e.g. `Theme`, `Finish`) will not render swatches.
- **Single swatch row.** Products with two visual options (e.g. Color + Size) only get the color row. The card is one-component-at-a-time by design.
- **No quick-add.** Adding the variant to cart is handled by the existing product page, not the card.

## File-by-file

- **`assets/product-card-custom.css`** — design tokens, card styles, grid, swatch ring, badge, price, reduced-motion, hover-none fallback. ~390 lines.
- **`assets/product-card-custom.js`** — vanilla JS variant swap. No dependencies. ~240 lines.
- **`snippets/product-card-custom.liquid`** — `<article>` markup + JSON data block. ~200 lines.
- **`snippets/swatch-custom.liquid`** — `<fieldset>` + radiogroup of swatch buttons. ~90 lines.
- **`snippets/price-custom.liquid`** — price block with compare-at + sale state. ~45 lines.
- **`sections/featured-collection-custom.liquid`** — Online Store 2.0 section with 11 merchant settings. ~190 lines.
- **`templates/index.json`** — homepage referencing `featured-collection-custom` as `pcc_section`.

## Verification checklist

- [x] Sale product renders compare-at + sale price + "On Sale!" badge.
- [x] Non-sale product renders single price, no badge.
- [x] Multiple variants render a swatch per variant.
- [x] Single variant product renders no swatch row.
- [x] Clicking a swatch updates primary image + price + badge.
- [x] Hovering the media swaps to secondary image (and back).
- [x] Mobile (touch): hover effect disabled — primary stays visible.
- [x] Keyboard: Arrow keys move focus + selection; Space/Enter activates; Home/End jump.
- [x] Unavailable variant has `aria-disabled="true"` and does not respond to clicks/keys.
- [x] Reduced motion: transitions disabled.
- [x] Live region announces variant changes.
