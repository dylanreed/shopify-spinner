// ABOUTME: Handles Shopify OAuth 2.0 authorization flow.
// ABOUTME: Generates auth URLs and exchanges codes for access tokens.

import type { AppCredentials, OAuthTokenResponse } from './types.js';

export class OAuthHandler {
  private credentials: AppCredentials;

  constructor(credentials: AppCredentials) {
    this.credentials = credentials;
  }

  normalizeDomain(shop: string): string {
    let normalized = shop.toLowerCase().trim();
    if (!normalized.includes('.')) {
      normalized = `${normalized}.myshopify.com`;
    }
    return normalized;
  }

  getAuthorizationUrl(shop: string, state: string): string {
    const normalizedShop = this.normalizeDomain(shop);
    const params = new URLSearchParams({
      client_id: this.credentials.clientId,
      scope: this.credentials.scopes.join(','),
      redirect_uri: this.credentials.redirectUri,
      state,
    });

    return `https://${normalizedShop}/admin/oauth/authorize?${params.toString()}`;
  }

  async exchangeCodeForToken(shop: string, code: string): Promise<OAuthTokenResponse> {
    const normalizedShop = this.normalizeDomain(shop);
    const url = `https://${normalizedShop}/admin/oauth/access_token`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: this.credentials.clientId,
        client_secret: this.credentials.clientSecret,
        code,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`OAuth token exchange failed (${response.status}): ${text}`);
    }

    return (await response.json()) as OAuthTokenResponse;
  }
}
