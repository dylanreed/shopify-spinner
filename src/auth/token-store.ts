// ABOUTME: Stores OAuth access tokens for authenticated shops.
// ABOUTME: Persists tokens in a JSON file for reuse across CLI commands.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

export interface StoredToken {
  accessToken: string;
  scopes: string[];
  shop: string;
}

interface TokenData {
  tokens: Record<string, StoredToken>;
}

export class TokenStore {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private load(): TokenData {
    if (!existsSync(this.filePath)) {
      return { tokens: {} };
    }
    const content = readFileSync(this.filePath, 'utf-8');
    return JSON.parse(content) as TokenData;
  }

  private save(data: TokenData): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  saveToken(shop: string, accessToken: string, scopes: string[]): void {
    const data = this.load();
    data.tokens[shop] = { accessToken, scopes, shop };
    this.save(data);
  }

  getToken(shop: string): StoredToken | null {
    const data = this.load();
    return data.tokens[shop] || null;
  }

  removeToken(shop: string): void {
    const data = this.load();
    delete data.tokens[shop];
    this.save(data);
  }

  listShops(): string[] {
    const data = this.load();
    return Object.keys(data.tokens);
  }
}
