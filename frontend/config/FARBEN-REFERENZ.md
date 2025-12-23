# 🎨 SONG-NEXUS FARBSYSTEM
## Vollständige Farbreferenz für Designer

**Version:** 1.0  
**Zuletzt aktualisiert:** 22.12.2025  
**Autor:** SONG-NEXUS Design Team

---

## 📌 SCHNELLEINSTIEG

Alle Farben findest du in: **`design.config.json`** → **`"colors"`**

```json
"colors": {
  "primary": "#00CC77",
  "accent_red": "#FF5459",
  ...
}
```

Wenn du eine Farbe änderst, muss der Developer danach nur `npm run build` ausführen. ✅

---

## 🎨 PRIMÄRFARBEN (Primary Colors)

Diese Farben sind die **Hauptfarben** des Systems und werden am meisten verwendet.

### 🟢 Primary Green (Haupt-Akzent)

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **primary** | `#00CC77` | rgb(0, 204, 119) | Buttons, Links, CTA, aktive Zustände |
| **primary_hover** | `#00B366` | rgb(0, 179, 102) | Hover-Zustand von Buttons |
| **primary_active** | `#009933` | rgb(0, 153, 51) | Active/geklickter Zustand |

**Wo wird es verwendet:**
- ✅ Primäre Action-Buttons
- ✅ Hover-Effekte
- ✅ Active/Selected-Zustände
- ✅ Highlight-Elemente
- ✅ Call-to-Action Bereiche

---

### 🟤 Brown / Secondary Colors

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **secondary** | `#5E5240` | rgb(94, 82, 64) | Sekundäre Buttons, weniger wichtige Aktionen |
| **secondary_hover** | `#6B624F` | rgb(107, 98, 79) | Hover-Zustand von sekundären Buttons |

**Wo wird es verwendet:**
- ✅ Sekundäre Action-Buttons
- ✅ Alternative Aktionen
- ✅ Weniger prominente UI-Elemente
- ✅ Hover-Zustände

---

## 🎯 AKZENTFARBEN (Accent Colors)

Diese Farben sind für **spezifische Zwecke** gedacht und werden gezielt eingesetzt.

### 🔵 Teal Accent

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **accent_teal** | `#32B8C6` | rgb(50, 184, 198) | Info, Highlights, spezielle Effekte |

**Wo wird es verwendet:**
- ℹ️ Info-Meldungen
- ✨ Besondere Highlights
- 🎯 Fokus-Zustände
- 📍 Spezielle Markierungen

---

### 🟢 Bright Green (Success)

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **accent_green** | `#22C55E` | rgb(34, 197, 94) | Erfolgs-Meldungen, positive Aktionen |

**Wo wird es verwendet:**
- ✅ Erfolgs-Benachrichtigungen
- ✅ Bestätigungen
- ✅ "OK" / "Akzeptieren" Buttons
- ✅ Positive Feedback

---

### 🔴 Red (Error)

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **accent_red** | `#FF5459` | rgb(255, 84, 89) | Fehler, Warnungen, Löschen, Ablehnung |

**Wo wird es verwendet:**
- ❌ Fehler-Meldungen
- ⚠️ Validierungs-Fehler
- 🗑️ Löschen-Aktionen
- ❌ Ablehnung/Nein

---

### 🟠 Orange (Warning)

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **accent_orange** | `#E68161` | rgb(230, 129, 97) | Warnungen, Achtung, vorsichtige Aktionen |

**Wo wird es verwendet:**
- ⚠️ Warn-Meldungen
- ⚡ Achtung/Vorsicht
- 🔔 Wichtige Hinweise
- ⏱️ Zeitlimitierungen

---

### 💗 Pink (Highlight)

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **accent_pink** | `#FF1493` | rgb(255, 20, 147) | Spezielle Highlights, Favoriten |

**Wo wird es verwendet:**
- ⭐ Favoriten
- 💗 "Gefällt mir" Funktionen
- ✨ Spezielle Highlights
- 🎯 Featured Content

