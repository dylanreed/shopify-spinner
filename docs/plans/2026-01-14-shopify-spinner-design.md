# Shopify Spinner - Design Document

**Date:** 2026-01-14
**Status:** Approved
**Author:** Rodney & Claude

## Overview

Shopify Spinner is a CLI tool for agencies to spin up fully-configured Shopify stores from YAML configuration files. It eliminates the repetitive manual setup work when creating 6+ stores per month.

## Problem Statement

- Agency workflow requires spinning up 6+ Shopify stores monthly
- Current process is 100% manual - "death by a thousand clicks"
- Stores are 80% similar with 20% client-specific customization
- Need to upload client product/inventory as part of setup
- Want turnkey handoff: client-specific starter with their actual inventory loaded

## Solution

A config-first CLI tool that:
1. Creates development stores via Shopify Partner API
2. Configures theme, settings, and imports products via Admin API
3. Supports config inheritance for the 80% common setup
4. Tracks state for recovery and re-runs
5. Transfers ownership to clients on approval

## Architecture

```
shopify-spinner/
├── src/
│   ├── cli/              # Command handlers (create, validate, transfer)
│   ├── config/           # Config schema, parsing, validation
│   ├── shopify/          # Shopify API client wrappers
│   │   ├── partner.ts    # Partner API (create/transfer stores)
│   │   ├── admin.ts      # Admin API (settings, products, themes)
│   │   └── auth.ts       # Authentication handling
│   ├── builders/         # Modular builders for each store aspect
│   │   ├── theme.ts      # Theme installation & configuration
│   │   ├── apps.ts       # App installation
│   │   ├── settings.ts   # Store settings (shipping, taxes, etc.)
│   │   └── products.ts   # Product/inventory import
│   └── templates/        # Base config templates by niche
├── configs/              # Client config files
├── products/             # Client product CSVs
└── templates/            # Reusable base configurations
```

### Flow

1. Run `spinner create --config ./configs/acme.yaml`
2. CLI validates config against schema
3. Creates dev store via Partner API
4. Runs each builder in sequence: theme → apps → settings → products
5. Outputs store URL and admin link
6. Later: `spinner transfer --store acme` when client approves

Each builder is independent and idempotent - can re-run to fix issues without starting over.

## Config File Format

```yaml
# configs/acme-corp.yaml
store:
  name: "Acme Corp"
  email: "client@acme.com"

theme:
  source: "dawn"  # Shopify theme name or git repo URL
  settings:
    colors:
      primary: "#FF5733"
      secondary: "#333333"
    typography:
      heading_font: "Montserrat"
      body_font: "Open Sans"
    logo: "./assets/acme-logo.png"

apps:
  - name: "klaviyo"
    required: true
  - name: "judge-me"
    required: false
  - name: "recharge"
    required: false

settings:
  currency: "USD"
  timezone: "America/Los_Angeles"
  shipping:
    domestic_flat_rate: 5.99
    free_shipping_threshold: 50
  checkout:
    require_phone: false
    enable_tips: false

products:
  source: "./products/acme-products.csv"
  create_collections: true  # Auto-create collections from tags

# Optional: extend a base template
extends: "./templates/ecommerce-base.yaml"
```

### Inheritance

The `extends` field allows configs to inherit from base templates:

- Deep merge - nested objects combine, don't replace
- Arrays replace entirely (app list is all-or-nothing per config)
- Explicit `null` removes inherited values

## Product CSV Format

```csv
handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
basic-tee,Basic Cotton Tee,Soft everyday comfort,Acme,Shirts,cotton;basics;summer,29.99,39.99,TEE-001,100,0.3,lb,https://cdn.acme.com/tee.jpg,,
logo-hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter;bestseller,59.99,,HOOD-001,50,0.8,lb,https://cdn.acme.com/hoodie.jpg,,
logo-hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter;bestseller,59.99,,HOOD-002,30,0.8,lb,https://cdn.acme.com/hoodie-blue.jpg,Color,Blue
```

**Conventions:**
- Same handle = variants of one product
- Tags separated by semicolons - used to auto-create collections
- Images can be URLs or local paths (tool uploads them)

**Validation:**
- Required fields present (handle, title, price)
- Prices are valid numbers
- Image URLs/paths are accessible
- SKUs are unique
- Warns on missing images but continues

## CLI Commands

