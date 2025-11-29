# 📹 SONG-NEXUS v6.0 – SCHRITT-FÜR-SCHRITT ANLEITUNG
## (Wie ein Video zum Durchlesen)

---

## 🎬 SZENE 1: VORBEREITUNG (2 MIN)

**Narrator:** "Hallo! Ich zeige dir heute, wie du SONG-NEXUS v6.0 in VS Code zum Laufen bringst!"

### Was du brauchst:
- ✅ VS Code (kostenlos, https://code.visualstudio.com)
- ✅ Node.js 18+ (kostenlos, https://nodejs.org)
- ✅ PostgreSQL 15+ (kostenlos, https://postgresql.org)
- ✅ Die heruntergeladenen Dateien
- ✅ 30 Minuten Zeit

### Schritt 1a: Node.js installieren
"Öffne nodejs.org, klick auf den grünen LTS Button, und installiere es. Bei der Installation klickst du überall "Yes"."

**Sichtbar:** Bildschirm zeigt Node.js Website

### Schritt 1b: PostgreSQL installieren
"Öffne postgresql.org/download, lade die Windows Version runter. **WICHTIG:** Merke dir das Passwort das du beim Setup eingibst! Lass Port auf 5432."

**Sichtbar:** PostgreSQL Installation Screen

### Schritt 1c: VS Code öffnen
"Öffne VS Code. Wir benutzen das jetzt für alles."

**Sichtbar:** VS Code Desktop

---

## 🎬 SZENE 2: ORDNERSTRUKTUR (5 MIN)

**Narrator:** "Jetzt erstellen wir die Ordnerstruktur. Das ist simpel!"

### Schritt 2a: Terminal öffnen
"Öffne in VS Code Terminal. Drück Ctrl+ö. Du siehst oben: PowerShell, Bash, etc. Wähle PowerShell."

**Sichtbar:** VS Code mit Terminal oben

```
> PS C:\Users\dein-name\...>
```

### Schritt 2b: Zum Desktop navigieren
"Kopiere diesen Befehl in Terminal und drück Enter:"

```powershell
cd $env:USERPROFILE\Desktop
```

**Sichtbar:** Terminal aktualisiert sich, zeigt neuen Pfad

### Schritt 2c: Projektordner erstellen
"Jetzt erstellen wir den Projektordner:"

```powershell
mkdir song-nexus-v6.0
cd song-nexus-v6.0
```

**Sichtbar:** Terminal zeigt jetzt: `song-nexus-v6.0>`

### Schritt 2d: Ordnerstruktur erstellen
"Kopiere alle diese Befehle (komplett, mit rechtsklick Paste):"

```powershell
mkdir frontend, backend\routes, backend\db, backend\logs
New-Item frontend\index.html -Force
New-Item backend\server.js -Force
New-Item backend\package.json -Force
New-Item backend\.env -Force
New-Item backend\.env.example -Force
New-Item backend\routes\auth.js -Force
New-Item backend\routes\payments.js -Force
New-Item backend\routes\users.js -Force
New-Item backend\routes\tracks.js -Force
New-Item backend\db\schema.sql -Force
```

**Sichtbar:** Terminal zeigt "True" für jede Datei

### Schritt 2e: VS Code neu laden
"Klick File → Open Folder → Deine song-nexus-v6.0 Ordner → Select Folder"

**Sichtbar:** VS Code linke Seite zeigt Ordnerstruktur

---

## 🎬 SZENE 3: DATEIEN KOPIEREN (10 MIN)

**Narrator:** "Jetzt kopierst du deine heruntergeladenen Dateien rein. Das ist Copy & Paste!"

### Schritt 3a: Frontend HTML
"Öffne frontend → index.html (in VS Code)"

**Sichtbar:** Leere Datei

"Jetzt öffnest du die heruntergeladene Datei 'song-nexus-v6.0-frontend.html' in deinem Browser oder Texteditor. Wähle alles (Ctrl+A), kopiere (Ctrl+C)."

**Sichtbar:** HTML Code wird selektiert

"Zurück in VS Code, index.html Datei, alles löschen und einfügen (Ctrl+V)"

**Sichtbar:** Code taucht in VS Code auf

"Speichern mit Ctrl+S"

**Sichtbar:** Punkt vor index.html verschwindet (= gespeichert)

### Schritt 3b: Alle anderen Dateien
"Wiederhole das für alle Dateien:"

| Heruntergeladene Datei | Zielort in VS Code |
|---|---|
| server.js | backend → server.js |
| auth.js | backend → routes → auth.js |
| payments.js | backend → routes → payments.js |
| users.js | backend → routes → users.js |
| tracks.js | backend → routes → tracks.js |
| package.json | backend → package.json |
| .env.example | backend → .env.example |
| schema.sql | backend → db → schema.sql |

**Sichtbar:** Bildschirm-Split zeigt Browser mit Dateien auf linker Seite, VS Code auf rechter

---

## 🎬 SZENE 4: .ENV KONFIGURIEREN (5 MIN)

**Narrator:** ".env ist eine geheime Datei mit deinen Passwörtern. Sag niemanden davon!"

### Schritt 4a: .env erstellen
"Im backend Ordner gibt es jetzt '.env.example'. Rechtsklick → Copy"

**Sichtbar:** .env.example wird angewählt

"Rechtsklick auf leeren Raum → Paste, dann rename es zu '.env'"

**Sichtbar:** Neue Datei '.env' taucht auf

### Schritt 4b: .env ausfüllen
"Öffne die .env Datei. Ändere folgende Zeilen:"

Kopiere diese exakten Werte:

```
NODE_ENV=development
PORT=3000
HOST=localhost

DB_HOST=localhost
DB_PORT=5432
DB_NAME=song_nexus_db
DB_USER=postgres
DB_PASSWORD=DeinPostgresPassword123

JWT_SECRET=my-super-secret-jwt-key-minimum-32-characters-long-12345
JWT_EXPIRE=24h

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=AXxxxxxxxx
PAYPAL_SECRET=EC_xxxxxxxx

FRONTEND_URL=http://localhost
ALLOWED_ORIGINS=http://localhost

BCRYPT_ROUNDS=10
```

**Sichtbar:** .env Datei wird gefüllt

"**WICHTIG:** Das Postgres Password muss das sein, das du bei der PostgreSQL Installation eingegeben hast!"

**Sichtbar:** Roter Highlight auf DB_PASSWORD

"Speichern mit Ctrl+S"

---

## 🎬 SZENE 5: DATENBANK SETUP (10 MIN)

**Narrator:** "Jetzt richten wir die Datenbank ein. Das ist der komplizierteste Teil, aber du schaffst das!"

### Schritt 5a: pgAdmin öffnen
"Windows Start → pgAdmin 4"

**Sichtbar:** pgAdmin öffnet sich im Browser

"Gib dein Master Password ein (was du bei PostgreSQL Installation gesetzt hast)"

**Sichtbar:** Login Fenster

### Schritt 5b: Server verbinden
"Rechtsklick auf 'Servers' → Create → Server"

**Sichtbar:** Menü öffnet sich

"In Fenster eingeben:"

```
Name: localhost

Dann Tab 'Connection':
  Host: localhost
  Port: 5432
  Username: postgres
  Password: [dein postgres password]
```

**Sichtbar:** Formular wird ausgefüllt

"Save klicken"

**Sichtbar:** Server taucht auf in der Liste

### Schritt 5c: Datenbank erstellen
"Rechtsklick auf dein Server 'localhost' → Databases → Create → Database"

**Sichtbar:** Menü

"Name: song_nexus_db"

**Sichtbar:** Dialog

"Create"

**Sichtbar:** Neue Datenbank in Liste

### Schritt 5d: Schema importieren
"Wähle 'song_nexus_db' Datenbank"

**Sichtbar:** Datenbank wird selektiert

"Tools → Query Tool"

**Sichtbar:** SQL Editor öffnet sich (großes weißes Feld)

"Öffne backend → db → schema.sql in VS Code, kopiere alles (Ctrl+A, Ctrl+C)"

**Sichtbar:** SQL Code wird kopiert

"Zurück in pgAdmin, einfügen (Ctrl+V) in Query Tool"

**Sichtbar:** SQL Code in Editor

"Execute Button (oder F5)"

**Sichtbar:** Green "Queries completed successfully"

"✅ Datenbank ist bereit!"

---

## 🎬 SZENE 6: BACKEND INSTALLIEREN (5 MIN)

**Narrator:** "Jetzt installieren wir alle Abhängigkeiten. Das dauert ein paar Minuten."

### Schritt 6a: Terminal navigieren
"In VS Code, Terminal (Ctrl+ö)"

**Sichtbar:** Terminal

"Tippe:"

```powershell
cd backend
```

**Sichtbar:** Terminal zeigt `backend>`

### Schritt 6b: Dependencies installieren
"Tippe:"

```powershell
npm install
```

**Sichtbar:** Terminal zeigt viele grüne Meldungen mit '+', dann "added XXX packages"

"Das kann 2-3 Minuten dauern. Warte..."

**Sichtbar:** Waiting... Fortschritt

**Sichtbar:** Fertig: "added 127 packages"

"✅ Fertig!"

---

## 🎬 SZENE 7: BACKEND STARTEN (2 MIN)

**Narrator:** "Jetzt starten wir den Backend Server!"

### Schritt 7a: Start Befehl
"Terminal zeigt `backend>`, tippe:"

```powershell
npm run dev
```

**Sichtbar:** Terminal aktualisiert sich

**Sichtbar:** Grüne Nachricht:
```
✅ SONG-NEXUS v6.0 Backend running on http://localhost:3000
🔒 Environment: development
```

"**WICHTIG:** Lasse dieses Terminal OFFEN! Das ist der Backend Server!"

**Sichtbar:** Terminal mit Cursor blinkt (zeigt es läuft)

---

## 🎬 SZENE 8: FRONTEND STARTEN (2 MIN)

**Narrator:** "Jetzt öffnest du den Frontend in deinem Browser!"

### Schritt 8a: Live Server Extension
"In VS Code, Links → Extensions Icon"

**Sichtbar:** Extensions Sidebar

"Suche: 'Live Server'"

**Sichtbar:** Suchfeld mit Ergebnis

"Installiere (blauer Install Button)"

**Sichtbar:** Installing... dann grüner "Uninstall" Button

### Schritt 8b: Frontend öffnen
"Gehe zu frontend → index.html"

**Sichtbar:** Datei wird angewählt

"Rechtsklick → 'Open with Live Server'"

**Sichtbar:** Kontextmenü

"✅ Browser öffnet sich automatisch!"

**Sichtbar:** Chrome/Firefox öffnet sich mit http://localhost:5500

"Du siehst jetzt deine Website mit:"
- Das Logo
- Der Audio Player
- Registration & Login Formulare

**Sichtbar:** Vollständige Website in Browser

---

## 🎬 SZENE 9: TEST (3 MIN)

**Narrator:** "Jetzt testen wir ob alles funktioniert!"

### Test 1: Registrieren
"Gebe ein:"

```
Email: test@example.com
Username: testuser
Password: TestPass123!
```

**Sichtbar:** Formular wird gefüllt

"Klick 'Register'"

**Sichtbar:** Wartet...

"✅ Erfolgs-Nachricht: 'Registered successfully!'"

### Test 2: Login
"Gleiche Daten eingeben, klick 'Login'"

**Sichtbar:** Formular wird gefüllt

"✅ Dashboard zeigt sich mit Profil-Infos!"

**Sichtbar:** User Dashboard mit Statistiken

---

## 🎬 SZENE 10: PAYPAL SETUP (OPTIONAL, 10 MIN)

**Narrator:** "Wenn du echte Zahlungen brauchst, richten wir Paypal ein!"

### Schritt 10a: Developer Account
"Öffne: https://developer.paypal.com"

**Sichtbar:** Website

"Sign In oder Create Account (kostenlos!)"

**Sichtbar:** Login Screen

### Schritt 10b: Sandbox Credentials
"Dashboard → Sandbox → Accounts"

**Sichtbar:** Seite mit Business Account

"Wähle Business Account, kopiere:"
- Client ID
- Secret

**Sichtbar:** Werte werden kopiert

### Schritt 10c: In .env einfügen
"Zurück zu VS Code, backend → .env"

**Sichtbar:** Datei

"Ändere:"

```
PAYPAL_CLIENT_ID=paste_dein_client_id_hier
PAYPAL_SECRET=paste_dein_secret_hier
PAYPAL_MODE=sandbox
```

**Sichtbar:** Werte werden eingefügt

"Speichern (Ctrl+S)"

### Schritt 10d: Backend neustarten
"Im Terminal (mit Backend) → Strg+C"

**Sichtbar:** Server stoppt

"Tippe nochmal:"

```powershell
npm run dev
```

**Sichtbar:** Server startet neu

"✅ Paypal ist jetzt verbunden!"

---

## 🎬 SZENE 11: DU BIST FERTIG! 🎉

**Narrator:** "Herzlichen Glückwunsch! Du hast SONG-NEXUS v6.0 zum Laufen gebracht!"

**Sichtbar:** Website in Browser, mit allen Features funktionstüchtig

### Was du jetzt hast:
✅ Backend läuft auf http://localhost:3000
✅ Frontend läuft auf http://localhost:5500
✅ PostgreSQL Datenbank läuft
✅ User Authentication funktioniert
✅ Paypal Integration ready
✅ Audio Player funktioniert

### Nächste Schritte:
1. **Testen:** Probiere alle Features aus
2. **Code verstehen:** Lese die Dateien
3. **Customizen:** Ändere Farben, Funktionen
4. **Deployen:** Stelle online
5. **Live gehen:** Website für alle

**Narrator:** "Viel Erfolg mit deinem Projekt! Happy Coding! 🚀"

**Sichtbar:** SONG-NEXUS Logo, Credits rollen

---

## 🆘 WENN WAS NICHT FUNKTIONIERT

### Problem: "npm: Befehl nicht gefunden"
**Lösung:** Node.js neu installiert? Starte PowerShell neu!

### Problem: "Cannot connect to database"
**Lösung:** PostgreSQL läuft? pgAdmin öffnen und prüfen!

### Problem: "Port 3000 already in use"
**Lösung:** In Terminal: `netstat -ano | findstr :3000` dann `taskkill /PID [NUMMER] /F`

### Problem: "Paypal SDK not loaded"
**Lösung:** Browser Console öffnen (F12), auf Fehler prüfen!

---

## 📚 WEITERE RESSOURCEN

- **COMPLETE_SETUP_GUIDE.md** - Detaillierte schriftliche Anleitung
- **COMMANDS_CHEATSHEET.md** - Alle PowerShell Befehle
- **QUICKSTART.md** - Die 5-Minuten Version
- **Backend Code** - Alle Dateien sind gut kommentiert!

---

**THE END** 🎬

Wenn du Fragen hast, lese die anderen Guides oder google den Fehler!

**Viel Erfolg! 🚀**