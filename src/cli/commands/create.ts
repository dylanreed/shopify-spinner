// ABOUTME: CLI command to create a new Shopify store from config.
// ABOUTME: Orchestrates all builders and tracks state.

import chalk from 'chalk';
import { parseConfigFile } from '../../config/parser.js';
import { parseProductsCsv } from '../../products/parser.js';
import { ShopifyClient } from '../../shopify/client.js';
import { ProductBuilder } from '../../builders/products.js';
import { CollectionBuilder } from '../../builders/collections.js';
import { ThemeBuilder } from '../../builders/theme.js';
import { StateManager } from '../../state/manager.js';
import { resolve, dirname } from 'path';
import { homedir } from 'os';

interface CreateOptions {
  config: string;
  accessToken?: string;
  shopDomain?: string;
}

export async function createCommand(options: CreateOptions): Promise<void> {
  const configPath = resolve(options.config);

  console.log(chalk.blue('Loading config...'));
  const config = await parseConfigFile(configPath);

  console.log(chalk.blue(`Creating store: ${config.store.name}`));

  // For MVP, require access token and shop domain
  // Later: integrate with Partner API for store creation
  if (!options.accessToken || !options.shopDomain) {
    console.log(chalk.yellow('\nMVP Mode: Store must already exist.'));
    console.log(chalk.yellow('Provide --access-token and --shop-domain for an existing dev store.\n'));
    console.log(chalk.gray('Future: Partner API integration will create stores automatically.'));
    return;
  }

  const client = new ShopifyClient({
    accessToken: options.accessToken,
    shopDomain: options.shopDomain,
  });

  // Initialize state
  const stateDir = resolve(homedir(), '.spinner', 'stores');
  const stateManager = new StateManager(stateDir);
  const storeName = config.store.name.toLowerCase().replace(/\s+/g, '-');

  let state = stateManager.loadState(storeName);
  if (!state) {
    state = stateManager.initializeState(storeName, configPath);
    stateManager.saveState(storeName, state);
  }

  // Persist shopDomain to state
  if (options.shopDomain) {
    state.shopDomain = options.shopDomain;
    stateManager.saveState(storeName, state);
  }

  // Mark store_created as complete since we're using an existing store in MVP mode
  if (state.steps.store_created.status !== 'complete') {
    stateManager.updateStep(storeName, 'store_created', 'complete', {
      note: 'Using existing store (MVP mode)',
    });
  }

  // Theme configuration
  if (state.steps.theme_configured.status !== 'complete' && config.theme) {
    console.log(chalk.blue('Configuring theme...'));
    stateManager.updateStep(storeName, 'theme_configured', 'in_progress');

    try {
      const themeBuilder = new ThemeBuilder(client);
      await themeBuilder.configureTheme(config.theme);
      stateManager.updateStep(storeName, 'theme_configured', 'complete');
      console.log(chalk.green('✓ Theme configured'));
    } catch (error) {
      stateManager.setStepError(storeName, 'theme_configured', (error as Error).message);
      console.log(chalk.red(`✗ Theme configuration failed: ${(error as Error).message}`));
    }
  }

  // Product import
  if (state.steps.products_imported.status !== 'complete' && config.products?.source) {
    console.log(chalk.blue('Importing products...'));
    stateManager.updateStep(storeName, 'products_imported', 'in_progress');

    try {
      const csvPath = resolve(dirname(configPath), config.products.source);
      const parseResult = await parseProductsCsv(csvPath);

      if (parseResult.errors.length > 0) {
        throw new Error(`CSV errors: ${parseResult.errors.join(', ')}`);
      }

      parseResult.warnings.forEach(w => console.log(chalk.yellow(`  ⚠ ${w}`)));

      const productBuilder = new ProductBuilder(client);
      const result = await productBuilder.createProducts(parseResult.products);

      console.log(chalk.green(`✓ ${result.created.length} products imported`));

      if (result.failed.length > 0) {
        result.failed.forEach(f => console.log(chalk.red(`  ✗ ${f.product.handle}: ${f.error}`)));
        stateManager.updateStep(storeName, 'products_imported', 'partial', {
          created: result.created.length,
          failed: result.failed.length,
        });
      } else {
        stateManager.updateStep(storeName, 'products_imported', 'complete', {
          count: result.created.length,
        });
      }

      // Create collections if enabled
      if (config.products.create_collections) {
        console.log(chalk.blue('Creating collections...'));
        stateManager.updateStep(storeName, 'collections_created', 'in_progress');

        const collectionBuilder = new CollectionBuilder(client);
        const collectionResult = await collectionBuilder.createCollectionsFromProducts(parseResult.products);

        console.log(chalk.green(`✓ ${collectionResult.created.length} collections created`));

        if (collectionResult.failed.length > 0) {
          collectionResult.failed.forEach(f => console.log(chalk.yellow(`  ⚠ ${f.tag}: ${f.error}`)));
          stateManager.updateStep(storeName, 'collections_created', 'partial', {
            created: collectionResult.created.length,
            failed: collectionResult.failed.length,
          });
        } else {
          stateManager.updateStep(storeName, 'collections_created', 'complete', {
            count: collectionResult.created.length,
          });
        }
      }
    } catch (error) {
      stateManager.setStepError(storeName, 'products_imported', (error as Error).message);
      console.log(chalk.red(`✗ Product import failed: ${(error as Error).message}`));
    }
  }

  // Summary
  console.log('\n' + chalk.blue('─'.repeat(50)));
  console.log(chalk.green(`Store configured: ${config.store.name}`));
  console.log(chalk.gray(`Shop: https://${options.shopDomain}`));
  console.log(chalk.gray(`Admin: https://${options.shopDomain}/admin`));
}
