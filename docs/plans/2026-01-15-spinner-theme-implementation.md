# Spinner Theme Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a flexible Shopify theme with 3 layouts, 3 nav styles, 3 grids, 3 heroes, curated fonts/colors, and preset system.

**Architecture:** CSS custom properties control visual variation. Liquid conditionals swap structures. Presets are JSON configs applied via CLI.

**Tech Stack:** Vanilla Liquid, CSS custom properties, Shopify CLI

---

## Phase 1: Foundation

### Task 1: Initialize Theme Structure

**Files:**
- Create: `themes/spinner/` directory structure

**Step 1: Create theme directory structure**

```bash
mkdir -p themes/spinner/{assets,config,layout,locales,sections,snippets,templates,templates/customers}
```

**Step 2: Create minimal theme.liquid layout**

Create `themes/spinner/layout/theme.liquid`:
```liquid
<!doctype html>
<html lang="{{ request.locale.iso_code }}">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>{{ page_title }}</title>
  {{ content_for_header }}
  {% render 'css-variables' %}
  {{ 'theme.css' | asset_url | stylesheet_tag }}
</head>
<body>
  {% sections 'header-group' %}
  <main id="main" role="main">
    {{ content_for_layout }}
  </main>
  {% sections 'footer-group' %}
</body>
</html>
```

**Step 3: Verify structure exists**

Run: `ls -la themes/spinner/`
Expected: All directories present

**Step 4: Commit**

```bash
git add themes/spinner/
git commit -m "feat(theme): initialize spinner theme structure"
```

---

### Task 2: Create Settings Schema - Layout Options

**Files:**
- Create: `themes/spinner/config/settings_schema.json`

**Step 1: Create settings_schema.json with layout settings**

Create `themes/spinner/config/settings_schema.json`:
```json
[
  {
    "name": "theme_info",
    "theme_name": "Spinner",
    "theme_version": "1.0.0",
    "theme_author": "Spinner CLI",
    "theme_documentation_url": "",
    "theme_support_url": ""
  },
  {
    "name": "Layout",
    "settings": [
      {
        "type": "select",
        "id": "layout_style",
        "label": "Layout Style",
        "options": [
          { "value": "standard", "label": "Standard (centered)" },
          { "value": "editorial", "label": "Editorial (asymmetric)" },
          { "value": "bold", "label": "Bold (full-bleed, sidebar)" }
        ],
        "default": "standard"
      },
      {
        "type": "select",
        "id": "navigation_style",
        "label": "Navigation Style",
        "options": [
          { "value": "topbar", "label": "Top Bar" },
          { "value": "hamburger", "label": "Hamburger Menu" },
          { "value": "sidebar", "label": "Sidebar" }
        ],
        "default": "topbar"
      },
      {
        "type": "select",
        "id": "animation_level",
        "label": "Animation Level",
        "options": [
          { "value": "none", "label": "None" },
          { "value": "subtle", "label": "Subtle" },
          { "value": "dynamic", "label": "Dynamic" }
        ],
        "default": "subtle"
      }
    ]
  },
  {
    "name": "Typography",
    "settings": [
      {
        "type": "select",
        "id": "font_pairing",
        "label": "Font Pairing",
        "options": [
          { "value": "penthouse", "label": "Penthouse (Oswald / Inter)" },
          { "value": "mosh-pit", "label": "Mosh Pit (Bebas Neue / Roboto Mono)" },
          { "value": "honky-tonk", "label": "Honky Tonk (Playfair / Source Sans)" },
          { "value": "neon-stage", "label": "Neon Stage (Poppins / Inter)" },
          { "value": "front-porch", "label": "Front Porch (Lora / Open Sans)" },
          { "value": "boom-bap", "label": "Boom Bap (Archivo Black / Space Grotesk)" },
          { "value": "garage", "label": "Garage Band (Rock Salt / Nunito)" },
          { "value": "gallery", "label": "Gallery (Cormorant / Montserrat)" }
        ],
        "default": "penthouse"
      }
    ]
  },
  {
    "name": "Colors",
    "settings": [
      {
        "type": "select",
        "id": "color_palette",
        "label": "Color Palette",
        "options": [
          { "value": "after-midnight", "label": "After Midnight (dark + gold)" },
          { "value": "blood-chrome", "label": "Blood & Chrome (black + red)" },
          { "value": "sawdust", "label": "Sawdust (cream + brown)" },
          { "value": "highlighter", "label": "Highlighter (white + bright)" },
          { "value": "porch-light", "label": "Porch Light (earth tones)" },
          { "value": "concrete-jungle", "label": "Concrete Jungle (dark + neon)" },
          { "value": "xerox-punk", "label": "Xerox Punk (black + white + red)" },
          { "value": "gallery-white", "label": "Gallery White (minimal + blue)" }
        ],
        "default": "after-midnight"
      },
      {
        "type": "color",
        "id": "accent_override",
        "label": "Accent Color Override",
        "info": "Leave blank to use palette default"
      },
      {
        "type": "checkbox",
        "id": "custom_colors_enabled",
        "label": "Enable Full Custom Colors (White Glove)",
        "default": false
      },
      {
        "type": "color",
        "id": "custom_background",
        "label": "Custom Background"
      },
      {
        "type": "color",
        "id": "custom_text",
        "label": "Custom Text"
      },
      {
        "type": "color",
        "id": "custom_primary",
        "label": "Custom Primary"
      },
      {
        "type": "color",
        "id": "custom_secondary",
        "label": "Custom Secondary"
      },
      {
        "type": "color",
        "id": "custom_accent",
        "label": "Custom Accent"
      }
    ]
  }
]
```

