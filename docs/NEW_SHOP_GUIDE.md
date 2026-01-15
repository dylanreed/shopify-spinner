# Creating a New Shop

Complete guide for setting up a new Shopify store with Spinner.

---

## Quick Start Checklist

Before you begin, gather these items:

- [ ] Store name and email
- [ ] Logo file (PNG with transparency)
- [ ] Hero/banner image (JPG, 1920x1080+)
- [ ] Product images (square, 800x800+)
- [ ] Product details (names, descriptions, prices)
- [ ] Social media links
- [ ] Shopify store created and whitelisted

---

## 1. Assets Required

### Logo

| Spec | Requirement |
|------|-------------|
| Format | PNG (transparent background preferred) |
| Width | 150-300px (configurable via `logo_width`) |
| Height | Proportional, typically 50-150px |
| Location | `assets/logos/<store-name>.png` |

**Tips:**
- Use vector source if available for clean scaling
- Ensure logo works on both light and dark backgrounds
- Keep file size under 500KB

### Hero Image

| Style | Dimensions | Aspect Ratio | Notes |
|-------|------------|--------------|-------|
| full-bleed | 1920 x 1080px minimum | 16:9 or wider | Main background, text overlays |
| split | 960 x 720px | 4:3 | Side-by-side with content |
| video | N/A | 16:9 | Use video URL instead |

| Spec | Requirement |
|------|-------------|
| Format | JPG or PNG |
| Location | `assets/heroes/<store-name>.jpg` |
| File size | Under 2MB recommended |

**Tips:**
- Use high contrast images that work with text overlay
- Avoid busy patterns that compete with headlines
- Consider how image crops on mobile (center-focused works best)

### Product Images

| Spec | Requirement |
|------|-------------|
| Format | JPG or PNG |
| Dimensions | 800 x 800px minimum (square) |
| Aspect ratio | 1:1 (square) recommended |
| Background | White or transparent preferred |
| Hosting | Must be publicly accessible URLs |

**Tips:**
- Consistent lighting across all products
- Same background style for cohesive look
- Show product clearly, minimal props

---

## 2. Product CSV Format

### File Location
`products/<store-name>.csv`

### Required Columns

```csv
handle,title,description,vendor,type,tags,price,image_url
```

### All Columns

| Column | Required | Description | Example |
|--------|----------|-------------|---------|
| `handle` | Yes | URL slug (lowercase, hyphens) | `gold-logo-tee` |
| `title` | Yes | Product name | `Gold Logo Tee` |
| `description` | Yes | Product description (HTML OK) | `Premium cotton tee...` |
| `vendor` | Yes | Brand/artist name | `Artist Name` |
| `type` | Yes | Product category | `T-Shirts` |
| `tags` | Yes | Semicolon-separated tags | `bestseller;black;cotton` |
| `price` | Yes | Decimal price | `34.99` |
| `compare_at_price` | No | Original price (for sales) | `44.99` |
| `sku` | No | Stock keeping unit | `GLT-BLK-M` |
| `inventory_qty` | No | Stock quantity | `100` |
| `weight` | No | Product weight | `0.5` |
| `weight_unit` | No | Weight unit | `lb` |
| `image_url` | Yes | Full URL to product image | `https://...` |
| `variant_option1_name` | No | Variant option name | `Size` |
| `variant_option1_value` | No | Variant option value | `Medium` |

### Example CSV

```csv
handle,title,description,vendor,type,tags,price,compare_at_price,sku,inventory_qty,weight,weight_unit,image_url,variant_option1_name,variant_option1_value
gold-logo-tee,Gold Logo Tee,Premium heavyweight cotton tee with embroidered gold logo.,Artist Name,T-Shirts,bestseller;black;premium,44.99,,GLT-001,100,0.5,lb,https://example.com/gold-tee.jpg,Size,Medium
tour-hoodie,2024 Tour Hoodie,Limited edition hoodie from the summer tour.,Artist Name,Hoodies,bestseller;tour;limited,89.99,99.99,TH-001,50,1.2,lb,https://example.com/hoodie.jpg,Size,Large
```

### Tags Strategy

Tags become smart collections automatically. Use these conventions:

