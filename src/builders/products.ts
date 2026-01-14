// ABOUTME: Builds and creates Shopify products via GraphQL API.
// ABOUTME: Handles product creation with variants and media.

import type { ShopifyClient } from '../shopify/client.js';
import type { Product } from '../products/types.js';
import type { UserError } from '../shopify/types.js';

interface ProductInput {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  handle?: string;
}

interface ProductCreateResponse {
  productCreate: {
    product: {
      id: string;
      title: string;
      handle: string;
    } | null;
    userErrors: UserError[];
  };
}

interface CreatedProduct {
  id: string;
  title: string;
  handle: string;
}

const PRODUCT_CREATE_MUTATION = `
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export class ProductBuilder {
  private client: ShopifyClient;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  buildProductInput(product: Product): ProductInput {
    return {
      title: product.title,
      descriptionHtml: product.description,
      vendor: product.vendor,
      productType: product.type,
      tags: product.tags,
      handle: product.handle,
    };
  }

  async createProduct(product: Product): Promise<CreatedProduct> {
    const input = this.buildProductInput(product);

    const response = await this.client.mutate<ProductCreateResponse>(
      PRODUCT_CREATE_MUTATION,
      { input }
    );

    if (response.productCreate.userErrors.length > 0) {
      const errors = response.productCreate.userErrors
        .map(e => `${e.field.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to create product: ${errors}`);
    }

    if (!response.productCreate.product) {
      throw new Error('Product creation returned no product');
    }

    return response.productCreate.product;
  }

  async createProducts(products: Product[]): Promise<{
    created: CreatedProduct[];
    failed: Array<{ product: Product; error: string }>;
  }> {
    const created: CreatedProduct[] = [];
    const failed: Array<{ product: Product; error: string }> = [];

    for (const product of products) {
      try {
        const result = await this.createProduct(product);
        created.push(result);
      } catch (error) {
        failed.push({
          product,
          error: (error as Error).message,
        });
      }
    }

    return { created, failed };
  }
}
