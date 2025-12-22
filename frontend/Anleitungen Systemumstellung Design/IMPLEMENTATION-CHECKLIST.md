# ✅ SONG-NEXUS Design System – Implementation Checklist

**Project**: Designer-Friendly Design System with WebAuthn Protection  
**Duration**: 6 Weeks  
**Start Date**: Week of 20. Dec 2025

---

## 📅 WEEK 1: Planning & Preparation

### Day 1-2: Documentation Review
- [ ] Read `DESIGN-SYSTEM-ROADMAP.md` (45 min)
- [ ] Review `design.config.json` template (15 min)
- [ ] Understand webpack loader concept (20 min)
- [ ] Check WebAuthn security zones in `ANALYSIS-PART2-JS-MODULES.md` (30 min)

**Checkpoint**: You understand the full architecture

---

### Day 3: Designer Onboarding
- [ ] Schedule 1-hour meeting with designer
- [ ] Share `DESIGNER-QUICK-REF.md`
- [ ] Walk through practical examples (color change, button style)
- [ ] Collect feedback on config structure
- [ ] Ask: Which colors/fonts does your brand need?

**Deliverable**: Designer agrees on config updates

---

### Day 4-5: Repo Setup
- [ ] Create new directories:
  ```bash
  mkdir -p frontend/config
  mkdir -p frontend/webpack
  mkdir -p frontend/styles/{base,components,layout,themes}
  ```
- [ ] Copy files:
  - `design.config.json` → `frontend/config/`
  - `design-config-loader.js` → `frontend/webpack/`
- [ ] Update `.gitignore`:
  ```
  frontend/styles/_design-tokens.css  # Auto-generated
  ```
- [ ] Create `frontend/styles/index.css` (import all)

**Checkpoint**: Folder structure ready

---

## 🛠️ WEEK 2: Webpack Integration

### Day 1: Update webpack.config.js

```javascript
// In webpack.config.js module.rules add:

{
  test: /design\.config\.json$/,
  use: [path.resolve(__dirname, 'webpack/design-config-loader.js')]
}
```

**Test**: Run `npm run build` → No errors

---

### Day 2: First Build

```bash
npm run build
# Check for: frontend/styles/_design-tokens.css (generated)
ls -la frontend/styles/_design-tokens.css
```

- [ ] Build completes without errors
- [ ] `_design-tokens.css` created
- [ ] File contains CSS variables (`:root { --color-primary: ... }`)
- [ ] File size ~3-5KB

**Checkpoint**: Webpack loader works

---

### Day 3: Integrate into HTML/CSS

Update `frontend/styles/index.css`:

```css
/* Import generated tokens first */
@import '_design-tokens.css';

/* Then your components */
@import 'base/typography.css';
@import 'base/reset.css';
@import 'components/buttons.css';
@import 'components/cards.css';
/* ... etc ... */
```

Update `index.html`:
```html
<link rel="stylesheet" href="/styles/index.css">
```

- [ ] CSS imports organized
- [ ] No conflicts with existing styles
- [ ] Page still loads (check browser console)

---

### Day 4-5: Verify Design Tokens

Test that tokens work:

```bash
npm run build
npm start
# Visit: https://localhost:5500
# Open DevTools → Elements → <html> → Inspect :root
```

**Check**:
- [ ] `--color-primary` visible in DevTools
- [ ] `--space-16` visible
- [ ] `--font-size-base` visible
- [ ] All tokens from config present

**Checkpoint**: Tokens are live!

---

## 🎨 WEEK 3: CSS Refactoring Phase 1

### Day 1-2: Buttons Refactor

In `frontend/styles/components/buttons.css`:

**Before**:
```css
.button {
  padding: 12px 24px;
  background: linear-gradient(135deg, #00cc77, #b7410e);
  color: #0a0e1a;
  border-radius: 4px;
}
```

**After**:
```css
.button {
  padding: var(--space-12) var(--space-24);
  background: linear-gradient(
    135deg,
    var(--color-accent-teal),
    var(--color-accent-pink)
  );
  color: var(--color-background);
  border-radius: var(--radius-base);
}
```

