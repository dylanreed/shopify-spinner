// ABOUTME: Manages shop whitelist for controlling app installation access.
// ABOUTME: Stores allowed shop domains in a JSON file.

import { existsSync, readFileSync, writeFileSync, mkdirSync } from 'fs';
import { dirname } from 'path';

interface WhitelistData {
  allowed_shops: string[];
}

export class Whitelist {
  private filePath: string;

  constructor(filePath: string) {
    this.filePath = filePath;
  }

  private normalizeDomain(shop: string): string {
    let normalized = shop.toLowerCase().trim();
    if (!normalized.includes('.')) {
      normalized = `${normalized}.myshopify.com`;
    }
    return normalized;
  }

  private load(): WhitelistData {
    if (!existsSync(this.filePath)) {
      return { allowed_shops: [] };
    }
    const content = readFileSync(this.filePath, 'utf-8');
    return JSON.parse(content) as WhitelistData;
  }

  private save(data: WhitelistData): void {
    const dir = dirname(this.filePath);
    if (!existsSync(dir)) {
      mkdirSync(dir, { recursive: true });
    }
    writeFileSync(this.filePath, JSON.stringify(data, null, 2));
  }

  isAllowed(shop: string): boolean {
    const data = this.load();
    const normalized = this.normalizeDomain(shop);
    return data.allowed_shops.some(
      (s) => this.normalizeDomain(s) === normalized
    );
  }

  addShop(shop: string): void {
    const data = this.load();
    const normalized = this.normalizeDomain(shop);
    if (!data.allowed_shops.some((s) => this.normalizeDomain(s) === normalized)) {
      data.allowed_shops.push(normalized);
      this.save(data);
    }
  }

  removeShop(shop: string): void {
    const data = this.load();
    const normalized = this.normalizeDomain(shop);
    data.allowed_shops = data.allowed_shops.filter(
      (s) => this.normalizeDomain(s) !== normalized
    );
    this.save(data);
  }

  listShops(): string[] {
    return this.load().allowed_shops;
  }
}