| Tag Type | Examples | Purpose |
|----------|----------|---------|
| Featured | `bestseller`, `featured`, `new` | Homepage featured collection |
| Category | `apparel`, `accessories`, `music` | Navigation/filtering |
| Attribute | `black`, `white`, `cotton`, `vinyl` | Product filtering |
| Season | `summer`, `winter`, `tour-2024` | Seasonal collections |
| Status | `limited`, `exclusive`, `sale` | Urgency/scarcity |

**Important:** Include `bestseller` tag on 4-8 products for the featured collection.

---

## 3. Theme Presets

### Overview

| Preset | Vibe | Best For |
|--------|------|----------|
| `penthouse` | Luxury, upscale, dark | Hip-hop, R&B, luxury brands |
| `mosh-pit` | Aggressive, bold, intense | Metal, punk, hardcore |
| `honky-tonk` | Warm, rustic, authentic | Country, folk, americana |
| `neon-stage` | Bright, energetic, fun | Pop, EDM, dance |
| `front-porch` | Earthy, organic, calm | Acoustic, indie, singer-songwriter |
| `boom-bap` | Urban, street, bold | Hip-hop, rap, streetwear |
| `garage` | Raw, DIY, rebellious | Rock, garage, punk |
| `gallery` | Minimal, clean, artistic | Art, photography, minimal |

### Preset Details

#### Penthouse
- **Fonts:** Oswald (headings) / Inter (body)
- **Colors:** Dark background, gold accents
- **Feel:** Nightclub, luxury, exclusive
- **Use for:** Upscale artists, premium merch

#### Mosh Pit
- **Fonts:** Bebas Neue (headings) / Roboto Mono (body)
- **Colors:** Black, red, chrome
- **Feel:** Aggressive, intense, underground
- **Use for:** Metal, hardcore, punk bands

#### Honky Tonk
- **Fonts:** Playfair Display (headings) / Source Sans (body)
- **Colors:** Cream, brown, warm tones
- **Feel:** Authentic, handcrafted, down-to-earth
- **Use for:** Country, folk, americana artists

#### Neon Stage
- **Fonts:** Poppins (headings) / Inter (body)
- **Colors:** White background, pink/cyan gradients
- **Feel:** Bright, fun, youthful
- **Use for:** Pop artists, EDM, dance acts

#### Front Porch
- **Fonts:** Lora (headings) / Open Sans (body)
- **Colors:** Earth tones, natural palette
- **Feel:** Warm, inviting, organic
- **Use for:** Acoustic, indie folk, singer-songwriters

#### Boom Bap
- **Fonts:** Archivo Black (headings) / Space Grotesk (body)
- **Colors:** Dark background, neon green accents
- **Feel:** Urban, street, bold
- **Use for:** Hip-hop, rap, urban artists

#### Garage
- **Fonts:** Rock Salt (headings) / Nunito (body)
- **Colors:** Black, white, red accents
- **Feel:** Raw, DIY, hand-drawn
- **Use for:** Rock bands, garage rock, DIY artists

#### Gallery
- **Fonts:** Cormorant Garamond (headings) / Montserrat (body)
- **Colors:** White, minimal, blue accents
- **Feel:** Clean, artistic, sophisticated
- **Use for:** Visual artists, photographers, minimal brands

---

## 4. Config File Structure

### Location
`configs/<store-name>.yaml`

### Complete Template

```yaml
# Store Information
store:
  name: "Artist Name"              # Used for theme naming
  email: "contact@artist.com"      # Required

# Theme Configuration
theme:
  source: spinner
  settings:
    # Choose one preset (see preset guide above)
    preset: boom-bap

    # Logo
    logo: ../assets/logos/artist-name.png
    logo_width: 180                # 50-300px

    # Optional: Auto-generate colors from logo
    # extract_colors_from_logo: true

    # Optional: Override accent color
    # accent_override: "#ff5500"

    # Optional: Layout overrides
    # layout_style: standard       # standard | editorial | bold
    # navigation_style: topbar     # topbar | hamburger | sidebar
    # animation_level: subtle      # none | subtle | dynamic

    # Content
    content:
      hero_heading: "Artist Name"
      hero_subheading: "Official Merch Store"
      hero_image: ../assets/heroes/artist-name.jpg
      hero_button_text: "Shop Now"
      # hero_button_link: "/collections/all"  # Defaults to featured collection
      tagline: "\"Music is life\""
      featured_collection: bestseller

    # Social Links (include what applies)
    social:
      instagram: https://instagram.com/artistname
      twitter: https://twitter.com/artistname
      youtube: https://youtube.com/@artistname
      tiktok: https://tiktok.com/@artistname
      spotify: https://open.spotify.com/artist/xxx

# Products
products:
  source: ../products/artist-name.csv
  create_collections: true

# Store Settings
settings:
  currency: USD
  timezone: America/Los_Angeles
  shipping:
    domestic_flat_rate: 5.99
    free_shipping_threshold: 50
```

