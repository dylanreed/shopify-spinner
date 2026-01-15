# Multi-Store Architecture Options

**Date:** 2026-01-14
**Status:** Research
**Author:** Rodney & Claude

## Context

When scaling to 6+ stores per month with subdomain-based architecture (`<act>.mydomain.com`), understanding Shopify's limitations is critical for choosing the right approach.

## The Problem

Traditional Shopify multi-store setups don't scale economically or operationally:

| Month | Stores | Basic Plan Cost | Operational Overhead |
|-------|--------|-----------------|----------------------|
| 1 | 6 | $174/mo | 6 admin panels |
| 6 | 36 | $1,044/mo | 36 admin panels |
| 12 | 72 | $2,088/mo | 72 admin panels |

Each store requires separate credentials, inventory management, and updates.

## Option 1: Separate Stores (Standard Plans)

**How it works:**
- Each subdomain = separate Shopify store + subscription ($29-299/mo each)
- Point CNAME record to `shops.myshopify.com`
- Each store has independent admin, inventory, and billing

**Subdomain setup:**
```
act1.mydomain.com → CNAME → shops.myshopify.com
act2.mydomain.com → CNAME → shops.myshopify.com
```

**Limits:**
- Max 20 domains per store (irrelevant since each act is its own store)
- Unique email required per store

**Pros:**
- Simple setup
- Full store independence

**Cons:**
- Cost scales linearly ($29 × N stores)
- Management nightmare at scale
- No shared inventory/orders
- N separate API credentials to manage

## Option 2: Shopify Plus

**How it works:**
- Up to 10 stores included (1 main + 9 expansion) for $2,000/mo
- Additional stores: $250/mo each
- Unified billing and user management

**Store limits:**
| Stores | Cost |
|--------|------|
| 1-10 | $2,000/mo |
| 20 | $4,500/mo |
| 72 | $17,500/mo |

**Critical restrictions on expansion stores:**
- Must be extensions of main brand (same name/branding)
- Must carry same types of products
- Only allowed variations: language, currency, region
- Different brands = separate Plus contracts ($2k each)

**Eligible expansion store types:**
- International stores (same brand, different locale)
- D2C stores for wholesale merchants (1 free B2C per contract)
- Employee-only stores
- Physical retail locations (100% in-person, no online)

**Pros:**
- Unified management dashboard
- Up to 1,000 domains/subdomains per store
- Better support and features

**Cons:**
- Expansion stores still function independently (separate products, inventory)
- Brand restrictions make it unsuitable for distinct "acts"
- Cost explodes with multiple brands

**Verdict:** If acts are different brands/concepts, Plus doesn't solve the problem.

## Option 3: Headless Architecture (Recommended)

**How it works:**
- Single Shopify store as backend (products, inventory, orders)
- Multiple custom frontends, one per subdomain
- Storefront API connects frontends to shared backend

```
                    ┌─────────────────┐
                    │  Single Shopify │
                    │    Backend      │
                    │  (products,     │
                    │   inventory,    │
                    │   orders)       │
                    └────────┬────────┘
                             │
                      Storefront API
                             │
        ┌────────────┬───────┼───────┬────────────┐
        ▼            ▼       ▼       ▼            ▼
   act1.site    act2.site  act3.site  ...    actN.site
   (frontend)   (frontend) (frontend)        (frontend)
```

**Cost at scale:**
| Stores | Separate Plans | Plus | Headless |
|--------|----------------|------|----------|
| 10 | $290/mo | $2,000/mo | $29-299/mo |
| 36 | $1,044/mo | $8,500/mo | $29-299/mo |
| 72 | $2,088/mo | $17,500/mo | $29-299/mo |

**Tech stack options:**
- **Hydrogen** - Shopify's React framework for headless
- **Next.js** - Use Storefront API directly
- **Any framework** - Storefront API is GraphQL, framework-agnostic

**Product organization:**
- Tag products by act: `act:act1`, `act:act2`
- Filter products in each frontend by tag
- Single inventory source, multiple storefronts

**Checkout flow:**
- All orders flow to one Shopify backend
- Use Storefront API `checkoutCreate` mutation
- Shared fulfillment regardless of which frontend sold it

**Pros:**
- One inventory, one order system
- Unlimited frontends at no extra Shopify cost
- Full design freedom per act
- Single API credential set

**Cons:**
- Requires building/deploying frontends
- More technical setup
- Hosting costs for frontends (typically minimal)

## Shopify API Quick Reference

### Admin API (store management)
- Products, variants, inventory
- Orders, fulfillment
- Themes, assets
- Requires: Access token per store

### Storefront API (customer-facing)
- Read products, collections
- Create checkouts, carts
- Customer accounts
- Requires: Storefront access token (public-safe)

### Partner API (partner business)
- App install events
- Earnings and transactions
- Development store management
- **Does NOT provide store data access**

## Recommendation for shopify-spinner

Given the 6+ stores/month scale with distinct acts:

1. **Add headless frontend scaffolding** to spinner
2. **New command:** `spinner frontend create --act myact --template hydrogen`
3. **Product tagging:** Auto-tag products with act identifier during import
4. **Subdomain config:** Generate Vercel/Netlify config for subdomain routing

### Proposed workflow:
```bash
# One-time: Set up shared Shopify backend
spinner create --config ./configs/main-store.yaml

# Per act: Spin up frontend
spinner frontend create --act summer-drop \
  --subdomain summer.mydomain.com \
  --products ./products/summer.csv

# Behind the scenes:
# 1. Import products with act:summer-drop tag
# 2. Generate Hydrogen frontend from template
# 3. Configure frontend to filter by act tag
# 4. Deploy to Vercel with subdomain config
```

### Config extension:
```yaml
# configs/summer-drop.yaml
act:
  name: summer-drop
  subdomain: summer.mydomain.com

products:
  source: ./products/summer.csv
  tag_prefix: "act:summer-drop"

frontend:
  template: hydrogen
  theme:
    colors:
      primary: "#FFD700"
```

## Sources

- [Shopify Plus Expansion Stores](https://help.shopify.com/en/manual/organization-settings/expansion-stores)
- [Connecting Subdomains to Shopify](https://help.shopify.com/en/manual/domains/add-a-domain/connecting-domains/connect-subdomain)
- [Storefront API Reference](https://shopify.dev/docs/api/storefront)
- [Hydrogen Documentation](https://shopify.dev/docs/storefronts/headless/hydrogen)
