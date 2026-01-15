// ABOUTME: Tests for the product builder that creates Shopify products.
// ABOUTME: Verifies GraphQL mutation building and response handling.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ProductBuilder } from './products.js';
import type { Product } from '../products/types.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('ProductBuilder', () => {
  const mockClient = {
    mutate: vi.fn(),
    query: vi.fn(),
  } as unknown as ShopifyClient;

  const mockPublicationsResponse = {
    publications: {
      edges: [
        { node: { id: 'gid://shopify/Publication/1', name: 'Online Store' } },
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
  });

  it('creates product and adds variants via bulk create', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>)
      // Product create
      .mockResolvedValueOnce({
        productCreate: {
          product: {
            id: 'gid://shopify/Product/123',
            title: 'Test T-Shirt',
            handle: 'test-tee',
            variants: {
              edges: [{ node: { id: 'gid://shopify/ProductVariant/default' } }],
            },
          },
          userErrors: [],
        },
      })
      // Variants bulk create
      .mockResolvedValueOnce({
        productVariantsBulkCreate: {
          product: { id: 'gid://shopify/Product/123' },
          productVariants: [
            { id: 'gid://shopify/ProductVariant/1', sku: 'TEE-001-S' },
            { id: 'gid://shopify/ProductVariant/2', sku: 'TEE-001-M' },
          ],
          userErrors: [],
        },
      })
      // Publish
      .mockResolvedValueOnce(mockPublishResponse);

    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'test-tee',
      title: 'Test T-Shirt',
      description: 'A test product',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: [],
      variants: [{
        sku: 'TEE-001-S',
        price: 29.99,
        inventoryQty: 100,
        options: { Size: 'Small' },
      }, {
        sku: 'TEE-001-M',
        price: 29.99,
        inventoryQty: 150,
        options: { Size: 'Medium' },
      }],
    };

    const result = await builder.createProduct(product);

    expect(result.id).toBe('gid://shopify/Product/123');
    expect(mockClient.mutate).toHaveBeenCalledTimes(3); // create + bulk variants + publish

    // Verify variants bulk create was called with correct data
    const bulkCall = (mockClient.mutate as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(bulkCall[1].productId).toBe('gid://shopify/Product/123');
    expect(bulkCall[1].variants).toHaveLength(2);
    expect(bulkCall[1].variants[0].price).toBe('29.99');
    expect(bulkCall[1].variants[0].inventoryItem.sku).toBe('TEE-001-S');
    expect(bulkCall[1].strategy).toBe('REMOVE_STANDALONE_VARIANT');
  });

  it('updates default variant for single variant products without options', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>)
      // Product create
      .mockResolvedValueOnce({
        productCreate: {
          product: {
            id: 'gid://shopify/Product/456',
            title: 'Simple Product',
            handle: 'simple',
            variants: {
              edges: [{ node: { id: 'gid://shopify/ProductVariant/default' } }],
            },
          },
          userErrors: [],
        },
      })
      // Variants bulk update
      .mockResolvedValueOnce({
        productVariantsBulkUpdate: {
          product: { id: 'gid://shopify/Product/456' },
          productVariants: [{ id: 'gid://shopify/ProductVariant/default' }],
          userErrors: [],
        },
      })
      // Publish
      .mockResolvedValueOnce(mockPublishResponse);

    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'simple',
      title: 'Simple Product',
      description: 'Single variant',
      vendor: 'Test Vendor',
      type: 'Accessories',
      tags: [],
      variants: [{
        sku: 'SIMPLE-001',
        price: 19.99,
        inventoryQty: 50,
        options: {},
      }],
    };

    const result = await builder.createProduct(product);

    expect(result.id).toBe('gid://shopify/Product/456');
    expect(mockClient.mutate).toHaveBeenCalledTimes(3);

    // Verify update was called
    const updateCall = (mockClient.mutate as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(updateCall[1].variants[0].id).toBe('gid://shopify/ProductVariant/default');
    expect(updateCall[1].variants[0].price).toBe('19.99');
    expect(updateCall[1].variants[0].inventoryItem.sku).toBe('SIMPLE-001');
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
      // Product 1: create success
      .mockResolvedValueOnce({
        productCreate: {
          product: {
            id: 'gid://shopify/Product/1',
            title: 'Product 1',
            handle: 'product-1',
            variants: { edges: [] },
          },
          userErrors: [],
        },
      })
      // Product 1: publish success
      .mockResolvedValueOnce(mockPublishResponse)
      // Product 2: create fails
      .mockRejectedValueOnce(new Error('Network error'))
      // Product 3: create success
      .mockResolvedValueOnce({
        productCreate: {
          product: {
            id: 'gid://shopify/Product/3',
            title: 'Product 3',
            handle: 'product-3',
            variants: { edges: [] },
          },
          userErrors: [],
        },
      })
      // Product 3: publish success
      .mockResolvedValueOnce(mockPublishResponse);

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

  it('builds correct product input', async () => {
    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'test-tee',
      title: 'Test T-Shirt',
      description: 'A test product',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: ['cotton', 'summer'],
      variants: [],
    };

    const input = await builder.buildProductInput(product);

    expect(input.title).toBe('Test T-Shirt');
    expect(input.descriptionHtml).toBe('A test product');
    expect(input.vendor).toBe('Test Vendor');
    expect(input.productType).toBe('Shirts');
    expect(input.tags).toEqual(['cotton', 'summer']);
    expect(input.status).toBe('ACTIVE');
  });
});
