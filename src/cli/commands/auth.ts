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
        'read_publications',
        'write_publications',
      ],
      redirectUri,
    },
  });
}
