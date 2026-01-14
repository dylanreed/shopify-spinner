// ABOUTME: TypeScript types for Shopify API interactions.
// ABOUTME: Covers authentication, store data, and API responses.

export interface ShopifyCredentials {
  accessToken: string;
  shopDomain: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface UserError {
  field: string[];
  message: string;
}

export interface ShopifyStore {
  id: string;
  name: string;
  email: string;
  myshopifyDomain: string;
}