---

## 📋 STATUS-FARBEN (Semantic Colors)

Diese Farben folgen der **universellen Konvention** für Status-Meldungen.

| Name | Hex-Code | Bedeutung |
|------|----------|----------|
| **status_success** | `#22C55E` | ✅ Erfolg, OK, bestätigt |
| **status_error** | `#FF5459` | ❌ Fehler, Warnung, Problem |
| **status_warning** | `#E68161` | ⚠️ Warnung, Achtung erforderlich |
| **status_info** | `#32B8C6` | ℹ️ Information, Hinweis |

---

## 🎨 HINTERGRUND & OBERFLÄCHEN

Diese Farben definieren die **Basis-Struktur** der Website (Hintergründe, Karten, etc.).

### Helle Varianten (Light Mode)

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **background** | `#FCF8F9` | rgb(252, 248, 249) | Seiten-Hintergrund (Haupt-BG) |
| **surface** | `#FFFFFD` | rgb(255, 255, 253) | Karten, Modals, Container |

**Unterschied:**
- `background` = ganz heller Seiten-Hintergrund
- `surface` = noch heller, für Karten/Boxen darauf

---

## 🔤 TEXT-FARBEN

Diese Farben sind für **Text und Typografie** reserviert.

### Cyan/Teal (Cyberpunk-Style)

| Name | Hex-Code | RGB | Verwendung |
|------|----------|-----|-----------|
| **text_primary** | `#00ffff` | rgb(0, 255, 255) | Haupttext, Überschriften |
| **text_secondary** | `#88ddff` | rgb(136, 221, 255) | Sekundärtext, Beschreibungen |
| **text_muted** | `#A7A9A9` | rgb(167, 169, 169) | Deaktivierter/schwacher Text |

---

## 🎯 BORDER & FOCUS

Diese Farben sind für **Grenzen und Fokus-Zustände**.

| Name | Wert | Verwendung |
|------|------|-----------|
| **border** | `rgba(94, 82, 64, 0.2)` | Standard Border für Cards, Inputs |
| **border_focus** | `rgba(50, 184, 198, 0.4)` | Fokus-Ring (beim Klick auf Input-Felder) |

---

## 🌙 DARK MODE FARBEN

Im Dunkelmodus werden folgende Farben **automatisch** angewendet:

```json
"darkMode": {
  "colors": {
    "primary": "#00CC77",          // Bleibt gleich (Grün ist neutral)
    "primary_hover": "#00B366",    // Bleibt gleich
    "primary_active": "#009933",   // Bleibt gleich
    "secondary": "#8B7B6D",        // Heller braun für Dunkel
    "background": "#0F1419",       // Sehr dunkles Blau-Grau
    "surface": "#1A1F2E",          // Dunkelblau für Cards
    "text_primary": "#00ffff",     // Cyan bleibt für Kontrast
    "text_secondary": "#88ddff",   // Helles Cyan bleibt
    "text_muted": "#6B7076",       // Heller Grau
    "border": "rgba(232, 234, 235, 0.15)" // Hell für dunklen BG
  }
}
```

**Automatische Umschaltung:** Der Browser erkennt die System-Einstellung (Windows/Mac Dunkel-Modus) und wechselt automatisch! 🌓

---

## 🔄 WIE ÄNDERST DU EINE FARBE?

### Schritt 1: Datei öffnen

Öffne: **`design.config.json`**

### Schritt 2: Die richtige Farbe finden

Suche nach der Farbe in der `"colors"` Sektion:

```json
"colors": {
  "primary": "#00CC77",     ← Diese Zeile!
  ...
}
```

### Schritt 3: Hex-Code ersetzen

```json
VORHER:
  "primary": "#00CC77"

NACHHER:
  "primary": "#FF1493"     ← Neue Farbe!
```

### Schritt 4: Build durchführen

Terminal öffnen und eingeben:
```bash
npm run build
```

### Schritt 5: Browser aktualisieren

Drücke: **Strg+Shift+R** (Windows) oder **Cmd+Shift+R** (Mac)

