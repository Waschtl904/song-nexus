# 🎨 SONG-NEXUS Designer Quick Reference

### 📂 Where to Make Changes

**Config-Datei öffnen:**
```
frontend/config/design.config.json
```

Das ist DEIN Spielplatz! 👇

---

## 1️⃣ Farben ändern

### 📍 Wo sind die Farben definiert?
```json
{
  "colors": {
    "primary": "#32B8C6",           ← Primary Button, Links
    "primary_hover": "#2FA6B2",     ← Mouse-over
    "primary_active": "#1A7073",    ← Click
    
    "secondary": "#5E5240",         ← Secondary Buttons
    "accent_teal": "#32B8C6",       ← Highlights
    "accent_red": "#FF5459",        ← Error/Delete
    "accent_green": "#22C55E",      ← Success
    
    "text_primary": "#134252",      ← Main Text
    "text_secondary": "#626C71",    ← Smaller Text
    "background": "#FCF8F9",        ← Page Background
    "surface": "#FFFFFD"            ← Cards/Modals
  }
}
```

### 🔄 Use Case: Button-Farbe ändern von Teal zu Purple
```json
// Vorher:
"primary": "#32B8C6",
"primary_hover": "#2FA6B2",
"primary_active": "#1A7073",

// Nachher:
"primary": "#8B5CF6",           ← Neue Farbe (Purple)
"primary_hover": "#7C3AED",     ← Slightly darker (Hover)
"primary_active": "#6D28D9",    ← Still darker (Active)
```

**Dann:** `npm run build` → Alle Primary-Buttons sind purple! ✨

---

## 2️⃣ Schriftarten ändern

### 📍 Typography Section
```json
{
  "typography": {
    "font_family_base": "\"JetBrains Mono\", monospace",
    "font_sizes": {
      "sm": "12px",       ← Klein (Labels)
      "base": "14px",     ← Standard
      "lg": "16px",       ← Groß (Titles)
      "3xl": "24px"       ← Sehr groß (Headers)
    },
    "font_weights": {
      "normal": 400,      ← Regular
      "medium": 500,      ← Semi-bold
      "bold": 600         ← Bold
    }
  }
}
```

### 🔄 Use Case: Alle Text größer machen
```json
"font_sizes": {
  "base": "16px",      ← Statt 14px (größer)
  "lg": "18px",        ← Statt 16px
  "3xl": "28px"        ← Statt 24px
}
```

---

## 3️⃣ Abstände & Padding ändern

### 📍 Spacing Section
```json
{
  "spacing": {
    "4": "4px",         ← Micro-Spacing
    "8": "8px",         ← Small
    "16": "16px",       ← Standard
    "24": "24px",       ← Large
    "32": "32px"        ← Extra large
  }
}
```

### 🔄 Use Case: Buttons haben mehr Innenabstand
```json
"components": {
  "buttons": {
    "primary": {
      "padding": "12px 20px"    ← Statt "8px 16px" (größer)
    }
  }
}
```

---

## 4️⃣ Button-Varianten definieren

### 📍 Components Section
```json
{
  "components": {
    "buttons": {
      "primary": {
        "background": "#32B8C6",
        "text_color": "#FFFFFD",
        "padding": "8px 16px",
        "border_radius": "8px",
        "font_weight": 500
      },
      "secondary": {
        "background": "#5E5240",
        "text_color": "#134252",
        ...
      }
    }
  }
}
```

### 🔄 Use Case: Neue "Danger" Button-Variante (Rot für Delete)
```json
"components": {
  "buttons": {
    // ... existing buttons ...
    
    "danger": {
      "background": "#FF5459",        ← Rot
      "background_hover": "#E63946",  ← Darker rot
      "text_color": "#FFFFFD",
      "padding": "8px 16px",
      "border_radius": "8px"
    }
  }
}
```

Developer nutzt dann:
```html
<button class="btn btn--danger">Delete Account</button>
```

---

## 5️⃣ Dark Mode / Light Mode