**Step 2: Verify JSON is valid**

Run: `cat themes/spinner/config/settings_schema.json | jq .`
Expected: Valid JSON output

**Step 3: Commit**

```bash
git add themes/spinner/config/settings_schema.json
git commit -m "feat(theme): add settings schema for layout, typography, colors"
```

---

### Task 3: Create CSS Variables Snippet

**Files:**
- Create: `themes/spinner/snippets/css-variables.liquid`

**Step 1: Create css-variables.liquid with all design tokens**

Create `themes/spinner/snippets/css-variables.liquid`:
```liquid
{% comment %}
  ABOUTME: Generates CSS custom properties from theme settings
  ABOUTME: Handles font pairings, color palettes, and overrides
{% endcomment %}

<style>
:root {
  /* Font Pairings */
  {% case settings.font_pairing %}
    {% when 'penthouse' %}
      --font-heading: 'Oswald', sans-serif;
      --font-body: 'Inter', sans-serif;
    {% when 'mosh-pit' %}
      --font-heading: 'Bebas Neue', sans-serif;
      --font-body: 'Roboto Mono', monospace;
    {% when 'honky-tonk' %}
      --font-heading: 'Playfair Display', serif;
      --font-body: 'Source Sans Pro', sans-serif;
    {% when 'neon-stage' %}
      --font-heading: 'Poppins', sans-serif;
      --font-body: 'Inter', sans-serif;
    {% when 'front-porch' %}
      --font-heading: 'Lora', serif;
      --font-body: 'Open Sans', sans-serif;
    {% when 'boom-bap' %}
      --font-heading: 'Archivo Black', sans-serif;
      --font-body: 'Space Grotesk', sans-serif;
    {% when 'garage' %}
      --font-heading: 'Rock Salt', cursive;
      --font-body: 'Nunito', sans-serif;
    {% when 'gallery' %}
      --font-heading: 'Cormorant Garamond', serif;
      --font-body: 'Montserrat', sans-serif;
  {% endcase %}

  /* Color Palettes */
  {% if settings.custom_colors_enabled %}
    --color-background: {{ settings.custom_background }};
    --color-text: {{ settings.custom_text }};
    --color-primary: {{ settings.custom_primary }};
    --color-secondary: {{ settings.custom_secondary }};
    --color-accent: {{ settings.custom_accent }};
  {% else %}
    {% case settings.color_palette %}
      {% when 'after-midnight' %}
        --color-background: #0f0f0f;
        --color-text: #ffffff;
        --color-primary: #000000;
        --color-secondary: #1a1a1a;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#d4af37{% endif %};
      {% when 'blood-chrome' %}
        --color-background: #0a0a0a;
        --color-text: #e0e0e0;
        --color-primary: #1a1a1a;
        --color-secondary: #2d2d2d;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#8b0000{% endif %};
      {% when 'sawdust' %}
        --color-background: #faf6f1;
        --color-text: #2c2416;
        --color-primary: #8b7355;
        --color-secondary: #d4c4a8;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#c7923e{% endif %};
      {% when 'highlighter' %}
        --color-background: #ffffff;
        --color-text: #1a1a1a;
        --color-primary: #f5f5f5;
        --color-secondary: #e0e0e0;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#ff3366{% endif %};
      {% when 'porch-light' %}
        --color-background: #f5f0e6;
        --color-text: #3d3225;
        --color-primary: #6b5d4d;
        --color-secondary: #a69580;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#7c9a5e{% endif %};
      {% when 'concrete-jungle' %}
        --color-background: #1c1c1c;
        --color-text: #f0f0f0;
        --color-primary: #2a2a2a;
        --color-secondary: #404040;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#00ff88{% endif %};
      {% when 'xerox-punk' %}
        --color-background: #ffffff;
        --color-text: #000000;
        --color-primary: #000000;
        --color-secondary: #666666;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#ff0000{% endif %};
      {% when 'gallery-white' %}
        --color-background: #fafafa;
        --color-text: #1a1a1a;
        --color-primary: #ffffff;
        --color-secondary: #f0f0f0;
        --color-accent: {% if settings.accent_override != blank %}{{ settings.accent_override }}{% else %}#0066cc{% endif %};
    {% endcase %}
  {% endif %}

  /* Spacing */
  --space-xs: 0.25rem;
  --space-sm: 0.5rem;
  --space-md: 1rem;
  --space-lg: 2rem;
  --space-xl: 4rem;

  /* Border Radius */
  --radius-sm: 2px;
  --radius-md: 4px;
  --radius-lg: 8px;

  /* Animation */
  {% case settings.animation_level %}
    {% when 'none' %}
      --transition-speed: 0ms;
      --animation-enabled: 0;
    {% when 'subtle' %}
      --transition-speed: 200ms;
      --animation-enabled: 1;
    {% when 'dynamic' %}
      --transition-speed: 300ms;
      --animation-enabled: 1;
  {% endcase %}
}

@media (prefers-reduced-motion: reduce) {
  :root {
    --transition-speed: 0ms;
    --animation-enabled: 0;
  }
}
</style>
```

