# Theme Customization

Configure client-specific theme settings in your YAML config, then push a fully customized theme with one command.

## Quick Start

```bash
# Push theme with customizations from config
spinner theme push -s store.myshopify.com -c configs/my-client.yaml
```

## Config Structure

```yaml
theme:
  source: spinner
  settings:
    # Pick a preset (fonts + colors + layout)
    preset: mosh-pit  # or gallery, penthouse, honky-tonk, etc.

    # Override the accent color
    accent_override: "#8b0000"

    # Logo with optional color extraction
    logo: ./logo.png
    logo_width: 200
    extract_colors_from_logo: true  # Auto-generate palette from logo!

    # Layout overrides (optional - preset sets defaults)
    layout_style: bold        # standard, editorial, bold
    navigation_style: hamburger  # topbar, hamburger, sidebar
    animation_level: subtle   # none, subtle, dynamic

    # Homepage content
    content:
      hero_heading: "Band Name"
      hero_subheading: "Official Merch"
      hero_button_text: "Shop Now"
      tagline: "Your tagline here"

    # Social links (appear in footer)
    social:
      instagram: https://instagram.com/band
      twitter: https://twitter.com/band
      youtube: https://youtube.com/@band
      tiktok: https://tiktok.com/@band
      spotify: https://open.spotify.com/artist/...
```

## Available Presets

| Preset | Fonts | Colors | Layout |
|--------|-------|--------|--------|
| `penthouse` | Oswald / Inter | After Midnight (dark + gold) | Bold + sidebar |
| `mosh-pit` | Bebas Neue / Roboto Mono | Blood Chrome (black + red) | Bold + hamburger |
| `honky-tonk` | Playfair / Source Sans | Sawdust (cream + brown) | Standard + topbar |
| `neon-stage` | Poppins / Inter | Highlighter (white + bright) | Editorial + topbar |
| `front-porch` | Lora / Open Sans | Porch Light (earth tones) | Standard + topbar |
| `boom-bap` | Archivo Black / Space Grotesk | Concrete Jungle (dark + neon) | Editorial + hamburger |
| `garage` | Rock Salt / Nunito | Xerox Punk (B&W + red) | Standard + hamburger |
| `gallery` | Cormorant / Montserrat | Gallery White (minimal) | Editorial + topbar |

## Color Extraction from Logo

Set `extract_colors_from_logo: true` to automatically generate a color palette from the client's logo:

```yaml
theme:
  settings:
    logo: ./assets/client-logo.png
    extract_colors_from_logo: true
```

The system will:
1. Analyze dominant colors in the logo
2. Determine if dark or light theme works better
3. Generate matching background, text, primary, secondary, and accent colors
4. Apply them as custom colors to the theme

You can still use `accent_override` to tweak the accent color after extraction.

## Custom Colors (No Preset)

If you don't want a preset, specify custom colors directly:

```yaml
theme:
  settings:
    colors:
      background: "#050505"
      text: "#e5e5e5"
      primary: "#1a1a1a"
      secondary: "#2a2a2a"
      accent: "#ff6600"
```

## Full Workflow

```bash
# 1. Whitelist the shop
spinner whitelist add store.myshopify.com

# 2. Start OAuth server and install app
spinner serve
# Visit: http://localhost:3000/auth?shop=store.myshopify.com

# 3. Push customized theme
spinner theme push -s store.myshopify.com -c configs/client.yaml

# 4. Publish theme in Shopify admin (if pushed as unpublished)

# 5. Create products and publish to Online Store
spinner create -c configs/client.yaml --shop-domain store.myshopify.com
```

## Example Config

See `configs/pit-viper-funeral.yaml` for a complete example:

```yaml
store:
  name: Pit Viper Funeral
  email: merch@pitviperfuneral.com

theme:
  source: spinner
  settings:
    preset: mosh-pit
    accent_override: "#8b0000"
    logo: ../assets/logos/pit-viper-funeral.png
    logo_width: 200
    content:
      hero_heading: "Pit Viper Funeral"
      hero_subheading: "Official Merch - Death Never Looked So Good"
      tagline: "Wear Your Darkness"
    social:
      instagram: https://instagram.com/pitviperfuneral
      spotify: https://open.spotify.com/artist/pitviperfuneral

products:
  source: ../products/metal-band.csv
  create_collections: true

settings:
  currency: USD
  shipping:
    domestic_flat_rate: 7.99
    free_shipping_threshold: 75
```
