// ABOUTME: Tests for state management and persistence.
// ABOUTME: Verifies state file read/write and step tracking.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { StateManager } from './manager.js';
import { mkdirSync, rmSync, existsSync } from 'fs';

const TEST_DIR = '/tmp/spinner-test-state';

describe('StateManager', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('creates initial state for new store', () => {
    const manager = new StateManager(TEST_DIR);

    const state = manager.initializeState('test-store', '/path/to/config.yaml');

    expect(state.storeName).toBe('test-store');
    expect(state.configPath).toBe('/path/to/config.yaml');
    expect(state.steps.store_created.status).toBe('pending');
  });

  it('saves and loads state', () => {
    const manager = new StateManager(TEST_DIR);

    const state = manager.initializeState('test-store', '/path/to/config.yaml');
    manager.saveState('test-store', state);

    const loaded = manager.loadState('test-store');

    expect(loaded?.storeName).toBe('test-store');
  });

  it('updates step status', () => {
    const manager = new StateManager(TEST_DIR);

    const state = manager.initializeState('test-store', '/path/to/config.yaml');
    manager.saveState('test-store', state);

    manager.updateStep('test-store', 'store_created', 'complete', {
      storeId: 'gid://shopify/Store/123',
    });

    const loaded = manager.loadState('test-store');

    expect(loaded?.steps.store_created.status).toBe('complete');
    expect(loaded?.steps.store_created.data?.storeId).toBe('gid://shopify/Store/123');
  });

  it('finds first incomplete step', () => {
    const manager = new StateManager(TEST_DIR);

    const state = manager.initializeState('test-store', '/path/to/config.yaml');
    state.steps.store_created.status = 'complete';
    state.steps.theme_configured.status = 'complete';
    manager.saveState('test-store', state);

    const nextStep = manager.findNextIncompleteStep('test-store');

    expect(nextStep).toBe('products_imported');
  });

  it('lists all stores', () => {
    const manager = new StateManager(TEST_DIR);

    manager.initializeState('store-1', '/path/1.yaml');
    manager.saveState('store-1', manager.initializeState('store-1', '/path/1.yaml'));

    manager.initializeState('store-2', '/path/2.yaml');
    manager.saveState('store-2', manager.initializeState('store-2', '/path/2.yaml'));

    const stores = manager.listStores();

    expect(stores).toHaveLength(2);
    expect(stores).toContain('store-1');
    expect(stores).toContain('store-2');
  });
});
