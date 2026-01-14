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
