# 🎨 DESIGNER QUICK REFERENCE - UPDATED 22.12.2025

## 🚀 QUICK START (5 MIN)

### Where Are My Design Tokens?
```
frontend/config/design.config.json  ← Main configuration file
frontend/styles/_design-tokens.css  ← Auto-generated CSS variables
```

### How Do I Use Them?
```css
/* In any CSS file, use variables directly: */
color: var(--color-primary);
background: var(--color-background);
padding: var(--space-16);
border-radius: var(--radius-lg);
box-shadow: var(--shadow-md);
```

### How Do I Add New Tokens?
```json
/* Edit: frontend/config/design.config.json */
{
  "colors": {
    "brand_new": "#FF0000"  ← Add here
  }
}

/* Run: npm run build */
/* New variable: --color-brand_new */
```

---

## 🎨 COLOR TOKENS

### Primary Colors
```css
--color-primary: #00CC77           /* Main brand color */
--color-primary_hover: #00B366    /* Hover state */
--color-primary_active: #009933   /* Active/pressed state */
```

### Background Colors
```css
--color-background: #FCF8F9       /* Light mode background */
--color-surface: #FFFFFD          /* Light mode surface/cards */

/* Dark Mode (auto in @media): */
--color-background: #0F1419       /* Dark mode background */
--color-surface: #1A1F2E          /* Dark mode surface */
```

### Text Colors
```css
--color-text_primary: #00ffff     /* Main text (cyan) */
--color-text_secondary: #88ddff   /* Secondary text (light cyan) */
--color-text_muted: #A7A9A9       /* Muted/disabled text */
```

### Accent Colors
```css
--color-accent_teal: #32B8C6      /* Teal accent */
--color-accent_green: #22C55E     /* Green accent */
--color-accent_orange: #E68161    /* Orange accent */
--color-accent_red: #FF5459       /* Red accent */
--color-accent_pink: #FF1493      /* Pink accent */
```

### Status Colors
```css
--color-status_success: #22C55E   /* Success (green) */
--color-status_error: #FF5459     /* Error (red) */
--color-status_warning: #E68161   /* Warning (orange) */
--color-status_info: #32B8C6      /* Info (teal) */
```

### Border Colors
```css
--color-border: rgba(94, 82, 64, 0.2)        /* Default border */
--color-border_focus: rgba(50, 184, 198, 0.4) /* Focus border */
```

---

## 📝 TYPOGRAPHY TOKENS

### Font Families
```css
--font-family-base: "FKGroteskNeue", "Geist", "Inter", ...
--font-family-mono: "Berkeley Mono", monospace
```

### Font Sizes
```css
--font-size-xs: 11px      /* Extra small (labels, badges) */
--font-size-sm: 12px      /* Small (captions) */
--font-size-base: 14px    /* Base (body text) */
--font-size-md: 14px      /* Medium (body text) */
--font-size-lg: 16px      /* Large (subheadings) */
--font-size-xl: 18px      /* Extra large (headings) */
--font-size-2xl: 20px     /* 2XL (main headings) */
--font-size-3xl: 24px     /* 3XL (page titles) */
--font-size-4xl: 30px     /* 4XL (hero titles) */
```

### Font Weights
```css
--font-weight-normal: 400     /* Normal text */
--font-weight-medium: 500     /* Emphasized text */
--font-weight-semibold: 550   /* Strong emphasis */
--font-weight-bold: 600       /* Bold headings */
```

### Line Heights
```css
--line-height-tight: 1.2       /* Compact (headings) */
--line-height-normal: 1.5      /* Normal (body) */
--line-height-relaxed: 1.8     /* Spacious (paragraph text) */
```

---

## 📏 SPACING TOKENS

```css
--space-0: 0          /* No space */
--space-1: 1px        /* Minimal gap */
--space-2: 2px        /* Tiny gap */
--space-4: 4px        /* 4px gap */
--space-6: 6px        /* 6px gap */
--space-8: 8px        /* Small gap (most common) */
--space-10: 10px
--space-12: 12px      /* Medium gap */
--space-16: 16px      /* Standard gap (very common) */
--space-20: 20px
--space-24: 24px      /* Large gap */
--space-32: 32px      /* Extra large */
--space-48: 48px      /* Huge */
--space-64: 64px      /* Massive */
```

**Usage Tips:**
- Margins: `margin: var(--space-16);`
- Padding: `padding: var(--space-12) var(--space-16);`
- Gaps (flexbox): `gap: var(--space-8);`

---

## 🔘 BORDER RADIUS TOKENS

```css
--radius-sm: 6px        /* Subtle curves (inputs) */
--radius-base: 8px      /* Standard curves (buttons) */
--radius-md: 10px       /* Medium curves (cards) */
--radius-lg: 12px       /* Large curves (containers) */
--radius-xl: 16px       /* Extra large curves */
--radius-full: 9999px   /* Circles & pills */
```

---

## ✨ SHADOW TOKENS

```css
--shadow-xs: 0 1px 2px rgba(0, 0, 0, 0.02)
--shadow-sm: 0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.02)
--shadow-md: 0 4px 6px -1px rgba(0, 0, 0, 0.04), 0 2px 4px -1px rgba(0, 0, 0, 0.02)
--shadow-lg: 0 10px 15px -3px rgba(0, 0, 0, 0.04), 0 4px 6px -2px rgba(0, 0, 0, 0.02)
--shadow-xl: 0 20px 25px -5px rgba(0, 0, 0, 0.06), 0 10px 10px -5px rgba(0, 0, 0, 0.02)
```

