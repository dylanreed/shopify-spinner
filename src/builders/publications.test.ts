// ABOUTME: Tests for the publication service that publishes products to sales channels.
// ABOUTME: Verifies GraphQL queries and mutation handling for Online Store publishing.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { PublicationService } from './publications.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('PublicationService', () => {
  const mockClient = {
    mutate: vi.fn(),
    query: vi.fn(),
  } as unknown as ShopifyClient;

  const mockPublicationsResponse = {
    publications: {
      edges: [
        { node: { id: 'gid://shopify/Publication/1', name: 'Point of Sale' } },
        { node: { id: 'gid://shopify/Publication/2', name: 'Online Store' } },
      ],
    },
  };

  const mockPublishResponse = {
    publishablePublish: {
      publishable: { availablePublicationsCount: { count: 1 } },
      userErrors: [],
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue(mockPublicationsResponse);
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValue(mockPublishResponse);
  });

  it('finds Online Store publication ID', async () => {
    const service = new PublicationService(mockClient);
    const pubId = await service.getOnlineStorePublicationId();

    expect(pubId).toBe('gid://shopify/Publication/2');
    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });

  it('caches publication ID', async () => {
    const service = new PublicationService(mockClient);

    await service.getOnlineStorePublicationId();
    await service.getOnlineStorePublicationId();

    expect(mockClient.query).toHaveBeenCalledTimes(1);
  });

  it('throws when Online Store not found', async () => {
    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValue({
      publications: {
        edges: [
          { node: { id: 'gid://shopify/Publication/1', name: 'Point of Sale' } },
        ],
      },
    });

    const service = new PublicationService(mockClient);

    await expect(service.getOnlineStorePublicationId()).rejects.toThrow(
      'Online Store publication not found'
    );
  });

  it('publishes a single product', async () => {
    const service = new PublicationService(mockClient);

    await service.publishProduct('gid://shopify/Product/123');

    expect(mockClient.mutate).toHaveBeenCalledWith(
      expect.any(String),
      {
        id: 'gid://shopify/Product/123',
        input: [{ publicationId: 'gid://shopify/Publication/2' }],
      }
    );
  });

  it('throws on publish userErrors', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValue({
      publishablePublish: {
        publishable: null,
        userErrors: [{ field: 'id', message: 'Product not found' }],
      },
    });

    const service = new PublicationService(mockClient);

    await expect(service.publishProduct('gid://shopify/Product/invalid')).rejects.toThrow(
      'Product not found'
    );
  });

  it('publishes multiple products and tracks results', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce(mockPublishResponse)
      .mockRejectedValueOnce(new Error('Rate limited'))
      .mockResolvedValueOnce(mockPublishResponse);

    const service = new PublicationService(mockClient);

    const result = await service.publishProducts(
      [
        'gid://shopify/Product/1',
        'gid://shopify/Product/2',
        'gid://shopify/Product/3',
      ],
      { rateLimitMs: 0 }
    );

    expect(result.published).toEqual([
      'gid://shopify/Product/1',
      'gid://shopify/Product/3',
    ]);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].productId).toBe('gid://shopify/Product/2');
    expect(result.failed[0].error).toBe('Rate limited');
  });

  it('applies rate limiting between publishes', async () => {
    const service = new PublicationService(mockClient);
    const startTime = Date.now();

    await service.publishProducts(
      ['gid://shopify/Product/1', 'gid://shopify/Product/2'],
      { rateLimitMs: 100 }
    );

    const elapsed = Date.now() - startTime;
    expect(elapsed).toBeGreaterThanOrEqual(100);
  });
});