---

## 5. Deployment Steps

### Prerequisites

1. **Shopify store created** at `<store-name>.myshopify.com`
2. **Store whitelisted:**
   ```bash
   spinner whitelist add <store-name>.myshopify.com
   ```
3. **OAuth completed:**
   - Start auth server: `spinner auth serve`
   - Visit: `http://localhost:3000/auth?shop=<store-name>.myshopify.com`
   - Complete OAuth flow in browser

### Deploy Commands

```bash
# 1. Validate config (optional but recommended)
spinner validate -c configs/<store-name>.yaml

# 2. Get theme ID
spinner theme list -s <store-name>.myshopify.com

# 3. Push theme
spinner theme push \
  -s <store-name>.myshopify.com \
  -c configs/<store-name>.yaml \
  -t <theme-id>

# 4. Create products and collections
spinner create \
  -c configs/<store-name>.yaml \
  --shop-domain <store-name>.myshopify.com
```

### Post-Deployment Checklist

- [ ] Visit store and verify theme loads
- [ ] Check hero section displays correctly
- [ ] Verify featured collection shows products (not placeholders)
- [ ] Test navigation and footer links
- [ ] Check social links work
- [ ] Add any additional hero images via Shopify admin if needed
- [ ] Test add-to-cart and checkout flow
- [ ] Verify mobile responsiveness

---

## 6. Troubleshooting

### Featured Collection Shows Placeholders

**Cause:** Collections not published to Online Store sales channel.

**Fix:** Collections are auto-published with `spinner create`. If manually created, publish via Shopify admin: Sales channels > Online Store.

### Hero Image Not Showing

**Cause:** Image path incorrect or file missing.

**Fixes:**
1. Verify path in config is relative to config file location
2. Check file exists at specified path
3. After push, verify `hero-bg.jpg` exists in theme assets

### Logo Not Appearing

**Cause:** Logo path incorrect.

**Fix:**
1. Check path is relative to config file
2. Verify file exists
3. Check `logo_width` is reasonable (50-300)

### Products Not Creating

**Cause:** CSV format issues or missing required fields.

**Fixes:**
1. Ensure all required columns present
2. Check for special characters in descriptions (escape quotes)
3. Verify image URLs are publicly accessible

### OAuth Errors

**Cause:** Store not whitelisted or token expired.

**Fixes:**
1. Run `spinner whitelist add <store>.myshopify.com`
2. Re-run OAuth flow
3. Check token store for valid token

---

## 7. File Structure Reference

```
shopify-spinner/
├── assets/
│   ├── logos/
│   │   └── <store-name>.png
│   └── heroes/
│       └── <store-name>.jpg
├── configs/
│   ├── _example.yaml           # Template
│   └── <store-name>.yaml       # Your config
├── products/
│   └── <store-name>.csv        # Product data
└── themes/
    └── spinner/                # Theme source
        └── previews/           # HTML previews
            └── index.html      # View all presets
```

---

## 8. Quick Reference Card

### Image Sizes
| Asset | Size | Format |
|-------|------|--------|
| Logo | 150-300px wide | PNG |
| Hero (full-bleed) | 1920x1080px | JPG |
| Hero (split) | 960x720px | JPG |
| Products | 800x800px | JPG/PNG |

### Required CSV Columns
`handle`, `title`, `description`, `vendor`, `type`, `tags`, `price`, `image_url`

### Key Tags
- `bestseller` - Featured collection
- Product attributes for filtering

### Commands
```bash
spinner whitelist add STORE.myshopify.com
spinner auth serve
spinner theme list -s STORE.myshopify.com
spinner theme push -s STORE -c CONFIG -t THEME_ID
spinner create -c CONFIG --shop-domain STORE
```

---

## 9. Support

For issues or questions:
- Check `docs/DEPLOYMENT_GUIDE.md` for detailed deployment info
- View theme previews at `themes/spinner/previews/index.html`
- Review example configs in `configs/` directory
