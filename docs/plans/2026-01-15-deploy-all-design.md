# Design: `spinner theme deploy-all`

Batch deploy theme updates across all configured stores.

## Command Interface

```bash
spinner theme deploy-all \
  --repo https://github.com/your-org/spinner-theme \
  --configs ./configs \
  [--dry-run]
```

**Flags:**
- `--repo <url>` (required) — GitHub repo to clone theme from
- `--configs <path>` — Directory containing config files (default: `./configs`)
- `--dry-run` — Show what would be deployed without actually pushing

## Config Schema Change

Each config file gets a `shop_domain` field under `store`:

```yaml
store:
  name: Banjo Crimes Unit
  shop_domain: banjo-crimes-unit.myshopify.com
  email: merch@banjocrimes.com
```

Configs missing `shop_domain` are skipped with a warning.

## Deploy Flow

1. Clone `--repo` to temp directory
2. Scan `--configs` for `*.yaml` files (skip `_example.yaml`, test files)
3. For each config with `shop_domain`:
   - Load and validate config
   - Query store's themes via API
   - Find theme matching "Spinner - {store name}"
     - Found → get theme ID, will update
     - Not found → will create unpublished
   - Apply customizations to cloned theme
   - Push via Shopify CLI
4. Print summary showing success/failure for each store
5. Cleanup temp directory

## Error Handling

- Continue deploying to remaining stores on failure
- Report all successes and failures in summary at end

## Files to Change

| File | Change |
|------|--------|
| `src/config/schema.ts` | Add `shop_domain` to store schema |
| `src/cli/commands/theme.ts` | Add `deployAllCommand` function |
| `src/index.ts` | Register `theme deploy-all` subcommand |
| `configs/*.yaml` | Add `shop_domain` to each client config |
