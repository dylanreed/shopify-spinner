// ABOUTME: Zod schemas for validating store configuration YAML files.
// ABOUTME: Defines the shape of configs including store, theme, apps, settings, products.

import { z } from 'zod';

export const StoreSchema = z.object({
  name: z.string().min(1, 'Store name is required'),
  email: z.string().email('Valid email is required'),
});

// Spinner theme presets (maps to font_pairing + color_palette + layout)
export const ThemePresets = [
  'penthouse',
  'mosh-pit',
  'honky-tonk',
  'neon-stage',
  'front-porch',
  'boom-bap',
  'garage',
  'gallery',
] as const;

export const LayoutStyles = ['standard', 'editorial', 'bold'] as const;
export const NavigationStyles = ['topbar', 'hamburger', 'sidebar'] as const;
export const AnimationLevels = ['none', 'subtle', 'dynamic'] as const;

export const ThemeContentSchema = z.object({
  hero_heading: z.string().optional(),
  hero_subheading: z.string().optional(),
  hero_button_text: z.string().optional(),
  tagline: z.string().optional(),
}).optional();

export const ThemeSocialSchema = z.object({
  instagram: z.string().url().optional(),
  twitter: z.string().url().optional(),
  youtube: z.string().url().optional(),
  tiktok: z.string().url().optional(),
  spotify: z.string().url().optional(),
}).optional();

export const ThemeSettingsSchema = z.object({
  // New spinner theme settings
  preset: z.enum(ThemePresets).optional(),
  layout_style: z.enum(LayoutStyles).optional(),
  navigation_style: z.enum(NavigationStyles).optional(),
  animation_level: z.enum(AnimationLevels).optional(),
  accent_override: z.string().optional(),
  logo: z.string().optional(),
  logo_width: z.number().min(50).max(300).optional(),
  extract_colors_from_logo: z.boolean().optional(),
  content: ThemeContentSchema,
  social: ThemeSocialSchema,
  // Legacy color settings (used if no preset or for full custom)
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
  source: z.string().default('spinner'),
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
