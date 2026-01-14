// ABOUTME: Tests for the Shopify GraphQL client wrapper.
// ABOUTME: Tests query building and error handling (mocked).

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ShopifyClient } from './client.js';

describe('ShopifyClient', () => {
  it('constructs with credentials', () => {
    const client = new ShopifyClient({
      accessToken: 'test-token',
      shopDomain: 'test-store.myshopify.com',
    });

    expect(client).toBeDefined();
  });

  it('builds correct API URL', () => {
    const client = new ShopifyClient({
      accessToken: 'test-token',
      shopDomain: 'test-store.myshopify.com',
    });

    expect(client.getApiUrl()).toBe(
      'https://test-store.myshopify.com/admin/api/2025-01/graphql.json'
    );
  });

  it('includes required headers', () => {
    const client = new ShopifyClient({
      accessToken: 'test-token',
      shopDomain: 'test-store.myshopify.com',
    });

    const headers = client.getHeaders();
    expect(headers['X-Shopify-Access-Token']).toBe('test-token');
    expect(headers['Content-Type']).toBe('application/json');
  });

  describe('query()', () => {
    let client: ShopifyClient;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      client = new ShopifyClient({
        accessToken: 'test-token',
        shopDomain: 'test-store.myshopify.com',
      });
      originalFetch = global.fetch;
    });

    afterEach(() => {
      vi.stubGlobal('fetch', originalFetch);
    });

    it('returns data on successful query', async () => {
      const mockData = { shop: { name: 'Test Shop' } };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: mockData }),
        })
      );

      const result = await client.query<{ shop: { name: string } }>(
        '{ shop { name } }'
      );

      expect(result).toEqual(mockData);
    });

    it('passes variables to fetch body', async () => {
      const mockFetch = vi.fn().mockResolvedValue({
        ok: true,
        json: () => Promise.resolve({ data: { product: { id: '123' } } }),
      });
      vi.stubGlobal('fetch', mockFetch);

      await client.query('query ($id: ID!) { product(id: $id) { id } }', {
        id: 'gid://shopify/Product/123',
      });

      expect(mockFetch).toHaveBeenCalledWith(
        expect.any(String),
        expect.objectContaining({
          body: JSON.stringify({
            query: 'query ($id: ID!) { product(id: $id) { id } }',
            variables: { id: 'gid://shopify/Product/123' },
          }),
        })
      );
    });

    it('throws on HTTP error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 401,
          text: () => Promise.resolve('Unauthorized'),
        })
      );

      await expect(client.query('{ shop { name } }')).rejects.toThrow(
        'Shopify API error (401): Unauthorized'
      );
    });

    it('throws on GraphQL errors', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () =>
            Promise.resolve({
              errors: [
                { message: 'Field not found' },
                { message: 'Invalid query' },
              ],
            }),
        })
      );

      await expect(client.query('{ invalid }')).rejects.toThrow(
        'GraphQL errors: Field not found, Invalid query'
      );
    });

    it('throws when data is missing', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({}),
        })
      );

      await expect(client.query('{ shop { name } }')).rejects.toThrow(
        'No data returned from Shopify API'
      );
    });
  });

  describe('mutate()', () => {
    let client: ShopifyClient;
    let originalFetch: typeof global.fetch;

    beforeEach(() => {
      client = new ShopifyClient({
        accessToken: 'test-token',
        shopDomain: 'test-store.myshopify.com',
      });
      originalFetch = global.fetch;
    });

    afterEach(() => {
      vi.stubGlobal('fetch', originalFetch);
    });

    it('returns data on successful mutation', async () => {
      const mockData = { productCreate: { product: { id: '123' } } };
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: true,
          json: () => Promise.resolve({ data: mockData }),
        })
      );

      const result = await client.mutate<{
        productCreate: { product: { id: string } };
      }>('mutation { productCreate { product { id } } }');

      expect(result).toEqual(mockData);
    });

    it('throws on HTTP error response', async () => {
      vi.stubGlobal(
        'fetch',
        vi.fn().mockResolvedValue({
          ok: false,
          status: 500,
          text: () => Promise.resolve('Internal Server Error'),
        })
      );

      await expect(
        client.mutate('mutation { productCreate { product { id } } }')
      ).rejects.toThrow('Shopify API error (500): Internal Server Error');
    });
  });
});
