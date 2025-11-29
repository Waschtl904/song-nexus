# 🎵 SONG-NEXUS v6.0 – KOMPLETTE VS CODE SETUP ANLEITUNG

## INHALTSVERZEICHNIS
1. Voraussetzungen
2. Ordnerstruktur erstellen
3. Dateien einfügen
4. Backend Setup
5. Frontend Setup
6. Database Setup
7. Alles starten
8. Troubleshooting

---

## 1️⃣ VORAUSSETZUNGEN

Installiere diese Programme (falls noch nicht vorhanden):

### Node.js (incl. npm)
https://nodejs.org/
- Version 18+ empfohlen
- Installiere LTS Version
- Bestätige bei Installation alles mit "Yes"

### PostgreSQL
https://www.postgresql.org/download/
- Version 15+ empfohlen
- Bei Installation merke dir das Admin-Passwort!
- Wähle Port 5432 (default)

### Git (optional aber empfohlen)
https://git-scm.com/download/win

### VS Code Erweiterungen
Öffne VS Code und installiere:
- Prettier (Code Formatter)
- Thunder Client (API Testing)
- PostgreSQL (Database Management)

**Installation in VS Code:**
Klick auf Extensions (linke Seite) → Suche nach dem Namen → Install

---

## 2️⃣ ORDNERSTRUKTUR ERSTELLEN

### SCHRITT 1: Hauptordner erstellen
```powershell
# Öffne PowerShell in VS Code (View → Terminal oder Ctrl+ö)

# Wechsle zu einem beliebigen Ort (z.B. Desktop)
cd $env:USERPROFILE\Desktop

# Erstelle Hauptordner
mkdir song-nexus-v6.0
cd song-nexus-v6.0

# Öffne in VS Code
code .
```

### SCHRITT 2: Ordnerstruktur erstellen (PowerShell im VS Code Terminal)
```powershell
# Frontend Ordner
mkdir frontend
mkdir backend
mkdir backend\routes
mkdir backend\db

# Dateien erstellen (sie sind leer, wir füllen sie später)
New-Item -Path frontend -Name "index.html" -ItemType "File" -Force
New-Item -Path backend -Name "server.js" -ItemType "File" -Force
New-Item -Path backend -Name "package.json" -ItemType "File" -Force
New-Item -Path backend -Name ".env" -ItemType "File" -Force
New-Item -Path backend -Name ".env.example" -ItemType "File" -Force
New-Item -Path backend -Name ".gitignore" -ItemType "File" -Force
New-Item -Path backend -Name "Dockerfile" -ItemType "File" -Force
New-Item -Path backend -Name "docker-compose.yml" -ItemType "File" -Force
New-Item -Path backend\routes -Name "auth.js" -ItemType "File" -Force
New-Item -Path backend\routes -Name "payments.js" -ItemType "File" -Force
New-Item -Path backend\routes -Name "users.js" -ItemType "File" -Force
New-Item -Path backend\routes -Name "tracks.js" -ItemType "File" -Force
New-Item -Path backend\db -Name "schema.sql" -ItemType "File" -Force

# Verifying folder structure
tree
```

**Sollte so aussehen:**
```
song-nexus-v6.0/
├── frontend/
│   └── index.html
└── backend/
    ├── server.js
    ├── package.json
    ├── .env
    ├── .env.example
    ├── .gitignore
    ├── Dockerfile
    ├── docker-compose.yml
    ├── routes/
    │   ├── auth.js
    │   ├── payments.js
    │   ├── users.js
    │   └── tracks.js
    └── db/
        └── schema.sql
```

---

## 3️⃣ DATEIEN EINFÜGEN

### Die heruntergeladenen Dateien einfügen:

**Frontend:**
1. Öffne `song-nexus-v6.0-frontend.html` (deine heruntergeladene Datei)
2. Kopiere den gesamten Inhalt
3. Füge ihn in `frontend/index.html` ein (in VS Code)
4. Speichern mit Ctrl+S