**Usage:** `box-shadow: var(--shadow-md);`

---

## 📱 RESPONSIVE BREAKPOINTS

```css
--breakpoints:
  mobile: 375px
  tablet: 768px
  desktop: 1024px
  wide: 1280px
  ultrawide: 1920px
```

**Usage:**
```css
@media (min-width: 768px) {
  /* tablet and up styles */
}
```

---

## 🎯 COMPONENT-SPECIFIC TOKENS

### Buttons
```json
{
  "primary": {
    "background": "@ref colors.primary",
    "background_hover": "@ref colors.primary_hover",
    "text_color": "@ref colors.background",
    "padding": "@ref spacing.8 @ref spacing.16"
  }
}
```

### Cards
```json
{
  "background": "@ref colors.surface",
  "border": "1px solid @ref colors.border",
  "border_radius": "@ref radius.lg",
  "padding": "@ref spacing.16",
  "shadow": "@ref shadows.sm"
}
```

### Forms
```json
{
  "input_background": "@ref colors.surface",
  "input_border": "1px solid @ref colors.border",
  "input_border_focus": "2px solid @ref colors.primary",
  "input_padding": "@ref spacing.8 @ref spacing.12"
}
```

### Player
```json
{
  "background": "@ref colors.surface",
  "control_background": "@ref colors.primary",
  "icon_color": "@ref colors.text_primary"
}
```

---

## 🔄 DARK MODE

Dark mode colors are **automatically generated** from the config:

```json
"darkMode": {
  "colors": {
    "primary": "#50D4E8",
    "text_primary": "#00ffff",
    "background": "#0F1419"
  }
}
```

**How it works:**
```css
/* Light mode (default in :root) */
:root {
  --color-primary: #00CC77;
  --color-text_primary: #134252;
}

/* Dark mode (auto in @media) */
@media (prefers-color-scheme: dark) {
  :root {
    --color-primary: #50D4E8;
    --color-text_primary: #E8EAEB;
  }
}
```

**No extra work needed!** Just use variables and dark mode works automatically.

---

## 💡 BEST PRACTICES

### ✅ DO
```css
/* Good: Use design tokens */
button {
  color: var(--color-text_primary);
  background: var(--color-primary);
  padding: var(--space-12) var(--space-16);
  border-radius: var(--radius-base);
}

/* Good: Use utility-friendly patterns */
.card {
  padding: var(--space-16);
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-sm);
}
```

### ❌ DON'T
```css
/* Bad: Hardcoded colors */
button {
  color: #00ffff;
  background: #00CC77;
  padding: 12px 16px;
  border-radius: 8px;
}

/* Bad: Arbitrary values */
.card {
  color: #123456;
  font-size: 15px;
  margin: 13px;
}
```

---

## 🚀 WORKFLOW

### Add a New Color
1. Edit `frontend/config/design.config.json`
2. Add to `colors` object
3. Run `npm run build`
4. Use `var(--color-new_name)` in CSS

### Update an Existing Color
1. Edit `frontend/config/design.config.json`
2. Change the hex value
3. Run `npm run build`
4. Changes apply everywhere automatically!

### Add a New Token Type
1. Add new section to `design.config.json`:
   ```json
   "transitions": {
     "fast": "150ms",
     "normal": "250ms"
   }
   ```
2. Run `npm run build`
3. Use: `transition: all var(--transition-normal) ease;`

---

## 📖 FILE LOCATIONS

| File | Purpose |
|------|---------|
| `frontend/config/design.config.json` | Main config (edit this!) |
| `frontend/styles/_design-tokens.css` | Auto-generated (don't edit!) |
| `frontend/css/styles-cyberpunk.css` | Main stylesheet (uses tokens) |
| `webpack.config.js` | Build config (has loader) |

---

## 🐛 TROUBLESHOOTING

### Variables Not Loading?
```bash
# 1. Rebuild the tokens
npm run build

# 2. Check if file exists
ls frontend/styles/_design-tokens.css

# 3. Verify in browser
getComputedStyle(document.documentElement)
  .getPropertyValue('--color-primary')
```

### Color Wrong After Update?
```bash
# Clear cache and rebuild
npm run build
# Hard refresh: Ctrl+Shift+Delete or Cmd+Shift+Delete
```

### New Token Not Working?
1. Check spelling in `design.config.json`
2. Run `npm run build`
3. Check for typos in CSS (var names are case-sensitive!)
4. Check DevTools console for errors

---

## 📞 QUICK LINKS

- **Config File:** `frontend/config/design.config.json`
- **Generated Tokens:** `frontend/styles/_design-tokens.css`
- **Usage Guide:** `README-START-HERE.md`
- **Full Roadmap:** `DESIGN-SYSTEM-ROADMAP.md`
- **Implementation Status:** `IMPLEMENTATION-CHECKLIST-v2.md`

---

**Last Updated:** 22.12.2025 09:00 CET
**Status:** ✅ Production Ready
**Build:** ✅ Passing