**Test**:
- [ ] Buttons still render correctly
- [ ] Colors match original
- [ ] npm run build succeeds
- [ ] DevTools shows `var(--...)` being used

---

### Day 3: Cards & Forms Refactor

Same pattern for:
- [ ] `components/cards.css` → Replace hardcoded colors/spacing
- [ ] `components/forms.css` → Replace input styles with tokens
- [ ] Any other component files

---

### Day 4: Typography Refactor

In `base/typography.css`:

```css
body {
  font-family: var(--font-family-base);
  font-size: var(--font-size-base);
  line-height: var(--line-height-normal);
  color: var(--color-text-primary);
}

h1 {
  font-size: var(--font-size-4xl);
  font-weight: var(--font-weight-bold);
  line-height: var(--line-height-tight);
}
```

- [ ] All font sizes use tokens
- [ ] All font weights use tokens
- [ ] Line heights defined

---

### Day 5: Final CSS Test

```bash
npm run build
npm start
# Visit: https://localhost:5500
# Test: Change a color in design.config.json, rebuild
```

**Verify**:
- [ ] Page renders correctly
- [ ] Colors updated when config changes
- [ ] No hardcoded colors remain
- [ ] Bundle size unchanged (~83KB)

**Checkpoint**: CSS fully tokenized!

---

## 🧩 WEEK 4: JS Module Refactoring

### Day 1: Identify Hardcoded Styles in JS

Search for hardcoded colors/spacing in modules:

```bash
grep -r "style\." frontend/js/ | grep -E "(color|padding|margin|fontSize)"
grep -r "#[0-9a-f]" frontend/js/ | grep -v "//"
```

Examples to find:
```javascript
// ❌ BAD
element.style.backgroundColor = '#00cc77';
element.style.padding = '16px';

// ✅ GOOD
element.className = 'track-card'; // CSS handles styling
```

- [ ] Found all inline styles
- [ ] Listed problematic modules
- [ ] Prioritized by impact

---

### Day 2-3: Refactor tracks.js

In `frontend/js/tracks.js`:

**Before**:
```javascript
function createTrackCard(track) {
  const card = document.createElement('div');
  card.className = 'track-card';
  card.innerHTML = `
    <div class="track-title">${track.name}</div>
    <div class="track-artist">${track.artist}</div>
  `;
  return card;
}
```

**After** (same!):
```javascript
// No changes needed if using CSS classes
// Just ensure CSS uses design tokens
```

**Focus**: Make sure CSS classes are used, not inline styles

- [ ] Removed all `element.style.color = ...`
- [ ] Removed all `element.style.padding = ...`
- [ ] Prefer CSS classes with token-based styles

---

### Day 4: Refactor ui.js

Similar process:
- [ ] Remove inline style assignments
- [ ] Use CSS classes
- [ ] Let CSS handle styling (with tokens)

---

### Day 5: Test All Modules

```bash
npm run build
npm start
# Test: Each major feature
```

- [ ] Tracks render correctly
- [ ] Auth UI looks good
- [ ] Player renders
- [ ] No console errors
- [ ] Performance unchanged

**Checkpoint**: JS modules refactored!

---

## 🧪 WEEK 5: Testing & Optimization

### Day 1-2: Functional Testing

**Checklist**:

**Authentication**:
- [ ] Biometric login works (WebAuthn)
- [ ] Password login works
- [ ] Magic link flow works
- [ ] Logout works

**Tracks**:
- [ ] Tracks display correctly
- [ ] Pagination works
- [ ] Search/filter works
- [ ] Track cards styled properly

**Player**:
- [ ] Player opens/closes
- [ ] Play/pause works
- [ ] Volume control works
- [ ] Draggable works

**Responsive**:
- [ ] Desktop (1920px)
- [ ] Tablet (768px)
- [ ] Mobile (375px)

---

### Day 3: Designer Testing

Have designer modify config and test:

```json
// In design.config.json
"primary": "#8B5CF6"  // Change to purple
"primary_hover": "#7C3AED"
"primary_active": "#6D28D9"
```

```bash
npm run build
npm start
```

