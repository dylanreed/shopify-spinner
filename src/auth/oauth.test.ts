// ABOUTME: Tests for Shopify OAuth flow handling.
// ABOUTME: Validates authorization URL generation and token exchange.

import { describe, it, expect } from 'vitest';
import { OAuthHandler } from './oauth.js';
import type { AppCredentials } from './types.js';

describe('OAuthHandler', () => {
  const credentials: AppCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['read_products', 'write_products'],
    redirectUri: 'http://localhost:3000/auth/callback',
  };

  describe('getAuthorizationUrl', () => {
    it('generates correct authorization URL', () => {
      const handler = new OAuthHandler(credentials);
      const url = handler.getAuthorizationUrl('test-store.myshopify.com', 'state123');

      expect(url).toContain('https://test-store.myshopify.com/admin/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('scope=read_products%2Cwrite_products');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
      expect(url).toContain('state=state123');
    });

    it('normalizes shop domain', () => {
      const handler = new OAuthHandler(credentials);
      const url = handler.getAuthorizationUrl('test-store', 'state123');

      expect(url).toContain('https://test-store.myshopify.com/admin/oauth/authorize');
    });
  });

  describe('normalizeDomain', () => {
    it('adds .myshopify.com if missing', () => {
      const handler = new OAuthHandler(credentials);
      expect(handler.normalizeDomain('test-store')).toBe('test-store.myshopify.com');
    });

    it('keeps full domain unchanged', () => {
      const handler = new OAuthHandler(credentials);
      expect(handler.normalizeDomain('test-store.myshopify.com')).toBe('test-store.myshopify.com');
    });

    it('lowercases domain', () => {
      const handler = new OAuthHandler(credentials);
      expect(handler.normalizeDomain('TEST-Store.myshopify.com')).toBe('test-store.myshopify.com');
    });
  });
});
