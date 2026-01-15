// ABOUTME: Entry point for the Shopify Spinner CLI.
// ABOUTME: Parses commands and delegates to appropriate handlers.

import 'dotenv/config';
import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './cli/commands/validate.js';
import { createCommand } from './cli/commands/create.js';
import { listCommand } from './cli/commands/list.js';
import { statusCommand } from './cli/commands/status.js';
import { authServerCommand } from './cli/commands/auth.js';
import {
  whitelistAddCommand,
  whitelistRemoveCommand,
  whitelistListCommand,
} from './cli/commands/whitelist.js';
import { themePushCommand, themeListCommand } from './cli/commands/theme.js';

const program = new Command();

program
  .name('spinner')
  .description('Spin up Shopify stores from YAML configs')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate a config file without creating a store')
  .requiredOption('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    console.log(chalk.blue('Validating config...'));

    const result = await validateCommand(options.config);

    if (result.valid) {
      console.log(chalk.green('Config is valid'));
    } else {
      console.log(chalk.red('Config has errors:'));
      result.errors.forEach(err => {
        console.log(chalk.red(`  - ${err}`));
      });
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Create a new store from config')
  .requiredOption('-c, --config <path>', 'Path to config file')
  .option('--access-token <token>', 'Shopify Admin API access token')
  .option('--shop-domain <domain>', 'Shop domain (e.g., store.myshopify.com)')
  .action(async (options) => {
    try {
      await createCommand(options);
    } catch (error) {
      console.log(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

program
  .command('list')
  .description('List all managed stores')
  .action(async () => {
    await listCommand();
  });

program
  .command('status')
  .description('Show status of a store build')
  .argument('<store>', 'Store name')
  .action(async (store) => {
    await statusCommand(store);
  });

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

const themeCmd = program
  .command('theme')
  .description('Manage Shopify themes');

themeCmd
  .command('push')
  .description('Push theme to a Shopify store (uses Shopify CLI)')
  .requiredOption('-s, --shop <domain>', 'Shop domain (e.g., store.myshopify.com)')
  .option('-p, --path <path>', 'Path to theme directory', './themes/spinner')
  .option('--unpublished', 'Push as unpublished theme')
  .action(async (options) => {
    await themePushCommand(options);
  });

themeCmd
  .command('list')
  .description('List themes on a store')
  .requiredOption('-s, --shop <domain>', 'Shop domain')
  .action(async (options) => {
    await themeListCommand(options.shop);
  });

program.parse();
