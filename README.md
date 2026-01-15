# Shopify Spinner

Spin up fully-configured Shopify stores from YAML config files.

## Installation

```bash
npm install
npm run build
```

## Getting Started with Shopify

Before using Shopify Spinner, you need to set up a Shopify Partner account and create development stores with API access.

### Step 1: Create a Shopify Partner Account

1. Go to [partners.shopify.com](https://partners.shopify.com)
2. Click "Join now" and create an account (free)
3. Complete the partner signup form

### Step 2: Create a Development Store

1. In your Partner Dashboard, go to **Stores** in the left sidebar
2. Click **Add store** → **Create development store**
3. Select **Create a store to test and build**
4. Enter a store name (e.g., `acme-corp-dev`)
5. Choose your development store type and click **Create development store**

Your store URL will be: `your-store-name.myshopify.com`

### Step 3: Create a Custom App for API Access

1. In your development store admin, go to **Settings** → **Apps and sales channels**
2. Click **Develop apps** (top right)
3. Click **Allow custom app development** if prompted
4. Click **Create an app**
5. Name it something like "Shopify Spinner" and click **Create app**

### Step 4: Configure API Scopes

1. In your new app, click **Configure Admin API scopes**
2. Select these scopes:
   - `write_products` - Create and update products
   - `read_products` - Read product data
   - `write_themes` - Upload theme settings
   - `read_themes` - Read theme data
   - `write_inventory` - Manage inventory
   - `read_inventory` - Read inventory levels
3. Click **Save**

### Step 5: Install the App and Get Your Access Token

1. Click **Install app** in the top right
2. Confirm the installation
3. Go to the **API credentials** tab
4. Under **Admin API access token**, click **Reveal token once**
5. **Copy and save this token immediately** - you won't see it again!

> ⚠️ **Important:** The access token is shown only once. Store it securely (e.g., in a password manager or `.env` file).

### Step 6: Run Shopify Spinner

Now you have everything you need:
- **Shop domain:** `your-store-name.myshopify.com`
- **Access token:** The token you just copied

```bash
# Validate your config first
npm run spinner validate --config ./configs/example.yaml

# Create store content
npm run spinner create --config ./configs/example.yaml \
  --access-token shpat_xxxxxxxxxxxxxxxx \
  --shop-domain your-store-name.myshopify.com
```

### Using Environment Variables (Recommended)

Instead of passing credentials on the command line, create a `.env` file:

```bash
SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxx
SHOPIFY_SHOP_DOMAIN=your-store-name.myshopify.com
```

Then run without flags:

```bash
npm run spinner create --config ./configs/example.yaml
```

> Note: Add `.env` to your `.gitignore` to avoid committing secrets.

---

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
