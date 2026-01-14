// ABOUTME: Parses YAML config files and handles inheritance via 'extends'.
// ABOUTME: Deep merges configs with arrays replacing entirely.

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import yaml from 'js-yaml';
import { StoreConfigSchema, type StoreConfig } from './schema.js';

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type PartialStoreConfig = DeepPartial<StoreConfig>;

type ConfigObject = Record<string, unknown>;

/**
 * Deep merges two config objects.
 * - Objects are recursively merged
 * - Arrays replace entirely (no merging array elements)
 * - Primitive values in override replace base values
 */
export function mergeConfigs(
  base: ConfigObject,
  override: ConfigObject
): ConfigObject {
  const result: ConfigObject = { ...base };

  for (const key of Object.keys(override)) {
    const overrideValue = override[key];
    const baseValue = base[key];

    if (overrideValue === undefined) {
      continue;
    }

    if (Array.isArray(overrideValue)) {
      // Arrays replace entirely
      result[key] = overrideValue;
    } else if (
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      // Deep merge objects
      result[key] = mergeConfigs(
        baseValue as ConfigObject,
        overrideValue as ConfigObject
      );
    } else {
      // Primitive values replace
      result[key] = overrideValue;
    }
  }

  return result;
}

/**
 * Parses a YAML config file and validates it against the StoreConfigSchema.
 * Supports inheritance via the 'extends' field which points to a base config file.
 */
export async function parseConfigFile(configPath: string): Promise<StoreConfig> {
  if (!existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }

  const content = readFileSync(configPath, 'utf-8');
  let rawConfig: Record<string, unknown>;

  try {
    rawConfig = yaml.load(content) as Record<string, unknown>;
  } catch (e) {
    throw new Error(`Invalid YAML in ${configPath}: ${(e as Error).message}`);
  }

  // Handle inheritance
  if (rawConfig.extends && typeof rawConfig.extends === 'string') {
    const basePath = resolve(dirname(configPath), rawConfig.extends);
    const baseConfig = await parseConfigFile(basePath);

    // Remove extends from override before merging
    const { extends: _, ...overrideConfig } = rawConfig;

    const merged = mergeConfigs(
      baseConfig as Record<string, unknown>,
      overrideConfig as Record<string, unknown>
    );
    return StoreConfigSchema.parse(merged);
  }

  return StoreConfigSchema.parse(rawConfig);
}
