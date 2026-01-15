// ABOUTME: TypeScript types for OAuth authentication.
// ABOUTME: Defines app credentials and OAuth response structures.

export interface AppCredentials {
  clientId: string;
  clientSecret: string;
  scopes: string[];
  redirectUri: string;
}

export interface OAuthTokenResponse {
  access_token: string;
  scope: string;
}