---

## 🎯 TIPPS FÜR FARBAUSWAHL

### Wo findet man Farben?

**Online Farbwähler:**
- Google: "Color Picker" → click.com
- coolors.co (für Farbpalettenideen)
- colorhexa.com (zum Umrechnen von Formaten)

**In VS Code:**
- Öffne `design.config.json`
- Klick auf eine `#`-Farbe
- Ein Farbrad-Icon erscheint → klick drauf!
- Farbe wählen → automatisch wird der HEX-Code eingefügt

**Windows Farbwähler:**
- Windows-Taste + Shift + S
- Screenshot-Tool → "Farbe abgreifen"

---

## 🎨 FARBHARMONIE-TIPPS

### Gute Farbkombinationen

✅ **Kontrastreich:** `#00CC77` (Grün) + `#FFFFFD` (Weiß)
✅ **Harmonisch:** `#32B8C6` (Teal) + `#00CC77` (Grün)
✅ **Cyberpunk-Look:** `#00ffff` (Cyan) + `#0F1419` (Dunkelblau)
✅ **Status-Mix:** Grün (Success) + Rot (Error) + Orange (Warning)

### Zu vermeiden

❌ Zu ähnliche Farben (z.B. zwei leicht unterschiedliche Grüns nebeneinander)
❌ Kontrast zu schwach (z.B. helles Grau auf hellem Weiß)
❌ Zu viele verschiedene Farben (max. 5-7 Primärfarben)
❌ Neon-Farben für Text (verletzt Zugänglichkeit)

---

## 📊 FARBÜBERSICHT (Zusammenfassung)

```
PRIMÄR:
├─ Grün (#00CC77) → Buttons, Links, Aktionen
├─ Braun (#5E5240) → Sekundäre Aktionen
│
AKZENTE:
├─ Teal (#32B8C6) → Info, Highlights
├─ Grün (#22C55E) → Success, OK
├─ Rot (#FF5459) → Error, Fehler
├─ Orange (#E68161) → Warning, Warnung
├─ Pink (#FF1493) → Favoriten, Highlights
│
HINTERGRUND:
├─ Hell Creme (#FCF8F9) → Seiten-BG
├─ Weiß (#FFFFFD) → Card-BG
│
TEXT:
├─ Cyan (#00ffff) → Haupttext
├─ Hell Cyan (#88ddff) → Sekundärtext
├─ Grau (#A7A9A9) → Schwacher Text
│
DARK MODE:
└─ Dunkelblau (#0F1419) → Dark-BG
```

---

## ✅ CHECKLIST VOR ÄNDERUNGEN

