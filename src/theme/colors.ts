// ABOUTME: Extracts color palettes from images using node-vibrant.
// ABOUTME: Maps extracted colors to theme variables for auto-theming from logos.

import { Vibrant } from 'node-vibrant/node';

export interface ExtractedPalette {
  background: string;
  primary: string;
  secondary: string;
  accent: string;
  text: string;
}

interface VibrantSwatch {
  hex: string;
  population: number;
  rgb: [number, number, number];
}

function rgbToHex(r: number, g: number, b: number): string {
  return '#' + [r, g, b].map(x => Math.round(x).toString(16).padStart(2, '0')).join('');
}

function getLuminance(hex: string): number {
  const rgb = hex.replace('#', '').match(/.{2}/g)!.map(x => parseInt(x, 16) / 255);
  return 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];
}

function isLight(hex: string): boolean {
  return getLuminance(hex) > 0.5;
}

function darken(hex: string, amount: number): string {
  const rgb = hex.replace('#', '').match(/.{2}/g)!.map(x => parseInt(x, 16));
  return rgbToHex(
    rgb[0] * (1 - amount),
    rgb[1] * (1 - amount),
    rgb[2] * (1 - amount)
  );
}

function lighten(hex: string, amount: number): string {
  const rgb = hex.replace('#', '').match(/.{2}/g)!.map(x => parseInt(x, 16));
  return rgbToHex(
    rgb[0] + (255 - rgb[0]) * amount,
    rgb[1] + (255 - rgb[1]) * amount,
    rgb[2] + (255 - rgb[2]) * amount
  );
}

export async function extractColorsFromImage(imagePath: string): Promise<ExtractedPalette> {
  const palette = await Vibrant.from(imagePath).getPalette();

  // Get swatches with fallbacks
  const vibrant = palette.Vibrant;
  const darkVibrant = palette.DarkVibrant;
  const lightVibrant = palette.LightVibrant;
  const muted = palette.Muted;
  const darkMuted = palette.DarkMuted;
  const lightMuted = palette.LightMuted;

  // Determine if we should go light or dark theme based on dominant colors
  const dominantSwatch = vibrant || darkVibrant || muted;
  const dominantColor = dominantSwatch?.hex || '#1a1a1a';
  const useDarkTheme = !isLight(dominantColor);

  let background: string;
  let text: string;
  let primary: string;
  let secondary: string;
  let accent: string;

  if (useDarkTheme) {
    // Dark theme: dark background, light text
    background = darkMuted?.hex || darkVibrant?.hex || darken(dominantColor, 0.8);
    text = lightMuted?.hex || lightVibrant?.hex || '#e5e5e5';
    primary = darken(background, 0.3);
    secondary = lighten(background, 0.1);
    accent = vibrant?.hex || lightVibrant?.hex || '#d4af37';
  } else {
    // Light theme: light background, dark text
    background = lightMuted?.hex || lightVibrant?.hex || lighten(dominantColor, 0.9);
    text = darkMuted?.hex || darkVibrant?.hex || '#1a1a1a';
    primary = lighten(background, 0.3);
    secondary = darken(background, 0.1);
    accent = vibrant?.hex || darkVibrant?.hex || '#2563eb';
  }

  // Ensure sufficient contrast
  const bgLuminance = getLuminance(background);
  const textLuminance = getLuminance(text);
  const contrast = Math.abs(bgLuminance - textLuminance);

  if (contrast < 0.4) {
    // Not enough contrast, adjust text color
    text = useDarkTheme ? '#f5f5f5' : '#0a0a0a';
  }

  return {
    background,
    primary,
    secondary,
    accent,
    text,
  };
}

// Map preset names to their default color palettes
export const presetPalettes: Record<string, string> = {
  'penthouse': 'after-midnight',
  'mosh-pit': 'blood-chrome',
  'honky-tonk': 'sawdust',
  'neon-stage': 'highlighter',
  'front-porch': 'porch-light',
  'boom-bap': 'concrete-jungle',
  'garage': 'xerox-punk',
  'gallery': 'gallery-white',
};

// Map preset names to their layout styles
export const presetLayouts: Record<string, { layout: string; nav: string; animation: string }> = {
  'penthouse': { layout: 'bold', nav: 'sidebar', animation: 'dynamic' },
  'mosh-pit': { layout: 'bold', nav: 'hamburger', animation: 'none' },
  'honky-tonk': { layout: 'standard', nav: 'topbar', animation: 'subtle' },
  'neon-stage': { layout: 'editorial', nav: 'topbar', animation: 'dynamic' },
  'front-porch': { layout: 'standard', nav: 'topbar', animation: 'subtle' },
  'boom-bap': { layout: 'editorial', nav: 'hamburger', animation: 'subtle' },
  'garage': { layout: 'standard', nav: 'hamburger', animation: 'none' },
  'gallery': { layout: 'editorial', nav: 'topbar', animation: 'subtle' },
};