**Step 2: Commit**

```bash
git add themes/spinner/snippets/css-variables.liquid
git commit -m "feat(theme): add CSS variables snippet with fonts, colors, animations"
```

---

### Task 4: Create Base Theme CSS

**Files:**
- Create: `themes/spinner/assets/theme.css`

**Step 1: Create theme.css with base styles**

Create `themes/spinner/assets/theme.css`:
```css
/* ABOUTME: Base theme styles using CSS custom properties */
/* ABOUTME: All visual variation controlled via --variables */

/* Reset */
*, *::before, *::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

/* Base */
html {
  font-size: 16px;
  scroll-behavior: smooth;
}

body {
  font-family: var(--font-body);
  background-color: var(--color-background);
  color: var(--color-text);
  line-height: 1.6;
  min-height: 100vh;
}

/* Typography */
h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-heading);
  line-height: 1.2;
  margin-bottom: var(--space-md);
}

h1 { font-size: 3rem; }
h2 { font-size: 2.25rem; }
h3 { font-size: 1.75rem; }
h4 { font-size: 1.25rem; }

p { margin-bottom: var(--space-md); }

a {
  color: var(--color-accent);
  text-decoration: none;
  transition: opacity var(--transition-speed) ease;
}

a:hover {
  opacity: 0.8;
}

/* Buttons */
.btn {
  display: inline-block;
  padding: var(--space-sm) var(--space-lg);
  font-family: var(--font-heading);
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  border: none;
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all var(--transition-speed) ease;
}

.btn-primary {
  background-color: var(--color-accent);
  color: var(--color-background);
}

.btn-primary:hover {
  opacity: 0.9;
  transform: translateY(-2px);
}

.btn-secondary {
  background-color: transparent;
  color: var(--color-text);
  border: 2px solid var(--color-text);
}

.btn-secondary:hover {
  background-color: var(--color-text);
  color: var(--color-background);
}

/* Container */
.container {
  width: 100%;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 var(--space-md);
}

/* Layout: Standard */
.layout-standard .container {
  max-width: 1200px;
}

/* Layout: Editorial */
.layout-editorial .container {
  max-width: 1400px;
}

/* Layout: Bold */
.layout-bold {
  display: grid;
  grid-template-columns: 280px 1fr;
  min-height: 100vh;
}

.layout-bold .main-content {
  padding: var(--space-lg);
}

@media (max-width: 768px) {
  .layout-bold {
    grid-template-columns: 1fr;
  }
}

/* Product Grid: Classic */
.product-grid-classic {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
}

@media (max-width: 1024px) {
  .product-grid-classic {
    grid-template-columns: repeat(3, 1fr);
  }
}

@media (max-width: 768px) {
  .product-grid-classic {
    grid-template-columns: repeat(2, 1fr);
  }
}

/* Product Grid: Masonry */
.product-grid-masonry {
  columns: 4;
  column-gap: var(--space-lg);
}

.product-grid-masonry .product-card {
  break-inside: avoid;
  margin-bottom: var(--space-lg);
}

@media (max-width: 1024px) {
  .product-grid-masonry { columns: 3; }
}

@media (max-width: 768px) {
  .product-grid-masonry { columns: 2; }
}

/* Product Grid: Featured First */
.product-grid-featured {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: var(--space-lg);
}

.product-grid-featured .product-card:first-child {
  grid-column: span 2;
  grid-row: span 2;
}

@media (max-width: 768px) {
  .product-grid-featured {
    grid-template-columns: 1fr;
  }
  .product-grid-featured .product-card:first-child {
    grid-column: span 1;
    grid-row: span 1;
  }
}

/* Product Card */
.product-card {
  background-color: var(--color-secondary);
  border-radius: var(--radius-md);
  overflow: hidden;
  transition: transform var(--transition-speed) ease;
}

.product-card:hover {
  transform: translateY(-4px);
}

.product-card img {
  width: 100%;
  height: auto;
  display: block;
}

.product-card-info {
  padding: var(--space-md);
}

.product-card-title {
  font-family: var(--font-heading);
  font-size: 1rem;
  margin-bottom: var(--space-xs);
}

.product-card-price {
  color: var(--color-accent);
  font-weight: 600;
}

/* Utility Classes */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
```

