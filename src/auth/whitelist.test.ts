// ABOUTME: Tests for shop whitelist management.
// ABOUTME: Validates allowed shops and whitelist CRUD operations.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Whitelist } from './whitelist.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

describe('Whitelist', () => {
  const testPath = '/tmp/test-whitelist.json';

  afterEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  describe('isAllowed', () => {
    it('returns true for whitelisted shop', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('test-store.myshopify.com')).toBe(true);
    });

    it('returns false for non-whitelisted shop', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('other-store.myshopify.com')).toBe(false);
    });

    it('returns false when whitelist file does not exist', () => {
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('any-store.myshopify.com')).toBe(false);
    });

    it('normalizes shop domain for comparison', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('TEST-STORE.myshopify.com')).toBe(true);
      expect(whitelist.isAllowed('test-store')).toBe(true);
    });
  });

  describe('addShop', () => {
    it('adds shop to whitelist', () => {
      const whitelist = new Whitelist(testPath);
      whitelist.addShop('new-store.myshopify.com');
      expect(whitelist.isAllowed('new-store.myshopify.com')).toBe(true);
    });

    it('does not add duplicate shops', () => {
      const whitelist = new Whitelist(testPath);
      whitelist.addShop('test-store.myshopify.com');
      whitelist.addShop('test-store.myshopify.com');
      expect(whitelist.listShops()).toHaveLength(1);
    });
  });

  describe('removeShop', () => {
    it('removes shop from whitelist', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      whitelist.removeShop('test-store.myshopify.com');
      expect(whitelist.isAllowed('test-store.myshopify.com')).toBe(false);
    });
  });

  describe('listShops', () => {
    it('returns all whitelisted shops', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['store-1.myshopify.com', 'store-2.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.listShops()).toEqual([
        'store-1.myshopify.com',
        'store-2.myshopify.com'
      ]);
    });
  });
});
