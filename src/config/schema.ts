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
    background: z.string().optional(),
    accent: z.string().optional(),
    text: z.string().optional(),
  }).optional(),
  typography: z.object({
    heading_font: z.string().optional(),
    body_font: z.string().optional(),
  }).optional(),
  logo: z.string().optional(),
  // Extended theme metadata for band themes
  vibe: z.object({
    name: z.string().optional(),
    palette_name: z.string().optional(),
    density: z.enum(['sparse', 'balanced', 'dense']).optional(),
    motion: z.enum(['still', 'subtle', 'moderate', 'dynamic']).optional(),
    shapes: z.enum(['sharp', 'rounded', 'organic', 'mixed']).optional(),
  }).optional(),
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
