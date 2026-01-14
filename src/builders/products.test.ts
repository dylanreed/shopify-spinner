// ABOUTME: Tests for the product builder that creates Shopify products.
// ABOUTME: Verifies GraphQL mutation building and response handling.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductBuilder } from './products.js';
import type { Product } from '../products/types.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('ProductBuilder', () => {
  const mockClient = {
    mutate: vi.fn(),
  } as unknown as ShopifyClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds correct productCreate mutation input', () => {
    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'test-tee',
      title: 'Test T-Shirt',
      description: 'A test product',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: ['cotton', 'summer'],
      variants: [{
        sku: 'TEE-001',
        price: 29.99,
        compareAtPrice: 39.99,
        inventoryQty: 100,
        weight: 0.3,
        weightUnit: 'lb',
        imageUrl: 'https://example.com/tee.jpg',
        options: {},
      }],
    };

    const input = builder.buildProductInput(product);

    expect(input.title).toBe('Test T-Shirt');
    expect(input.descriptionHtml).toBe('A test product');
    expect(input.vendor).toBe('Test Vendor');
    expect(input.productType).toBe('Shirts');
    expect(input.tags).toEqual(['cotton', 'summer']);
  });

  it('creates product via API', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      productCreate: {
        product: {
          id: 'gid://shopify/Product/123',
          title: 'Test T-Shirt',
        },
        userErrors: [],
      },
    });

    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'test-tee',
      title: 'Test T-Shirt',
      description: 'A test product',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: [],
      variants: [{
        sku: 'TEE-001',
        price: 29.99,
        inventoryQty: 100,
        options: {},
      }],
    };

    const result = await builder.createProduct(product);

    expect(result.id).toBe('gid://shopify/Product/123');
    expect(mockClient.mutate).toHaveBeenCalled();
  });

  it('throws error when userErrors are returned', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      productCreate: {
        product: null,
        userErrors: [
          { field: ['title'], message: 'Title is required' },
        ],
      },
    });

    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'bad-product',
      title: '',
      description: 'A bad product',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: [],
      variants: [],
    };

    await expect(builder.createProduct(product)).rejects.toThrow(
      'Failed to create product: title: Title is required'
    );
  });

  it('throws error when product is null without userErrors', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      productCreate: {
        product: null,
        userErrors: [],
      },
    });

    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'mystery-product',
      title: 'Mystery',
      description: 'Should fail',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: [],
      variants: [],
    };

    await expect(builder.createProduct(product)).rejects.toThrow(
      'Product creation returned no product'
    );
  });

  it('creates multiple products and tracks failures', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({
        productCreate: {
          product: { id: 'gid://shopify/Product/1', title: 'Product 1', handle: 'product-1' },
          userErrors: [],
        },
      })
      .mockRejectedValueOnce(new Error('Network error'))
      .mockResolvedValueOnce({
        productCreate: {
          product: { id: 'gid://shopify/Product/3', title: 'Product 3', handle: 'product-3' },
          userErrors: [],
        },
      });

    const builder = new ProductBuilder(mockClient);

    const products: Product[] = [
      { handle: 'p1', title: 'Product 1', description: '', vendor: 'V', type: 'T', tags: [], variants: [] },
      { handle: 'p2', title: 'Product 2', description: '', vendor: 'V', type: 'T', tags: [], variants: [] },
      { handle: 'p3', title: 'Product 3', description: '', vendor: 'V', type: 'T', tags: [], variants: [] },
    ];

    const result = await builder.createProducts(products);

    expect(result.created).toHaveLength(2);
    expect(result.created[0].id).toBe('gid://shopify/Product/1');
    expect(result.created[1].id).toBe('gid://shopify/Product/3');
    expect(result.failed).toHaveLength(1);
    expect(result.failed[0].product.handle).toBe('p2');
    expect(result.failed[0].error).toBe('Network error');
  });
});
