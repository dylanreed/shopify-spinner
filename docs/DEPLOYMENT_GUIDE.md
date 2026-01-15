# Spinner Deployment Guide

## Required Assets

| Asset | Location | Dimensions | Format | Notes |
|-------|----------|------------|--------|-------|
| Logo | `assets/logos/<store-name>.png` | 150-300px wide | PNG (transparent) | Width configurable via `logo_width` |
| Hero Image | `assets/heroes/<store-name>.jpg` or Shopify admin | 1920x1080px min | JPG/PNG | 16:9 or wider, uses object-fit: cover |
| Product Images | URLs in CSV | 800x800px+ | JPG/PNG | Square recommended |

### Hero Image by Style

| Style | Recommended Size | Aspect Ratio |
|-------|------------------|--------------|
| full-bleed | 1920 x 1080px+ | 16:9 or wider |
| split | 960 x 720px | 4:3 |
| video | N/A (use video URL) | 16:9 |

---

## Config File Structure

```yaml
store:
  name: "Store Name"           # Required - used for theme name
  email: "email@example.com"   # Required

theme:
  source: spinner              # Always "spinner" for now
  settings:
    # Preset (picks font pairing + color palette)
    preset: penthouse          # See presets below

    # Logo
    logo: ../assets/logos/store-name.png
    logo_width: 180            # 50-300px

    # Optional: Extract colors from logo
    extract_colors_from_logo: true

    # Optional: Override accent color
    accent_override: "#ff5500"

    # Layout overrides (optional)
    layout_style: standard     # standard | editorial | bold
    navigation_style: topbar   # topbar | hamburger | sidebar
    animation_level: subtle    # none | subtle | dynamic

    # Content
    content:
      hero_heading: "Store Name"
      hero_subheading: "Tagline or tour name"
      hero_button_text: "Shop Now"        # Optional, defaults to "Shop Now"
      hero_button_link: "/collections/all" # Optional, defaults to featured collection
      hero_image: ../assets/heroes/store-name.jpg  # Optional, path to hero background
      tagline: "Footer tagline"
      featured_collection: bestseller      # Collection handle for homepage

    # Social links (all optional)
    social:
      instagram: https://instagram.com/handle
      twitter: https://twitter.com/handle
      youtube: https://youtube.com/@handle
      tiktok: https://tiktok.com/@handle
      spotify: https://open.spotify.com/artist/id

products:
  source: ../products/product-file.csv
  create_collections: true     # Creates collections from product tags

settings:
  currency: USD
  timezone: America/Los_Angeles
  shipping:
    domestic_flat_rate: 5.99
    free_shipping_threshold: 50
```

---

## Theme Presets

| Preset | Font Pairing | Color Palette | Best For |
|--------|--------------|---------------|----------|
| `penthouse` | Oswald / Inter | After Midnight (dark + gold) | Luxury, upscale |
| `mosh-pit` | Bebas Neue / Roboto Mono | Blood & Chrome (black + red) | Metal, punk, hardcore |
| `honky-tonk` | Playfair / Source Sans | Sawdust (cream + brown) | Country, folk, americana |
| `neon-stage` | Poppins / Inter | Highlighter (white + bright) | Pop, EDM, energetic |
| `front-porch` | Lora / Open Sans | Porch Light (earth tones) | Acoustic, indie folk |
| `boom-bap` | Archivo Black / Space Grotesk | Concrete Jungle (dark + neon) | Hip-hop, rap, urban |
| `garage` | Rock Salt / Nunito | Xerox Punk (black + white + red) | Rock, garage, DIY |
| `gallery` | Cormorant / Montserrat | Gallery White (minimal + blue) | Art, minimal, clean |

---

## Product CSV Format

```csv
handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
```

### Key Fields

| Field | Required | Notes |
|-------|----------|-------|
| handle | Yes | URL slug, lowercase with hyphens |
| title | Yes | Product name |
| description | Yes | Product description |
| vendor | Yes | Brand/artist name |
| type | Yes | Product type (T-Shirts, Hoodies, etc.) |
| tags | Yes | Semicolon-separated, becomes collections |
| price | Yes | Decimal price |
| compare_at_price | No | Original price for sale items |
| image_url | Yes | Full URL to product image |

### Tags → Collections

Tags in the CSV become smart collections. Common tags to include:
- `bestseller` - Good for featured collection
- Product attributes: `black`, `white`, `cotton`, etc.
- Categories: `summer`, `winter`, `limited`, `new`

---

## Deployment Checklist

### Before Deploy

- [ ] Logo file in `assets/logos/`
- [ ] Hero image in `assets/heroes/` (optional)
- [ ] Product CSV with images and tags
- [ ] Config YAML with all settings
- [ ] `featured_collection` matches a tag in the CSV
- [ ] Store whitelisted and OAuth completed

### Deploy Commands

```bash
# 1. Get theme ID
spinner theme list -s store.myshopify.com

# 2. Push theme with config
spinner theme push -s store.myshopify.com -c configs/store.yaml -t <theme-id>

# 3. Create products and collections
spinner create -c configs/store.yaml --shop-domain store.myshopify.com
```

### After Deploy

- [ ] Verify featured collection shows products
- [ ] Verify hero image displays (or upload in Shopify admin if not in config)
- [ ] Check social links in footer
- [ ] Test checkout flow

---

## Existing Product CSVs

| File | Genre | Products | Tags |
|------|-------|----------|------|
| `rap-artist.csv` | Hip-hop | 10 | bestseller, black, gold, premium, luxury |
| `pop-band.csv` | Pop | 10 | bestseller, summer, pink, accessories |
| `country-band.csv` | Country | 10 | bestseller, rustic, western |
| `classic-rock-band.csv` | Rock | 10 | bestseller, vintage, rock |

---

## Quick Reference: Store Setup

| Store | Preset | Featured Collection | Status |
|-------|--------|---------------------|--------|
| lil-tax-bracket | boom-bap | bestseller | ✅ Deployed |
| glitter-bomb-evacuation | neon-stage | bestseller | ✅ Deployed |
| trailer-park-shakespeare | honky-tonk | bestseller | Ready |
| mustache-ride-to-freedom | garage | bestseller | Ready |
| pit-viper-funeral | mosh-pit | bestseller | Ready |
| banjo-crimes-unit | front-porch | bestseller | Ready |
