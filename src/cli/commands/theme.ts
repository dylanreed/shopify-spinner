// ABOUTME: CLI command to push themes via Shopify CLI.
// ABOUTME: Wraps shopify theme push with spinner's store context.

import chalk from 'chalk';
import { spawn } from 'child_process';
import { existsSync } from 'fs';
import { resolve } from 'path';

interface ThemePushOptions {
  shop: string;
  path?: string;
  unpublished?: boolean;
}

function runShopifyCli(args: string[]): Promise<number> {
  return new Promise((resolve) => {
    const child = spawn('shopify', args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolve(code ?? 1);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`Failed to run Shopify CLI: ${err.message}`));
      console.log(chalk.yellow('Make sure Shopify CLI is installed: npm install -g @shopify/cli'));
      resolve(1);
    });
  });
}

export async function themePushCommand(options: ThemePushOptions): Promise<void> {
  const themePath = options.path ?? './themes/spinner';
  const resolvedPath = resolve(themePath);

  if (!existsSync(resolvedPath)) {
    console.error(chalk.red(`Theme path does not exist: ${resolvedPath}`));
    process.exit(1);
  }

  console.log(chalk.blue(`Pushing theme to ${options.shop}...`));
  console.log(chalk.gray(`Theme path: ${resolvedPath}`));

  const args = ['theme', 'push', '--store', options.shop, '--path', resolvedPath];

  if (options.unpublished) {
    args.push('--unpublished');
    console.log(chalk.gray('Pushing as unpublished theme'));
  }

  // Add --allow-live to skip confirmation for live themes
  args.push('--allow-live');

  const exitCode = await runShopifyCli(args);

  if (exitCode === 0) {
    console.log(chalk.green('\n✓ Theme pushed successfully'));

    if (options.unpublished) {
      console.log(chalk.yellow('\nNext steps:'));
      console.log(chalk.gray('  1. Go to your Shopify admin: Themes'));
      console.log(chalk.gray('  2. Find the uploaded theme and click "Publish"'));
      console.log(chalk.gray('  3. Run: spinner create -c <config> --shop-domain ' + options.shop));
    } else {
      console.log(chalk.yellow('\nNext step:'));
      console.log(chalk.gray('  Run: spinner create -c <config> --shop-domain ' + options.shop));
    }
  } else {
    console.error(chalk.red('\n✗ Theme push failed'));
    process.exit(exitCode);
  }
}

export async function themeListCommand(shop: string): Promise<void> {
  console.log(chalk.blue(`Listing themes for ${shop}...`));

  const args = ['theme', 'list', '--store', shop];
  const exitCode = await runShopifyCli(args);

  if (exitCode !== 0) {
    process.exit(exitCode);
  }
}
