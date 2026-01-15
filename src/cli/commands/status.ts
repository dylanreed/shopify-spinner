// ABOUTME: CLI command to show detailed status of a store build.
// ABOUTME: Shows each step's completion status and any errors.

import chalk from 'chalk';
import { StateManager } from '../../state/manager.js';
import { resolve } from 'path';
import { homedir } from 'os';

const STEP_LABELS: Record<string, string> = {
  store_created: 'Store Created',
  theme_configured: 'Theme Configured',
  products_imported: 'Products Imported',
  collections_created: 'Collections Created',
  settings_applied: 'Settings Applied',
};

export async function statusCommand(storeName: string): Promise<void> {
  const stateDir = resolve(homedir(), '.spinner', 'stores');
  const stateManager = new StateManager(stateDir);

  const state = stateManager.loadState(storeName);

  if (!state) {
    console.log(chalk.red(`Store not found: ${storeName}`));
    return;
  }

  console.log(chalk.blue(`\nStore: ${state.storeName}`));
  console.log(chalk.gray(`Config: ${state.configPath}`));
  console.log(chalk.gray(`Created: ${state.createdAt}`));
  console.log(chalk.gray(`Updated: ${state.updatedAt}`));

  if (state.shopDomain) {
    console.log(chalk.gray(`Domain: https://${state.shopDomain}`));
  }

  console.log(chalk.blue('\nBuild Progress:\n'));

  for (const [step, stepState] of Object.entries(state.steps)) {
    const label = STEP_LABELS[step] || step;

    let icon: string;
    let color: typeof chalk.green;

    switch (stepState.status) {
      case 'complete':
        icon = '✓';
        color = chalk.green;
        break;
      case 'in_progress':
        icon = '→';
        color = chalk.blue;
        break;
      case 'failed':
        icon = '✗';
        color = chalk.red;
        break;
      case 'partial':
        icon = '⚠';
        color = chalk.yellow;
        break;
      default:
        icon = '○';
        color = chalk.gray;
    }

    console.log(color(`  ${icon} ${label}`));

    if (stepState.error) {
      console.log(chalk.red(`      Error: ${stepState.error}`));
    }

    if (stepState.data) {
      for (const [key, value] of Object.entries(stepState.data)) {
        console.log(chalk.gray(`      ${key}: ${value}`));
      }
    }
  }
}