**Check**:
- [ ] All primary buttons change color
- [ ] Designer sees instant feedback
- [ ] No breaking changes
- [ ] Config changes are reversible

---

### Day 4: Performance Check

```bash
npm run build
# Check bundle size
ls -lh frontend/dist/app.bundle.js
# Should be ~83KB (same as before)

# Browser DevTools Performance tab
npm start
# Visit page, check Lighthouse score
```

- [ ] Bundle size ≤ 85KB
- [ ] Page load time < 3 seconds
- [ ] Lighthouse score ≥ 90

---

### Day 5: Security Audit

**Critical**:
- [ ] WebAuthn still works after all changes
- [ ] Token management intact
- [ ] No auth flows broken
- [ ] No localStorage issues

```bash
# Manual test
npm start
# Try biometric login on device that supports it
# If not available, password login must work
```

- [ ] At least one auth method works
- [ ] Session persists across page reload
- [ ] Logout clears session

**Checkpoint**: Everything tested & working!

---

## 📦 WEEK 6: Documentation & Launch

### Day 1-2: Create Designer Documentation

Create `DESIGNER-GUIDE-FINAL.md`:

```markdown
# How to Change SONG-NEXUS Visual Design

## Quick Start
1. Open: `frontend/config/design.config.json`
2. Change values you want to modify
3. Ask developer to run: `npm run build`
4. Visit: https://localhost:5500 to preview

## Example: Change Button Color
Find: "primary": "#32B8C6"
Change to: "primary": "#YOUR-HEX-COLOR"
```

- [ ] Document all config sections
- [ ] Include screenshots of config file
- [ ] Provide copy/paste examples
- [ ] List do's & don'ts

---

### Day 3: Create Developer Documentation

Create `DEVELOPER-GUIDE-FINAL.md`:

```markdown
# Design System for Developers

## Folder Structure
- frontend/config/design.config.json (DO NOT EDIT)
- frontend/webpack/design-config-loader.js (DO NOT EDIT)
- frontend/styles/_design-tokens.css (AUTO-GENERATED)
- frontend/styles/components/*.css (USE TOKENS)

## Using Design Tokens
.button {
  background: var(--color-primary);
  padding: var(--space-16);
}

## Making Changes
1. Designer changes design.config.json
2. Run: npm run build
3. Changes auto-apply
4. Test thoroughly
```

- [ ] Document all conventions
- [ ] Include code examples
- [ ] Explain update flow
- [ ] Link to this checklist

---

### Day 4: Create Maintenance Guide

`MAINTENANCE.md`:

```markdown
# Design System Maintenance

## Weekly
- [ ] Designer reviews visual consistency
- [ ] Check for style inconsistencies
- [ ] Test on multiple devices

## Monthly
- [ ] Update design tokens if brand changes
- [ ] Review config for unused tokens
- [ ] Check bundle size

## Quarterly
- [ ] Review module dependencies
- [ ] Look for optimization opportunities
- [ ] Plan new component additions
```

---

### Day 5: Launch & Monitor

**Pre-Launch Checklist**:
- [ ] All tests passing
- [ ] Designer approved visuals
- [ ] Security audit passed
- [ ] Performance baseline established
- [ ] Documentation complete
- [ ] Team trained
- [ ] Backup created

**Post-Launch (Week 7+)**:
- [ ] Monitor for issues
- [ ] Collect designer feedback
- [ ] Plan next features
- [ ] Schedule monthly reviews

---

## 🎯 Success Criteria

After 6 weeks, you should have:

| Criterion | Checklist |
|-----------|-----------|
| **Designer Autonomy** | Designer can change colors/fonts without asking |
| **Code Quality** | All hardcoded colors/spacing removed |
| **Security** | WebAuthn 100% intact, no regressions |
| **Performance** | Bundle ≤ 85KB, load time < 3s |
| **Documentation** | Designer + dev guides complete |
| **Testing** | All features tested, no bugs |
| **Maintainability** | Design tokens as single source of truth |

---

**Version**: 1.0  
**Created**: 20. Dezember 2025  
**Duration**: 6 weeks  
**Status**: Ready to start
