# Spinner Band Theme - Design Spec

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build one flexible Shopify theme that transforms via presets, designed for hundreds of band merch stores across genres.

**Architecture:** CSS custom properties control all visual variation. Liquid conditionals swap layout structures. Presets are JSON configs that set all variables at once. CLI tool applies presets to stores.

**Tech Stack:** Vanilla Liquid, CSS custom properties, no build step

---

## Customization Options

### Layouts (3)

| Layout | Description | Use Case |
|--------|-------------|----------|
| **Standard** | Centered content, balanced whitespace, traditional header | Safe default, works for any genre |
| **Editorial** | Asymmetric, left-heavy, art-directed feel | Indie, alternative, artsy bands |
| **Bold** | Full-bleed hero, sidebar navigation, immersive | High-energy, big personalities, rap/metal |

### Navigation Styles (3)

| Style | Description | Pairs With |
|-------|-------------|------------|
| **Top bar** | Classic horizontal nav, logo left, links center/right | Standard, Editorial layouts |
| **Hamburger** | Minimal, icon-only, full-screen menu on click | Any layout, minimal aesthetic |
| **Sidebar** | Persistent vertical nav, always visible | Bold layout primarily |

### Product Grid Styles (3)

| Style | Description | Use Case |
|-------|-------------|----------|
| **Classic** | Even columns (2/3/4), uniform cards | Clean, organized catalogs |
| **Masonry** | Varied heights, Pinterest-style | Mixed merch (vinyl, shirts, posters) |
| **Featured-first** | Hero product large, rest in grid | New releases, tour merch drops |

### Hero Styles (3)

| Style | Description | Use Case |
|-------|-------------|----------|
| **Full-bleed** | Edge-to-edge image, text overlay | Bold statements, strong imagery |
| **Split** | Image one side, text other side | Balanced, readable, versatile |
| **Video** | Looping background video | Tour footage, music videos, live clips |

### Typography (Curated Pairings)

Named font pairings - merchants pick a pairing, not individual fonts:

| Pairing Name | Heading | Body | Vibe |
|--------------|---------|------|------|
| **Penthouse** | Oswald | Inter | Luxury rap, commanding |
| **Mosh Pit** | Bebas Neue | Roboto Mono | Metal, aggressive, industrial |
| **Honky Tonk** | Playfair Display | Source Sans Pro | Country, warm, approachable |
| **Neon Stage** | Poppins | Inter | Pop, bright, contemporary |
| **Front Porch** | Lora | Open Sans | Bluegrass, folk, organic |
| **Boom Bap** | Archivo Black | Space Grotesk | Hip-hop, urban, bold |
| **Garage Band** | Rock Salt | Nunito | Punk, DIY, hand-drawn |
| **Velvet Rope** | Cormorant Garamond | Montserrat | Indie, sophisticated, editorial |

### Color System

**Default mode:** Curated palettes + accent override
**White glove mode:** Full custom (all colors editable)

| Palette Name | Background | Text | Primary | Secondary | Accent | Vibe |
|--------------|------------|------|---------|-----------|--------|------|
| **After Midnight** | #0f0f0f | #ffffff | #000000 | #1a1a1a | #d4af37 | Dark luxury, gold accents |
| **Blood & Chrome** | #0a0a0a | #e0e0e0 | #1a1a1a | #2d2d2d | #8b0000 | Metal, aggressive |
| **Sawdust** | #faf6f1 | #2c2416 | #8b7355 | #d4c4a8 | #c7923e | Country, warm wood tones |
| **Highlighter** | #ffffff | #1a1a1a | #f5f5f5 | #e0e0e0 | #ff3366 | Pop, bright, energetic |
| **Porch Light** | #f5f0e6 | #3d3225 | #6b5d4d | #a69580 | #7c9a5e | Folk, earthy, natural |
| **Concrete Jungle** | #1c1c1c | #f0f0f0 | #2a2a2a | #404040 | #00ff88 | Urban, neon accents |
| **Xerox Punk** | #ffffff | #000000 | #000000 | #666666 | #ff0000 | DIY, zine aesthetic |
| **Gallery White** | #fafafa | #1a1a1a | #ffffff | #f0f0f0 | #0066cc | Clean, editorial, art |

### Animation Levels (3)

| Level | Description | Use Case |
|-------|-------------|----------|
| **None** | No animations, instant state changes | Accessibility, fast loading, certain aesthetics |
| **Subtle** | Fade-ins, gentle hover states, soft transitions | Most stores, professional feel |
| **Dynamic** | Slide-ins, parallax, bold hover effects | High-energy, engaging, entertainment |

---

## Preset System

