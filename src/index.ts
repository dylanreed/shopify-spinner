// ABOUTME: Entry point for the Shopify Spinner CLI.
// ABOUTME: Parses commands and delegates to appropriate handlers.

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './cli/commands/validate.js';
import { createCommand } from './cli/commands/create.js';

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

program.parse();