**Backend - server.js:**
1. Öffne die heruntergeladene Datei `server.js`
2. Kopiere den Inhalt
3. Füge ihn in `backend/server.js` ein
4. Speichern

**Routes (gleiches Vorgehen für alle):**
```
routes/auth.js        ← auth.js Inhalt
routes/payments.js    ← payments.js Inhalt
routes/users.js       ← users.js Inhalt
routes/tracks.js      ← tracks.js Inhalt
```

**package.json:**
1. Kopiere den Inhalt von package.json
2. Füge ihn ein in `backend/package.json`
3. Speichern

**.env.example:**
1. Kopiere den Inhalt
2. Füge ihn ein in `backend/.env.example`
3. Speichern

**db/schema.sql:**
1. Kopiere den Inhalt von schema.sql
2. Füge ihn ein in `backend/db/schema.sql`
3. Speichern

**docker-compose.yml, Dockerfile, .gitignore:**
- Gleiches Vorgehen wie oben

---

## 4️⃣ BACKEND SETUP

### SCHRITT 1: Navigiere zum Backend
```powershell
# Im Terminal (in VS Code unten)
cd backend
```

### SCHRITT 2: Kopiere .env.example zu .env
```powershell
# Windows PowerShell
Copy-Item .env.example .env

# Linux/Mac (falls du das nutzt)
# cp .env.example .env
```

### SCHRITT 3: Öffne .env und fülle es aus
```powershell
# Öffne die Datei mit dem Editor
code .env
```

**Fülle diese Werte ein:**
```
NODE_ENV=development
PORT=3000
HOST=localhost

# Database
DB_HOST=localhost
DB_PORT=5432
DB_NAME=song_nexus_db
DB_USER=postgres
DB_PASSWORD=DeinPostgresPassword123!

# JWT Secret (generiere eine lange zufällige Zeichenkette)
JWT_SECRET=your_super_secret_jwt_key_at_least_32_characters_long_12345
JWT_EXPIRE=24h
REFRESH_TOKEN_SECRET=another_super_secret_refresh_key_12345

# Paypal Sandbox (fülle deine Credentials ein)
PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=YOUR_PAYPAL_CLIENT_ID_HERE
PAYPAL_SECRET=YOUR_PAYPAL_SECRET_HERE

# CORS
FRONTEND_URL=http://localhost
ALLOWED_ORIGINS=http://localhost

# Sonstiges
BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
LOG_FILE=logs/app.log
```

**Speichern mit Ctrl+S**

### SCHRITT 4: Installiere Dependencies
```powershell
# Stelle sicher, dass du noch in backend/ bist
cd backend

# Installiere alle npm Packages
npm install

# Warte bis es fertig ist (kann 2-3 Minuten dauern)
# Es sollte "added XXX packages" anzeigen
```

---

## 5️⃣ FRONTEND SETUP

Der Frontend braucht nicht viel Setup. Aber überprüfe folgendes:

### Öffne frontend/index.html
```powershell
# Überprüfe in der Datei diese Zeile:
# const API_BASE = 'http://localhost:3000/api';

# Wenn dein Backend auf einem anderen Port oder Host läuft, ändere es hier
```

---

## 6️⃣ DATABASE SETUP

### SCHRITT 1: Öffne pgAdmin4 (PostgreSQL Management)
```
Du hast PostgreSQL installiert - es wurde auch pgAdmin4 mitinstalliert
Öffne pgAdmin4:
- Windows Start → pgAdmin 4
- Oder browser: http://localhost:5050
```

### SCHRITT 2: Verbinde dich mit PostgreSQL
```
1. Master password eingeben (was du bei der Installation festgelegt hast)
2. Rechtsklick auf "Servers" → Create → Server
3. Name: localhost
4. Connection Tab:
   - Host: localhost
   - Port: 5432
   - Username: postgres
   - Password: DeinPostgresPassword
5. Save
```