- [ ] Habe ich die richtige Farbe gefunden?
- [ ] Ist es ein gültiger HEX-Code? (#RRGGBB)
- [ ] Passt die Farbe zur Verwendung? (z.B. Rot für Fehler)
- [ ] Ist genug Kontrast zum Hintergrund?
- [ ] Sieht es auch im Dark Mode gut aus?
- [ ] Habe ich `npm run build` ausgeführt?
- [ ] Habe ich den Browser aktualisiert (Strg+Shift+R)?

---

## 🚨 HÄUFIGE FEHLER

### ❌ Fehler 1: Falsches Format

```json
FALSCH:
  "primary": "green"              ← Wort statt Code!
  "primary": "rgb(0, 204, 119)"   ← RGB statt HEX!

RICHTIG:
  "primary": "#00CC77"            ← HEX-Code!
```

---

### ❌ Fehler 2: Keine Anführungszeichen

```json
FALSCH:
  "primary": #00CC77              ← Keine ""!

RICHTIG:
  "primary": "#00CC77"            ← Mit ""!
```

---

### ❌ Fehler 3: Zu wenig/zu viel Zeichen

```json
FALSCH:
  "primary": "#00CC"              ← Nur 4 Zeichen
  "primary": "#00CC7777"          ← Zu viele Zeichen

RICHTIG:
  "primary": "#00CC77"            ← Genau 6 Zeichen!
```

---

### ❌ Fehler 4: npm build nicht ausgeführt

```
Du änderst die Farbe ✅
Aber: npm run build wird NICHT ausgeführt ❌
Resultat: Website zeigt alte Farbe ❌
```

**Lösung:** IMMER nach Änderung `npm run build` machen!

---

## 📱 RESPONSIVE DESIGN

Die Farben sind **responsive** und passen sich automatisch an:
- ✅ Mobile (375px)
- ✅ Tablet (768px)
- ✅ Desktop (1024px)
- ✅ Wide (1280px)
- ✅ Ultra-Wide (1920px)

Du brauchst nichts zu ändern – die Farben funktionieren auf allen Geräten! 📱💻

---

## 🎓 GLOSSAR

| Begriff | Bedeutung |
|---------|-----------|
| **HEX** | Hexadezimal - Farbformat mit # (z.B. #FF0000) |
| **RGB** | Red Green Blue - Alternative Farbangabe |
| **RGBA** | RGB + Alpha (Transparenz) - z.B. rgba(255,0,0,0.5) |
| **Primary** | Hauptfarbe, am häufigsten verwendet |
| **Secondary** | Zweitrangige Farbe, weniger prominent |
| **Accent** | Akzentfarbe für spezielle Effekte |
| **Semantic** | Bedeutungsgebunden (Grün=Erfolg, Rot=Fehler) |
| **Dark Mode** | Dunkles Design für Nacht-Nutzung |
| **Kontrast** | Unterschied zwischen Farben (wichtig für Lesbarkeit) |

---

## 📞 FRAGEN?

### Frage: "Kann ich eine neue Farbe hinzufügen?"

Ja! Aber:
```json
"colors": {
  "myColor": "#123456"    ← Funktioniert syntaktisch
}
```

**Wichtig:** Der Developer muss diese Farbe danach **ins CSS integrieren**, damit sie auch wirklich verwendet wird. Frag den Developer! 👨‍💻

---

### Frage: "Welche Farbe für [Feature] wählen?"

**Faustregel:**
- ✅ **Aktionen:** Primary-Farbe (Grün)
- ✅ **Erfolg:** accent_green
- ✅ **Fehler:** accent_red
- ✅ **Warnung:** accent_orange
- ✅ **Info:** accent_teal
- ✅ **Sekundär:** secondary (Braun)

---

### Frage: "Sieht die Farbe im Dark Mode gut aus?"

Ja! Das System hat **automatische Dark Mode Farben**. Wenn deine Light-Mode Farbe nicht gut aussieht, kann der Developer eine spezielle Dark-Mode Version hinzufügen. Frag ihn! 🌙

---

## 🏆 BEST PRACTICES

### ✅ Farben-Konsistenz

Nutze immer die **gleichen Farben** für **gleiche Zwecke**:
- Alle Buttons sollten Primary sein ✅
- Alle Fehler sollten Red sein ✅
- Alle Erfolgs-Meldungen sollten Green sein ✅

### ✅ Kontrast testen

Stelle sicher, dass Text **lesbar** bleibt:
- Dunkler Text auf hellem Hintergrund ✅
- Heller Text auf dunklem Hintergrund ✅
- Nicht: Grau auf Grau ❌

### ✅ Beschränkung

Verwende **max. 5-7 Hauptfarben** auf einmal:
- Overload vermeiden ✅
- Übersichtlich bleiben ✅
- Nicht: 20 verschiedene Farben ❌

---

## 📅 VERSION-HISTORIE

| Version | Datum | Änderung |
|---------|-------|----------|
| 1.0 | 22.12.2025 | Initiale Erstellung |

---

## 📝 CREDITS

**Erstellt von:** SONG-NEXUS Design System Team  
**Für:** Designer & UX-Profis  
**Sprache:** Deutsch  
**Schwierigkeitsgrad:** Anfänger-freundlich ✨

---

**Du brauchst Hilfe? Frag den Developer!** 💪🎨