// ABOUTME: HTTP routes for Shopify OAuth flow.
// ABOUTME: Handles /auth, /auth/callback, and status endpoints.

import type { Hono } from 'hono';
import type { Whitelist } from '../auth/whitelist.js';
import type { TokenStore } from '../auth/token-store.js';
import type { OAuthHandler } from '../auth/oauth.js';
import { randomBytes } from 'crypto';

interface RouteDependencies {
  whitelist: Whitelist;
  tokenStore: TokenStore;
  oauth: OAuthHandler;
}

const pendingStates = new Map<string, string>();

export function createRoutes(app: Hono, deps: RouteDependencies) {
  const { whitelist, tokenStore, oauth } = deps;

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  app.get('/auth', (c) => {
    const shop = c.req.query('shop');

    if (!shop) {
      return c.text('Missing shop parameter. Use /auth?shop=your-store.myshopify.com', 400);
    }

    const normalizedShop = oauth.normalizeDomain(shop);

    if (!whitelist.isAllowed(normalizedShop)) {
      return c.text(
        `Shop ${normalizedShop} is not authorized to install this app.\n` +
        'Contact the app administrator to request access.',
        403
      );
    }

    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, normalizedShop);

    const authUrl = oauth.getAuthorizationUrl(normalizedShop, state);
    return c.redirect(authUrl);
  });

  app.get('/auth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const shop = c.req.query('shop');

    if (!code || !state || !shop) {
      return c.text('Missing required parameters', 400);
    }

    const expectedShop = pendingStates.get(state);
    if (!expectedShop) {
      return c.text('Invalid or expired state parameter', 400);
    }

    const normalizedShop = oauth.normalizeDomain(shop);
    if (normalizedShop !== expectedShop) {
      return c.text('Shop mismatch', 400);
    }

    pendingStates.delete(state);

    try {
      const tokenResponse = await oauth.exchangeCodeForToken(normalizedShop, code);
      const scopes = tokenResponse.scope.split(',');

      tokenStore.saveToken(normalizedShop, tokenResponse.access_token, scopes);

      return c.html(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>Installation Successful!</h1>
            <p>Spinner is now connected to <strong>${normalizedShop}</strong></p>
            <p>You can close this window and use the Spinner CLI to configure your store.</p>
            <pre style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
npm run spinner create --config ./configs/your-config.yaml --shop ${normalizedShop}
            </pre>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return c.text(`Authentication failed: ${(error as Error).message}`, 500);
    }
  });

  app.get('/shops', (c) => {
    const shops = tokenStore.listShops();
    return c.json({ shops });
  });
}
