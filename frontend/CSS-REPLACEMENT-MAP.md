# 🎨 CSS VARIABLE REPLACEMENT MAP
# Design System Refactoring - Option C
# Datum: 22. Dezember 2025

## ANLEITUNG
# 1. Öffne styles-cyberpunk.css in VS Code
# 2. Drücke Ctrl+H (Find & Replace)
# 3. Kopiere FIND und REPLACE separat
# 4. Führe jeden Replacement aus
# 5. Teste: npm run build && npm start

---

## 🎨 FARBEN REPLACEMENTS

### Replacement 1: Dark Background
FIND:     --bg-dark
REPLACE:  --color-background

### Replacement 2: Darker Background
FIND:     --bg-darker
REPLACE:  --color-charcoal-700

### Replacement 3: Primary Accent (Teal)
FIND:     --accent-teal
REPLACE:  --color-primary

### Replacement 4: Secondary Accent (Orange)
FIND:     --accent-pink
REPLACE:  --color-accent_orange

### Replacement 5: Primary Text
FIND:     --text-primary
REPLACE:  --color-text_primary

### Replacement 6: Secondary Text
FIND:     --text-secondary
REPLACE:  --color-text_secondary

---

## ⏱️ TRANSITIONS (OPTIONAL)

### Replacement 7: Transition Variable
FIND:     --transition
REPLACE:  --transition-normal (oder einfach: all 0.3s cubic-bezier(0.16, 1, 0.3, 1))

---

## 📋 SCHRITT-FÜR-SCHRITT

### SCHRITT 1: Find & Replace öffnen
```
Drücke: Ctrl+H
```

### SCHRITT 2: Replacement 1 ausführen
```
Find:    --bg-dark
Replace: --color-background
Click:   Replace All (oder einzeln: Alt+Enter)
```

### SCHRITT 3: Replacement 2 ausführen
```
Find:    --bg-darker
Replace: --color-charcoal-700
Click:   Replace All
```

### SCHRITT 4-6: Weitere Replacements
Wiederhole für alle 6 Farben-Replacements oben.

### SCHRITT 7: Alte :root {} löschen
```
In styles-cyberpunk.css:
Finde den Block:
:root {
  --bg-dark: #0a0e1a;
  --bg-darker: #050710;
  --text-primary: #00ffff;
  --text-secondary: #88ddff;
  --accent-teal: #00cc77;
  --accent-pink: #b7410e;
  --transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
}

LÖSCHE diesen kompletten Block!
```

### SCHRITT 8: Neuen Import hinzufügen
```
Am ANFANG von styles-cyberpunk.css, vor allen anderen Styles:

@import '../styles\_design-tokens.css';
```

### SCHRITT 9: Test
```bash
npm run build
# Sollte erfolgreich sein!

npm start
# Öffne https://localhost:5500
# Alles sollte VISUELL GLEICH aussehen!
```

---

## ✅ CHECKLIST

- [ ] Ctrl+H geöffnet
- [ ] Replacement 1: --bg-dark → --color-background
- [ ] Replacement 2: --bg-darker → --color-charcoal-700
- [ ] Replacement 3: --accent-teal → --color-primary
- [ ] Replacement 4: --accent-pink → --color-accent_orange
- [ ] Replacement 5: --text-primary → --color-text_primary
- [ ] Replacement 6: --text-secondary → --color-text_secondary
- [ ] Alte :root {} gelöscht
- [ ] @import '_design-tokens.css'; hinzugefügt
- [ ] npm run build erfolgreich
- [ ] npm start läuft
- [ ] Visuell alles gleich ✅

---

## 🚨 WICHTIG!

Wenn etwas schiefgeht:
```bash
# Undo mit Ctrl+Z
# Oder: git checkout css/styles-cyberpunk.css
```

**Du bist in Kontrolle!** 💪

---

## 📞 WENN DU STUCK BIST

Schreib mir:
- Welcher Schritt?
- Was ist das Problem?
- Screenshot?