### 🌙 Automatisch nach Browser-Einstellung
```json
// Wird automatisch angewendet wenn:
// - User Windows "Dark Mode" hat
// - User macOS "Dark Appearance" hat
```

**Dann sieht der Browser automatisch die Dark Mode Farben!**

---

## 6️⃣ Card-Designs (für Track-Cards)

### 📍 Components.cards
```json
"cards": {
  "background": "#FFFFFD",                    ← Hintergrund
  "border": "1px solid rgba(94, 82, 64, 0.2)",  ← Rahmen
  "border_radius": "12px",                    ← Ecken-Rundung
  "padding": "16px",                          ← Innenabstand
  "shadow": "0 1px 3px rgba(0, 0, 0, 0.04)"  ← Schatten
}
```

### 🔄 Use Case: Größere Schatten für Cards (3D-Effekt)
```json
"cards": {
  "shadow": "0 10px 15px -3px rgba(0, 0, 0, 0.1)"  ← Viel größerer Schatten
}
```

---

## 7️⃣ Form-Input Styles

### 📍 Components.forms
```json
"forms": {
  "input_background": "#FFFFFD",                    ← Background
  "input_border": "1px solid rgba(94, 82, 64, 0.2)",  ← Border
  "input_border_focus": "2px solid rgba(50, 184, 198, 0.4)",  ← Focus
  "input_padding": "8px 12px",                      ← Innenabstand
  "input_border_radius": "8px"                      ← Ecken
}
```

---

## ⚠️ WICHTIG: Was NICHT ändern!

### 🔒 SPERR-ZONEN (Developer-Only)

❌ **NICHT anpassen:**
- `js/auth.js` – WebAuthn/Biometric Login
- `js/tracks.js` – Track-Rendering
- `js/tracks-loader.js` – Performance-kritisch
- WebAuthn Event-Handlers in `main.js`

Diese sind **kryptografisch signiert**. Änderungen brechen das Login-System! 🚫

---

## 📋 Checkliste: Config-Änderungen

- [ ] Design.config.json geöffnet
- [ ] Farbe/Größe/Font angepasst
- [ ] JSON-Syntax ok (keine Fehler)?
- [ ] `npm run build` ausgeführt
- [ ] https://localhost:5500 aktualisiert
- [ ] Änderung sichtbar?

---

## 🐛 Häufige Probleme

### Problem: Änderung zeigt sich nicht

**Lösung:**
```bash
npm run build          # Webpack neu bauen
npm start              # Server neu starten
# Browser: Strg+F5 (Hard Refresh)
```

### Problem: JSON-Fehler beim Build

**Typisch:** Fehlende Komma
```json
// ❌ FALSCH:
"primary": "#32B8C6"
"primary_hover": "#2FA6B2"

// ✅ RICHTIG:
"primary": "#32B8C6",
"primary_hover": "#2FA6B2"
```

### Problem: Hex-Farbe ungültig

**Typisch:** Nur 3 Stellen statt 6
```
❌ "#F00"     ← Ungültig
✅ "#FF0000"  ← Richtig
```

---

## 📞 FAQ

**F: Kann ich HSL-Farben verwenden statt Hex?**  
A: Nein, nur Hex oder rgba() für jetzt.

**F: Wie änder ich den Player-Style?**  
A: `"components": { "player": { ... } }`

**F: Können Farben animiert sein?**  
A: Nein. Config definiert nur statische Werte. Für Animationen muss Developer CSS anpassen.

**F: Wie viele Button-Varianten kann ich machen?**  
A: Beliebig viele! Jede wird ein neuer Block unter `"buttons": { ... }`

---

## 🎨 Design System Export

Nach `npm run build` wird folgende Datei generiert:

```
frontend/styles/_design-tokens.css
```

Diese Datei ist **automatisch generiert** von deiner Config. 
Nicht direkt bearbeiten! 👉 Nur `design.config.json` ändern.

---

**Version**: 1.0  
**Für**: Designer  
**Letzte Änderung**: 20. Dezember 2025
