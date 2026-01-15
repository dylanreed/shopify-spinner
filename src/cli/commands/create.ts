// ABOUTME: CLI command to create a new Shopify store from config.
// ABOUTME: Orchestrates all builders and tracks state.

import chalk from 'chalk';
import { parseConfigFile } from '../../config/parser.js';
import { parseProductsCsv } from '../../products/parser.js';
import { ShopifyClient } from '../../shopify/client.js';
import { ProductBuilder } from '../../builders/products.js';
import { CollectionBuilder } from '../../builders/collections.js';
import { PublicationService } from '../../builders/publications.js';
import { StateManager } from '../../state/manager.js';
import { TokenStore } from '../../auth/token-store.js';
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

  const client = new ShopifyClient({
    accessToken: accessToken,
    shopDomain: shopDomain,
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
  if (shopDomain) {
    state.shopDomain = shopDomain;
    stateManager.saveState(storeName, state);
  }

  // Mark store_created as complete since we're using an existing store in MVP mode
  if (state.steps.store_created.status !== 'complete') {
    stateManager.updateStep(storeName, 'store_created', 'complete', {
      note: 'Using existing store (MVP mode)',
    });
  }

  // Theme configuration - handled separately via spinner theme push
  if (config.theme) {
    console.log(chalk.gray('Theme should be pushed before running create:'));
    console.log(chalk.gray(`  spinner theme push --shop ${shopDomain} --path ./themes/<theme-name>`));
    stateManager.updateStep(storeName, 'theme_configured', 'complete', {
      note: 'Theme pushed via Shopify CLI',
    });
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

      // Publish products to Online Store
      if (result.created.length > 0) {
        console.log(chalk.blue('Publishing products to Online Store...'));
        const publicationService = new PublicationService(client);
        const productIds = result.created.map(p => p.id);
        const publishResult = await publicationService.publishProducts(productIds);

        console.log(chalk.green(`✓ ${publishResult.published.length} products published`));

        if (publishResult.failed.length > 0) {
          publishResult.failed.forEach(f =>
            console.log(chalk.yellow(`  ⚠ Failed to publish ${f.id}: ${f.error}`))
          );
        }
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

        // Publish collections to Online Store
        if (collectionResult.created.length > 0) {
          console.log(chalk.blue('Publishing collections to Online Store...'));
          const publicationService = new PublicationService(client);
          const collectionIds = collectionResult.created.map(c => c.id);
          const collectionPublishResult = await publicationService.publishCollections(collectionIds);

          console.log(chalk.green(`✓ ${collectionPublishResult.published.length} collections published`));

          if (collectionPublishResult.failed.length > 0) {
            collectionPublishResult.failed.forEach(f =>
              console.log(chalk.yellow(`  ⚠ Failed to publish collection ${f.id}: ${f.error}`))
            );
          }
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
  console.log(chalk.gray(`Shop: https://${shopDomain}`));
  console.log(chalk.gray(`Admin: https://${shopDomain}/admin`));
}
