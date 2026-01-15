// ABOUTME: Generates customized theme settings from store config.
// ABOUTME: Applies presets, custom colors, content, and social links to settings_data.json.

import { readFileSync, writeFileSync, copyFileSync, mkdirSync, existsSync, readdirSync, statSync } from 'fs';
import { join, dirname, resolve } from 'path';
import { extractColorsFromImage, presetPalettes, presetLayouts } from './colors.js';
import type { StoreConfig } from '../config/schema.js';

interface SettingsData {
  current: Record<string, unknown>;
  presets: Record<string, unknown>;
}

function copyDirSync(src: string, dest: string): void {
  mkdirSync(dest, { recursive: true });
  const entries = readdirSync(src);

  for (const entry of entries) {
    const srcPath = join(src, entry);
    const destPath = join(dest, entry);
    const stat = statSync(srcPath);

    if (stat.isDirectory()) {
      copyDirSync(srcPath, destPath);
    } else {
      copyFileSync(srcPath, destPath);
    }
  }
}

export interface CustomizeOptions {
  configPath: string;
  config: StoreConfig;
  themePath: string;
  outputPath: string;
}

export async function customizeTheme(options: CustomizeOptions): Promise<void> {
  const { config, configPath, themePath, outputPath } = options;
  const themeSettings = config.theme?.settings;

  // Copy theme to output directory
  if (existsSync(outputPath)) {
    // Remove existing output directory contents
    const entries = readdirSync(outputPath);
    for (const entry of entries) {
      const entryPath = join(outputPath, entry);
      const stat = statSync(entryPath);
      if (stat.isDirectory()) {
        // Recursively remove directory (simple implementation)
        copyDirSync(themePath, outputPath); // This will overwrite
        break;
      }
    }
  }
  copyDirSync(themePath, outputPath);

  // Load existing settings_data.json
  const settingsPath = join(outputPath, 'config', 'settings_data.json');
  const settingsData: SettingsData = JSON.parse(readFileSync(settingsPath, 'utf-8'));

  // Apply preset if specified
  const preset = themeSettings?.preset;
  if (preset && settingsData.presets[capitalizePreset(preset)]) {
    const presetSettings = settingsData.presets[capitalizePreset(preset)] as Record<string, unknown>;
    Object.assign(settingsData.current, presetSettings);
  }

  // Apply layout overrides
  if (themeSettings?.layout_style) {
    settingsData.current.layout_style = themeSettings.layout_style;
  }
  if (themeSettings?.navigation_style) {
    settingsData.current.navigation_style = themeSettings.navigation_style;
  }
  if (themeSettings?.animation_level) {
    settingsData.current.animation_level = themeSettings.animation_level;
  }

  // Handle logo and color extraction
  if (themeSettings?.logo) {
    const logoPath = resolve(dirname(configPath), themeSettings.logo);

    if (existsSync(logoPath)) {
      // Copy logo to theme assets
      const logoFilename = `logo${getExtension(logoPath)}`;
      const logoDestPath = join(outputPath, 'assets', logoFilename);
      mkdirSync(dirname(logoDestPath), { recursive: true });
      copyFileSync(logoPath, logoDestPath);

      // Extract colors if requested
      if (themeSettings.extract_colors_from_logo) {
        try {
          const extractedColors = await extractColorsFromImage(logoPath);

          // Enable custom colors and apply extracted palette
          settingsData.current.custom_colors_enabled = true;
          settingsData.current.custom_background = extractedColors.background;
          settingsData.current.custom_text = extractedColors.text;
          settingsData.current.custom_primary = extractedColors.primary;
          settingsData.current.custom_secondary = extractedColors.secondary;
          settingsData.current.custom_accent = extractedColors.accent;
        } catch (error) {
          console.warn(`Warning: Could not extract colors from logo: ${(error as Error).message}`);
        }
      }
    }
  }

  // Apply logo width
  if (themeSettings?.logo_width) {
    settingsData.current.logo_width = themeSettings.logo_width;
  }

  // Apply accent override (takes precedence over extracted colors)
  if (themeSettings?.accent_override) {
    settingsData.current.accent_override = themeSettings.accent_override;
    // If using custom colors, also set the custom accent
    if (settingsData.current.custom_colors_enabled) {
      settingsData.current.custom_accent = themeSettings.accent_override;
    }
  }

  // Apply legacy custom colors if no preset and colors are specified
  if (!preset && themeSettings?.colors) {
    const colors = themeSettings.colors;
    if (colors.background || colors.primary || colors.secondary || colors.accent || colors.text) {
      settingsData.current.custom_colors_enabled = true;
      if (colors.background) settingsData.current.custom_background = colors.background;
      if (colors.text) settingsData.current.custom_text = colors.text;
      if (colors.primary) settingsData.current.custom_primary = colors.primary;
      if (colors.secondary) settingsData.current.custom_secondary = colors.secondary;
      if (colors.accent) settingsData.current.custom_accent = colors.accent;
    }
  }

  // Ensure sections object exists
  if (!settingsData.current.sections) {
    settingsData.current.sections = {};
  }
  const sections = settingsData.current.sections as Record<string, Record<string, unknown>>;

  // Apply content settings to sections
  if (themeSettings?.content) {
    const content = themeSettings.content;

    // Hero section
    if (!sections['hero-index']) {
      sections['hero-index'] = { type: 'hero', settings: {} };
    }
    const heroSettings = sections['hero-index'].settings as Record<string, unknown>;

    if (content.hero_heading) {
      heroSettings.heading = content.hero_heading;
    } else if (config.store.name) {
      // Default to store name
      heroSettings.heading = config.store.name;
    }

    if (content.hero_subheading) {
      heroSettings.subheading = content.hero_subheading;
    }

    if (content.hero_button_text) {
      heroSettings.button_text = content.hero_button_text;
    }

    // Footer section
    if (!sections['footer']) {
      sections['footer'] = { type: 'footer', settings: {} };
    }
    const footerSettings = sections['footer'].settings as Record<string, unknown>;

    if (content.tagline) {
      footerSettings.tagline = content.tagline;
    }
  }

  // Apply social links to footer
  if (themeSettings?.social) {
    const social = themeSettings.social;

    if (!sections['footer']) {
      sections['footer'] = { type: 'footer', settings: {} };
    }
    const footerSettings = sections['footer'].settings as Record<string, unknown>;

    if (social.instagram) footerSettings.social_instagram = social.instagram;
    if (social.twitter) footerSettings.social_twitter = social.twitter;
    if (social.youtube) footerSettings.social_youtube = social.youtube;
    if (social.tiktok) footerSettings.social_tiktok = social.tiktok;
    if (social.spotify) footerSettings.social_spotify = social.spotify;
  }

  // Write updated settings_data.json
  writeFileSync(settingsPath, JSON.stringify(settingsData, null, 2));
}

function capitalizePreset(preset: string): string {
  // Convert 'mosh-pit' to 'Mosh Pit'
  return preset
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

function getExtension(filePath: string): string {
  const match = filePath.match(/\.[^.]+$/);
  return match ? match[0] : '.png';
}