**Step 2: Commit**

```bash
git add themes/spinner/assets/theme.css
git commit -m "feat(theme): add base CSS with layouts, grids, components"
```

---

### Task 5: Create Settings Data with Presets

**Files:**
- Create: `themes/spinner/config/settings_data.json`

**Step 1: Create settings_data.json with all presets**

Create `themes/spinner/config/settings_data.json`:
```json
{
  "current": "Default",
  "presets": {
    "Default": {
      "layout_style": "standard",
      "navigation_style": "topbar",
      "animation_level": "subtle",
      "font_pairing": "penthouse",
      "color_palette": "after-midnight",
      "custom_colors_enabled": false
    },
    "Penthouse": {
      "layout_style": "bold",
      "navigation_style": "sidebar",
      "animation_level": "dynamic",
      "font_pairing": "penthouse",
      "color_palette": "after-midnight",
      "custom_colors_enabled": false
    },
    "Mosh Pit": {
      "layout_style": "bold",
      "navigation_style": "hamburger",
      "animation_level": "none",
      "font_pairing": "mosh-pit",
      "color_palette": "blood-chrome",
      "custom_colors_enabled": false
    },
    "Honky Tonk": {
      "layout_style": "standard",
      "navigation_style": "topbar",
      "animation_level": "subtle",
      "font_pairing": "honky-tonk",
      "color_palette": "sawdust",
      "custom_colors_enabled": false
    },
    "Neon Stage": {
      "layout_style": "editorial",
      "navigation_style": "topbar",
      "animation_level": "dynamic",
      "font_pairing": "neon-stage",
      "color_palette": "highlighter",
      "custom_colors_enabled": false
    },
    "Front Porch": {
      "layout_style": "standard",
      "navigation_style": "topbar",
      "animation_level": "subtle",
      "font_pairing": "front-porch",
      "color_palette": "porch-light",
      "custom_colors_enabled": false
    },
    "Boom Bap": {
      "layout_style": "editorial",
      "navigation_style": "hamburger",
      "animation_level": "subtle",
      "font_pairing": "boom-bap",
      "color_palette": "concrete-jungle",
      "custom_colors_enabled": false
    },
    "Garage": {
      "layout_style": "standard",
      "navigation_style": "hamburger",
      "animation_level": "none",
      "font_pairing": "garage",
      "color_palette": "xerox-punk",
      "custom_colors_enabled": false
    },
    "Gallery": {
      "layout_style": "editorial",
      "navigation_style": "topbar",
      "animation_level": "subtle",
      "font_pairing": "gallery",
      "color_palette": "gallery-white",
      "custom_colors_enabled": false
    }
  }
}
```

