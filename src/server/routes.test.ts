// ABOUTME: Tests for OAuth server routes.
// ABOUTME: Validates auth flow, whitelist enforcement, and error handling.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type ServerConfig } from './index.js';
import { writeFileSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

describe('Server Routes', () => {
  const testDataDir = '/tmp/spinner-test-server';
  const config: ServerConfig = {
    port: 3456,
    dataDir: testDataDir,
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['read_products'],
      redirectUri: 'http://localhost:3456/auth/callback',
    },
  };

  beforeEach(() => {
    mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  describe('GET /health', () => {
    it('returns ok status', async () => {
      const app = createServer(config);
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ok' });
    });
  });

  describe('GET /auth', () => {
    it('returns 400 when shop is missing', async () => {
      const app = createServer(config);
      const res = await app.request('/auth');
      expect(res.status).toBe(400);
      expect(await res.text()).toContain('Missing shop parameter');
    });

    it('returns 403 when shop is not whitelisted', async () => {
      const app = createServer(config);
      const res = await app.request('/auth?shop=not-allowed.myshopify.com');
      expect(res.status).toBe(403);
      expect(await res.text()).toContain('not authorized');
    });

    it('redirects to Shopify OAuth when shop is whitelisted', async () => {
      writeFileSync(
        resolve(testDataDir, 'whitelist.json'),
        JSON.stringify({ allowed_shops: ['allowed-store.myshopify.com'] })
      );

      const app = createServer(config);
      const res = await app.request('/auth?shop=allowed-store.myshopify.com');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toContain('oauth/authorize');
      expect(res.headers.get('location')).toContain('allowed-store.myshopify.com');
    });
  });

  describe('GET /shops', () => {
    it('returns empty list when no tokens stored', async () => {
      const app = createServer(config);
      const res = await app.request('/shops');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ shops: [] });
    });

    it('returns list of shops with tokens', async () => {
      writeFileSync(
        resolve(testDataDir, 'tokens.json'),
        JSON.stringify({
          tokens: {
            'store-1.myshopify.com': {
              accessToken: 'token1',
              scopes: [],
              shop: 'store-1.myshopify.com',
            },
          },
        })
      );

      const app = createServer(config);
      const res = await app.request('/shops');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ shops: ['store-1.myshopify.com'] });
    });
  });
});
