// ABOUTME: CLI command to push themes via Shopify CLI.
// ABOUTME: Supports customization from config before pushing.

import chalk from 'chalk';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { parseConfigFile } from '../../config/parser.js';
import { customizeTheme } from '../../theme/customizer.js';

interface ThemePushOptions {
  shop: string;
  path?: string;
  config?: string;
  unpublished?: boolean;
}

function runShopifyCli(args: string[]): Promise<number> {
  return new Promise((resolvePromise) => {
    const child = spawn('shopify', args, {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolvePromise(code ?? 1);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`Failed to run Shopify CLI: ${err.message}`));
      console.log(chalk.yellow('Make sure Shopify CLI is installed: npm install -g @shopify/cli'));
      resolvePromise(1);
    });
  });
}

export async function themePushCommand(options: ThemePushOptions): Promise<void> {
  const baseThemePath = options.path ?? './themes/spinner';
  const resolvedBasePath = resolve(baseThemePath);

  if (!existsSync(resolvedBasePath)) {
    console.error(chalk.red(`Theme path does not exist: ${resolvedBasePath}`));
    process.exit(1);
  }

  let themePath = resolvedBasePath;
  let tempDir: string | null = null;

  // If config provided, customize the theme first
  if (options.config) {
    const configPath = resolve(options.config);

    if (!existsSync(configPath)) {
      console.error(chalk.red(`Config file does not exist: ${configPath}`));
      process.exit(1);
    }

    console.log(chalk.blue('Loading config and customizing theme...'));

    try {
      const config = await parseConfigFile(configPath);

      // Create temp directory for customized theme
      tempDir = join(tmpdir(), `spinner-theme-${Date.now()}`);
      mkdirSync(tempDir, { recursive: true });

      await customizeTheme({
        configPath,
        config,
        themePath: resolvedBasePath,
        outputPath: tempDir,
      });

      themePath = tempDir;

      // Log what was applied
      const settings = config.theme?.settings;
      if (settings?.preset) {
        console.log(chalk.gray(`  Preset: ${settings.preset}`));
      }
      if (settings?.extract_colors_from_logo && settings?.logo) {
        console.log(chalk.gray(`  Extracted colors from: ${settings.logo}`));
      }
      if (settings?.content?.hero_heading) {
        console.log(chalk.gray(`  Hero: "${settings.content.hero_heading}"`));
      }
      if (settings?.social) {
        const socialCount = Object.values(settings.social).filter(Boolean).length;
        if (socialCount > 0) {
          console.log(chalk.gray(`  Social links: ${socialCount} configured`));
        }
      }

      console.log(chalk.green('✓ Theme customized'));
    } catch (error) {
      console.error(chalk.red(`Failed to customize theme: ${(error as Error).message}`));
      if (tempDir && existsSync(tempDir)) {
        rmSync(tempDir, { recursive: true, force: true });
      }
      process.exit(1);
    }
  }

  console.log(chalk.blue(`Pushing theme to ${options.shop}...`));
  console.log(chalk.gray(`Theme path: ${themePath}`));

  const args = ['theme', 'push', '--store', options.shop, '--path', themePath];

  if (options.unpublished) {
    args.push('--unpublished');
    console.log(chalk.gray('Pushing as unpublished theme'));
  }

  // Add --allow-live to skip confirmation for live themes
  args.push('--allow-live');

  const exitCode = await runShopifyCli(args);

  // Clean up temp directory
  if (tempDir && existsSync(tempDir)) {
    rmSync(tempDir, { recursive: true, force: true });
  }

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