### SCHRITT 3: Erstelle die Datenbank
```
1. Rechtsklick auf dein Server → Databases → Create → Database
2. Name: song_nexus_db
3. Create
```

### SCHRITT 4: Importiere das Schema
```
1. Wähle die Datenbank "song_nexus_db"
2. Gehe zu Tools → Query Tool
3. Öffne backend/db/schema.sql (Datei mit Ctrl+O)
4. Kopiere den kompletten Inhalt in die Query Box
5. Drücke F5 oder "Execute" Button
6. Es sollte alle Tabellen erstellen
```

---

## 7️⃣ ALLES STARTEN

### SCHRITT 1: Backend starten
```powershell
# Stelle sicher, dass du im backend/ Ordner bist
cd backend

# Starte den Backend Server
npm run dev

# Output sollte sein:
# ✅ SONG-NEXUS v6.0 Backend running on http://localhost:3000
# 🔒 Environment: development
```

**Lasse dieses Terminal OFFEN!**

### SCHRITT 2: Frontend öffnen
```
Öffne einen neuen Browser Tab
Gehe zu: file:///C:/Users/DeinUsername/Desktop/song-nexus-v6.0/frontend/index.html

ODER

Nutze VS Code Extension "Live Server":
1. Öffne frontend/index.html
2. Rechtsklick → Open with Live Server
3. Browser öffnet sich automatisch
```

---

## 8️⃣ TESTEN

### Test 1: Backend prüfen
```powershell
# Im Terminal mit Thunder Client oder im Browser:
# http://localhost:3000/api/tracks

# Sollte leeres Array zurückgeben: []
```

### Test 2: Frontend öffnen
```
http://localhost:3000 (oder Live Server Port)
```

### Test 3: Registrieren
```
1. Gebe Test-Email ein: test@example.com
2. Username: testuser
3. Password: TestPass123!
4. Klick Register
5. Sollte Erfolgs-Message zeigen
```

### Test 4: Login
```
1. Gebe gleiche Email ein
2. Gleiches Passwort
3. Klick Login
4. Sollte Dashboard zeigen
```

---

## ❌ TROUBLESHOOTING

### Problem: "npm: Befehl nicht gefunden"
**Lösung:**
- Node.js neu installiert? → VS Code neustarten
- Terminal neustarten
- PowerShell als Admin ausführen

### Problem: "Cannot connect to database"
**Lösung:**
```powershell
# Prüfe ob PostgreSQL läuft
# Windows: Strg+Alt+Entf → Task Manager → Services Tab → PostgreSQL prüfen

# Prüfe .env Datei:
# - DB_HOST = localhost
# - DB_USER = postgres
# - DB_PASSWORD = Dein Password
```

### Problem: "Backend running aber Frontend zeigt Error"
**Lösung:**
```
1. Browser Console öffnen (F12)
2. Schaue nach CORS Error
3. Prüfe dass API_BASE richtig ist
4. Frontend Datei mit Ctrl+Shift+R hart neuladen
```

### Problem: "Port 3000 ist bereits in Benutzung"
**Lösung:**
```powershell
# Finde den Prozess der Port 3000 nutzt
netstat -ano | findstr :3000

# Beende den Prozess (PID ist die letzte Nummer)
taskkill /PID 1234 /F

# Oder ändere den Port in .env:
PORT=3001
```

### Problem: "Paypal SDK nicht geladen"
**Lösung:**
```
1. Frontend/index.html öffnen
2. Suche nach: <script src="https://www.paypal.com/sdk/js?client-id=
3. Ersetze YOUR_PAYPAL_CLIENT_ID mit deiner tatsächlichen Client ID
4. Seite neuladen
```

---

## 🔐 PAYPAL SETUP (OPTIONAL ABER WICHTIG)

### Kostenlos Paypal Sandbox Account erstellen:

1. Öffne: https://developer.paypal.com
2. Sign in oder Create Account
3. Gehe zu Dashboard
4. Unter "Sandbox" → Accounts
5. Wähle "Business" Account
6. Kopiere:
   - Client ID
   - Secret
