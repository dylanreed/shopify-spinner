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
