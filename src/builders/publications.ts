// ABOUTME: Manages publishing products to sales channels.
// ABOUTME: Publishes products to Online Store after creation.

import type { ShopifyClient } from '../shopify/client.js';

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
    userErrors: Array<{
      field: string;
      message: string;
    }>;
  };
}

interface PublishResult {
  published: string[];
  failed: Array<{ productId: string; error: string }>;
}

export class PublicationService {
  private client: ShopifyClient;
  private onlineStorePublicationId: string | null = null;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  async getOnlineStorePublicationId(): Promise<string> {
    if (this.onlineStorePublicationId) {
      return this.onlineStorePublicationId;
    }

    const response = await this.client.query<PublicationsResponse>(
      GET_ONLINE_STORE_PUBLICATION
    );

    const onlineStore = response.publications.edges.find(
      (edge) => edge.node.name === 'Online Store'
    );

    if (!onlineStore) {
      throw new Error('Online Store publication not found. Is the Online Store sales channel enabled?');
    }

    this.onlineStorePublicationId = onlineStore.node.id;
    return this.onlineStorePublicationId;
  }

  async publishProduct(productId: string): Promise<void> {
    const publicationId = await this.getOnlineStorePublicationId();

    const response = await this.client.mutate<PublishResponse>(
      PUBLISH_TO_CHANNEL_MUTATION,
      {
        id: productId,
        input: [{ publicationId }],
      }
    );

    if (response.publishablePublish.userErrors.length > 0) {
      const errors = response.publishablePublish.userErrors
        .map((e) => e.message)
        .join(', ');
      throw new Error(errors);
    }
  }

  async publishProducts(
    productIds: string[],
    options: { rateLimitMs?: number } = {}
  ): Promise<PublishResult> {
    const rateLimitMs = options.rateLimitMs ?? 250;
    const result: PublishResult = {
      published: [],
      failed: [],
    };

    // Pre-fetch publication ID once
    await this.getOnlineStorePublicationId();

    for (const productId of productIds) {
      try {
        await this.publishProduct(productId);
        result.published.push(productId);
      } catch (error) {
        result.failed.push({
          productId,
          error: (error as Error).message,
        });
      }

      // Rate limiting
      if (rateLimitMs > 0) {
        await new Promise((resolve) => setTimeout(resolve, rateLimitMs));
      }
    }

    return result;
  }
}
