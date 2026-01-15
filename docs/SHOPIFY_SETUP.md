# Shopify App Setup Guide

This guide walks through setting up Spinner as a Shopify app with OAuth authentication.

## Prerequisites

- Shopify Partner account
- Node.js 18+

## Step 1: Create App in Dev Dashboard

1. Go to [Dev Dashboard](https://dev.shopify.com/dashboard)
2. Click "Create app"
3. Enter app name: "Spinner" (or your preferred name)
4. Select "/Users/nervous/Library/CloudStorage/Dropbox/Github/shopify-spinner/docs/SHOPIFY_SETUP.mdPublic distribution" (we'll make it unlisted after approval)

## Step 2: Configure App Settings

In your app's settings:

### API Scopes

Add these Admin API access scopes:
- `read_products`
- `write_products`
- `read_themes`
- `write_themes`
- `read_inventory`
- `write_inventory`

### App URL

Set to: `http://localhost:3000` (for development)

### Redirect URLs

Add: `http://localhost:3000/auth/callback`

## Step 3: Get Credentials

1. Go to "API credentials" in your app settings
2. Copy the **Client ID**
3. Copy the **Client Secret**

## Step 4: Configure Spinner

Create `.env` file:

```bash
SHOPIFY_CLIENT_ID=your-client-id-here
SHOPIFY_CLIENT_SECRET=your-client-secret-here
```

## Step 5: Whitelist Your Stores
http://localhost:3000/auth?shop=pit-viper-funeral.myshopify.com
http://localhost:3000/auth?shop=glitter-bomb-evacuation.myshopify.com
http://localhost:3000/auth?shop=mustache-ride-to-freedom.myshopify.com
http://localhost:3000/auth?shop=trailer-park-shakespeare.myshopify.com
http://localhost:3000/auth?shop=banjo-crimes-unit.myshopify.com
http://localhost:3000/auth?shop=lil-tax-bracket.myshopify.com
http://localhost:3000/auth?shop=goatproof.myshopify.com
	
Before a store can install the app, add it to the whitelist:

```bash
npm run spinner whitelist add my-store.myshopify.com
```

List whitelisted stores:

```bash
npm run spinner whitelist list
```

## Step 6: Install on a Store

1. Start the OAuth server:
   ```bash
   npm run spinner serve
   ```

2. Visit the install URL:
   ```
   http://localhost:3000/auth?shop=my-store.myshopify.com
   ```

3. Authorize the app in Shopify

4. The token is now stored locally in `~/.spinner/tokens.json`

## Step 7: Configure Your Store

```bash
npm run spinner create --config ./configs/my-config.yaml --shop my-store.myshopify.com
```

The command will automatically use the stored OAuth token.

## Production Deployment

For production, you'll need to:

1. Deploy the OAuth server to a public URL (e.g., Fly.io)
2. Update the App URL and Redirect URL in Dev Dashboard
3. Submit for Shopify app review
4. After approval, set visibility to "Unlisted" (Partner Dashboard → Apps → Your app → Distribution → Manage listing → App Store visibility → Limit visibility)

## Workflow Summary

```
┌─────────────────────────────────────────────────────────────┐
│ One-time setup                                              │
├─────────────────────────────────────────────────────────────┤
│ 1. Create app in Dev Dashboard                              │
│ 2. Configure scopes and redirect URLs                       │
│ 3. Get Client ID and Secret                                 │
│ 4. Submit for review (for production)                       │
│ 5. Set to unlisted after approval                           │
└─────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────┐
│ Per-client workflow                                         │
├─────────────────────────────────────────────────────────────┤
│ 1. Create client transfer store in Partner Dashboard        │
│ 2. Add store to whitelist: spinner whitelist add <shop>     │
│ 3. Start OAuth server: spinner serve                        │
│ 4. Client visits install URL → authorizes app               │
│ 5. Configure store: spinner create --config <yaml> --shop   │
│ 6. Transfer store to client                                 │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### "Shop not authorized" error

Add the shop to whitelist:
```bash
npm run spinner whitelist add <shop>
```

### "Missing credentials" error

Make sure `.env` file exists with `SHOPIFY_CLIENT_ID` and `SHOPIFY_CLIENT_SECRET`

### OAuth callback fails

Check that the redirect URL in Dev Dashboard matches your server URL exactly.

### Token expired or invalid

Tokens are stored in `~/.spinner/tokens.json`. You can:
1. Delete the store's entry and re-authorize
2. Or remove and re-add via OAuth flow

## CLI Commands Reference

```bash
# Start OAuth server
npm run spinner serve
npm run spinner serve --port 8080

# Manage whitelist
npm run spinner whitelist add <shop>
npm run spinner whitelist remove <shop>
npm run spinner whitelist list

# Configure store (uses stored token automatically)
npm run spinner create --config <yaml> --shop <shop>

# Or provide token directly
npm run spinner create --config <yaml> --shop <shop> --access-token <token>
```
