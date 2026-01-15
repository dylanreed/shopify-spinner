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
