// ABOUTME: Tests for theme CLI commands.
// ABOUTME: Verifies deploy-all config scanning and filtering.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';
import { scanConfigsForDeploy } from './theme.js';

const TEST_DIR = '/tmp/spinner-test-theme';

describe('scanConfigsForDeploy', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('finds configs with shop_domain', async () => {
    writeFileSync(join(TEST_DIR, 'store-a.yaml'), `
store:
  name: Store A
  shop_domain: store-a.myshopify.com
  email: a@example.com
`);

    const results = await scanConfigsForDeploy(TEST_DIR);
    expect(results.valid).toHaveLength(1);
    expect(results.valid[0].shopDomain).toBe('store-a.myshopify.com');
    expect(results.valid[0].storeName).toBe('Store A');
  });

  it('skips configs without shop_domain', async () => {
    writeFileSync(join(TEST_DIR, 'no-domain.yaml'), `
store:
  name: No Domain Store
  email: test@example.com
`);

    const results = await scanConfigsForDeploy(TEST_DIR);
    expect(results.valid).toHaveLength(0);
    expect(results.skipped).toHaveLength(1);
    expect(results.skipped[0].reason).toContain('shop_domain');
  });

  it('skips _example.yaml files', async () => {
    writeFileSync(join(TEST_DIR, '_example.yaml'), `
store:
  name: Example
  shop_domain: example.myshopify.com
  email: ex@example.com
`);

    const results = await scanConfigsForDeploy(TEST_DIR);
    expect(results.valid).toHaveLength(0);
    expect(results.skipped).toHaveLength(1);
    expect(results.skipped[0].reason).toContain('example');
  });

  it('skips test.yaml and invalid.yaml', async () => {
    writeFileSync(join(TEST_DIR, 'test.yaml'), `
store:
  name: Test
  shop_domain: test.myshopify.com
  email: test@example.com
`);
    writeFileSync(join(TEST_DIR, 'invalid.yaml'), `
store:
  name: Invalid
  shop_domain: invalid.myshopify.com
  email: invalid@example.com
`);

    const results = await scanConfigsForDeploy(TEST_DIR);
    expect(results.valid).toHaveLength(0);
    expect(results.skipped).toHaveLength(2);
  });

  it('returns multiple valid configs', async () => {
    writeFileSync(join(TEST_DIR, 'store-a.yaml'), `
store:
  name: Store A
  shop_domain: store-a.myshopify.com
  email: a@example.com
`);
    writeFileSync(join(TEST_DIR, 'store-b.yaml'), `
store:
  name: Store B
  shop_domain: store-b.myshopify.com
  email: b@example.com
`);

    const results = await scanConfigsForDeploy(TEST_DIR);
    expect(results.valid).toHaveLength(2);
  });

  it('handles invalid YAML gracefully', async () => {
    writeFileSync(join(TEST_DIR, 'bad.yaml'), `
store:
  name: [invalid yaml
`);

    const results = await scanConfigsForDeploy(TEST_DIR);
    expect(results.valid).toHaveLength(0);
    expect(results.skipped).toHaveLength(1);
    expect(results.skipped[0].reason).toContain('parse');
  });
});
