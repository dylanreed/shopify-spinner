# Future Feature Ideas

## Logo Color Extraction Tool

**Idea:** Develop a CLI tool that extracts dominant colors from a provided logo image and generates a theme preset.

**Workflow:**
1. User provides logo image: `spinner extract-colors --logo ./band-logo.png`
2. Tool analyzes image, extracts 3-5 dominant colors
3. Outputs suggested color assignments (primary, secondary, accent, background, text)
4. Can auto-generate a settings_data.json preset

**Potential libraries:**
- `node-vibrant` - Extract prominent colors from images
- `colorthief` - Get dominant color or palette
- `sharp` - Image processing in Node.js

**Example output:**
```
Extracted from: band-logo.png
  Primary:    #d4af37 (gold, 34% coverage)
  Secondary:  #1a1a1a (near-black, 28% coverage)  
  Accent:     #8b0000 (dark red, 12% coverage)
  Background: #0f0f0f (suggested dark)
  Text:       #ffffff (suggested light for contrast)
```

