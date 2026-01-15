// ABOUTME: CLI command to push themes via Shopify CLI.
// ABOUTME: Supports customization from config before pushing.

import chalk from 'chalk';
import { spawn } from 'child_process';
import { existsSync, mkdirSync, rmSync, readdirSync, readFileSync } from 'fs';
import { resolve, join, basename } from 'path';
import { tmpdir, homedir } from 'os';
import yaml from 'js-yaml';
import { parseConfigFile } from '../../config/parser.js';
import { customizeTheme } from '../../theme/customizer.js';
import { ShopifyClient } from '../../shopify/client.js';
import { TokenStore } from '../../auth/token-store.js';
import { StoreConfig } from '../../config/schema.js';

const THEME_UPDATE_MUTATION = `
  mutation themeUpdate($id: ID!, $input: OnlineStoreThemeInput!) {
    themeUpdate(id: $id, input: $input) {
      theme {
        id
        name
      }
      userErrors {
        field
        message
      }
    }
  }
`;

interface ThemeUpdateResponse {
  themeUpdate: {
    theme: { id: string; name: string } | null;
    userErrors: Array<{ field: string; message: string }>;
  };
}

async function renameTheme(shopDomain: string, themeId: string, newName: string): Promise<boolean> {
  const tokenStore = new TokenStore(resolve(homedir(), '.spinner', 'tokens.json'));
  const storedToken = tokenStore.getToken(shopDomain);

  if (!storedToken) {
    console.log(chalk.yellow('No stored token - cannot rename theme automatically'));
    return false;
  }

  const client = new ShopifyClient({
    accessToken: storedToken.accessToken,
    shopDomain,
  });

  try {
    const response = await client.mutate<ThemeUpdateResponse>(THEME_UPDATE_MUTATION, {
      id: `gid://shopify/OnlineStoreTheme/${themeId}`,
      input: { name: newName },
    });

    if (response.themeUpdate.userErrors.length > 0) {
      console.log(chalk.yellow(`Could not rename theme: ${response.themeUpdate.userErrors[0].message}`));
      return false;
    }

    return true;
  } catch (error) {
    console.log(chalk.yellow(`Could not rename theme: ${(error as Error).message}`));
    return false;
  }
}

interface ThemePushOptions {
  shop: string;
  path?: string;
  config?: string;
  unpublished?: boolean;
  name?: string;
  theme?: string;
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
  let themeName = options.name;

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

      // Use store name as theme name if not provided
      if (!themeName && config.store.name) {
        themeName = `Spinner - ${config.store.name}`;
      }

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

  // If theme ID specified, push to that theme
  if (options.theme) {
    args.push('--theme', options.theme);
  }