**Step 2: Commit**

```bash
git add themes/spinner/config/settings_data.json
git commit -m "feat(theme): add settings_data.json with 9 genre presets"
```

---

## Phase 2: Core Templates

### Task 6: Create Index Template

**Files:**
- Create: `themes/spinner/templates/index.json`

**Step 1: Create index.json**

Create `themes/spinner/templates/index.json`:
```json
{
  "sections": {
    "hero": {
      "type": "hero",
      "settings": {}
    },
    "featured-collection": {
      "type": "featured-collection",
      "settings": {
        "title": "Featured Products"
      }
    }
  },
  "order": ["hero", "featured-collection"]
}
```

**Step 2: Commit**

```bash
git add themes/spinner/templates/index.json
git commit -m "feat(theme): add index template"
```

---

### Task 7: Create Hero Section

**Files:**
- Create: `themes/spinner/sections/hero.liquid`

**Step 1: Create hero.liquid with three styles**

Create `themes/spinner/sections/hero.liquid`:
```liquid
{% comment %}
  ABOUTME: Hero section with three style variants
  ABOUTME: full-bleed, split, video controlled via settings
{% endcomment %}

{% liquid
  assign hero_style = section.settings.hero_style
%}

<section class="hero hero--{{ hero_style }}">
  {% case hero_style %}
    {% when 'full-bleed' %}
      <div class="hero__media">
        {% if section.settings.image != blank %}
          <img
            src="{{ section.settings.image | image_url: width: 1920 }}"
            alt="{{ section.settings.image.alt | default: section.settings.heading }}"
            loading="eager"
            class="hero__image"
          >
        {% endif %}
      </div>
      <div class="hero__content">
        <div class="container">
          {% if section.settings.heading != blank %}
            <h1 class="hero__heading">{{ section.settings.heading }}</h1>
          {% endif %}
          {% if section.settings.subheading != blank %}
            <p class="hero__subheading">{{ section.settings.subheading }}</p>
          {% endif %}
          {% if section.settings.button_text != blank %}
            <a href="{{ section.settings.button_link }}" class="btn btn-primary">
              {{ section.settings.button_text }}
            </a>
          {% endif %}
        </div>
      </div>

    {% when 'split' %}
      <div class="hero__split container">
        <div class="hero__content">
          {% if section.settings.heading != blank %}
            <h1 class="hero__heading">{{ section.settings.heading }}</h1>
          {% endif %}
          {% if section.settings.subheading != blank %}
            <p class="hero__subheading">{{ section.settings.subheading }}</p>
          {% endif %}
          {% if section.settings.button_text != blank %}
            <a href="{{ section.settings.button_link }}" class="btn btn-primary">
              {{ section.settings.button_text }}
            </a>
          {% endif %}
        </div>
        <div class="hero__media">
          {% if section.settings.image != blank %}
            <img
              src="{{ section.settings.image | image_url: width: 960 }}"
              alt="{{ section.settings.image.alt | default: section.settings.heading }}"
              loading="eager"
              class="hero__image"
            >
          {% endif %}
        </div>
      </div>

    {% when 'video' %}
      <div class="hero__media">
        {% if section.settings.video_url != blank %}
          <video autoplay muted loop playsinline class="hero__video">
            <source src="{{ section.settings.video_url }}" type="video/mp4">
          </video>
        {% elsif section.settings.image != blank %}
          <img
            src="{{ section.settings.image | image_url: width: 1920 }}"
            alt="{{ section.settings.image.alt | default: section.settings.heading }}"
            loading="eager"
            class="hero__image"
          >
        {% endif %}
      </div>
      <div class="hero__content">
        <div class="container">
          {% if section.settings.heading != blank %}
            <h1 class="hero__heading">{{ section.settings.heading }}</h1>
          {% endif %}
          {% if section.settings.subheading != blank %}
            <p class="hero__subheading">{{ section.settings.subheading }}</p>
          {% endif %}
          {% if section.settings.button_text != blank %}
            <a href="{{ section.settings.button_link }}" class="btn btn-primary">
              {{ section.settings.button_text }}
            </a>
          {% endif %}
        </div>
      </div>
  {% endcase %}
</section>

<style>
.hero {
  position: relative;
  min-height: 80vh;
  display: flex;
  align-items: center;
  overflow: hidden;
}

.hero--full-bleed .hero__media,
.hero--video .hero__media {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.hero--full-bleed .hero__media::after,
.hero--video .hero__media::after {
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, rgba(0,0,0,0.7) 0%, rgba(0,0,0,0.3) 100%);
}

.hero__image,
.hero__video {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.hero--full-bleed .hero__content,
.hero--video .hero__content {
  position: relative;
  z-index: 1;
  padding: var(--space-xl) 0;
}

.hero__heading {
  font-size: clamp(2.5rem, 8vw, 5rem);
  margin-bottom: var(--space-md);
}

.hero__subheading {
  font-size: 1.25rem;
  margin-bottom: var(--space-lg);
  max-width: 600px;
}

/* Split layout */
.hero--split {
  min-height: auto;
  padding: var(--space-xl) 0;
}

.hero__split {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-xl);
  align-items: center;
}

.hero--split .hero__media {
  position: relative;
}

.hero--split .hero__image {
  border-radius: var(--radius-lg);
}

@media (max-width: 768px) {
  .hero__split {
    grid-template-columns: 1fr;
  }

  .hero--split .hero__content {
    order: 1;
  }

  .hero--split .hero__media {
    order: 2;
  }
}
</style>

{% schema %}
{
  "name": "Hero",
  "settings": [
    {
      "type": "select",
      "id": "hero_style",
      "label": "Hero Style",
      "options": [
        { "value": "full-bleed", "label": "Full Bleed" },
        { "value": "split", "label": "Split" },
        { "value": "video", "label": "Video Background" }
      ],
      "default": "full-bleed"
    },
    {
      "type": "image_picker",
      "id": "image",
      "label": "Image"
    },
    {
      "type": "url",
      "id": "video_url",
      "label": "Video URL (for video style)"
    },
    {
      "type": "text",
      "id": "heading",
      "label": "Heading",
      "default": "Welcome to our store"
    },
    {
      "type": "textarea",
      "id": "subheading",
      "label": "Subheading"
    },
    {
      "type": "text",
      "id": "button_text",
      "label": "Button Text",
      "default": "Shop Now"
    },
    {
      "type": "url",
      "id": "button_link",
      "label": "Button Link"
    }
  ],
  "presets": [
    {
      "name": "Hero"
    }
  ]
}
{% endschema %}
```

