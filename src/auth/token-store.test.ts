// ABOUTME: Tests for OAuth token storage.
// ABOUTME: Validates token persistence and retrieval.

import { describe, it, expect, afterEach } from 'vitest';
import { TokenStore } from './token-store.js';
import { unlinkSync, existsSync } from 'fs';

describe('TokenStore', () => {
  const testPath = '/tmp/test-tokens.json';

  afterEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  describe('saveToken', () => {
    it('saves token for shop', () => {
      const store = new TokenStore(testPath);
      store.saveToken('test-store.myshopify.com', 'shpat_xxx', ['read_products']);
      const token = store.getToken('test-store.myshopify.com');
      expect(token).toEqual({
        accessToken: 'shpat_xxx',
        scopes: ['read_products'],
        shop: 'test-store.myshopify.com',
      });
    });
  });

  describe('getToken', () => {
    it('returns null for unknown shop', () => {
      const store = new TokenStore(testPath);
      expect(store.getToken('unknown.myshopify.com')).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('removes token for shop', () => {
      const store = new TokenStore(testPath);
      store.saveToken('test-store.myshopify.com', 'shpat_xxx', ['read_products']);
      store.removeToken('test-store.myshopify.com');
      expect(store.getToken('test-store.myshopify.com')).toBeNull();
    });
  });

  describe('listShops', () => {
    it('returns all shops with tokens', () => {
      const store = new TokenStore(testPath);
      store.saveToken('store-1.myshopify.com', 'token1', []);
      store.saveToken('store-2.myshopify.com', 'token2', []);
      expect(store.listShops()).toEqual([
        'store-1.myshopify.com',
        'store-2.myshopify.com',
      ]);
    });
  });
});
