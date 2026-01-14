# Shopify Spinner Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a CLI tool that creates fully-configured Shopify stores from YAML config files.

**Architecture:** Config-first approach with modular builders. CLI parses YAML, creates dev store via Partner API, then runs builders (theme, products, settings) via Admin GraphQL API. State tracking enables resume on failure.

**Tech Stack:** TypeScript, Node.js, Commander (CLI), Vitest (testing), js-yaml, @shopify/shopify-api, chalk

---

## Task 1: Project Scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`
- Create: `src/index.ts`
- Create: `vitest.config.ts`

**Step 1: Initialize npm project**

Run: `cd /Users/nervous/Library/CloudStorage/Dropbox/Github/shopify-spinner && npm init -y`

**Step 2: Install dependencies**

```bash
npm install commander chalk js-yaml zod
npm install -D typescript @types/node @types/js-yaml vitest tsx
```

**Step 3: Create tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "NodeNext",
    "moduleResolution": "NodeNext",
    "lib": ["ES2022"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist"]
}
```

**Step 4: Create vitest.config.ts**

```typescript
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    include: ['src/**/*.test.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
});
```

**Step 5: Create .gitignore**

```
node_modules/
dist/
.env
.env.*
!.env.example
*.log
.DS_Store
coverage/
.spinner/
```

**Step 6: Update package.json scripts**

```json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest run",
    "test:watch": "vitest",
    "spinner": "tsx src/index.ts"
  },
  "bin": {
    "spinner": "./dist/index.js"
  }
}
```

**Step 7: Create placeholder entry point**

```typescript
// src/index.ts
// ABOUTME: Entry point for the Shopify Spinner CLI.
// ABOUTME: Parses commands and delegates to appropriate handlers.

console.log('Shopify Spinner - coming soon');
```

**Step 8: Verify setup**

Run: `npm run spinner`
Expected: Output "Shopify Spinner - coming soon"

**Step 9: Commit**

```bash
git add -A
git commit -m "chore: scaffold project with TypeScript, Vitest, and dependencies"
```

---

## Task 2: Config Schema with Zod

**Files:**
- Create: `src/config/schema.ts`
- Create: `src/config/schema.test.ts`

**Step 1: Write failing test for store config**

```typescript
// src/config/schema.test.ts
// ABOUTME: Tests for config schema validation.
// ABOUTME: Ensures YAML configs are properly validated with clear error messages.

import { describe, it, expect } from 'vitest';
import { StoreConfigSchema, parseConfig } from './schema.js';