7. Füge in .env ein:
   ```
   PAYPAL_CLIENT_ID=paste_client_id_here
   PAYPAL_SECRET=paste_secret_here
   PAYPAL_MODE=sandbox
   ```
8. Backend neustarten: Drücke Ctrl+C und dann npm run dev

### Test Paypal mit Sandbox Card:
```
Card Number: 4111111111111111
Expiry: 12/25
CVV: 123
```

---

## 📊 FOLDER STRUKTUR ENDGÜLTIG

Nachdem alles eingerichtet ist:

```
song-nexus-v6.0/
│
├── frontend/
│   └── index.html                    (Deine Frontend Datei)
│
└── backend/
    ├── server.js                     (Express Server)
    ├── package.json                  (Dependencies)
    ├── package-lock.json             (Auto erstellt)
    ├── .env                          (Deine Secrets)
    ├── .env.example                  (Template)
    ├── .gitignore                    (Git ignore rules)
    ├── Dockerfile                    (Docker Setup)
    ├── docker-compose.yml            (Docker Compose)
    ├── node_modules/                 (Auto erstellt nach npm install)
    ├── routes/
    │   ├── auth.js
    │   ├── payments.js
    │   ├── users.js
    │   └── tracks.js
    └── db/
        └── schema.sql
```

---

## ✅ CHECKLIST BEVOR DU STARTEST

```
□ Node.js Version 18+ installiert (node --version)
□ PostgreSQL installiert und läuft
□ song-nexus-v6.0 Ordner erstellt
□ Alle Dateien ins richtige Folder kopiert
□ .env Datei mit echten Werten gefüllt
□ npm install ausgeführt (im backend/ Ordner)
□ Database "song_nexus_db" erstellt
□ Schema.sql in pgAdmin ausgeführt
□ npm run dev funktioniert (Backend läuft)
□ Frontend/index.html in Browser öffnet
□ Test: Register funktioniert
□ Test: Login funktioniert
```

---

## 🚀 FINAL COMMANDS (ZUSAMMENFASSUNG)

### ALLE COMMANDS ZUM KOPIEREN:

```powershell
# 1. Ordner erstellen
cd $env:USERPROFILE\Desktop
mkdir song-nexus-v6.0
cd song-nexus-v6.0
mkdir frontend, backend\routes, backend\db

# 2. Backend einrichten
cd backend
Copy-Item .env.example .env

# 3. Edit .env (mit PowerShell Editor)
notepad .env

# 4. Dependencies installieren
npm install

# 5. Backend starten
npm run dev

# In neuem Terminal:
# 6. Frontend öffnen
cd frontend
code index.html
# Dann Rechtsklick → Open with Live Server
```

---

## 📞 WENN ES NICHT FUNKTIONIERT

1. **Alle Terminals schließen**
2. **VS Code neustarten**
3. **Computer neustarten** (ernsthaft! Das hilft oft)
4. **Von vorne beginnen, aber Schritt für Schritt prüfen**

---

## 🎉 ERFOLG!

Wenn alles läuft:
- ✅ Backend läuft auf http://localhost:3000
- ✅ Frontend öffnet sich
- ✅ Du kannst dich registrieren/einloggen
- ✅ Dashboard zeigt Daten
- ✅ Payment Button funktioniert

**HERZLICHEN GLÜCKWUNSCH! SONG-NEXUS v6.0 läuft jetzt! 🎊**

---

## NÄCHSTE SCHRITTE

Nach erfolgreichem Setup:

1. **Produzieren:** Ändere Production Einstellungen
2. **Domain:** Kaufe eine Domain
3. **SSL:** Besorge SSL Certificate (Let's Encrypt - kostenlos!)
4. **Deploy:** Uploade auf Server (Heroku, AWS, etc.)
5. **Live:** Website geht live!

---

**Viel Erfolg beim Aufbau! 🚀**
