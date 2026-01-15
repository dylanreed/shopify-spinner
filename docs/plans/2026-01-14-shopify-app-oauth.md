# Shopify App OAuth Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Transform Spinner from a custom-app-token CLI into an unlisted Shopify app with OAuth authentication and whitelist access control.

**Architecture:** Add a web server (Hono) that handles OAuth flow. When a merchant clicks the install link, the server checks their shop domain against a whitelist before completing installation. Tokens are stored locally in JSON. The existing CLI commands use stored tokens instead of requiring manual credentials.

**Tech Stack:** Hono (web server), OAuth 2.0 (Shopify auth), JSON file storage (whitelist + tokens)

---

## Task 1: Add Web Server Dependencies

**Files:**
- Modify: `package.json`

**Step 1: Add dependencies**

```bash
npm install hono @hono/node-server dotenv
```

**Step 2: Verify installation**

```bash
npm ls hono @hono/node-server dotenv
```
Expected: All packages listed without errors

**Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add hono web server dependencies"
```

---

## Task 2: Create Whitelist Manager

**Files:**
- Create: `src/auth/whitelist.ts`
- Create: `src/auth/whitelist.test.ts`

**Step 1: Write the failing test**

Create `src/auth/whitelist.test.ts`:

```typescript
// ABOUTME: Tests for shop whitelist management.
// ABOUTME: Validates allowed shops and whitelist CRUD operations.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { Whitelist } from './whitelist.js';
import { writeFileSync, unlinkSync, existsSync } from 'fs';