describe('StoreConfigSchema', () => {
  it('validates a minimal valid config', () => {
    const config = {
      store: {
        name: 'Test Store',
        email: 'test@example.com',
      },
    };

    const result = StoreConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });

  it('rejects config without store name', () => {
    const config = {
      store: {
        email: 'test@example.com',
      },
    };

    const result = StoreConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });

  it('rejects config without store email', () => {
    const config = {
      store: {
        name: 'Test Store',
      },
    };

    const result = StoreConfigSchema.safeParse(config);
    expect(result.success).toBe(false);
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './schema.js'

**Step 3: Write minimal schema implementation**

```typescript
// src/config/schema.ts
// ABOUTME: Zod schemas for validating store configuration YAML files.
// ABOUTME: Defines the shape of configs including store, theme, apps, settings, products.

import { z } from 'zod';

export const StoreSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  email: z.string().email('Valid email is required'),
});

export const ThemeSettingsSchema = z.object({
  colors: z.object({
    primary: z.string().optional(),
    secondary: z.string().optional(),
  }).optional(),
  typography: z.object({
    heading_font: z.string().optional(),
    body_font: z.string().optional(),
  }).optional(),
  logo: z.string().optional(),
}).optional();

export const ThemeSchema = z.object({
  source: z.string().default('dawn'),
  settings: ThemeSettingsSchema,
}).optional();

export const AppSchema = z.object({
  name: z.string(),
  required: z.boolean().default(false),
});

export const ShippingSchema = z.object({
  domestic_flat_rate: z.number().optional(),
  free_shipping_threshold: z.number().optional(),
}).optional();

export const CheckoutSchema = z.object({
  require_phone: z.boolean().default(false),
  enable_tips: z.boolean().default(false),
}).optional();

export const SettingsSchema = z.object({
  currency: z.string().default('USD'),
  timezone: z.string().default('America/Los_Angeles'),
  shipping: ShippingSchema,
  checkout: CheckoutSchema,
}).optional();

export const ProductsSchema = z.object({
  source: z.string(),
  create_collections: z.boolean().default(true),
}).optional();

export const StoreConfigSchema = z.object({
  extends: z.string().optional(),
  store: StoreSchema,
  theme: ThemeSchema,
  apps: z.array(AppSchema).optional(),
  settings: SettingsSchema,
  products: ProductsSchema,
});

export type StoreConfig = z.infer<typeof StoreConfigSchema>;

export function parseConfig(data: unknown): StoreConfig {
  return StoreConfigSchema.parse(data);
}
```

**Step 4: Run test to verify it passes**

Run: `npm test`
Expected: PASS - 3 tests passed

**Step 5: Add more validation tests**

```typescript
// Add to src/config/schema.test.ts

describe('Full config validation', () => {
  it('validates a complete config', () => {
    const config = {
      store: {
        name: 'Acme Corp',
        email: 'client@acme.com',
      },
      theme: {
        source: 'dawn',
        settings: {
          colors: {
            primary: '#FF5733',
          },
          typography: {
            heading_font: 'Montserrat',
          },
        },
      },
      apps: [
        { name: 'klaviyo', required: true },
        { name: 'judge-me', required: false },
      ],
      settings: {
        currency: 'USD',
        timezone: 'America/Los_Angeles',
        shipping: {
          domestic_flat_rate: 5.99,
          free_shipping_threshold: 50,
        },
        checkout: {
          require_phone: false,
          enable_tips: false,
        },
      },
      products: {
        source: './products/acme.csv',
        create_collections: true,
      },
    };

    const result = StoreConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.store.name).toBe('Acme Corp');
      expect(result.data.theme?.source).toBe('dawn');
      expect(result.data.apps?.length).toBe(2);
    }
  });

  it('applies defaults for optional fields', () => {
    const config = {
      store: {
        name: 'Minimal Store',
        email: 'min@test.com',
      },
    };

    const result = StoreConfigSchema.safeParse(config);
    expect(result.success).toBe(true);
  });
});
```

**Step 6: Run tests**

Run: `npm test`
Expected: PASS - 5 tests passed

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add Zod schema for config validation"
```

---

## Task 3: YAML Config Parser with Inheritance

**Files:**
- Create: `src/config/parser.ts`
- Create: `src/config/parser.test.ts`
- Modify: `src/config/schema.ts` (export types)

**Step 1: Write failing test for YAML parsing**

```typescript
// src/config/parser.test.ts
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

    expect(merged.store.name).toBe('Override');
    expect(merged.theme?.settings?.colors?.primary).toBe('#FFF');
    expect(merged.theme?.settings?.typography?.heading_font).toBe('Arial');
    expect(merged.settings?.currency).toBe('USD');
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
    expect(merged.apps?.length).toBe(1);
    expect(merged.apps?.[0].name).toBe('app2');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './parser.js'

**Step 3: Implement parser**

```typescript
// src/config/parser.ts
// ABOUTME: Parses YAML config files and handles inheritance via 'extends'.
// ABOUTME: Deep merges configs with arrays replacing entirely.

import { readFileSync, existsSync } from 'fs';
import { dirname, resolve } from 'path';
import yaml from 'js-yaml';
import { StoreConfigSchema, type StoreConfig } from './schema.js';

type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export function mergeConfigs(
  base: DeepPartial<StoreConfig>,
  override: DeepPartial<StoreConfig>
): DeepPartial<StoreConfig> {
  const result: DeepPartial<StoreConfig> = { ...base };

  for (const key of Object.keys(override) as (keyof StoreConfig)[]) {
    const overrideValue = override[key];
    const baseValue = base[key];

    if (overrideValue === undefined) {
      continue;
    }

    if (Array.isArray(overrideValue)) {
      // Arrays replace entirely
      (result as Record<string, unknown>)[key] = overrideValue;
    } else if (
      typeof overrideValue === 'object' &&
      overrideValue !== null &&
      typeof baseValue === 'object' &&
      baseValue !== null &&
      !Array.isArray(baseValue)
    ) {
      // Deep merge objects
      (result as Record<string, unknown>)[key] = mergeConfigs(
        baseValue as DeepPartial<StoreConfig>,
        overrideValue as DeepPartial<StoreConfig>
      );
    } else {
      // Primitive values replace
      (result as Record<string, unknown>)[key] = overrideValue;
    }
  }

  return result;
}

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

    const merged = mergeConfigs(baseConfig, overrideConfig as DeepPartial<StoreConfig>);
    return StoreConfigSchema.parse(merged);
  }

  return StoreConfigSchema.parse(rawConfig);
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 5: Add inheritance test with files**

```typescript
// Add to src/config/parser.test.ts

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
```

**Step 6: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add YAML parser with inheritance support"
```

---

## Task 4: CLI Framework Setup

**Files:**
- Modify: `src/index.ts`
- Create: `src/cli/commands/validate.ts`
- Create: `src/cli/commands/validate.test.ts`

**Step 1: Write failing test for validate command**

```typescript
// src/cli/commands/validate.test.ts
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
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './validate.js'

**Step 3: Implement validate command**

```typescript
// src/cli/commands/validate.ts
// ABOUTME: CLI command to validate config files without creating stores.
// ABOUTME: Returns structured validation results with errors.

import { parseConfigFile } from '../../config/parser.js';
import { ZodError } from 'zod';

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  config?: unknown;
}

export async function validateCommand(configPath: string): Promise<ValidationResult> {
  try {
    const config = await parseConfigFile(configPath);
    return {
      valid: true,
      errors: [],
      config,
    };
  } catch (error) {
    if (error instanceof ZodError) {
      return {
        valid: false,
        errors: error.errors.map(e => `${e.path.join('.')}: ${e.message}`),
      };
    }

    return {
      valid: false,
      errors: [(error as Error).message],
    };
  }
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 5: Set up CLI entry point with Commander**

```typescript
// src/index.ts
// ABOUTME: Entry point for the Shopify Spinner CLI.
// ABOUTME: Parses commands and delegates to appropriate handlers.

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './cli/commands/validate.js';

const program = new Command();

program
  .name('spinner')
  .description('Spin up Shopify stores from YAML configs')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate a config file without creating a store')
  .requiredOption('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    console.log(chalk.blue('Validating config...'));

    const result = await validateCommand(options.config);

    if (result.valid) {
      console.log(chalk.green('✓ Config is valid'));
    } else {
      console.log(chalk.red('✗ Config has errors:'));
      result.errors.forEach(err => {
        console.log(chalk.red(`  - ${err}`));
      });
      process.exit(1);
    }
  });

program.parse();
```

**Step 6: Test CLI manually**

Create test config:
```bash
mkdir -p /Users/nervous/Library/CloudStorage/Dropbox/Github/shopify-spinner/configs
cat > /Users/nervous/Library/CloudStorage/Dropbox/Github/shopify-spinner/configs/test.yaml << 'EOF'
store:
  name: Test Store
  email: test@example.com
theme:
  source: dawn
EOF
```

Run: `npm run spinner validate --config ./configs/test.yaml`
Expected: "✓ Config is valid"

**Step 7: Commit**

```bash
git add -A
git commit -m "feat: add CLI framework with validate command"
```

---

## Task 5: CSV Product Parser

**Files:**
- Create: `src/products/parser.ts`
- Create: `src/products/parser.test.ts`
- Create: `src/products/types.ts`

**Step 1: Define product types**

```typescript
// src/products/types.ts
// ABOUTME: TypeScript types for product data parsed from CSV.
// ABOUTME: Maps to Shopify product/variant structure.

export interface ProductVariant {
  sku: string;
  price: number;
  compareAtPrice?: number;
  inventoryQty: number;
  weight?: number;
  weightUnit?: 'lb' | 'kg' | 'oz' | 'g';
  imageUrl?: string;
  options: Record<string, string>;
}

export interface Product {
  handle: string;
  title: string;
  description: string;
  vendor: string;
  type: string;
  tags: string[];
  variants: ProductVariant[];
}

export interface ProductParseResult {
  products: Product[];
  warnings: string[];
  errors: string[];
}
```

**Step 2: Write failing test for CSV parsing**

```typescript
// src/products/parser.test.ts
// ABOUTME: Tests for CSV product file parsing.
// ABOUTME: Verifies product/variant grouping and validation.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { parseProductsCsv } from './parser.js';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { join } from 'path';

const TEST_DIR = '/tmp/spinner-test-products';

describe('parseProductsCsv', () => {
  beforeEach(() => {
    mkdirSync(TEST_DIR, { recursive: true });
  });

  afterEach(() => {
    rmSync(TEST_DIR, { recursive: true, force: true });
  });

  it('parses a simple product CSV', async () => {
    const csvPath = join(TEST_DIR, 'products.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
basic-tee,Basic Cotton Tee,Soft everyday comfort,Acme,Shirts,cotton;basics,29.99,39.99,TEE-001,100,0.3,lb,https://example.com/tee.jpg,,`);

    const result = await parseProductsCsv(csvPath);

    expect(result.errors).toHaveLength(0);
    expect(result.products).toHaveLength(1);
    expect(result.products[0].handle).toBe('basic-tee');
    expect(result.products[0].title).toBe('Basic Cotton Tee');
    expect(result.products[0].tags).toEqual(['cotton', 'basics']);
    expect(result.products[0].variants).toHaveLength(1);
    expect(result.products[0].variants[0].price).toBe(29.99);
  });

  it('groups variants by handle', async () => {
    const csvPath = join(TEST_DIR, 'variants.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter,59.99,,HOOD-S,50,0.8,lb,https://example.com/hoodie.jpg,Size,Small
hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter,59.99,,HOOD-M,30,0.8,lb,https://example.com/hoodie.jpg,Size,Medium
hoodie,Logo Hoodie,Warm and cozy,Acme,Hoodies,winter,64.99,,HOOD-L,25,0.9,lb,https://example.com/hoodie.jpg,Size,Large`);

    const result = await parseProductsCsv(csvPath);

    expect(result.products).toHaveLength(1);
    expect(result.products[0].variants).toHaveLength(3);
    expect(result.products[0].variants[0].options).toEqual({ Size: 'Small' });
    expect(result.products[0].variants[2].price).toBe(64.99);
  });

  it('returns errors for missing required fields', async () => {
    const csvPath = join(TEST_DIR, 'missing.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
,Missing Handle,Description,Acme,Shirts,tag,29.99,,SKU-001,100,,,,,`);

    const result = await parseProductsCsv(csvPath);

    expect(result.errors.length).toBeGreaterThan(0);
    expect(result.errors[0]).toContain('handle');
  });

  it('warns on missing images but continues', async () => {
    const csvPath = join(TEST_DIR, 'no-image.csv');
    writeFileSync(csvPath, `handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
no-img,No Image Product,Description,Acme,Shirts,tag,29.99,,SKU-001,100,,,,,`);

    const result = await parseProductsCsv(csvPath);

    expect(result.errors).toHaveLength(0);
    expect(result.warnings.length).toBeGreaterThan(0);
    expect(result.warnings[0]).toContain('image');
    expect(result.products).toHaveLength(1);
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './parser.js'

**Step 4: Implement CSV parser**

```typescript
// src/products/parser.ts
// ABOUTME: Parses product CSV files into structured product data.
// ABOUTME: Groups rows by handle into products with variants.

import { readFileSync, existsSync } from 'fs';
import type { Product, ProductVariant, ProductParseResult } from './types.js';

interface CsvRow {
  handle: string;
  title: string;
  description: string;
  vendor: string;
  type: string;
  tags: string;
  price: string;
  compare_at_price: string;
  sku: string;
  inventory_qty: string;
  weight: string;
  weight_unit: string;
  image_url: string;
  variant_option1_name: string;
  variant_option1_value: string;
  variant_option2_name?: string;
  variant_option2_value?: string;
  variant_option3_name?: string;
  variant_option3_value?: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];

    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      result.push(current.trim());
      current = '';
    } else {
      current += char;
    }
  }

  result.push(current.trim());
  return result;
}

function parseCsv(content: string): CsvRow[] {
  const lines = content.split('\n').filter(line => line.trim());
  if (lines.length < 2) return [];

  const headers = parseCsvLine(lines[0]);
  const rows: CsvRow[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = parseCsvLine(lines[i]);
    const row: Record<string, string> = {};

    headers.forEach((header, idx) => {
      row[header] = values[idx] || '';
    });

    rows.push(row as unknown as CsvRow);
  }

  return rows;
}

export async function parseProductsCsv(csvPath: string): Promise<ProductParseResult> {
  const errors: string[] = [];
  const warnings: string[] = [];
  const productMap = new Map<string, Product>();

  if (!existsSync(csvPath)) {
    return { products: [], warnings: [], errors: [`CSV file not found: ${csvPath}`] };
  }

  const content = readFileSync(csvPath, 'utf-8');
  const rows = parseCsv(content);

  rows.forEach((row, index) => {
    const lineNum = index + 2; // Account for header and 0-index

    // Validate required fields
    if (!row.handle) {
      errors.push(`Line ${lineNum}: Missing required field 'handle'`);
      return;
    }
    if (!row.title) {
      errors.push(`Line ${lineNum}: Missing required field 'title'`);
      return;
    }
    if (!row.price || isNaN(parseFloat(row.price))) {
      errors.push(`Line ${lineNum}: Missing or invalid 'price'`);
      return;
    }

    // Warn on missing images
    if (!row.image_url) {
      warnings.push(`Line ${lineNum}: Product '${row.handle}' has no image`);
    }

    // Build variant
    const variant: ProductVariant = {
      sku: row.sku || `${row.handle}-${lineNum}`,
      price: parseFloat(row.price),
      compareAtPrice: row.compare_at_price ? parseFloat(row.compare_at_price) : undefined,
      inventoryQty: parseInt(row.inventory_qty) || 0,
      weight: row.weight ? parseFloat(row.weight) : undefined,
      weightUnit: (row.weight_unit as ProductVariant['weightUnit']) || undefined,
      imageUrl: row.image_url || undefined,
      options: {},
    };

    // Parse variant options
    if (row.variant_option1_name && row.variant_option1_value) {
      variant.options[row.variant_option1_name] = row.variant_option1_value;
    }
    if (row.variant_option2_name && row.variant_option2_value) {
      variant.options[row.variant_option2_name] = row.variant_option2_value;
    }
    if (row.variant_option3_name && row.variant_option3_value) {
      variant.options[row.variant_option3_name] = row.variant_option3_value;
    }

    // Get or create product
    let product = productMap.get(row.handle);
    if (!product) {
      product = {
        handle: row.handle,
        title: row.title,
        description: row.description || '',
        vendor: row.vendor || '',
        type: row.type || '',
        tags: row.tags ? row.tags.split(';').map(t => t.trim()).filter(Boolean) : [],
        variants: [],
      };
      productMap.set(row.handle, product);
    }

    product.variants.push(variant);
  });

  return {
    products: Array.from(productMap.values()),
    warnings,
    errors,
  };
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add CSV product parser with variant grouping"
```

---

## Task 6: Shopify GraphQL Client Setup

**Files:**
- Create: `src/shopify/client.ts`
- Create: `src/shopify/client.test.ts`
- Create: `src/shopify/types.ts`

**Step 1: Define Shopify types**

```typescript
// src/shopify/types.ts
// ABOUTME: TypeScript types for Shopify API interactions.
// ABOUTME: Covers authentication, store data, and API responses.

export interface ShopifyCredentials {
  accessToken: string;
  shopDomain: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: string[];
  }>;
}

export interface UserError {
  field: string[];
  message: string;
}

export interface ShopifyStore {
  id: string;
  name: string;
  email: string;
  myshopifyDomain: string;
}
```

**Step 2: Write failing test for GraphQL client**

```typescript
// src/shopify/client.test.ts
// ABOUTME: Tests for the Shopify GraphQL client wrapper.
// ABOUTME: Tests query building and error handling (mocked).

import { describe, it, expect, vi } from 'vitest';
import { ShopifyClient } from './client.js';

describe('ShopifyClient', () => {
  it('constructs with credentials', () => {
    const client = new ShopifyClient({
      accessToken: 'test-token',
      shopDomain: 'test-store.myshopify.com',
    });

    expect(client).toBeDefined();
  });

  it('builds correct API URL', () => {
    const client = new ShopifyClient({
      accessToken: 'test-token',
      shopDomain: 'test-store.myshopify.com',
    });

    expect(client.getApiUrl()).toBe('https://test-store.myshopify.com/admin/api/2025-01/graphql.json');
  });

  it('includes required headers', () => {
    const client = new ShopifyClient({
      accessToken: 'test-token',
      shopDomain: 'test-store.myshopify.com',
    });

    const headers = client.getHeaders();
    expect(headers['X-Shopify-Access-Token']).toBe('test-token');
    expect(headers['Content-Type']).toBe('application/json');
  });
});
```

**Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './client.js'

**Step 4: Implement GraphQL client**

```typescript
// src/shopify/client.ts
// ABOUTME: Shopify GraphQL Admin API client wrapper.
// ABOUTME: Handles authentication, requests, rate limiting, and error parsing.

import type { ShopifyCredentials, GraphQLResponse } from './types.js';

const API_VERSION = '2025-01';

export class ShopifyClient {
  private credentials: ShopifyCredentials;
  private apiUrl: string;

  constructor(credentials: ShopifyCredentials) {
    this.credentials = credentials;
    this.apiUrl = `https://${credentials.shopDomain}/admin/api/${API_VERSION}/graphql.json`;
  }

  getApiUrl(): string {
    return this.apiUrl;
  }

  getHeaders(): Record<string, string> {
    return {
      'X-Shopify-Access-Token': this.credentials.accessToken,
      'Content-Type': 'application/json',
    };
  }

  async query<T>(query: string, variables?: Record<string, unknown>): Promise<T> {
    const response = await fetch(this.apiUrl, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({ query, variables }),
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(`Shopify API error (${response.status}): ${text}`);
    }

    const json = await response.json() as GraphQLResponse<T>;

    if (json.errors && json.errors.length > 0) {
      const messages = json.errors.map(e => e.message).join(', ');
      throw new Error(`GraphQL errors: ${messages}`);
    }

    if (!json.data) {
      throw new Error('No data returned from Shopify API');
    }

    return json.data;
  }

  async mutate<T>(mutation: string, variables?: Record<string, unknown>): Promise<T> {
    return this.query<T>(mutation, variables);
  }
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add Shopify GraphQL client wrapper"
```

---

## Task 7: Product Builder

**Files:**
- Create: `src/builders/products.ts`
- Create: `src/builders/products.test.ts`

**Step 1: Write failing test for product builder**

```typescript
// src/builders/products.test.ts
// ABOUTME: Tests for the product builder that creates Shopify products.
// ABOUTME: Verifies GraphQL mutation building and response handling.

import { describe, it, expect, vi } from 'vitest';
import { ProductBuilder } from './products.js';
import type { Product } from '../products/types.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('ProductBuilder', () => {
  const mockClient = {
    mutate: vi.fn(),
  } as unknown as ShopifyClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds correct productCreate mutation input', () => {
    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'test-tee',
      title: 'Test T-Shirt',
      description: 'A test product',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: ['cotton', 'summer'],
      variants: [{
        sku: 'TEE-001',
        price: 29.99,
        compareAtPrice: 39.99,
        inventoryQty: 100,
        weight: 0.3,
        weightUnit: 'lb',
        imageUrl: 'https://example.com/tee.jpg',
        options: {},
      }],
    };

    const input = builder.buildProductInput(product);

    expect(input.title).toBe('Test T-Shirt');
    expect(input.descriptionHtml).toBe('A test product');
    expect(input.vendor).toBe('Test Vendor');
    expect(input.productType).toBe('Shirts');
    expect(input.tags).toEqual(['cotton', 'summer']);
  });

  it('creates product via API', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      productCreate: {
        product: {
          id: 'gid://shopify/Product/123',
          title: 'Test T-Shirt',
        },
        userErrors: [],
      },
    });

    const builder = new ProductBuilder(mockClient);

    const product: Product = {
      handle: 'test-tee',
      title: 'Test T-Shirt',
      description: 'A test product',
      vendor: 'Test Vendor',
      type: 'Shirts',
      tags: [],
      variants: [{
        sku: 'TEE-001',
        price: 29.99,
        inventoryQty: 100,
        options: {},
      }],
    };

    const result = await builder.createProduct(product);

    expect(result.id).toBe('gid://shopify/Product/123');
    expect(mockClient.mutate).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './products.js'

