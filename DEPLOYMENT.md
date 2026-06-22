# Deployment

## Prerequisites

- Shopify CLI 4.x (`@shopify/cli/4.2.0`)
- Authenticated to a Shopify store with the `theme` write scope
- Node.js 20+ for running the smoke test

```bash
shopify version
# @shopify/cli/4.2.0 …

shopify theme info
# Store:  monoline-nzljgsz8.myshopify.com
```

## Local dev (live preview with file watching)

```bash
cd theme-mono
shopify theme dev --store monoline-nzljgsz8.myshopify.com
```

Output:

```
╭─ success ─────────────────────────────────────────────────────────────────╮
│                                                                            │
│  Preview URL:  https://monoline-nzljgsz8.myshopify.com/?preview_theme_id=… │
│  Editor URL:   https://monoline-nzljgsz8.myshopify.com/admin/themes/…/editor│
│                                                                            │
╰────────────────────────────────────────────────────────────────────────────╯
```

The CLI:
1. Uploads the local `theme-mono/` tree to a **development theme** on the store.
2. Prints a preview URL (Shopify-side theme editor opens with our section pre-placed on the homepage).
3. Watches for file changes; pushes them to the dev theme in real time.

Stop with `Ctrl-C`. The development theme persists on the store until you delete it (`shopify theme delete --development`).

## Push to an existing unpublished theme

To target the existing `Dev` theme (#190433755419) instead of creating a fresh dev theme:

```bash
cd theme-mono
shopify theme push --theme 190433755419 --store monoline-nzljgsz8.myshopify.com
# or
shopify theme push --theme Dev --store monoline-nzljgsz8.myshopify.com
```

You'll get a confirmation prompt — `--allow-live` is not required because `Dev` is unpublished.

## Publishing

After verifying the preview:

1. Shopify admin → **Online Store → Themes → Dev → ⋯ → Preview** (review the homepage).
2. **⋯ → Publish** when satisfied.

The card is already wired into `templates/index.json` as the `pcc_section` so the homepage shows the grid immediately after publish.

## Theme installation (zero-config)

The card lives in `theme-mono/` which is a complete Shopify theme. To install it from scratch on a new store:

```bash
shopify theme init --clone https://github.com/taras-polishchuk/shopify-product-card-assess.git
cd shopify-product-card-assess
shopify theme dev --store <your-store>.myshopify.com
```

Or as a ZIP upload:

1. Download the repo.
2. In Shopify admin → **Online Store → Themes → Add theme → Upload ZIP**.
3. Activate from the theme list.

## Files changed vs. Dawn 15.4.1 starter

| File                                          | Action |
|-----------------------------------------------|--------|
| `assets/product-card-custom.css`              | added  |
| `assets/product-card-custom.js`               | added  |
| `snippets/product-card-custom.liquid`         | added  |
| `snippets/swatch-custom.liquid`               | added  |
| `snippets/price-custom.liquid`                | added  |
| `sections/featured-collection-custom.liquid`  | added  |
| `templates/index.json`                        | patched — added `pcc_section` |
| `config/settings_data.json`                   | untouched |
| All Dawn `layout/`, `locales/`, etc.         | untouched |

## Rollback

```bash
shopify theme delete --theme 190433755419
# re-publishes the previous live theme (Dawn) automatically
```

## Verification after publish

```bash
curl -s "https://monoline-nzljgsz8.myshopify.com/" | grep -E "pcc__|pcc-grid"
# should return markup containing pcc classes
```

```bash
node tests/smoke.js
# PASSED: 12  FAILED: 0
```
