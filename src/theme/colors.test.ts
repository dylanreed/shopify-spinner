// ABOUTME: Tests for color extraction from images.
// ABOUTME: Verifies palette generation and color mapping.

import { describe, it, expect } from 'vitest';
import { presetPalettes, presetLayouts } from './colors.js';

describe('colors', () => {
  describe('presetPalettes', () => {
    it('maps all presets to color palettes', () => {
      expect(presetPalettes['penthouse']).toBe('after-midnight');
      expect(presetPalettes['mosh-pit']).toBe('blood-chrome');
      expect(presetPalettes['honky-tonk']).toBe('sawdust');
      expect(presetPalettes['neon-stage']).toBe('highlighter');
      expect(presetPalettes['front-porch']).toBe('porch-light');
      expect(presetPalettes['boom-bap']).toBe('concrete-jungle');
      expect(presetPalettes['garage']).toBe('xerox-punk');
      expect(presetPalettes['gallery']).toBe('gallery-white');
    });
  });

  describe('presetLayouts', () => {
    it('maps all presets to layout styles', () => {
      expect(presetLayouts['penthouse']).toEqual({
        layout: 'bold',
        nav: 'sidebar',
        animation: 'dynamic',
      });

      expect(presetLayouts['mosh-pit']).toEqual({
        layout: 'bold',
        nav: 'hamburger',
        animation: 'none',
      });

      expect(presetLayouts['gallery']).toEqual({
        layout: 'editorial',
        nav: 'topbar',
        animation: 'subtle',
      });
    });

    it('has layout config for all presets', () => {
      const presets = Object.keys(presetPalettes);
      for (const preset of presets) {
        expect(presetLayouts[preset]).toBeDefined();
        expect(presetLayouts[preset].layout).toBeDefined();
        expect(presetLayouts[preset].nav).toBeDefined();
        expect(presetLayouts[preset].animation).toBeDefined();
      }
    });
  });
});
