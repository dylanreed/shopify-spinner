// ABOUTME: Tests for the collection builder that creates smart collections.
// ABOUTME: Verifies tag-based collection creation from products.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectionBuilder } from './collections.js';
import type { Product } from '../products/types.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('CollectionBuilder', () => {
  const mockClient = {
    mutate: vi.fn(),
  } as unknown as ShopifyClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts unique tags from products', () => {
    const builder = new CollectionBuilder(mockClient);

    const products: Product[] = [
      {
        handle: 'p1',
        title: 'Product 1',
        description: '',
        vendor: '',
        type: '',
        tags: ['summer', 'cotton'],
        variants: [],
      },
      {
        handle: 'p2',
        title: 'Product 2',
        description: '',
        vendor: '',
        type: '',
        tags: ['summer', 'winter'],
        variants: [],
      },
    ];

    const tags = builder.extractUniqueTags(products);

    expect(tags).toContain('summer');
    expect(tags).toContain('cotton');
    expect(tags).toContain('winter');
    expect(tags).toHaveLength(3);
  });

  it('builds smart collection input for tag', () => {
    const builder = new CollectionBuilder(mockClient);

    const input = builder.buildCollectionInput('summer');

    expect(input.title).toBe('Summer');
    expect(input.ruleSet.rules[0].column).toBe('TAG');
    expect(input.ruleSet.rules[0].condition).toBe('summer');
  });

  it('creates collection via API', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      collectionCreate: {
        collection: {
          id: 'gid://shopify/Collection/123',
          title: 'Summer',
          handle: 'summer',
        },
        userErrors: [],
      },
    });

    const builder = new CollectionBuilder(mockClient);
    const result = await builder.createCollectionForTag('summer');

    expect(result.id).toBe('gid://shopify/Collection/123');
    expect(mockClient.mutate).toHaveBeenCalled();
  });

  it('throws error when API returns userErrors', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      collectionCreate: {
        collection: null,
        userErrors: [{ field: ['input', 'title'], message: 'Title is invalid' }],
      },
    });

    const builder = new CollectionBuilder(mockClient);

    await expect(builder.createCollectionForTag('invalid')).rejects.toThrow('Failed to create collection');
  });

  it('creates collections from products and reports failures', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        collectionCreate: {
          collection: { id: 'gid://shopify/Collection/1', title: 'Summer', handle: 'summer' },
          userErrors: [],
        },
      })
      .mockRejectedValueOnce(new Error('API error'));

    const builder = new CollectionBuilder(mockClient);
    const products: Product[] = [
      { handle: 'p1', title: 'P1', description: '', vendor: '', type: '', tags: ['summer', 'winter'], variants: [] },
    ];

    const result = await builder.createCollectionsFromProducts(products);

    expect(result.created).toHaveLength(1);
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].tag).toBe('winter');
  });
});
