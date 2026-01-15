# Shopify Spinner

Spin up fully-configured Shopify stores from YAML config files.

## Installation

```bash
npm install
npm run build
```

## Usage

### Validate a config

```bash
npm run spinner validate --config ./configs/example.yaml
```

### Create a store (requires existing dev store)

```bash
npm run spinner create --config ./configs/example.yaml \
  --access-token YOUR_TOKEN \
  --shop-domain your-store.myshopify.com
```

### List stores

```bash
npm run spinner list
```

### Check store status

```bash
npm run spinner status store-name
```

## Config Format

See `configs/example.yaml` for a complete example.

Configs support inheritance via `extends`:

```yaml
extends: ../templates/ecommerce-base.yaml

store:
  name: My Store
  email: me@example.com

theme:
  settings:
    colors:
      primary: "#FF5733"

products:
  source: ./products.csv
  create_collections: true
```

## Product CSV Format

See `products/example-products.csv` for the expected format.

Required columns:
- handle, title, price

Optional columns:
- description, vendor, type, tags, compare_at_price, sku, inventory_qty, weight, weight_unit, image_url, variant_option1_name, variant_option1_value

Rows with the same `handle` are grouped as variants of one product.

## Development

```bash
npm run dev          # Watch mode
npm test             # Run tests
npm run test:watch   # Watch tests
```