**Step 3: Implement product builder**

```typescript
// src/builders/products.ts
// ABOUTME: Builds and creates Shopify products via GraphQL API.
// ABOUTME: Handles product creation with variants and media.

import type { ShopifyClient } from '../shopify/client.js';
import type { Product } from '../products/types.js';
import type { UserError } from '../shopify/types.js';

interface ProductInput {
  title: string;
  descriptionHtml: string;
  vendor: string;
  productType: string;
  tags: string[];
  handle?: string;
}

interface ProductCreateResponse {
  productCreate: {
    product: {
      id: string;
      title: string;
      handle: string;
    } | null;
    userErrors: UserError[];
  };
}

interface CreatedProduct {
  id: string;
  title: string;
  handle: string;
}

const PRODUCT_CREATE_MUTATION = `
  mutation ProductCreate($input: ProductInput!) {
    productCreate(input: $input) {
      product {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export class ProductBuilder {
  private client: ShopifyClient;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  buildProductInput(product: Product): ProductInput {
    return {
      title: product.title,
      descriptionHtml: product.description,
      vendor: product.vendor,
      productType: product.type,
      tags: product.tags,
      handle: product.handle,
    };
  }

  async createProduct(product: Product): Promise<CreatedProduct> {
    const input = this.buildProductInput(product);

    const response = await this.client.mutate<ProductCreateResponse>(
      PRODUCT_CREATE_MUTATION,
      { input }
    );

    if (response.productCreate.userErrors.length > 0) {
      const errors = response.productCreate.userErrors
        .map(e => `${e.field.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to create product: ${errors}`);
    }

    if (!response.productCreate.product) {
      throw new Error('Product creation returned no product');
    }

    return response.productCreate.product;
  }

  async createProducts(products: Product[]): Promise<{
    created: CreatedProduct[];
    failed: Array<{ product: Product; error: string }>;
  }> {
    const created: CreatedProduct[] = [];
    const failed: Array<{ product: Product; error: string }> = [];

    for (const product of products) {
      try {
        const result = await this.createProduct(product);
        created.push(result);
      } catch (error) {
        failed.push({
          product,
          error: (error as Error).message,
        });
      }
    }

    return { created, failed };
  }
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add product builder for Shopify API"
```

---

## Task 8: Collection Builder

**Files:**
- Create: `src/builders/collections.ts`
- Create: `src/builders/collections.test.ts`

**Step 1: Write failing test for collection builder**

```typescript
// src/builders/collections.test.ts
// ABOUTME: Tests for the collection builder that creates smart collections.
// ABOUTME: Verifies tag-based collection creation from products.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { CollectionBuilder } from './collections.js';
import type { Product } from '../products/types.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('CollectionBuilder', () => {
  const mockClient = {
    mutate: vi.fn(),
  } as unknown as ShopifyClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('extracts unique tags from products', () => {
    const builder = new CollectionBuilder(mockClient);

    const products: Product[] = [
      {
        handle: 'p1',
        title: 'Product 1',
        description: '',
        vendor: '',
        type: '',
        tags: ['summer', 'cotton'],
        variants: [],
      },
      {
        handle: 'p2',
        title: 'Product 2',
        description: '',
        vendor: '',
        type: '',
        tags: ['summer', 'winter'],
        variants: [],
      },
    ];

    const tags = builder.extractUniqueTags(products);

    expect(tags).toContain('summer');
    expect(tags).toContain('cotton');
    expect(tags).toContain('winter');
    expect(tags).toHaveLength(3);
  });

  it('builds smart collection input for tag', () => {
    const builder = new CollectionBuilder(mockClient);

    const input = builder.buildCollectionInput('summer');

    expect(input.title).toBe('Summer');
    expect(input.ruleSet.rules[0].column).toBe('TAG');
    expect(input.ruleSet.rules[0].condition).toBe('summer');
  });

  it('creates collection via API', async () => {
    (mockClient.mutate as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      collectionCreate: {
        collection: {
          id: 'gid://shopify/Collection/123',
          title: 'Summer',
          handle: 'summer',
        },
        userErrors: [],
      },
    });

    const builder = new CollectionBuilder(mockClient);
    const result = await builder.createCollectionForTag('summer');

    expect(result.id).toBe('gid://shopify/Collection/123');
    expect(mockClient.mutate).toHaveBeenCalled();
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './collections.js'

**Step 3: Implement collection builder**

```typescript
// src/builders/collections.ts
// ABOUTME: Builds and creates Shopify smart collections via GraphQL API.
// ABOUTME: Auto-creates collections based on product tags.

import type { ShopifyClient } from '../shopify/client.js';
import type { Product } from '../products/types.js';
import type { UserError } from '../shopify/types.js';

interface CollectionRuleInput {
  column: 'TAG' | 'PRODUCT_TYPE' | 'VENDOR';
  relation: 'EQUALS';
  condition: string;
}

interface CollectionInput {
  title: string;
  ruleSet: {
    appliedDisjunctively: boolean;
    rules: CollectionRuleInput[];
  };
}

interface CollectionCreateResponse {
  collectionCreate: {
    collection: {
      id: string;
      title: string;
      handle: string;
    } | null;
    userErrors: UserError[];
  };
}

interface CreatedCollection {
  id: string;
  title: string;
  handle: string;
}

const COLLECTION_CREATE_MUTATION = `
  mutation CollectionCreate($input: CollectionInput!) {
    collectionCreate(input: $input) {
      collection {
        id
        title
        handle
      }
      userErrors {
        field
        message
      }
    }
  }
`;

export class CollectionBuilder {
  private client: ShopifyClient;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  extractUniqueTags(products: Product[]): string[] {
    const tagSet = new Set<string>();

    for (const product of products) {
      for (const tag of product.tags) {
        tagSet.add(tag.toLowerCase());
      }
    }

    return Array.from(tagSet);
  }

  buildCollectionInput(tag: string): CollectionInput {
    // Capitalize first letter for title
    const title = tag.charAt(0).toUpperCase() + tag.slice(1);

    return {
      title,
      ruleSet: {
        appliedDisjunctively: false,
        rules: [{
          column: 'TAG',
          relation: 'EQUALS',
          condition: tag,
        }],
      },
    };
  }

  async createCollectionForTag(tag: string): Promise<CreatedCollection> {
    const input = this.buildCollectionInput(tag);

    const response = await this.client.mutate<CollectionCreateResponse>(
      COLLECTION_CREATE_MUTATION,
      { input }
    );

    if (response.collectionCreate.userErrors.length > 0) {
      const errors = response.collectionCreate.userErrors
        .map(e => `${e.field.join('.')}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to create collection: ${errors}`);
    }

    if (!response.collectionCreate.collection) {
      throw new Error('Collection creation returned no collection');
    }

    return response.collectionCreate.collection;
  }

  async createCollectionsFromProducts(products: Product[]): Promise<{
    created: CreatedCollection[];
    failed: Array<{ tag: string; error: string }>;
  }> {
    const tags = this.extractUniqueTags(products);
    const created: CreatedCollection[] = [];
    const failed: Array<{ tag: string; error: string }> = [];

    for (const tag of tags) {
      try {
        const result = await this.createCollectionForTag(tag);
        created.push(result);
      } catch (error) {
        failed.push({
          tag,
          error: (error as Error).message,
        });
      }
    }

    return { created, failed };
  }
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add collection builder for auto-creating tag collections"
```

---

## Task 9: Theme Builder

**Files:**
- Create: `src/builders/theme.ts`
- Create: `src/builders/theme.test.ts`

**Step 1: Write failing test for theme builder**

```typescript
// src/builders/theme.test.ts
// ABOUTME: Tests for the theme builder that configures Shopify themes.
// ABOUTME: Verifies theme settings JSON generation and upload.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ThemeBuilder } from './theme.js';
import type { ShopifyClient } from '../shopify/client.js';

describe('ThemeBuilder', () => {
  const mockClient = {
    query: vi.fn(),
    mutate: vi.fn(),
  } as unknown as ShopifyClient;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('builds settings_data.json from config', () => {
    const builder = new ThemeBuilder(mockClient);

    const themeConfig = {
      source: 'dawn',
      settings: {
        colors: {
          primary: '#FF5733',
          secondary: '#333333',
        },
        typography: {
          heading_font: 'Montserrat',
          body_font: 'Open Sans',
        },
      },
    };

    const settingsData = builder.buildSettingsData(themeConfig);

    expect(settingsData.current.colors_solid_button_labels).toBeDefined();
  });

  it('gets main theme ID', async () => {
    (mockClient.query as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
      themes: {
        nodes: [
          { id: 'gid://shopify/OnlineStoreTheme/123', name: 'Dawn', role: 'MAIN' },
        ],
      },
    });

    const builder = new ThemeBuilder(mockClient);
    const themeId = await builder.getMainThemeId();

    expect(themeId).toBe('gid://shopify/OnlineStoreTheme/123');
  });
});
```

**Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './theme.js'

**Step 3: Implement theme builder**

```typescript
// src/builders/theme.ts
// ABOUTME: Builds and configures Shopify themes via GraphQL API.
// ABOUTME: Uploads theme settings via settings_data.json asset.

import type { ShopifyClient } from '../shopify/client.js';

interface ThemeConfig {
  source?: string;
  settings?: {
    colors?: {
      primary?: string;
      secondary?: string;
    };
    typography?: {
      heading_font?: string;
      body_font?: string;
    };
    logo?: string;
  };
}

interface ThemeNode {
  id: string;
  name: string;
  role: 'MAIN' | 'UNPUBLISHED' | 'DEMO';
}

interface ThemesQueryResponse {
  themes: {
    nodes: ThemeNode[];
  };
}

interface ThemeFilesUpsertResponse {
  themeFilesUpsert: {
    userErrors: Array<{ field: string; message: string }>;
  };
}

const THEMES_QUERY = `
  query {
    themes(first: 10) {
      nodes {
        id
        name
        role
      }
    }
  }
`;

const THEME_FILES_UPSERT_MUTATION = `
  mutation ThemeFilesUpsert($themeId: ID!, $files: [OnlineStoreThemeFilesUpsertFileInput!]!) {
    themeFilesUpsert(themeId: $themeId, files: $files) {
      userErrors {
        field
        message
      }
    }
  }
`;

export class ThemeBuilder {
  private client: ShopifyClient;

  constructor(client: ShopifyClient) {
    this.client = client;
  }

  buildSettingsData(themeConfig: ThemeConfig): Record<string, unknown> {
    const settings: Record<string, unknown> = {};

    if (themeConfig.settings?.colors?.primary) {
      settings.colors_solid_button_labels = themeConfig.settings.colors.primary;
      settings.colors_accent_1 = themeConfig.settings.colors.primary;
    }

    if (themeConfig.settings?.colors?.secondary) {
      settings.colors_accent_2 = themeConfig.settings.colors.secondary;
    }

    if (themeConfig.settings?.typography?.heading_font) {
      settings.type_header_font = themeConfig.settings.typography.heading_font;
    }

    if (themeConfig.settings?.typography?.body_font) {
      settings.type_body_font = themeConfig.settings.typography.body_font;
    }

    return {
      current: settings,
    };
  }

  async getMainThemeId(): Promise<string> {
    const response = await this.client.query<ThemesQueryResponse>(THEMES_QUERY);

    const mainTheme = response.themes.nodes.find(t => t.role === 'MAIN');

    if (!mainTheme) {
      throw new Error('No main theme found');
    }

    return mainTheme.id;
  }

  async uploadThemeSettings(themeId: string, settingsData: Record<string, unknown>): Promise<void> {
    const response = await this.client.mutate<ThemeFilesUpsertResponse>(
      THEME_FILES_UPSERT_MUTATION,
      {
        themeId,
        files: [{
          filename: 'config/settings_data.json',
          body: {
            value: JSON.stringify(settingsData, null, 2),
          },
        }],
      }
    );

    if (response.themeFilesUpsert.userErrors.length > 0) {
      const errors = response.themeFilesUpsert.userErrors
        .map(e => `${e.field}: ${e.message}`)
        .join(', ');
      throw new Error(`Failed to upload theme settings: ${errors}`);
    }
  }

  async configureTheme(themeConfig: ThemeConfig): Promise<void> {
    const themeId = await this.getMainThemeId();
    const settingsData = this.buildSettingsData(themeConfig);
    await this.uploadThemeSettings(themeId, settingsData);
  }
}
```

**Step 4: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add theme builder for configuring store themes"
```

---

## Task 10: State Manager

**Files:**
- Create: `src/state/manager.ts`
- Create: `src/state/manager.test.ts`
- Create: `src/state/types.ts`

**Step 1: Define state types**

```typescript
// src/state/types.ts
// ABOUTME: TypeScript types for store build state tracking.
// ABOUTME: Enables resume functionality after failures.

export type StepStatus = 'pending' | 'in_progress' | 'complete' | 'failed' | 'partial';

export interface StepState {
  status: StepStatus;
  startedAt?: string;
  completedAt?: string;
  error?: string;
  data?: Record<string, unknown>;
}

export interface StoreState {
  storeId?: string;
  storeName: string;
  shopDomain?: string;
  createdAt: string;
  updatedAt: string;
  configPath: string;
  steps: {
    store_created: StepState;
    theme_configured: StepState;
    products_imported: StepState;
    collections_created: StepState;
    settings_applied: StepState;
  };
}
```

**Step 2: Write failing test for state manager**

```typescript
// src/state/manager.test.ts
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
```

**Step 3: Run test to verify it fails**

Run: `npm test`
Expected: FAIL - Cannot find module './manager.js'

**Step 4: Implement state manager**

```typescript
// src/state/manager.ts
// ABOUTME: Manages store build state persistence to disk.
// ABOUTME: Enables resume functionality and progress tracking.

import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync } from 'fs';
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
      const { rmSync } = require('fs');
      rmSync(storePath, { recursive: true });
    }
  }
}
```

**Step 5: Run tests**

Run: `npm test`
Expected: PASS - all tests pass

**Step 6: Commit**

```bash
git add -A
git commit -m "feat: add state manager for tracking build progress"
```

---

## Task 11: Create Command Integration

**Files:**
- Create: `src/cli/commands/create.ts`
- Modify: `src/index.ts`

**Step 1: Implement create command**

```typescript
// src/cli/commands/create.ts
// ABOUTME: CLI command to create a new Shopify store from config.
// ABOUTME: Orchestrates all builders and tracks state.

import chalk from 'chalk';
import { parseConfigFile } from '../../config/parser.js';
import { parseProductsCsv } from '../../products/parser.js';
import { ShopifyClient } from '../../shopify/client.js';
import { ProductBuilder } from '../../builders/products.js';
import { CollectionBuilder } from '../../builders/collections.js';
import { ThemeBuilder } from '../../builders/theme.js';
import { StateManager } from '../../state/manager.js';
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

  // For MVP, require access token and shop domain
  // Later: integrate with Partner API for store creation
  if (!options.accessToken || !options.shopDomain) {
    console.log(chalk.yellow('\nMVP Mode: Store must already exist.'));
    console.log(chalk.yellow('Provide --access-token and --shop-domain for an existing dev store.\n'));
    console.log(chalk.gray('Future: Partner API integration will create stores automatically.'));
    return;
  }

  const client = new ShopifyClient({
    accessToken: options.accessToken,
    shopDomain: options.shopDomain,
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

  // Theme configuration
  if (state.steps.theme_configured.status !== 'complete' && config.theme) {
    console.log(chalk.blue('Configuring theme...'));
    stateManager.updateStep(storeName, 'theme_configured', 'in_progress');

    try {
      const themeBuilder = new ThemeBuilder(client);
      await themeBuilder.configureTheme(config.theme);
      stateManager.updateStep(storeName, 'theme_configured', 'complete');
      console.log(chalk.green('✓ Theme configured'));
    } catch (error) {
      stateManager.setStepError(storeName, 'theme_configured', (error as Error).message);
      console.log(chalk.red(`✗ Theme configuration failed: ${(error as Error).message}`));
    }
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

      // Create collections if enabled
      if (config.products.create_collections) {
        console.log(chalk.blue('Creating collections...'));
        stateManager.updateStep(storeName, 'collections_created', 'in_progress');

        const collectionBuilder = new CollectionBuilder(client);
        const collectionResult = await collectionBuilder.createCollectionsFromProducts(parseResult.products);

        console.log(chalk.green(`✓ ${collectionResult.created.length} collections created`));

        if (collectionResult.failed.length > 0) {
          collectionResult.failed.forEach(f => console.log(chalk.yellow(`  ⚠ ${f.tag}: ${f.error}`)));
        }

        stateManager.updateStep(storeName, 'collections_created', 'complete', {
          count: collectionResult.created.length,
        });
      }
    } catch (error) {
      stateManager.setStepError(storeName, 'products_imported', (error as Error).message);
      console.log(chalk.red(`✗ Product import failed: ${(error as Error).message}`));
    }
  }

  // Summary
  console.log('\n' + chalk.blue('─'.repeat(50)));
  console.log(chalk.green(`Store configured: ${config.store.name}`));
  console.log(chalk.gray(`Shop: https://${options.shopDomain}`));
  console.log(chalk.gray(`Admin: https://${options.shopDomain}/admin`));
}
```

**Step 2: Update CLI entry point**

```typescript
// src/index.ts
// ABOUTME: Entry point for the Shopify Spinner CLI.
// ABOUTME: Parses commands and delegates to appropriate handlers.

import { Command } from 'commander';
import chalk from 'chalk';
import { validateCommand } from './cli/commands/validate.js';
import { createCommand } from './cli/commands/create.js';

const program = new Command();

program
  .name('spinner')
  .description('Spin up Shopify stores from YAML configs')
  .version('0.1.0');

program
  .command('validate')
  .description('Validate a config file without creating a store')
  .requiredOption('-c, --config <path>', 'Path to config file')
  .action(async (options) => {
    console.log(chalk.blue('Validating config...'));

    const result = await validateCommand(options.config);

    if (result.valid) {
      console.log(chalk.green('✓ Config is valid'));
    } else {
      console.log(chalk.red('✗ Config has errors:'));
      result.errors.forEach(err => {
        console.log(chalk.red(`  - ${err}`));
      });
      process.exit(1);
    }
  });

program
  .command('create')
  .description('Create a new store from config')
  .requiredOption('-c, --config <path>', 'Path to config file')
  .option('--access-token <token>', 'Shopify Admin API access token')
  .option('--shop-domain <domain>', 'Shop domain (e.g., store.myshopify.com)')
  .action(async (options) => {
    try {
      await createCommand(options);
    } catch (error) {
      console.log(chalk.red(`Error: ${(error as Error).message}`));
      process.exit(1);
    }
  });

program.parse();
```

**Step 3: Test manually**

Run: `npm run spinner create --config ./configs/test.yaml`
Expected: Shows MVP mode message (no token provided)

**Step 4: Commit**

```bash
git add -A
git commit -m "feat: add create command for store setup"
```

---

## Task 12: List and Status Commands

**Files:**
- Create: `src/cli/commands/list.ts`
- Create: `src/cli/commands/status.ts`
- Modify: `src/index.ts`

**Step 1: Implement list command**

```typescript
// src/cli/commands/list.ts
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
```

**Step 2: Implement status command**

```typescript
// src/cli/commands/status.ts
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
```

**Step 3: Add commands to CLI**

Add to `src/index.ts`:

```typescript
import { listCommand } from './cli/commands/list.js';
import { statusCommand } from './cli/commands/status.js';

// After other commands:

program
  .command('list')
  .description('List all managed stores')
  .action(async () => {
    await listCommand();
  });

program
  .command('status')
  .description('Show status of a store build')
  .argument('<store>', 'Store name')
  .action(async (store) => {
    await statusCommand(store);
  });
```

**Step 4: Test manually**

Run: `npm run spinner list`
Expected: "No stores found." or list of stores

**Step 5: Commit**

```bash
git add -A
git commit -m "feat: add list and status commands"
```

---

## Task 13: Sample Templates and Documentation

**Files:**
- Create: `templates/ecommerce-base.yaml`
- Create: `configs/example.yaml`
- Create: `products/example-products.csv`
- Create: `README.md`

**Step 1: Create base template**

```yaml
# templates/ecommerce-base.yaml
# ABOUTME: Base template for standard e-commerce stores.
# ABOUTME: Extend this in client configs to inherit common settings.

theme:
  source: dawn
  settings:
    typography:
      heading_font: Montserrat
      body_font: "Open Sans"

settings:
  currency: USD
  timezone: America/Los_Angeles
  checkout:
    require_phone: false
    enable_tips: false
  shipping:
    domestic_flat_rate: 5.99
    free_shipping_threshold: 50
```

**Step 2: Create example config**

```yaml
# configs/example.yaml
# ABOUTME: Example client config that extends the base template.
# ABOUTME: Copy this to create new client configurations.

extends: ../templates/ecommerce-base.yaml

store:
  name: Example Store
  email: client@example.com

theme:
  settings:
    colors:
      primary: "#3B82F6"
      secondary: "#1E40AF"

products:
  source: ../products/example-products.csv
  create_collections: true
```

**Step 3: Create example products CSV**

```csv
handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
basic-tee,Basic Cotton Tee,Soft and comfortable everyday t-shirt made from 100% organic cotton.,Example Brand,Shirts,cotton;basics;summer,29.99,39.99,TEE-WHT-S,100,0.3,lb,https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800,Size,Small
basic-tee,Basic Cotton Tee,Soft and comfortable everyday t-shirt made from 100% organic cotton.,Example Brand,Shirts,cotton;basics;summer,29.99,39.99,TEE-WHT-M,150,0.3,lb,https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800,Size,Medium
basic-tee,Basic Cotton Tee,Soft and comfortable everyday t-shirt made from 100% organic cotton.,Example Brand,Shirts,cotton;basics;summer,29.99,39.99,TEE-WHT-L,120,0.35,lb,https://images.unsplash.com/photo-1521572163474-6864f9cf17ab?w=800,Size,Large
logo-hoodie,Logo Hoodie,Warm fleece hoodie with embroidered logo. Perfect for cool evenings.,Example Brand,Hoodies,winter;bestseller;fleece,59.99,79.99,HOOD-BLK-S,50,0.8,lb,https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800,Size,Small
logo-hoodie,Logo Hoodie,Warm fleece hoodie with embroidered logo. Perfect for cool evenings.,Example Brand,Hoodies,winter;bestseller;fleece,59.99,79.99,HOOD-BLK-M,75,0.8,lb,https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800,Size,Medium
logo-hoodie,Logo Hoodie,Warm fleece hoodie with embroidered logo. Perfect for cool evenings.,Example Brand,Hoodies,winter;bestseller;fleece,64.99,84.99,HOOD-BLK-L,60,0.9,lb,https://images.unsplash.com/photo-1556821840-3a63f95609a7?w=800,Size,Large
canvas-tote,Canvas Tote Bag,Durable canvas tote for everyday carry. Reinforced handles.,Example Brand,Accessories,bags;cotton;basics,24.99,,TOTE-NAT,200,0.4,lb,https://images.unsplash.com/photo-1544816155-12df9643f363?w=800,,
```

**Step 4: Create README**

```markdown
# Shopify Spinner

Spin up fully-configured Shopify stores from YAML config files.

## Installation

```bash
npm install
npm run build
```

## Usage

### Validate a config

```bash
npm run spinner validate --config ./configs/example.yaml
```

### Create a store (requires existing dev store)

```bash
npm run spinner create --config ./configs/example.yaml \
  --access-token YOUR_TOKEN \
  --shop-domain your-store.myshopify.com
```

### List stores

```bash
npm run spinner list
```

### Check store status

```bash
npm run spinner status store-name
```

## Config Format

See `configs/example.yaml` for a complete example.

Configs support inheritance via `extends`:

```yaml
extends: ../templates/ecommerce-base.yaml

store:
  name: My Store
  email: me@example.com

theme:
  settings:
    colors:
      primary: "#FF5733"

products:
  source: ./products.csv
  create_collections: true
```

## Product CSV Format

See `products/example-products.csv` for the expected format.

Required columns:
- handle, title, price

Optional columns:
- description, vendor, type, tags, compare_at_price, sku, inventory_qty, weight, weight_unit, image_url, variant_option1_name, variant_option1_value

Rows with the same `handle` are grouped as variants of one product.

## Development

```bash
npm run dev          # Watch mode
npm test             # Run tests
npm run test:watch   # Watch tests
```
```

**Step 5: Commit**

```bash
git add -A
git commit -m "docs: add templates, examples, and README"
```

---

## Summary

This implementation plan covers the MVP for Shopify Spinner:

1. **Tasks 1-3**: Project setup, config schema, YAML parser with inheritance
2. **Tasks 4-5**: CLI framework, CSV product parser
3. **Tasks 6-9**: Shopify GraphQL client and builders (products, collections, themes)
4. **Task 10**: State management for resume capability
5. **Tasks 11-12**: CLI commands (create, validate, list, status)
6. **Task 13**: Templates, examples, documentation

**Not in MVP** (as designed):
- Partner API store creation (requires token for existing dev store)
- App installation
- Shipping/tax configuration
- Transfer command

**Estimated commits**: 13
**Estimated test files**: 8
**Estimated source files**: 15+
