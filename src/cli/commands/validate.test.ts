// ABOUTME: Tests for the validate CLI command.
// ABOUTME: Verifies config validation without creating stores.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { validateCommand } from './validate.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/spinner-test-validate';

describe('validateCommand', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('returns success for valid config', async () => {
    const configPath = join(TEST_DIR, 'valid.yaml');
    writeFileSync(configPath, `
store:
  name: Test Store
  email: test@example.com
`);

    const result = await validateCommand(configPath);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('returns errors for invalid config', async () => {
    const configPath = join(TEST_DIR, 'invalid.yaml');
    writeFileSync(configPath, `
store:
  name: Test Store
`);

    const result = await validateCommand(configPath);
    expect(result.valid).toBe(false);
    expect(result.errors.length).toBeGreaterThan(0);
  });

  it('returns error for missing file', async () => {
    const result = await validateCommand('/nonexistent/path.yaml');
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain('not found');
  });
});
