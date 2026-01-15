// ABOUTME: Tests for theme customization from config.
// ABOUTME: Verifies settings_data.json generation.

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdirSync, writeFileSync, readFileSync, rmSync, existsSync } from 'fs';
import { join } from 'path';
import { tmpdir } from 'os';
import { customizeTheme } from './customizer.js';
import type { StoreConfig } from '../config/schema.js';

describe('customizer', () => {
  let testDir: string;
  let themePath: string;
  let outputPath: string;

  const baseSettingsData = {
    current: {
      layout_style: 'standard',
      navigation_style: 'topbar',
      animation_level: 'subtle',
      font_pairing: 'penthouse',
      color_palette: 'after-midnight',
      custom_colors_enabled: false,
      sections: {
        header: { type: 'header', settings: {} },
        footer: { type: 'footer', settings: { tagline: 'Default tagline' } },
        'hero-index': {
          type: 'hero',
          settings: {
            heading: 'Default heading',
            subheading: 'Default subheading',
          },
        },
      },
    },
    presets: {
      'Default': { layout_style: 'standard', font_pairing: 'penthouse' },
      'Mosh Pit': { layout_style: 'bold', font_pairing: 'mosh-pit', color_palette: 'blood-chrome' },
      'Gallery': { layout_style: 'editorial', font_pairing: 'gallery', color_palette: 'gallery-white' },
    },
  };

  beforeEach(() => {
    testDir = join(tmpdir(), `customizer-test-${Date.now()}`);
    themePath = join(testDir, 'theme');
    outputPath = join(testDir, 'output');

    // Create mock theme structure
    mkdirSync(join(themePath, 'config'), { recursive: true });
    mkdirSync(join(themePath, 'assets'), { recursive: true });
    writeFileSync(
      join(themePath, 'config', 'settings_data.json'),
      JSON.stringify(baseSettingsData, null, 2)
    );
  });

  afterEach(() => {
    if (existsSync(testDir)) {
      rmSync(testDir, { recursive: true, force: true });
    }
  });

  it('copies theme to output directory', async () => {
    const config: StoreConfig = {
      store: { name: 'Test Store', email: 'test@example.com' },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    expect(existsSync(join(outputPath, 'config', 'settings_data.json'))).toBe(true);
  });

  it('applies preset settings', async () => {
    const config: StoreConfig = {
      store: { name: 'Test Store', email: 'test@example.com' },
      theme: {
        source: 'spinner',
        settings: {
          preset: 'mosh-pit',
        },
      },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    const result = JSON.parse(readFileSync(join(outputPath, 'config', 'settings_data.json'), 'utf-8'));
    expect(result.current.layout_style).toBe('bold');
    expect(result.current.font_pairing).toBe('mosh-pit');
    expect(result.current.color_palette).toBe('blood-chrome');
  });

  it('applies layout overrides', async () => {
    const config: StoreConfig = {
      store: { name: 'Test Store', email: 'test@example.com' },
      theme: {
        source: 'spinner',
        settings: {
          preset: 'mosh-pit',
          layout_style: 'editorial', // Override preset's bold
          navigation_style: 'sidebar',
        },
      },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    const result = JSON.parse(readFileSync(join(outputPath, 'config', 'settings_data.json'), 'utf-8'));
    expect(result.current.layout_style).toBe('editorial');
    expect(result.current.navigation_style).toBe('sidebar');
  });

  it('applies content settings to sections', async () => {
    const config: StoreConfig = {
      store: { name: 'My Band Store', email: 'test@example.com' },
      theme: {
        source: 'spinner',
        settings: {
          content: {
            hero_heading: 'Welcome to My Band',
            hero_subheading: 'Official Merch',
            tagline: 'Rock on!',
          },
        },
      },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    const result = JSON.parse(readFileSync(join(outputPath, 'config', 'settings_data.json'), 'utf-8'));
    expect(result.current.sections['hero-index'].settings.heading).toBe('Welcome to My Band');
    expect(result.current.sections['hero-index'].settings.subheading).toBe('Official Merch');
    expect(result.current.sections['footer'].settings.tagline).toBe('Rock on!');
  });

  it('applies social links to footer', async () => {
    const config: StoreConfig = {
      store: { name: 'Test Store', email: 'test@example.com' },
      theme: {
        source: 'spinner',
        settings: {
          social: {
            instagram: 'https://instagram.com/myband',
            spotify: 'https://open.spotify.com/artist/123',
          },
        },
      },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    const result = JSON.parse(readFileSync(join(outputPath, 'config', 'settings_data.json'), 'utf-8'));
    expect(result.current.sections['footer'].settings.social_instagram).toBe('https://instagram.com/myband');
    expect(result.current.sections['footer'].settings.social_spotify).toBe('https://open.spotify.com/artist/123');
  });

  it('applies accent override', async () => {
    const config: StoreConfig = {
      store: { name: 'Test Store', email: 'test@example.com' },
      theme: {
        source: 'spinner',
        settings: {
          preset: 'gallery',
          accent_override: '#ff0000',
        },
      },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    const result = JSON.parse(readFileSync(join(outputPath, 'config', 'settings_data.json'), 'utf-8'));
    expect(result.current.accent_override).toBe('#ff0000');
  });

  it('applies custom colors when no preset', async () => {
    const config: StoreConfig = {
      store: { name: 'Test Store', email: 'test@example.com' },
      theme: {
        source: 'spinner',
        settings: {
          colors: {
            background: '#111111',
            text: '#eeeeee',
            accent: '#ff6600',
          },
        },
      },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    const result = JSON.parse(readFileSync(join(outputPath, 'config', 'settings_data.json'), 'utf-8'));
    expect(result.current.custom_colors_enabled).toBe(true);
    expect(result.current.custom_background).toBe('#111111');
    expect(result.current.custom_text).toBe('#eeeeee');
    expect(result.current.custom_accent).toBe('#ff6600');
  });

  it('copies hero image to assets and sets image_asset in index.json', async () => {
    // Create mock hero image
    const heroImagePath = join(testDir, 'hero.jpg');
    writeFileSync(heroImagePath, 'mock image content');

    // Create index.json template
    mkdirSync(join(themePath, 'templates'), { recursive: true });
    writeFileSync(
      join(themePath, 'templates', 'index.json'),
      JSON.stringify({
        sections: {
          hero: {
            type: 'hero',
            settings: {
              heading: 'Default',
              subheading: 'Default',
            },
          },
        },
        order: ['hero'],
      }, null, 2)
    );

    const config: StoreConfig = {
      store: { name: 'Test Store', email: 'test@example.com' },
      theme: {
        source: 'spinner',
        settings: {
          content: {
            hero_heading: 'My Store',
            hero_image: 'hero.jpg',  // Relative to config path
          },
        },
      },
    };

    await customizeTheme({
      configPath: join(testDir, 'config.yaml'),
      config,
      themePath,
      outputPath,
    });

    // Verify hero image was copied to assets
    expect(existsSync(join(outputPath, 'assets', 'hero-bg.jpg'))).toBe(true);

    // Verify image_asset was set in index.json
    const indexTemplate = JSON.parse(readFileSync(join(outputPath, 'templates', 'index.json'), 'utf-8'));
    expect(indexTemplate.sections.hero.settings.image_asset).toBe('hero-bg.jpg');
    expect(indexTemplate.sections.hero.settings.heading).toBe('My Store');
  });
});