  if (options.unpublished) {
    args.push('--unpublished');
    if (themeName) {
      args.push('--name', `"${themeName}"`);
      console.log(chalk.gray(`Creating new theme: ${themeName}`));
    }
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

    // Rename theme if we have a theme ID and name
    if (options.theme && themeName) {
      console.log(chalk.blue(`Renaming theme to "${themeName}"...`));
      const renamed = await renameTheme(options.shop, options.theme, themeName);
      if (renamed) {
        console.log(chalk.green(`✓ Theme renamed to "${themeName}"`));
      }
    }

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

// Files to skip when scanning configs
const SKIP_FILES = ['_example.yaml', 'example.yaml', 'test.yaml', 'invalid.yaml'];

export interface ValidConfig {
  configPath: string;
  shopDomain: string;
  storeName: string;
  config: StoreConfig;
}

export interface SkippedConfig {
  configPath: string;
  reason: string;
}

export interface ScanResult {
  valid: ValidConfig[];
  skipped: SkippedConfig[];
}

export async function scanConfigsForDeploy(configsDir: string): Promise<ScanResult> {
  const result: ScanResult = { valid: [], skipped: [] };
  const resolvedDir = resolve(configsDir);

  if (!existsSync(resolvedDir)) {
    return result;
  }

  const files = readdirSync(resolvedDir).filter(f => f.endsWith('.yaml'));

  for (const file of files) {
    const configPath = join(resolvedDir, file);
    const fileName = basename(file);

    // Skip known test/example files
    if (SKIP_FILES.includes(fileName) || fileName.startsWith('_')) {
      result.skipped.push({ configPath, reason: `Skipped example/test file: ${fileName}` });
      continue;
    }

    try {
      const content = readFileSync(configPath, 'utf-8');
      const parsed = yaml.load(content) as Record<string, unknown>;

      // Check for shop_domain
      const store = parsed?.store as Record<string, unknown> | undefined;
      const shopDomain = store?.shop_domain as string | undefined;
      const storeName = store?.name as string | undefined;

      if (!shopDomain) {
        result.skipped.push({ configPath, reason: `Missing shop_domain in ${fileName}` });
        continue;
      }

      if (!storeName) {
        result.skipped.push({ configPath, reason: `Missing store name in ${fileName}` });
        continue;
      }

      // Full parse to validate
      const config = await parseConfigFile(configPath);

      result.valid.push({
        configPath,
        shopDomain,
        storeName,
        config,
      });
    } catch (error) {
      result.skipped.push({
        configPath,
        reason: `Failed to parse ${fileName}: ${(error as Error).message}`,
      });
    }
  }

  return result;
}

function runGitClone(repoUrl: string, targetDir: string): Promise<number> {
  return new Promise((resolvePromise) => {
    const child = spawn('git', ['clone', '--depth', '1', repoUrl, targetDir], {
      stdio: 'inherit',
      shell: true,
    });

    child.on('close', (code) => {
      resolvePromise(code ?? 1);
    });

    child.on('error', (err) => {
      console.error(chalk.red(`Failed to clone repo: ${err.message}`));
      resolvePromise(1);
    });
  });
}

const THEMES_QUERY = `
  query {
    themes(first: 50) {
      nodes {
        id
        name
        role
      }
    }
  }
`;

interface ThemesQueryResponse {
  themes: {
    nodes: Array<{ id: string; name: string; role: string }>;
  };
}

async function findThemeByName(shopDomain: string, themeName: string): Promise<string | null> {
  const tokenStore = new TokenStore(resolve(homedir(), '.spinner', 'tokens.json'));
  const storedToken = tokenStore.getToken(shopDomain);

  if (!storedToken) {
    return null;
  }

  const client = new ShopifyClient({
    accessToken: storedToken.accessToken,
    shopDomain,
  });

  try {
    const response = await client.query<ThemesQueryResponse>(THEMES_QUERY);
    const theme = response.themes.nodes.find(t => t.name === themeName);
    if (theme) {
      // Extract numeric ID from gid://shopify/OnlineStoreTheme/123456
      const match = theme.id.match(/\/(\d+)$/);
      return match ? match[1] : null;
    }
    return null;
  } catch {
    return null;
  }
}

export interface DeployAllOptions {
  repo: string;
  configs: string;
  dryRun?: boolean;
}

interface DeployResult {
  shopDomain: string;
  storeName: string;
  success: boolean;
  message: string;
  themeId?: string;
  action?: 'created' | 'updated';
}

export async function deployAllCommand(options: DeployAllOptions): Promise<void> {
  const { repo, configs, dryRun } = options;

  console.log(chalk.blue('Scanning configs...'));
  const scanResult = await scanConfigsForDeploy(configs);

  if (scanResult.skipped.length > 0) {
    console.log(chalk.yellow(`\nSkipped ${scanResult.skipped.length} config(s):`));
    for (const skipped of scanResult.skipped) {
      console.log(chalk.gray(`  - ${skipped.reason}`));
    }
  }

  if (scanResult.valid.length === 0) {
    console.log(chalk.yellow('\nNo valid configs found with shop_domain. Nothing to deploy.'));
    return;
  }

  console.log(chalk.green(`\nFound ${scanResult.valid.length} store(s) to deploy:`));
  for (const config of scanResult.valid) {
    console.log(chalk.gray(`  - ${config.storeName} → ${config.shopDomain}`));
  }

  if (dryRun) {
    console.log(chalk.yellow('\n--dry-run specified, not deploying.'));
    return;
  }

  // Clone repo to temp directory
  const tempDir = join(tmpdir(), `spinner-deploy-${Date.now()}`);
  console.log(chalk.blue(`\nCloning theme from ${repo}...`));

  const cloneResult = await runGitClone(repo, tempDir);
  if (cloneResult !== 0) {
    console.error(chalk.red('Failed to clone theme repository'));
    process.exit(1);
  }

  console.log(chalk.green('✓ Theme cloned'));

  const results: DeployResult[] = [];

  // Deploy to each store
  for (const validConfig of scanResult.valid) {
    console.log(chalk.blue(`\n${'─'.repeat(50)}`));
    console.log(chalk.blue(`Deploying to ${validConfig.storeName} (${validConfig.shopDomain})...`));

    const themeName = `Spinner - ${validConfig.storeName}`;
    let themeId = await findThemeByName(validConfig.shopDomain, themeName);
    let action: 'created' | 'updated' = themeId ? 'updated' : 'created';

    try {
      // Create customized theme in temp directory
      const customizedDir = join(tmpdir(), `spinner-custom-${Date.now()}`);
      mkdirSync(customizedDir, { recursive: true });

      await customizeTheme({
        configPath: validConfig.configPath,
        config: validConfig.config,
        themePath: tempDir,
        outputPath: customizedDir,
      });

      // Build shopify CLI args
      const args = ['theme', 'push', '--store', validConfig.shopDomain, '--path', customizedDir];

      if (themeId) {
        args.push('--theme', themeId);
        console.log(chalk.gray(`  Updating existing theme: ${themeName} (${themeId})`));
      } else {
        args.push('--unpublished', '--name', `"${themeName}"`);
        console.log(chalk.gray(`  Creating new theme: ${themeName}`));
      }

      args.push('--allow-live');

      const exitCode = await runShopifyCli(args);

      // Cleanup customized dir
      rmSync(customizedDir, { recursive: true, force: true });

      if (exitCode === 0) {
        results.push({
          shopDomain: validConfig.shopDomain,
          storeName: validConfig.storeName,
          success: true,
          message: action === 'updated' ? `Updated theme ${themeId}` : 'Created new theme',
          themeId: themeId ?? undefined,
          action,
        });
        console.log(chalk.green(`✓ ${validConfig.storeName} deployed`));
      } else {
        results.push({
          shopDomain: validConfig.shopDomain,
          storeName: validConfig.storeName,
          success: false,
          message: `Shopify CLI exited with code ${exitCode}`,
        });
        console.log(chalk.red(`✗ ${validConfig.storeName} failed`));
      }
    } catch (error) {
      results.push({
        shopDomain: validConfig.shopDomain,
        storeName: validConfig.storeName,
        success: false,
        message: (error as Error).message,
      });
      console.log(chalk.red(`✗ ${validConfig.storeName} failed: ${(error as Error).message}`));
    }
  }

  // Cleanup cloned repo
  rmSync(tempDir, { recursive: true, force: true });

  // Print summary
  console.log(chalk.blue(`\n${'═'.repeat(50)}`));
  console.log(chalk.blue('DEPLOYMENT SUMMARY'));
  console.log(chalk.blue(`${'═'.repeat(50)}`));

  const successes = results.filter(r => r.success);
  const failures = results.filter(r => !r.success);

  if (successes.length > 0) {
    console.log(chalk.green(`\n✓ Successful (${successes.length}):`));
    for (const r of successes) {
      const actionText = r.action === 'updated' ? `updated theme ${r.themeId}` : 'created new theme';
      console.log(chalk.gray(`  ${r.storeName} → ${r.shopDomain} (${actionText})`));
    }
  }

  if (failures.length > 0) {
    console.log(chalk.red(`\n✗ Failed (${failures.length}):`));
    for (const r of failures) {
      console.log(chalk.gray(`  ${r.storeName} → ${r.shopDomain}`));
      console.log(chalk.gray(`    ${r.message}`));
    }
  }

  console.log('');

  if (failures.length > 0) {
    process.exit(1);
  }
}
