# 🎨 SONG-NEXUS DESIGNER-ANLEITUNG
## Wie du das Design System verwendest (ohne Code zu schreiben!)

**Fertig zu lesen in: ~15 Minuten**

---

## 📌 TL;DR (Die Kurzversion)

1. Öffne die Datei: `design.config.json`
2. Ändere Farben, Abstände, Schriftgrößen
3. Drücke auf Terminal: `npm run build`
4. Fertig! Die Website passt sich automatisch an

**Das war's! Keine Code-Kenntnisse nötig!** ✅

---

## 🎯 WAS DU ÄNDERN KANNST

Du kannst **alles ändern**, das in `design.config.json` definiert ist:

✅ **Farben** (Primary, Secondary, Fehler, Erfolg, etc.)
✅ **Schriftgrößen** (Überschriften, Text, klein)
✅ **Abstände** (Padding, Margin, Größen)
✅ **Eckenradien** (wie rund sind Buttons/Cards)
✅ **Schatten** (Tiefeneffekte)
✅ **Übergänge** (wie schnell Animationen sind)

❌ **Das solltest du NICHT anfassen:**
- JavaScript-Code (`.js` Dateien)
- HTML-Struktur (`.html` Dateien)
- CSS-Regeln selbst (`.css` Dateien)

---

## 🚀 SO FUNKTIONIERT ES

### Das Design System = Ein System aus 3 Teilen

```
┌─────────────────────────────────────────┐
│  1. design.config.json                  │
│     (Deine Änderungen gehen hier rein)  │
└─────────────────┬───────────────────────┘
                  │
                  ↓ (npm run build)
┌─────────────────────────────────────────┐
│  2. _design-tokens.css (AUTO-GENERIERT) │
│     (Wird automatisch erstellt)         │
└─────────────────┬───────────────────────┘
                  │
                  ↓ (Browser lädt CSS)
┌─────────────────────────────────────────┐
│  3. Website sieht deine Änderungen!     │
│     (Farben, Abstände, etc. aktualisiert)
└─────────────────────────────────────────┘
```

**Du brauchst nur Schritt 1 zu tun. Der Rest passiert automatisch!**

---

## 📂 WELCHE DATEI MUSST DU ÖFFNEN?

```
Song-Nexus/                    ← Projekt-Hauptordner
├─ design.config.json          ← 👈 DIESE DATEI!
├─ frontend/
├─ server.js
└─ [andere Dateien]
```

**Pfad:** Im Projekt-Stammverzeichnis (die oberste Ebene)

---

## 📝 SCHRITT-FÜR-SCHRITT ANLEITUNG

### 1️⃣ Datei öffnen

Öffne `design.config.json` mit einem **einfachen Text-Editor** (nicht Word!):
- Visual Studio Code ✅ (EMPFOHLEN)
- Sublime Text ✅
- NotePad++ ✅
- Notepad ✅

---

### 2️⃣ Datei-Struktur verstehen

Die Datei sieht ungefähr so aus:

```json
{
  "colors": {
    "primary": "#00FFFF",
    "secondary": "#FF1493",
    "success": "#22C55E",
    "error": "#C01530",
    "warning": "#A84B2F"
  },
  
  "typography": {
    "fontSize": {
      "sm": "12px",
      "base": "14px",
      "lg": "16px"
    }
  },
  
  "spacing": {
    "xs": "4px",
    "sm": "8px",
    "md": "16px",
    "lg": "24px"
  }
  
  // ... und mehr ...
}
```

**Logik:**
- Alles ist in `Kategorien` organisiert
- Jede Kategorie hat `Namen` und `Werte`
- Werte sind immer `"in Anführungszeichen"`

---

### 3️⃣ Eine Farbe ändern (BEISPIEL)