```bash
# Create a new store from config
spinner create --config ./configs/acme.yaml

# Validate config without creating anything
spinner validate --config ./configs/acme.yaml

# Check status of a store build
spinner status --store acme-corp

# Re-run a specific builder
spinner run theme --store acme-corp
spinner run products --store acme-corp --csv ./products/acme-v2.csv

# List all stores you've created
spinner list

# Transfer ownership to client
spinner transfer --store acme-corp --email client@acme.com

# Create a new config from template (interactive)
spinner init --template ecommerce --out ./configs/newclient.yaml

# Resume from failure
spinner resume --store acme-corp

# Destroy a dev store
spinner destroy --store acme-corp
```

## Shopify API Integration

### Partner API (store lifecycle)
- Create development stores
- Transfer store ownership
- Requires: Partner account credentials, organization ID

### Admin API (store contents)
- Theme management (install, configure via `themes` and `assets` endpoints)
- Product CRUD (create products, variants, images, collections)
- Store settings (checkout, shipping, etc. where API allows)
- Requires: Access token per store (auto-generated when creating dev store)

### Authentication Flow
1. Authenticate CLI with Partner credentials (one-time setup)
2. CLI creates dev store → gets admin access token automatically
3. Token stored locally in `.spinner/stores.json`
4. All subsequent calls use stored token

### API Limitations
- Some apps can't be installed via API - tool flags these for manual install
- Some settings aren't API-accessible - documented for manual tweaks
- Rate limits - tool handles throttling automatically
- Theme settings - applied via `settings_data.json` asset upload

### Local Storage
```
~/.spinner/
  ├── credentials.json    # Partner API auth
  └── stores.json         # Store tokens and metadata
```

## Error Handling & Recovery

### State Tracking
```
~/.spinner/stores/acme-corp/
  ├── state.json          # What's been completed
  ├── config.yaml         # Snapshot of config used
  └── logs/
      └── 2024-01-15.log  # Detailed run log
```

### state.json Example
```json
{
  "store_id": "gid://shopify/Store/12345",
  "url": "acme-corp.myshopify.com",
  "created_at": "2024-01-15T10:30:00Z",
  "steps": {
    "store_created": { "status": "complete", "at": "..." },
    "theme_installed": { "status": "complete", "at": "..." },
    "theme_configured": { "status": "complete", "at": "..." },
    "apps_installed": { "status": "partial", "installed": ["klaviyo"], "manual": ["recharge"] },
    "settings_applied": { "status": "complete", "at": "..." },
    "products_imported": { "status": "failed", "error": "Rate limited at row 234" }
  }
}
```

### Recovery Behavior
- Each step checks state before running, skips if already complete
- `resume` picks up from first incomplete/failed step
- Logs capture everything for debugging

## Testing Strategy

### Unit Tests (vitest)
- Config parsing and validation
- CSV parsing and validation
- Merge/inheritance logic
- Each builder's transformation logic (input → API calls)

### Integration Tests
- Use dedicated test Partner account
- Create real dev stores, verify results, tear them down
- Run on CI with secrets, or locally on-demand
- Marked slow, skipped by default

### Test Structure
```
src/
  config/
    parser.ts
    parser.test.ts       # Unit: parsing, validation
  builders/
    products.ts
    products.test.ts     # Unit: CSV transform, API call shapes
  shopify/
    admin.ts
    admin.integration.ts # Integration: real API calls
```

## MVP Scope

### Must Have (Week 1-2)
- `spinner create` - Full store creation flow
- `spinner validate` - Config validation without creating
- `spinner list` - Show your stores
- `spinner transfer` - Hand off to client
- Config parsing with `extends` inheritance
- Theme installation + settings via `settings_data.json`
- Product import from CSV with variants and images
- Auto-create collections from tags
- Basic store settings (currency, timezone)
- State tracking and `resume` capability
- Clear output showing progress and warnings

### Won't Have Yet
- Web UI dashboard
- App installation via API (flag for manual install in v1)
- Shipping rate configuration
- Tax configuration
- Metafields/custom data
- Multiple inventory locations

### Post-MVP Backlog
- App installation for apps that support it
- `spinner clone` - Duplicate existing store's config
- Webhook notifications when store is ready
- Client-facing status page
- Web dashboard for non-CLI users

## Tech Stack

- **Runtime:** TypeScript/Node.js
- **CLI Framework:** Commander
- **Testing:** Vitest
- **Shopify:** @shopify/shopify-api, Partner API
- **Config:** YAML parsing with js-yaml
- **Output:** chalk for colored terminal output

## Decision Log

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Interface | CLI + config files | Fastest to build, scriptable, web UI later |
| Config format | YAML with inheritance | Readable, supports 80/20 template reuse |
| Product format | CSV | Clients know spreadsheets, aligns with Shopify |
| Store creation | Partner API dev stores | Free to create, transfer on approval |
| Tech stack | TypeScript | Matches existing workflow, Shopify libs are JS-first |
