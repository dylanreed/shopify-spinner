// ABOUTME: Manages store build state persistence to disk.
// ABOUTME: Enables resume functionality and progress tracking.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, rmSync } from 'fs';
import { join } from 'path';
import type { StoreState, StepStatus } from './types.js';

const STEP_ORDER: (keyof StoreState['steps'])[] = [
  'store_created',
  'theme_configured',
  'products_imported',
  'collections_created',
  'settings_applied',
];

export class StateManager {
  private baseDir: string;

  constructor(baseDir: string) {
    this.baseDir = baseDir;
    mkdirSync(baseDir, { recursive: true });
  }

  private getStorePath(storeName: string): string {
    return join(this.baseDir, storeName);
  }

  private getStateFilePath(storeName: string): string {
    return join(this.getStorePath(storeName), 'state.json');
  }

  initializeState(storeName: string, configPath: string): StoreState {
    const now = new Date().toISOString();

    return {
      storeName,
      configPath,
      createdAt: now,
      updatedAt: now,
      steps: {
        store_created: { status: 'pending' },
        theme_configured: { status: 'pending' },
        products_imported: { status: 'pending' },
        collections_created: { status: 'pending' },
        settings_applied: { status: 'pending' },
      },
    };
  }

  saveState(storeName: string, state: StoreState): void {
    const storePath = this.getStorePath(storeName);
    mkdirSync(storePath, { recursive: true });

    state.updatedAt = new Date().toISOString();

    const stateFile = this.getStateFilePath(storeName);
    writeFileSync(stateFile, JSON.stringify(state, null, 2));
  }

  loadState(storeName: string): StoreState | null {
    const stateFile = this.getStateFilePath(storeName);

    if (!existsSync(stateFile)) {
      return null;
    }

    const content = readFileSync(stateFile, 'utf-8');
    return JSON.parse(content) as StoreState;
  }

  updateStep(
    storeName: string,
    step: keyof StoreState['steps'],
    status: StepStatus,
    data?: Record<string, unknown>
  ): void {
    const state = this.loadState(storeName);

    if (!state) {
      throw new Error(`No state found for store: ${storeName}`);
    }

    state.steps[step].status = status;

    if (status === 'in_progress') {
      state.steps[step].startedAt = new Date().toISOString();
    }

    if (status === 'complete' || status === 'failed') {
      state.steps[step].completedAt = new Date().toISOString();
    }

    if (data) {
      state.steps[step].data = { ...state.steps[step].data, ...data };
    }

    this.saveState(storeName, state);
  }

  setStepError(storeName: string, step: keyof StoreState['steps'], error: string): void {
    const state = this.loadState(storeName);

    if (!state) {
      throw new Error(`No state found for store: ${storeName}`);
    }

    state.steps[step].status = 'failed';
    state.steps[step].error = error;
    state.steps[step].completedAt = new Date().toISOString();

    this.saveState(storeName, state);
  }

  findNextIncompleteStep(storeName: string): keyof StoreState['steps'] | null {
    const state = this.loadState(storeName);

    if (!state) {
      return null;
    }

    for (const step of STEP_ORDER) {
      if (state.steps[step].status !== 'complete') {
        return step;
      }
    }

    return null;
  }

  listStores(): string[] {
    if (!existsSync(this.baseDir)) {
      return [];
    }

    return readdirSync(this.baseDir, { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
  }

  deleteStore(storeName: string): void {
    const storePath = this.getStorePath(storeName);

    if (existsSync(storePath)) {
      rmSync(storePath, { recursive: true });
    }
  }
}
