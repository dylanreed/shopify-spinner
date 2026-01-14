// ABOUTME: Tests for YAML config file parsing and inheritance merging.
// ABOUTME: Verifies file loading, validation, and extends resolution.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseConfigFile, mergeConfigs } from './parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/spinner-test-configs';

describe('parseConfigFile', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('parses a valid YAML config file', async () => {
    const configPath = join(TEST_DIR, 'test.yaml');
    writeFileSync(configPath, `
store:
  name: Test Store
  email: test@example.com
theme:
  source: dawn
`);

    const config = await parseConfigFile(configPath);
    expect(config.store.name).toBe('Test Store');
    expect(config.theme?.source).toBe('dawn');
  });

  it('throws on invalid YAML', async () => {
    const configPath = join(TEST_DIR, 'invalid.yaml');
    writeFileSync(configPath, `
store:
  name: [invalid yaml
`);

    await expect(parseConfigFile(configPath)).rejects.toThrow();
  });

  it('throws on missing required fields', async () => {
    const configPath = join(TEST_DIR, 'missing.yaml');
    writeFileSync(configPath, `
store:
  name: Test Store
`);

    await expect(parseConfigFile(configPath)).rejects.toThrow();
  });
});

describe('mergeConfigs', () => {
  it('deep merges base and override configs', () => {
    const base = {
      store: { name: 'Base', email: 'base@test.com' },
      theme: {
        source: 'dawn',
        settings: {
          colors: { primary: '#000' },
          typography: { heading_font: 'Arial' },
        },
      },
      settings: { currency: 'USD' },
    };

    const override = {
      store: { name: 'Override', email: 'override@test.com' },
      theme: {
        settings: {
          colors: { primary: '#FFF' },
        },
      },
    };

    const merged = mergeConfigs(base, override);
    const store = merged.store as { name: string };
    const theme = merged.theme as { settings: { colors: { primary: string }; typography: { heading_font: string } } };
    const settings = merged.settings as { currency: string };

    expect(store.name).toBe('Override');
    expect(theme.settings.colors.primary).toBe('#FFF');
    expect(theme.settings.typography.heading_font).toBe('Arial');
    expect(settings.currency).toBe('USD');
  });

  it('replaces arrays entirely', () => {
    const base = {
      store: { name: 'Base', email: 'base@test.com' },
      apps: [{ name: 'app1', required: true }],
    };

    const override = {
      store: { name: 'Override', email: 'override@test.com' },
      apps: [{ name: 'app2', required: false }],
    };

    const merged = mergeConfigs(base, override);
    const apps = merged.apps as { name: string; required: boolean }[];

    expect(apps.length).toBe(1);
    expect(apps[0].name).toBe('app2');
  });
});

describe('Config inheritance', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('resolves extends from base template', async () => {
    const basePath = join(TEST_DIR, 'base.yaml');
    writeFileSync(basePath, `
store:
  name: Base Store
  email: base@test.com
theme:
  source: dawn
  settings:
    colors:
      primary: "#000000"
    typography:
      heading_font: Arial
settings:
  currency: USD
`);

    const childPath = join(TEST_DIR, 'child.yaml');
    writeFileSync(childPath, `
extends: ./base.yaml
store:
  name: Child Store
  email: child@test.com
theme:
  settings:
    colors:
      primary: "#FFFFFF"
`);

    const config = await parseConfigFile(childPath);

    expect(config.store.name).toBe('Child Store');
    expect(config.theme?.settings?.colors?.primary).toBe('#FFFFFF');
    expect(config.theme?.settings?.typography?.heading_font).toBe('Arial');
    expect(config.settings?.currency).toBe('USD');
  });
});