describe('Whitelist', () => {
  const testPath = '/tmp/test-whitelist.json';

  afterEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  describe('isAllowed', () => {
    it('returns true for whitelisted shop', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('test-store.myshopify.com')).toBe(true);
    });

    it('returns false for non-whitelisted shop', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('other-store.myshopify.com')).toBe(false);
    });

    it('returns false when whitelist file does not exist', () => {
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('any-store.myshopify.com')).toBe(false);
    });

    it('normalizes shop domain for comparison', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.isAllowed('TEST-STORE.myshopify.com')).toBe(true);
      expect(whitelist.isAllowed('test-store')).toBe(true);
    });
  });

  describe('addShop', () => {
    it('adds shop to whitelist', () => {
      const whitelist = new Whitelist(testPath);
      whitelist.addShop('new-store.myshopify.com');
      expect(whitelist.isAllowed('new-store.myshopify.com')).toBe(true);
    });

    it('does not add duplicate shops', () => {
      const whitelist = new Whitelist(testPath);
      whitelist.addShop('test-store.myshopify.com');
      whitelist.addShop('test-store.myshopify.com');
      expect(whitelist.listShops()).toHaveLength(1);
    });
  });

  describe('removeShop', () => {
    it('removes shop from whitelist', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['test-store.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      whitelist.removeShop('test-store.myshopify.com');
      expect(whitelist.isAllowed('test-store.myshopify.com')).toBe(false);
    });
  });

  describe('listShops', () => {
    it('returns all whitelisted shops', () => {
      writeFileSync(testPath, JSON.stringify({
        allowed_shops: ['store-1.myshopify.com', 'store-2.myshopify.com']
      }));
      const whitelist = new Whitelist(testPath);
      expect(whitelist.listShops()).toEqual([
        'store-1.myshopify.com',
        'store-2.myshopify.com'
      ]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/auth/whitelist.test.ts
```
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/auth/whitelist.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/auth/whitelist.test.ts
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/auth/whitelist.ts src/auth/whitelist.test.ts
git commit -m "feat: add whitelist manager for shop access control"
```

---

## Task 3: Create Token Storage

**Files:**
- Create: `src/auth/token-store.ts`
- Create: `src/auth/token-store.test.ts`

**Step 1: Write the failing test**

Create `src/auth/token-store.test.ts`:

```typescript
// ABOUTME: Tests for OAuth token storage.
// ABOUTME: Validates token persistence and retrieval.

import { describe, it, expect, afterEach } from 'vitest';
import { TokenStore } from './token-store.js';
import { unlinkSync, existsSync } from 'fs';

describe('TokenStore', () => {
  const testPath = '/tmp/test-tokens.json';

  afterEach(() => {
    if (existsSync(testPath)) {
      unlinkSync(testPath);
    }
  });

  describe('saveToken', () => {
    it('saves token for shop', () => {
      const store = new TokenStore(testPath);
      store.saveToken('test-store.myshopify.com', 'shpat_xxx', ['read_products']);
      const token = store.getToken('test-store.myshopify.com');
      expect(token).toEqual({
        accessToken: 'shpat_xxx',
        scopes: ['read_products'],
        shop: 'test-store.myshopify.com',
      });
    });
  });

  describe('getToken', () => {
    it('returns null for unknown shop', () => {
      const store = new TokenStore(testPath);
      expect(store.getToken('unknown.myshopify.com')).toBeNull();
    });
  });

  describe('removeToken', () => {
    it('removes token for shop', () => {
      const store = new TokenStore(testPath);
      store.saveToken('test-store.myshopify.com', 'shpat_xxx', ['read_products']);
      store.removeToken('test-store.myshopify.com');
      expect(store.getToken('test-store.myshopify.com')).toBeNull();
    });
  });

  describe('listShops', () => {
    it('returns all shops with tokens', () => {
      const store = new TokenStore(testPath);
      store.saveToken('store-1.myshopify.com', 'token1', []);
      store.saveToken('store-2.myshopify.com', 'token2', []);
      expect(store.listShops()).toEqual([
        'store-1.myshopify.com',
        'store-2.myshopify.com',
      ]);
    });
  });
});
```

**Step 2: Run test to verify it fails**

```bash
npm test -- src/auth/token-store.test.ts
```
Expected: FAIL with "Cannot find module"

**Step 3: Write minimal implementation**

Create `src/auth/token-store.ts`:

```typescript
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
```

**Step 4: Run test to verify it passes**

```bash
npm test -- src/auth/token-store.test.ts
```
Expected: All tests PASS

**Step 5: Commit**

```bash
git add src/auth/token-store.ts src/auth/token-store.test.ts
git commit -m "feat: add token store for OAuth token persistence"
```

---

## Task 4: Create OAuth Handler

**Files:**
- Create: `src/auth/oauth.ts`
- Create: `src/auth/oauth.test.ts`
- Create: `src/auth/types.ts`

**Step 1: Create types file**

Create `src/auth/types.ts`:

```typescript
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
```

**Step 2: Write the failing test**

Create `src/auth/oauth.test.ts`:

```typescript
// ABOUTME: Tests for Shopify OAuth flow handling.
// ABOUTME: Validates authorization URL generation and token exchange.

import { describe, it, expect } from 'vitest';
import { OAuthHandler } from './oauth.js';
import type { AppCredentials } from './types.js';

describe('OAuthHandler', () => {
  const credentials: AppCredentials = {
    clientId: 'test-client-id',
    clientSecret: 'test-client-secret',
    scopes: ['read_products', 'write_products'],
    redirectUri: 'http://localhost:3000/auth/callback',
  };

  describe('getAuthorizationUrl', () => {
    it('generates correct authorization URL', () => {
      const handler = new OAuthHandler(credentials);
      const url = handler.getAuthorizationUrl('test-store.myshopify.com', 'state123');

      expect(url).toContain('https://test-store.myshopify.com/admin/oauth/authorize');
      expect(url).toContain('client_id=test-client-id');
      expect(url).toContain('scope=read_products%2Cwrite_products');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A3000%2Fauth%2Fcallback');
      expect(url).toContain('state=state123');
    });

    it('normalizes shop domain', () => {
      const handler = new OAuthHandler(credentials);
      const url = handler.getAuthorizationUrl('test-store', 'state123');

      expect(url).toContain('https://test-store.myshopify.com/admin/oauth/authorize');
    });
  });

  describe('normalizeDomain', () => {
    it('adds .myshopify.com if missing', () => {
      const handler = new OAuthHandler(credentials);
      expect(handler.normalizeDomain('test-store')).toBe('test-store.myshopify.com');
    });

    it('keeps full domain unchanged', () => {
      const handler = new OAuthHandler(credentials);
      expect(handler.normalizeDomain('test-store.myshopify.com')).toBe('test-store.myshopify.com');
    });

    it('lowercases domain', () => {
      const handler = new OAuthHandler(credentials);
      expect(handler.normalizeDomain('TEST-Store.myshopify.com')).toBe('test-store.myshopify.com');
    });
  });
});
```

**Step 3: Run test to verify it fails**

```bash
npm test -- src/auth/oauth.test.ts
```
Expected: FAIL with "Cannot find module"

**Step 4: Write minimal implementation**

Create `src/auth/oauth.ts`:

```typescript
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
```

**Step 5: Run test to verify it passes**

```bash
npm test -- src/auth/oauth.test.ts
```
Expected: All tests PASS

**Step 6: Commit**

```bash
git add src/auth/types.ts src/auth/oauth.ts src/auth/oauth.test.ts
git commit -m "feat: add OAuth handler for Shopify authorization flow"
```

---

## Task 5: Create Web Server

**Files:**
- Create: `src/server/index.ts`
- Create: `src/server/routes.ts`

**Step 1: Create server entry point**

Create `src/server/index.ts`:

```typescript
// ABOUTME: Hono web server entry point for OAuth flow.
// ABOUTME: Handles app installation and callback endpoints.

import { serve } from '@hono/node-server';
import { Hono } from 'hono';
import { createRoutes } from './routes.js';
import { Whitelist } from '../auth/whitelist.js';
import { TokenStore } from '../auth/token-store.js';
import { OAuthHandler } from '../auth/oauth.js';
import type { AppCredentials } from '../auth/types.js';
import { resolve } from 'path';
import { homedir } from 'os';

export interface ServerConfig {
  port: number;
  credentials: AppCredentials;
  dataDir: string;
}

export function createServer(config: ServerConfig) {
  const whitelist = new Whitelist(resolve(config.dataDir, 'whitelist.json'));
  const tokenStore = new TokenStore(resolve(config.dataDir, 'tokens.json'));
  const oauth = new OAuthHandler(config.credentials);

  const app = new Hono();
  createRoutes(app, { whitelist, tokenStore, oauth });

  return app;
}

export function startServer(config: ServerConfig) {
  const app = createServer(config);

  serve({
    fetch: app.fetch,
    port: config.port,
  }, (info) => {
    console.log(`Spinner OAuth server running on http://localhost:${info.port}`);
    console.log(`Install URL: http://localhost:${info.port}/auth?shop=SHOP_NAME`);
  });

  return app;
}
```

**Step 2: Create routes**

Create `src/server/routes.ts`:

```typescript
// ABOUTME: HTTP routes for Shopify OAuth flow.
// ABOUTME: Handles /auth, /auth/callback, and status endpoints.

import type { Hono } from 'hono';
import type { Whitelist } from '../auth/whitelist.js';
import type { TokenStore } from '../auth/token-store.js';
import type { OAuthHandler } from '../auth/oauth.js';
import { randomBytes } from 'crypto';

interface RouteDependencies {
  whitelist: Whitelist;
  tokenStore: TokenStore;
  oauth: OAuthHandler;
}

const pendingStates = new Map<string, string>();

export function createRoutes(app: Hono, deps: RouteDependencies) {
  const { whitelist, tokenStore, oauth } = deps;

  app.get('/health', (c) => {
    return c.json({ status: 'ok' });
  });

  app.get('/auth', (c) => {
    const shop = c.req.query('shop');

    if (!shop) {
      return c.text('Missing shop parameter. Use /auth?shop=your-store.myshopify.com', 400);
    }

    const normalizedShop = oauth.normalizeDomain(shop);

    if (!whitelist.isAllowed(normalizedShop)) {
      return c.text(
        `Shop ${normalizedShop} is not authorized to install this app.\n` +
        'Contact the app administrator to request access.',
        403
      );
    }

    const state = randomBytes(16).toString('hex');
    pendingStates.set(state, normalizedShop);

    const authUrl = oauth.getAuthorizationUrl(normalizedShop, state);
    return c.redirect(authUrl);
  });

  app.get('/auth/callback', async (c) => {
    const code = c.req.query('code');
    const state = c.req.query('state');
    const shop = c.req.query('shop');

    if (!code || !state || !shop) {
      return c.text('Missing required parameters', 400);
    }

    const expectedShop = pendingStates.get(state);
    if (!expectedShop) {
      return c.text('Invalid or expired state parameter', 400);
    }

    const normalizedShop = oauth.normalizeDomain(shop);
    if (normalizedShop !== expectedShop) {
      return c.text('Shop mismatch', 400);
    }

    pendingStates.delete(state);

    try {
      const tokenResponse = await oauth.exchangeCodeForToken(normalizedShop, code);
      const scopes = tokenResponse.scope.split(',');

      tokenStore.saveToken(normalizedShop, tokenResponse.access_token, scopes);

      return c.html(`
        <html>
          <body style="font-family: sans-serif; padding: 40px; text-align: center;">
            <h1>Installation Successful!</h1>
            <p>Spinner is now connected to <strong>${normalizedShop}</strong></p>
            <p>You can close this window and use the Spinner CLI to configure your store.</p>
            <pre style="background: #f5f5f5; padding: 20px; border-radius: 8px;">
npm run spinner create --config ./configs/your-config.yaml --shop ${normalizedShop}
            </pre>
          </body>
        </html>
      `);
    } catch (error) {
      console.error('OAuth callback error:', error);
      return c.text(`Authentication failed: ${(error as Error).message}`, 500);
    }
  });

  app.get('/shops', (c) => {
    const shops = tokenStore.listShops();
    return c.json({ shops });
  });
}
```

**Step 3: Commit**

```bash
git add src/server/index.ts src/server/routes.ts
git commit -m "feat: add Hono web server for OAuth flow"
```

---

## Task 6: Update ShopifyClient for OAuth Tokens

**Files:**
- Modify: `src/shopify/client.ts`
- Modify: `src/shopify/types.ts`
- Modify: `src/shopify/client.test.ts`

**Step 1: Update types**

Modify `src/shopify/types.ts` to add alternate credential type:

```typescript
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
```

Note: The types remain the same since we're using stored tokens. The ShopifyClient already accepts accessToken - we just retrieve it from TokenStore now.

**Step 2: Commit**

```bash
git add src/shopify/types.ts
git commit -m "docs: clarify ShopifyCredentials usage with OAuth tokens"
```

---

## Task 7: Add CLI Commands for Auth Management

**Files:**
- Create: `src/cli/commands/auth.ts`
- Create: `src/cli/commands/whitelist.ts`
- Modify: `src/index.ts`

**Step 1: Create auth command**

Create `src/cli/commands/auth.ts`:

```typescript
// ABOUTME: CLI command to start the OAuth server for app installation.
// ABOUTME: Runs the web server that handles Shopify OAuth flow.

import chalk from 'chalk';
import { startServer } from '../../server/index.js';
import { resolve } from 'path';
import { homedir } from 'os';

interface AuthServerOptions {
  port: number;
}

export function authServerCommand(options: AuthServerOptions): void {
  const clientId = process.env.SHOPIFY_CLIENT_ID;
  const clientSecret = process.env.SHOPIFY_CLIENT_SECRET;
  const port = options.port;

  if (!clientId || !clientSecret) {
    console.log(chalk.red('Missing required environment variables:'));
    console.log(chalk.yellow('  SHOPIFY_CLIENT_ID - Your Shopify app client ID'));
    console.log(chalk.yellow('  SHOPIFY_CLIENT_SECRET - Your Shopify app client secret'));
    console.log(chalk.gray('\nGet these from: Dev Dashboard → Your App → API credentials'));
    process.exit(1);
  }

  const dataDir = resolve(homedir(), '.spinner');
  const redirectUri = `http://localhost:${port}/auth/callback`;

  console.log(chalk.blue('Starting Spinner OAuth server...'));
  console.log(chalk.gray(`Data directory: ${dataDir}`));

  startServer({
    port,
    dataDir,
    credentials: {
      clientId,
      clientSecret,
      scopes: [
        'read_products',
        'write_products',
        'read_themes',
        'write_themes',
        'read_inventory',
        'write_inventory',
      ],
      redirectUri,
    },
  });
}
```

**Step 2: Create whitelist command**

Create `src/cli/commands/whitelist.ts`:

```typescript
// ABOUTME: CLI commands for managing the shop whitelist.
// ABOUTME: Add, remove, and list authorized shops.

import chalk from 'chalk';
import { Whitelist } from '../../auth/whitelist.js';
import { resolve } from 'path';
import { homedir } from 'os';

function getWhitelist(): Whitelist {
  const dataDir = resolve(homedir(), '.spinner');
  return new Whitelist(resolve(dataDir, 'whitelist.json'));
}

export function whitelistAddCommand(shop: string): void {
  const whitelist = getWhitelist();
  whitelist.addShop(shop);
  console.log(chalk.green(`✓ Added ${shop} to whitelist`));
}

export function whitelistRemoveCommand(shop: string): void {
  const whitelist = getWhitelist();
  whitelist.removeShop(shop);
  console.log(chalk.green(`✓ Removed ${shop} from whitelist`));
}

export function whitelistListCommand(): void {
  const whitelist = getWhitelist();
  const shops = whitelist.listShops();

  if (shops.length === 0) {
    console.log(chalk.yellow('No shops in whitelist'));
    console.log(chalk.gray('Add a shop with: spinner whitelist add <shop>'));
    return;
  }

  console.log(chalk.blue('Whitelisted shops:'));
  shops.forEach((shop) => {
    console.log(chalk.white(`  • ${shop}`));
  });
}
```

**Step 3: Update main CLI**

Modify `src/index.ts` to add new commands. Add after existing command registrations:

```typescript
// Add these imports at the top
import { authServerCommand } from './cli/commands/auth.js';
import {
  whitelistAddCommand,
  whitelistRemoveCommand,
  whitelistListCommand,
} from './cli/commands/whitelist.js';

// Add these commands after existing ones

program
  .command('serve')
  .description('Start OAuth server for app installation')
  .option('-p, --port <port>', 'Port to run server on', '3000')
  .action((options) => {
    authServerCommand({ port: parseInt(options.port, 10) });
  });

const whitelistCmd = program
  .command('whitelist')
  .description('Manage shop whitelist');

whitelistCmd
  .command('add <shop>')
  .description('Add shop to whitelist')
  .action(whitelistAddCommand);

whitelistCmd
  .command('remove <shop>')
  .description('Remove shop from whitelist')
  .action(whitelistRemoveCommand);

whitelistCmd
  .command('list')
  .description('List all whitelisted shops')
  .action(whitelistListCommand);
```

**Step 4: Commit**

```bash
git add src/cli/commands/auth.ts src/cli/commands/whitelist.ts src/index.ts
git commit -m "feat: add CLI commands for auth server and whitelist management"
```

---

## Task 8: Update Create Command to Use Stored Tokens

**Files:**
- Modify: `src/cli/commands/create.ts`

**Step 1: Update create command**

Modify `src/cli/commands/create.ts` to use TokenStore when --shop is provided without --access-token:

Replace the credential handling section (around lines 29-41) with:

```typescript
import { TokenStore } from '../../auth/token-store.js';

// Inside createCommand function, replace the credential check:

  // Get credentials - either from flags or stored tokens
  let accessToken = options.accessToken;
  let shopDomain = options.shopDomain;

  if (shopDomain && !accessToken) {
    // Try to get token from store
    const tokenStore = new TokenStore(resolve(homedir(), '.spinner', 'tokens.json'));
    const storedToken = tokenStore.getToken(shopDomain);

    if (storedToken) {
      accessToken = storedToken.accessToken;
      console.log(chalk.gray(`Using stored token for ${shopDomain}`));
    }
  }

  if (!accessToken || !shopDomain) {
    console.log(chalk.yellow('\nNo credentials found.'));
    console.log(chalk.white('Option 1: Install app via OAuth'));
    console.log(chalk.gray('  1. Add shop to whitelist: spinner whitelist add <shop>'));
    console.log(chalk.gray('  2. Start OAuth server: spinner serve'));
    console.log(chalk.gray('  3. Visit: http://localhost:3000/auth?shop=<shop>'));
    console.log(chalk.white('\nOption 2: Provide credentials directly'));
    console.log(chalk.gray('  spinner create --config <config> --shop <shop> --access-token <token>'));
    return;
  }
```

**Step 2: Commit**

```bash
git add src/cli/commands/create.ts
git commit -m "feat: update create command to use stored OAuth tokens"
```

---

## Task 9: Update Environment Configuration

**Files:**
- Modify: `.env.example`

**Step 1: Update .env.example**

Replace contents of `.env.example`:

```bash
# ABOUTME: Example environment variables for Shopify Spinner
# ABOUTME: Copy this to .env and fill in your values

# Shopify App Credentials (from Dev Dashboard)
# Get these from: Dev Dashboard → Your App → API credentials
SHOPIFY_CLIENT_ID=your-client-id
SHOPIFY_CLIENT_SECRET=your-client-secret

# Optional: For direct API access without OAuth flow
# SHOPIFY_SHOP_DOMAIN=your-store.myshopify.com
# SHOPIFY_ACCESS_TOKEN=shpat_xxxxxxxxxxxxxxxx
```

**Step 2: Commit**

```bash
git add .env.example
git commit -m "docs: update .env.example for OAuth app credentials"
```

---

## Task 10: Add Server Tests

**Files:**
- Create: `src/server/routes.test.ts`

**Step 1: Write server route tests**

Create `src/server/routes.test.ts`:

```typescript
// ABOUTME: Tests for OAuth server routes.
// ABOUTME: Validates auth flow, whitelist enforcement, and error handling.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createServer, type ServerConfig } from './index.js';
import { writeFileSync, unlinkSync, existsSync, mkdirSync, rmSync } from 'fs';
import { resolve } from 'path';

describe('Server Routes', () => {
  const testDataDir = '/tmp/spinner-test-server';
  const config: ServerConfig = {
    port: 3456,
    dataDir: testDataDir,
    credentials: {
      clientId: 'test-client-id',
      clientSecret: 'test-client-secret',
      scopes: ['read_products'],
      redirectUri: 'http://localhost:3456/auth/callback',
    },
  };

  beforeEach(() => {
    mkdirSync(testDataDir, { recursive: true });
  });

  afterEach(() => {
    if (existsSync(testDataDir)) {
      rmSync(testDataDir, { recursive: true });
    }
  });

  describe('GET /health', () => {
    it('returns ok status', async () => {
      const app = createServer(config);
      const res = await app.request('/health');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ status: 'ok' });
    });
  });

  describe('GET /auth', () => {
    it('returns 400 when shop is missing', async () => {
      const app = createServer(config);
      const res = await app.request('/auth');
      expect(res.status).toBe(400);
      expect(await res.text()).toContain('Missing shop parameter');
    });

    it('returns 403 when shop is not whitelisted', async () => {
      const app = createServer(config);
      const res = await app.request('/auth?shop=not-allowed.myshopify.com');
      expect(res.status).toBe(403);
      expect(await res.text()).toContain('not authorized');
    });

    it('redirects to Shopify OAuth when shop is whitelisted', async () => {
      writeFileSync(
        resolve(testDataDir, 'whitelist.json'),
        JSON.stringify({ allowed_shops: ['allowed-store.myshopify.com'] })
      );

      const app = createServer(config);
      const res = await app.request('/auth?shop=allowed-store.myshopify.com');
      expect(res.status).toBe(302);
      expect(res.headers.get('location')).toContain('oauth/authorize');
      expect(res.headers.get('location')).toContain('allowed-store.myshopify.com');
    });
  });

  describe('GET /shops', () => {
    it('returns empty list when no tokens stored', async () => {
      const app = createServer(config);
      const res = await app.request('/shops');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ shops: [] });
    });

    it('returns list of shops with tokens', async () => {
      writeFileSync(
        resolve(testDataDir, 'tokens.json'),
        JSON.stringify({
          tokens: {
            'store-1.myshopify.com': {
              accessToken: 'token1',
              scopes: [],
              shop: 'store-1.myshopify.com',
            },
          },
        })
      );

      const app = createServer(config);
      const res = await app.request('/shops');
      expect(res.status).toBe(200);
      expect(await res.json()).toEqual({ shops: ['store-1.myshopify.com'] });
    });
  });
});
```

**Step 2: Run tests**

```bash
npm test -- src/server/routes.test.ts
```
Expected: All tests PASS

**Step 3: Commit**

```bash
git add src/server/routes.test.ts
git commit -m "test: add server route tests"
```

---

## Task 11: Run Full Test Suite

**Step 1: Run all tests**

```bash
npm test
```
Expected: All tests PASS

**Step 2: Build project**

```bash
npm run build
```
Expected: Build succeeds without errors

**Step 3: Commit any fixes if needed**

---

## Task 12: Update Documentation

**Files:**
- Modify: `docs/SHOPIFY_SETUP.md` (if exists) or create it

**Step 1: Create/update setup documentation**

Create `docs/SHOPIFY_SETUP.md`:

```markdown
# Shopify App Setup Guide