**Step 2: Commit**

```bash
git add themes/spinner/sections/hero.liquid
git commit -m "feat(theme): add hero section with full-bleed, split, video variants"
```

---

### Task 8: Create Header Section with Nav Variants

**Files:**
- Create: `themes/spinner/sections/header.liquid`

**Step 1: Create header.liquid with three nav styles**

Create `themes/spinner/sections/header.liquid`:
```liquid
{% comment %}
  ABOUTME: Header with three navigation styles
  ABOUTME: topbar, hamburger, sidebar controlled via theme settings
{% endcomment %}

{% liquid
  assign nav_style = settings.navigation_style
%}

<header class="header header--{{ nav_style }}" data-nav-style="{{ nav_style }}">
  {% case nav_style %}
    {% when 'topbar' %}
      <div class="header__topbar container">
        <a href="/" class="header__logo">
          {% if settings.logo != blank %}
            <img src="{{ settings.logo | image_url: width: 200 }}" alt="{{ shop.name }}">
          {% else %}
            {{ shop.name }}
          {% endif %}
        </a>
        <nav class="header__nav">
          {% for link in linklists.main-menu.links %}
            <a href="{{ link.url }}" class="header__nav-link">{{ link.title }}</a>
          {% endfor %}
        </nav>
        <div class="header__actions">
          <a href="/search" class="header__icon" aria-label="Search">
            {% render 'icon-search' %}
          </a>
          <a href="/cart" class="header__icon header__cart" aria-label="Cart">
            {% render 'icon-cart' %}
            <span class="header__cart-count">{{ cart.item_count }}</span>
          </a>
        </div>
      </div>

    {% when 'hamburger' %}
      <div class="header__hamburger container">
        <button class="header__menu-toggle" aria-label="Menu" aria-expanded="false">
          {% render 'icon-menu' %}
        </button>
        <a href="/" class="header__logo">
          {% if settings.logo != blank %}
            <img src="{{ settings.logo | image_url: width: 200 }}" alt="{{ shop.name }}">
          {% else %}
            {{ shop.name }}
          {% endif %}
        </a>
        <div class="header__actions">
          <a href="/cart" class="header__icon header__cart" aria-label="Cart">
            {% render 'icon-cart' %}
            <span class="header__cart-count">{{ cart.item_count }}</span>
          </a>
        </div>
      </div>
      <div class="header__menu-overlay" aria-hidden="true">
        <nav class="header__menu-content">
          {% for link in linklists.main-menu.links %}
            <a href="{{ link.url }}" class="header__menu-link">{{ link.title }}</a>
          {% endfor %}
        </nav>
      </div>

    {% when 'sidebar' %}
      <aside class="header__sidebar">
        <a href="/" class="header__logo">
          {% if settings.logo != blank %}
            <img src="{{ settings.logo | image_url: width: 200 }}" alt="{{ shop.name }}">
          {% else %}
            {{ shop.name }}
          {% endif %}
        </a>
        <nav class="header__nav">
          {% for link in linklists.main-menu.links %}
            <a href="{{ link.url }}" class="header__nav-link">{{ link.title }}</a>
          {% endfor %}
        </nav>
        <div class="header__actions">
          <a href="/search" class="header__icon" aria-label="Search">
            {% render 'icon-search' %}
          </a>
          <a href="/cart" class="header__icon header__cart" aria-label="Cart">
            {% render 'icon-cart' %}
            <span class="header__cart-count">{{ cart.item_count }}</span>
          </a>
        </div>
      </aside>
  {% endcase %}
</header>

<style>
/* Topbar Navigation */
.header--topbar {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-background);
  border-bottom: 1px solid var(--color-secondary);
}

.header__topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md) var(--space-md);
  gap: var(--space-lg);
}

.header__logo {
  font-family: var(--font-heading);
  font-size: 1.5rem;
  color: var(--color-text);
  text-decoration: none;
}

.header__logo img {
  height: 40px;
  width: auto;
}

.header__nav {
  display: flex;
  gap: var(--space-lg);
}

.header__nav-link {
  color: var(--color-text);
  font-size: 0.9rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  transition: color var(--transition-speed) ease;
}

.header__nav-link:hover {
  color: var(--color-accent);
}

.header__actions {
  display: flex;
  gap: var(--space-md);
  align-items: center;
}

.header__icon {
  color: var(--color-text);
  position: relative;
}

.header__cart-count {
  position: absolute;
  top: -8px;
  right: -8px;
  background: var(--color-accent);
  color: var(--color-background);
  font-size: 0.7rem;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* Hamburger Navigation */
.header--hamburger {
  position: sticky;
  top: 0;
  z-index: 100;
  background: var(--color-background);
}

.header__hamburger {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-md);
}

.header__menu-toggle {
  background: none;
  border: none;
  color: var(--color-text);
  cursor: pointer;
  padding: var(--space-sm);
}

.header__menu-overlay {
  position: fixed;
  inset: 0;
  background: var(--color-background);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  visibility: hidden;
  transition: all var(--transition-speed) ease;
}

.header__menu-overlay.is-open {
  opacity: 1;
  visibility: visible;
}

.header__menu-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-lg);
}

.header__menu-link {
  font-family: var(--font-heading);
  font-size: 2rem;
  color: var(--color-text);
  text-transform: uppercase;
}

/* Sidebar Navigation */
.header--sidebar {
  position: fixed;
  left: 0;
  top: 0;
  bottom: 0;
  width: 280px;
  background: var(--color-secondary);
  z-index: 100;
  display: flex;
  flex-direction: column;
  padding: var(--space-xl) var(--space-lg);
}

.header__sidebar .header__logo {
  margin-bottom: var(--space-xl);
}

.header__sidebar .header__nav {
  flex-direction: column;
  gap: var(--space-md);
  flex: 1;
}

.header__sidebar .header__nav-link {
  font-size: 1.1rem;
  padding: var(--space-sm) 0;
  border-bottom: 1px solid var(--color-primary);
}

.header__sidebar .header__actions {
  margin-top: auto;
  padding-top: var(--space-lg);
  border-top: 1px solid var(--color-primary);
}

@media (max-width: 768px) {
  .header--topbar .header__nav {
    display: none;
  }

  .header--sidebar {
    transform: translateX(-100%);
    transition: transform var(--transition-speed) ease;
  }

  .header--sidebar.is-open {
    transform: translateX(0);
  }
}
</style>

{% schema %}
{
  "name": "Header",
  "settings": []
}
{% endschema %}
```

**Step 2: Commit**

```bash
git add themes/spinner/sections/header.liquid
git commit -m "feat(theme): add header section with topbar, hamburger, sidebar variants"
```

---

_Plan continues in next tasks for: icon snippets, featured collection, product card, collection template, product template, cart, footer, locales, and CLI integration._
