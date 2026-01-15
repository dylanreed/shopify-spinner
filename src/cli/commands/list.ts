// ABOUTME: CLI command to list all stores managed by spinner.
// ABOUTME: Shows store names and current status.

import chalk from 'chalk';
import { StateManager } from '../../state/manager.js';
import { resolve } from 'path';
import { homedir } from 'os';

export async function listCommand(): Promise<void> {
  const stateDir = resolve(homedir(), '.spinner', 'stores');
  const stateManager = new StateManager(stateDir);

  const stores = stateManager.listStores();

  if (stores.length === 0) {
    console.log(chalk.gray('No stores found.'));
    console.log(chalk.gray('Run "spinner create --config <path>" to create a store.'));
    return;
  }

  console.log(chalk.blue('Managed stores:\n'));

  for (const storeName of stores) {
    const state = stateManager.loadState(storeName);

    if (!state) {
      console.log(chalk.gray(`  ${storeName} (no state)`));
      continue;
    }

    const completedSteps = Object.values(state.steps).filter(s => s.status === 'complete').length;
    const totalSteps = Object.keys(state.steps).length;
    const progress = `${completedSteps}/${totalSteps}`;

    const statusColor = completedSteps === totalSteps ? chalk.green : chalk.yellow;

    console.log(`  ${chalk.white(state.storeName)} ${statusColor(`[${progress}]`)}`);

    if (state.shopDomain) {
      console.log(chalk.gray(`    https://${state.shopDomain}`));
    }
  }
}