This guide walks through setting up Spinner as a Shopify app with OAuth authentication.

## Prerequisites

- Shopify Partner account
- Node.js 18+

## Step 1: Create App in Dev Dashboard

1. Go to [Dev Dashboard](https://dev.shopify.com/dashboard)
2. Click "Create app"
3. Enter app name: "Spinner" (or your preferred name)
4. Select "Custom distribution" (allows install via link, not listed in app store)

## Step 2: Configure App Settings

In your app's settings:

### API Scopes

Add these Admin API access scopes:
- `read_products`
- `write_products`
- `read_themes`
- `write_themes`
- `read_inventory`
- `write_inventory`

### App URL

Set to: `http://localhost:3000` (for development)

### Redirect URLs

Add: `http://localhost:3000/auth/callback`

## Step 3: Get Credentials

1. Go to "API credentials" in your app settings
2. Copy the **Client ID**
3. Copy the **Client Secret**

## Step 4: Configure Spinner

Create `.env` file:

```bash
SHOPIFY_CLIENT_ID=your-client-id-here
SHOPIFY_CLIENT_SECRET=your-client-secret-here
```

## Step 5: Whitelist Your Stores

Before a store can install the app, add it to the whitelist:

```bash
npm run spinner whitelist add my-store.myshopify.com
```

## Step 6: Install on a Store

1. Start the OAuth server:
   ```bash
   npm run spinner serve
   ```

2. Visit the install URL:
   ```
   http://localhost:3000/auth?shop=my-store.myshopify.com
   ```

3. Authorize the app in Shopify

4. The token is now stored locally

## Step 7: Configure Your Store

```bash
npm run spinner create --config ./configs/my-config.yaml --shop my-store.myshopify.com
```

## Production Deployment

For production, you'll need to:

1. Deploy the OAuth server to a public URL (e.g., Fly.io)
2. Update the App URL and Redirect URL in Dev Dashboard
3. Submit for Shopify app review
4. Set visibility to "Unlisted" after approval

## Troubleshooting

### "Shop not authorized" error

Add the shop to whitelist: `npm run spinner whitelist add <shop>`

### "Missing credentials" error

Make sure `.env` file exists with SHOPIFY_CLIENT_ID and SHOPIFY_CLIENT_SECRET

### OAuth callback fails

Check that the redirect URL in Dev Dashboard matches your server URL
```

**Step 2: Commit**

```bash
git add docs/SHOPIFY_SETUP.md
git commit -m "docs: add Shopify app setup guide"
```

---

## Summary

After completing all tasks, you'll have:

1. **Whitelist manager** - Controls which shops can install the app
2. **Token store** - Persists OAuth tokens for reuse
3. **OAuth handler** - Manages Shopify authorization flow
4. **Web server** - Handles /auth and /auth/callback endpoints
5. **CLI commands** - `serve`, `whitelist add/remove/list`
6. **Updated create command** - Uses stored tokens automatically

### Usage Flow

```bash
# One-time: Add shop to whitelist
npm run spinner whitelist add client-store.myshopify.com

# Start OAuth server
npm run spinner serve

# Client visits: http://localhost:3000/auth?shop=client-store
# → Authorizes app
# → Token stored automatically

# Configure store
npm run spinner create --config ./configs/client.yaml --shop client-store.myshopify.com
```