**Du willst:** Primärfarbe von Cyan (#00FFFF) zu Orange (#FF8C00) ändern

**So geht's:**

```json
VORHER:
  "colors": {
    "primary": "#00FFFF",    ← Diese Zeile
  }

NACHHER:
  "colors": {
    "primary": "#FF8C00",    ← Geändert!
  }
```

**Fertig!** ✅ Speichern und weitermachen.

---

### 4️⃣ Das Magische: Rebuild durchführen

Nach jeder Änderung musst du folgendes machen:

**Öffne das Terminal** (PowerShell/Command Prompt/Terminal):
1. Gehe ins Projekt-Verzeichnis
2. Tippe ein: `npm run build`
3. Drücke Enter
4. Warte ~5-10 Sekunden

```
C:\Users\YourName\Song-Nexus> npm run build
  ✓ Webpack bundling complete...
  ✓ Assets compiled
  ✓ Build successful!
```

**Das bedeutet:** Deine Änderungen sind jetzt in der Website aktiv! 🎉

---

### 5️⃣ Website aktualisieren

Nach `npm run build`:

1. Öffne die Website im Browser (meist: `https://localhost:3000`)
2. **Drücke Strg+Shift+R** (= Hard Refresh = Cache löschen)
3. Deine Änderungen sind sichtbar! 🎨

---

## 🎨 HÄUFIGE ÄNDERUNGEN (BEISPIELE)

### Beispiel 1: Primärfarbe ändern

```json
// VORHER
"primary": "#00FFFF"

// NACHHER (z.B. zu Pink)
"primary": "#FF1493"
```

**Effekt:** Alle Buttons, Links, Highlights werden Pink.

---

### Beispiel 2: Schriftgröße erhöhen

```json
// VORHER
"fontSize": {
  "base": "14px"
}

// NACHHER
"fontSize": {
  "base": "16px"
}
```

**Effekt:** Der normale Text wird überall größer.

---

### Beispiel 3: Abstände vergrößern

```json
// VORHER
"spacing": {
  "md": "16px"
}

// NACHHER
"spacing": {
  "md": "24px"
}
```

**Effekt:** Alle mittleren Abstände (zwischen Elementen) werden größer.

---

### Beispiel 4: Buttons mehr abrunden

```json
// VORHER
"borderRadius": {
  "base": "8px"
}

// NACHHER
"borderRadius": {
  "base": "12px"
}
```

**Effekt:** Buttons, Cards, Input-Felder sehen mehr abgerundet aus.

---

## ⚠️ HÄUFIGE FEHLER (UND WIE DU SIE VERMEIDEST)

### ❌ Fehler 1: Anführungszeichen vergessen

```json
FALSCH:
  "primary": #00FFFF,    ← Keine Anführungszeichen!

RICHTIG:
  "primary": "#00FFFF",  ← Mit Anführungszeichen!
```

**Resultat:** Datei funktioniert nicht. Fehler beim Build.

---

### ❌ Fehler 2: Komma vergessen

```json
FALSCH:
  "primary": "#00FFFF"   ← Kein Komma!
  "secondary": "#FF1493"

RICHTIG:
  "primary": "#00FFFF",  ← Mit Komma!
  "secondary": "#FF1493"
```

**Resultat:** Datei funktioniert nicht.

**Regel:** Nach jedem Wert kommt ein Komma, AUSSER beim letzten in einer Gruppe.

---

### ❌ Fehler 3: Keine Build durchgeführt

```
Du änderst: design.config.json
Aber: npm run build wird NICHT ausgeführt
Resultat: Website zeigt alte Farben
```

**Lösung:** Immer nach einer Änderung `npm run build` drücken!

---

### ❌ Fehler 4: Falsches Farb-Format

```json
FALSCH:
  "primary": "cyan"      ← Wort statt Code
  "primary": "rgb(0, 255, 255)"  ← RGB statt HEX

RICHTIG:
  "primary": "#00FFFF"   ← HEX-Code
```

**Format:** Farben MÜSSEN im `#RRGGBB` Format sein (HEX-Code).

---

## 🎯 FARBCODES SCHNELL FINDEN

Brauchen einen bestimmten Farbcode? Verwende einen **Farbwähler**:

- **Online:** Google "Color Picker" → erste Ergebnis
- **VS Code:** Klick rechts unten auf "Color Picker"
- **Windows:** Windows Farbwähler (Windows-Taste + Shift + S)

Wähle deine Farbe, kopiere den HEX-Code, einfügen!

---

## 📊 ÜBERSICHT: WAS KANN ICH ÄNDERN?

```
colors:
├─ primary         (Hauptfarbe, z.B. Buttons)
├─ secondary       (Sekundärfarbe)
├─ success         (Grün, für Erfolg)
├─ error           (Rot, für Fehler)
├─ warning         (Orange, für Warnung)
└─ ... mehr Farben

typography:
├─ fontSize        (Schriftgrößen: sm, base, lg, xl)
├─ fontWeight      (Fettdruck: normal, medium, bold)
└─ lineHeight      (Zeilenabstand)

spacing:
├─ xs, sm, md, lg, xl (verschiedene Abstände)

borderRadius:
├─ sm, base, md, lg (verschiedene Rundungen)

shadows:
├─ xs, sm, md, lg, xl (Schattentiefe)

transitions:
├─ duration        (wie schnell Animationen sind)
└─ easing          (wie "weich" Animationen laufen)
```

---

## 🚨 WENN ETWAS KAPUTTGEHT

### Problem: "npm run build" zeigt Fehler

```
error: Unexpected token in JSON at line 15
```

**Lösung:**
1. Öffne die Datei nochmal
2. Suche Zeile 15
3. Prüfe auf: fehlende Kommas, Anführungszeichen, Klammern
4. Speichern
5. `npm run build` nochmal versuchen

---

### Problem: Website zeigt alte Farben nach Änderung

**Lösung:**
1. Hast du `npm run build` ausgeführt?
2. Browser Hard-Refresh: **Strg+Shift+R** (Windows) oder **Cmd+Shift+R** (Mac)
3. Versuche: Browser komplett schließen und neu öffnen

---

### Problem: Datei lässt sich nicht speichern

**Lösung:**
1. Ist die Datei "Read-Only"? (Häufig bei VS Code)
2. Rechtsklick auf Datei → Eigenschaften → "Schreibgeschützt" aktivieren
3. Oder: Datei schließen, neu öffnen, versuchen

---

## 💡 PRO-TIPPS

### Tipp 1: Vorher/Nachher Screenshot machen

```
Vor Änderung: Screenshot machen (Bildschirm)
Änderung durchführen
npm run build
Nach Änderung: Screenshot machen
Vergleiche beide Bilder
```

So siehst du genau, was sich geändert hat!

---

### Tipp 2: Eine Änderung nach der anderen

```
❌ NICHT: 10 Farben auf einmal ändern
✅ BESSER: 1 Farbe ändern → npm run build → testen
          → Nächste Farbe ändern → npm run build → testen
```

Wenn etwas schiefgeht, weißt du genau welche Änderung das Problem verursacht hat.

---

### Tipp 3: GitHub Backup

Nach erfolgreichen Änderungen, die dir gefallen:
```
git add design.config.json
git commit -m "design: updated primary color to #FF1493"
git push
```

So haben du und der Developer immer ein Backup!

---

### Tipp 4: Farben-Palette dokumentieren

Erstelle eine einfache Notiz:

```
SONG-NEXUS Farbsystem:
- Primary (Buttons, Links): #00FFFF
- Secondary: #FF1493
- Success (Grün): #22C55E
- Error (Rot): #C01530
- Warning (Orange): #A84B2F

Diese Farben nutzen überall!
```

So vergisst du nicht deine eigenen Farben! 📝

---

## ✅ CHECKLIST FÜR ÄNDERUNGEN

Bevor du `npm run build` ausführst, prüfe:

- [ ] Habe ich die richtige Datei geöffnet? (`design.config.json`)
- [ ] Habe ich Anführungszeichen um Werte?
- [ ] Habe ich Kommas nach jedem Wert (außer dem letzten)?
- [ ] Verwende ich richtige Farb-Formate? (#RRGGBB)
- [ ] Versuche ich, etwas zu ändern das NICHT in der Datei steht?
- [ ] Habe ich die Datei gespeichert?

**Ja zu alle?** → `npm run build` ausführen! ✅

---

## 📞 WENN DU FRAGEN HAST

### Frage 1: "Kann ich neue Farben hinzufügen?"

Ja! Du kannst neue Kategorien oder Einträge hinzufügen. Aber Vorsicht:
```json
"colors": {
  "primary": "#00FFFF",
  "myNewColor": "#123456"    ← Funktioniert, wird aber nicht überall verwendet
}
```

**Besser:** Frag den Developer, um die neue Farbe auch ins CSS zu integrieren.

---

### Frage 2: "Was ist mit Dark Mode?"

Dark Mode ist automatisch aktiviert! Das System erkennt deine System-Einstellung:
- **Helles Design:** Windows/Mac Licht-Modus
- **Dunkles Design:** Windows/Mac Dunkel-Modus

Du kannst auch Farben speziell für Dark Mode anpassen:

```json
"darkMode": {
  "colors": {
    "primary": "#00FF88"   ← Andere Farbe für Dunkel-Modus
  }
}
```

---

### Frage 3: "Wer kümmert sich um CSS und JavaScript?"

Das ist die Arbeit des **Developers**. Du änderst nur die Werte in `design.config.json`.

Der Developer verwaltet:
- CSS-Regeln (`.css` Dateien)
- JavaScript-Code (`.js` Dateien)
- HTML-Struktur (`.html` Dateien)

**Die Aufteilung:**
- **Designer:** design.config.json (Zahlen und Farben)
- **Developer:** CSS und JavaScript (Code und Logik)

---

## 🎓 GLOSSAR (Begriffe erklärt)

| Begriff | Bedeutung |
|---------|-----------|
| **HEX-Code** | Farb-Format, z.B. #FF1493 (Rot) |
| **CSS** | Sprache für Styling (Farben, Abstände) |
| **Token** | Ein Wert, der wiederverwendet wird (z.B. Farbe) |
| **Build** | Prozess, der Änderungen in Website umwandelt |
| **npm run build** | Befehl, um Änderungen zu aktivieren |
| **Responsive** | Website passt sich an Bildschirm-Größe an |
| **Dark Mode** | Dunkles Design für schwache Beleuchtung |
| **px** | Pixel (Maßeinheit für Größe/Abstand) |

---

## 🏁 SUMMARY (Zusammenfassung)

```
1. Öffne: design.config.json
2. Ändere: Farben, Größen, Abstände
3. Speichern
4. Terminal: npm run build
5. Browser: Hard Refresh (Strg+Shift+R)
6. Fertig! 🎉
```

**Das ist alles, was du wissen musst!**

---

## 🎊 VIEL ERFOLG!

Du kannst jetzt:
- ✅ Das Design verändern (ohne Code zu schreiben!)
- ✅ Farben anpassen
- ✅ Größen/Abstände verändern
- ✅ Mit dem Developer zusammenarbeiten
- ✅ Das Design System selbstständig nutzen

**Bei Fragen: Frag den Developer!** 💪

---

**Version:** 1.0  
**Sprache:** Deutsch  
**Zielgruppe:** Designer (keine Code-Kenntnisse nötig)  
**Aktuell:** 22.12.2025