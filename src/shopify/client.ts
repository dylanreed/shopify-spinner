// ABOUTME: Shopify GraphQL Admin API client wrapper.
// ABOUTME: Handles authentication, requests, and error parsing.

import type { ShopifyCredentials, GraphQLResponse } from './types.js';

const API_VERSION = '2025-01';

export class ShopifyClient {
  private credentials: ShopifyCredentials;
  private apiUrl: string;

  constructor(credentials: ShopifyCredentials) {
    this.credentials = credentials;
    this.apiUrl = `https://${credentials.shopDomain}/admin/api/${API_VERSION}/graphql.json`;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  getHeaders(): Record<string, string> {
    return {
      'X-Shopify-Access-Token': this.credentials.accessToken,
      'Content-Type': 'application/json',
    };
  }

  async query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${text}`);
    }

    const json = (await response.json()) as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
      const messages = json.errors.map((e) => e.message).join(', ');
      throw new Error(`GraphQL errors: ${messages}`);
    }

    if (!json.data) {
      throw new Error('No data returned from Shopify API');
    }

    return json.data;
  }

  async mutate<T>(
    mutation: string,
    variables?: Record<string, unknown>
  ): Promise<T> {
    return this.query<T>(mutation, variables);
  }
}
