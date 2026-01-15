// ABOUTME: Builds and creates Shopify products via GraphQL API.
// ABOUTME: Handles product creation with variants and media with rate limiting.

import type { ShopifyClient } from '../shopify/client.js';
import type { Product, ProductVariant } from '../products/types.js';
import type { UserError } from '../shopify/types.js';

const DEFAULT_RATE_LIMIT_MS = 250;

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface ProductCreateResponse {
  productCreate: {
    product: {
      id: string;
      title: string;
      handle: string;
      variants: {
        edges: Array<{
          node: {
            id: string;
          };
        }>;
      };
    } | null;
    userErrors: UserError[];
  };
}

interface VariantsBulkCreateResponse {
  productVariantsBulkCreate: {
    product: { id: string } | null;
    productVariants: Array<{
      id: string;
      sku: string;
    }>;
    userErrors: UserError[];
  };
}

interface VariantsBulkUpdateResponse {
  productVariantsBulkUpdate: {
    product: { id: string } | null;
    productVariants: Array<{
      id: string;
    }>;
    userErrors: UserError[];
  };
}

interface CreatedProduct {
  id: string;
  title: string;
  handle: string;
}

// Create product with basic info only (no variants in new API)
const PRODUCT_CREATE_MUTATION = `
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
        variants(first: 1) {
          edges {
            node {
              id
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Add variants to existing product
const VARIANTS_BULK_CREATE_MUTATION = `
  mutation ProductVariantsBulkCreate($productId: ID!, $variants: [ProductVariantsBulkInput!]!, $strategy: ProductVariantsBulkCreateStrategy) {
    productVariantsBulkCreate(productId: $productId, variants: $variants, strategy: $strategy) {
      product {
        id
      }
      productVariants {
        id
        sku
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// Update existing variants (for single variant products)
const VARIANTS_BULK_UPDATE_MUTATION = `
  mutation ProductVariantsBulkUpdate($productId: ID!, $variants: [ProductVariantsBulkInput!]!) {
    productVariantsBulkUpdate(productId: $productId, variants: $variants) {
      product {
        id
      }
      productVariants {
        id
      }
      userErrors {
        field
        message
      }
    }
  }
`;

const GET_ONLINE_STORE_PUBLICATION = `
  query GetOnlineStorePublication {
    publications(first: 10) {
      edges {
        node {
          id
          name
        }
      }
    }
  }
`;

const PUBLISH_TO_CHANNEL_MUTATION = `
  mutation PublishablePublish($id: ID!, $input: [PublicationInput!]!) {
    publishablePublish(id: $id, input: $input) {
      publishable {
        availablePublicationsCount {
          count
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface PublicationsResponse {
  publications: {
    edges: Array<{
      node: {
        id: string;
        name: string;
      };
    }>;
  };
}

interface PublishResponse {
  publishablePublish: {
    publishable: {
      availablePublicationsCount: {
        count: number;
      };
    } | null;
    userErrors: UserError[];
  };
}

export class ProductBuilder {
  private client: ShopifyClient;
  private onlineStorePublicationId: string | null = null;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  async getOnlineStorePublicationId(): Promise<string | null> {
    if (this.onlineStorePublicationId) {
      return this.onlineStorePublicationId;
    }

    try {
      const response = await this.client.query<PublicationsResponse>(
        GET_ONLINE_STORE_PUBLICATION
      );

      const onlineStore = response.publications.edges.find(
        edge => edge.node.name === 'Online Store'
      );

      if (onlineStore) {
        this.onlineStorePublicationId = onlineStore.node.id;
      }
    } catch (error) {
      console.warn('Could not fetch publications (missing scope?), products will need manual publishing');
      return null;
    }

    return this.onlineStorePublicationId;
  }

  async publishToOnlineStore(productId: string): Promise<void> {
    const publicationId = await this.getOnlineStorePublicationId();

    if (!publicationId) {
      console.warn('Online Store publication not found, skipping publish');
      return;
    }

    const response = await this.client.mutate<PublishResponse>(
      PUBLISH_TO_CHANNEL_MUTATION,
      {
        id: productId,
        input: [{ publicationId }],
      }
    );

    if (response.publishablePublish.userErrors.length > 0) {
      const errors = response.publishablePublish.userErrors
        .map(e => `${e.field.join('.')}: ${e.message}`)
        .join(', ');
      console.warn(`Failed to publish product to Online Store: ${errors}`);
    }
  }

  private extractProductOptions(variants: ProductVariant[]): string[] {
    const optionNames = new Set<string>();
    for (const variant of variants) {
      for (const optionName of Object.keys(variant.options)) {
        optionNames.add(optionName);
      }
    }
    return Array.from(optionNames);
  }

  private buildProductOptions(variants: ProductVariant[]): Array<{ name: string; values: Array<{ name: string }> }> {
    const optionsMap = new Map<string, Set<string>>();

    for (const variant of variants) {
      for (const [optionName, optionValue] of Object.entries(variant.options)) {
        if (!optionsMap.has(optionName)) {
          optionsMap.set(optionName, new Set());
        }
        optionsMap.get(optionName)!.add(optionValue);
      }
    }

    return Array.from(optionsMap.entries()).map(([name, values]) => ({
      name,
      values: Array.from(values).map(v => ({ name: v })),
    }));
  }

  private buildVariantBulkInput(variant: ProductVariant, optionNames: string[]): Record<string, unknown> {
    const input: Record<string, unknown> = {
      price: variant.price.toFixed(2),
      inventoryItem: {
        sku: variant.sku,
      },
    };

    if (variant.compareAtPrice) {
      input.compareAtPrice = variant.compareAtPrice.toFixed(2);
    }

    // Build options array in the same order as product options
    if (optionNames.length > 0) {
      input.optionValues = optionNames.map(name => ({
        optionName: name,
        name: variant.options[name] || '',
      }));
    }

    return input;
  }

  async createProduct(product: Product): Promise<CreatedProduct> {
    // Step 1: Create product with basic info and options (if any)
    const optionNames = this.extractProductOptions(product.variants);
    const hasOptions = optionNames.length > 0;

    const productInput: Record<string, unknown> = {
      title: product.title,
      descriptionHtml: product.description,
      vendor: product.vendor,
      productType: product.type,
      tags: product.tags,
      handle: product.handle,
      status: 'ACTIVE',
    };

    // Include product options if variants have options
    if (hasOptions) {
      productInput.productOptions = this.buildProductOptions(product.variants);
    }

    const createResponse = await this.client.mutate<ProductCreateResponse>(
      PRODUCT_CREATE_MUTATION,
      { input: productInput }
    );

    if (createResponse.productCreate.userErrors.length > 0) {
      const errors = createResponse.productCreate.userErrors
        .map(e => `${e.field.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to create product: ${errors}`);
    }

    if (!createResponse.productCreate.product) {
      throw new Error('Product creation returned no product');
    }

    const createdProduct = createResponse.productCreate.product;
    const defaultVariantId = createdProduct.variants.edges[0]?.node.id;

    // Step 2: Handle variants
    if (product.variants.length > 0) {
      if (hasOptions) {
        // Multiple variants with options - use bulk create with REMOVE_STANDALONE_VARIANT
        const variantInputs = product.variants.map(v =>
          this.buildVariantBulkInput(v, optionNames)
        );

        const bulkResponse = await this.client.mutate<VariantsBulkCreateResponse>(
          VARIANTS_BULK_CREATE_MUTATION,
          {
            productId: createdProduct.id,
            variants: variantInputs,
            strategy: 'REMOVE_STANDALONE_VARIANT',
          }
        );

        if (bulkResponse.productVariantsBulkCreate.userErrors.length > 0) {
          const errors = bulkResponse.productVariantsBulkCreate.userErrors
            .map(e => `${e.field.join('.')}: ${e.message}`)
            .join(', ');
          console.warn(`Failed to create variants: ${errors}`);
        }
      } else if (product.variants.length === 1 && defaultVariantId) {
        // Single variant without options - update the default variant
        const variant = product.variants[0];
        const updateInput = {
          id: defaultVariantId,
          price: variant.price.toFixed(2),
          inventoryItem: {
            sku: variant.sku,
          },
          ...(variant.compareAtPrice && { compareAtPrice: variant.compareAtPrice.toFixed(2) }),
        };

        const updateResponse = await this.client.mutate<VariantsBulkUpdateResponse>(
          VARIANTS_BULK_UPDATE_MUTATION,
          {
            productId: createdProduct.id,
            variants: [updateInput],
          }
        );

        if (updateResponse.productVariantsBulkUpdate.userErrors.length > 0) {
          const errors = updateResponse.productVariantsBulkUpdate.userErrors
            .map(e => `${e.field.join('.')}: ${e.message}`)
            .join(', ');
          console.warn(`Failed to update variant: ${errors}`);
        }
      }
    }

    // Step 3: Publish to Online Store
    await this.publishToOnlineStore(createdProduct.id);

    return {
      id: createdProduct.id,
      title: createdProduct.title,
      handle: createdProduct.handle,
    };
  }

  async createProducts(
    products: Product[],
    options: { rateLimitMs?: number } = {}
  ): Promise<{
    created: CreatedProduct[];
    failed: Array<{ product: Product; error: string }>;
  }> {
    const rateLimitMs = options.rateLimitMs ?? DEFAULT_RATE_LIMIT_MS;
    const created: CreatedProduct[] = [];
    const failed: Array<{ product: Product; error: string }> = [];

    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      try {
        const result = await this.createProduct(product);
        created.push(result);
      } catch (error) {
        failed.push({
          product,
          error: (error as Error).message,
        });
      }

      // Rate limit: delay between requests to avoid hitting Shopify API limits
      // Skip delay after the last product
      if (i < products.length - 1) {
        await sleep(rateLimitMs);
      }
    }

    return { created, failed };
  }

  // Keep for backwards compatibility with tests
  async buildProductInput(product: Product): Promise<Record<string, unknown>> {
    return {
      title: product.title,
      descriptionHtml: product.description,
      vendor: product.vendor,
      productType: product.type,
      tags: product.tags,
      handle: product.handle,
      status: 'ACTIVE',
    };
  }
}
