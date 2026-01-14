// ABOUTME: Builds and creates Shopify smart collections via GraphQL API.
// ABOUTME: Auto-creates collections based on product tags.

import type { ShopifyClient } from '../shopify/client.js';
import type { Product } from '../products/types.js';
import type { UserError } from '../shopify/types.js';

interface CollectionRuleInput {
  column: 'TAG' | 'PRODUCT_TYPE' | 'VENDOR';
  relation: 'EQUALS';
  condition: string;
}

interface CollectionInput {
  title: string;
  ruleSet: {
    appliedDisjunctively: boolean;
    rules: CollectionRuleInput[];
  };
}

interface CollectionCreateResponse {
  collectionCreate: {
    collection: {
      id: string;
      title: string;
      handle: string;
    } | null;
    userErrors: UserError[];
  };
}

interface CreatedCollection {
  id: string;
  title: string;
  handle: string;
}

const COLLECTION_CREATE_MUTATION = `
  mutation CollectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
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

export class CollectionBuilder {
  private client: ShopifyClient;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  extractUniqueTags(products: Product[]): string[] {
    const tagSet = new Set<string>();

    for (const product of products) {
      for (const tag of product.tags) {
        tagSet.add(tag.toLowerCase());
      }
    }

    return Array.from(tagSet);
  }

  buildCollectionInput(tag: string): CollectionInput {
    // Capitalize first letter for title
    const title = tag.charAt(0).toUpperCase() + tag.slice(1);

    return {
      title,
      ruleSet: {
        appliedDisjunctively: false,
        rules: [{
          column: 'TAG',
          relation: 'EQUALS',
          condition: tag,
        }],
      },
    };
  }

  async createCollectionForTag(tag: string): Promise<CreatedCollection> {
    const input = this.buildCollectionInput(tag);

    const response = await this.client.mutate<CollectionCreateResponse>(
      COLLECTION_CREATE_MUTATION,
      { input }
    );

    if (response.collectionCreate.userErrors.length > 0) {
      const errors = response.collectionCreate.userErrors
        .map(e => `${e.field.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to create collection: ${errors}`);
    }

    if (!response.collectionCreate.collection) {
      throw new Error('Collection creation returned no collection');
    }

    return response.collectionCreate.collection;
  }

  async createCollectionsFromProducts(products: Product[]): Promise<{
    created: CreatedCollection[];
    failed: Array<{ tag: string; error: string }>;
  }> {
    const tags = this.extractUniqueTags(products);
    const created: CreatedCollection[] = [];
    const failed: Array<{ tag: string; error: string }> = [];

    for (const tag of tags) {
      try {
        const result = await this.createCollectionForTag(tag);
        created.push(result);
      } catch (error) {
        failed.push({
          tag,
          error: (error as Error).message,
        });
      }
    }

    return { created, failed };
  }
}