Presets combine all options into named configurations:

```json
{
  "preset_name": "penthouse",
  "layout": "bold",
  "navigation": "sidebar",
  "product_grid": "featured-first",
  "hero": "video",
  "typography": "penthouse",
  "palette": "after-midnight",
  "accent_override": null,
  "animation": "dynamic"
}
```

### Default Presets

| Preset | Layout | Nav | Grid | Hero | Typography | Palette | Animation |
|--------|--------|-----|------|------|------------|---------|-----------|
| `penthouse` | bold | sidebar | featured-first | video | Penthouse | After Midnight | dynamic |
| `mosh-pit` | bold | hamburger | masonry | full-bleed | Mosh Pit | Blood & Chrome | none |
| `honky-tonk` | standard | top-bar | classic | split | Honky Tonk | Sawdust | subtle |
| `neon-stage` | editorial | top-bar | featured-first | video | Neon Stage | Highlighter | dynamic |
| `front-porch` | standard | top-bar | classic | split | Front Porch | Porch Light | subtle |
| `boom-bap` | editorial | hamburger | masonry | full-bleed | Boom Bap | Concrete Jungle | subtle |
| `garage` | standard | hamburger | masonry | full-bleed | Garage Band | Xerox Punk | none |
| `gallery` | editorial | top-bar | classic | split | Velvet Rope | Gallery White | subtle |

---

## CLI Integration

### Apply preset to store

```bash
spinner theme apply --store band.myshopify.com --preset penthouse
```

### Apply with accent override

```bash
spinner theme apply --store band.myshopify.com --preset mosh-pit --accent "#ff0000"
```

### Full custom (white glove)

```bash
spinner theme apply --store vip.myshopify.com --config ./custom-theme.yaml
```

### Custom theme YAML format

```yaml
layout: bold
navigation: sidebar
product_grid: featured-first
hero: video
typography: penthouse
colors:
  background: "#0f0f0f"
  text: "#ffffff"
  primary: "#000000"
  secondary: "#1a1a1a"
  accent: "#d4af37"
animation: dynamic
```

---

## File Structure

```
themes/spinner/
├── assets/
│   ├── theme.css              # All styles, CSS custom properties
│   └── theme.js               # Minimal vanilla JS
├── config/
│   ├── settings_schema.json   # Theme settings definitions
│   └── settings_data.json     # Default values + presets
├── layout/
│   └── theme.liquid           # Main layout wrapper
├── locales/
│   └── en.default.json        # Translations
├── sections/
│   ├── header.liquid          # Nav variations via Liquid
│   ├── hero.liquid            # Hero style variations
│   ├── featured-collection.liquid
│   ├── product-grid.liquid    # Grid style variations
│   ├── footer.liquid
│   └── ...
├── snippets/
│   ├── css-variables.liquid   # Design tokens from settings
│   ├── product-card.liquid    # Reusable card component
│   └── ...
└── templates/
    ├── index.json
    ├── collection.json
    ├── product.json
    ├── cart.json
    └── ...
```

---

## Implementation Phases

### Phase 1: Foundation
- Set up theme structure
- Implement CSS custom properties system
- Build settings_schema.json with all options
- Create css-variables.liquid snippet

### Phase 2: Layout System
- Build three layout variations in theme.liquid
- Implement layout switching via settings

### Phase 3: Navigation
- Build three nav styles in header.liquid
- Mobile responsive for all variants

### Phase 4: Hero Sections
- Full-bleed, split, video hero variants
- Responsive behavior

### Phase 5: Product Grid
- Classic, masonry, featured-first grids
- Product card component

### Phase 6: Typography & Colors
- Implement all font pairings
- Implement all color palettes
- Accent override system

### Phase 7: Animation System
- None/subtle/dynamic levels
- Respect prefers-reduced-motion

### Phase 8: Presets & CLI
- Create all default presets
- Build `spinner theme apply` command
- Settings_data.json generation

### Phase 9: Polish
- All page templates
- Empty states
- Mobile pass
- Shopify theme check

---

## Future Enhancements

### Logo Color Extraction Tool

CLI tool to extract dominant colors from logo and generate theme preset:

```bash
spinner extract-colors --logo ./band-logo.png
```

**Output:**
```
Extracted from: band-logo.png
  Primary:    #d4af37 (gold, 34% coverage)
  Secondary:  #1a1a1a (near-black, 28% coverage)
  Accent:     #8b0000 (dark red, 12% coverage)
  Background: #0f0f0f (suggested dark)
  Text:       #ffffff (suggested light for contrast)
```

**Potential libraries:** node-vibrant, colorthief, sharp
