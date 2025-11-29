# 🚀 SONG-NEXUS v6.0 – QUICK START (5 MINUTEN!)

## 📋 ÜBERBLICK

Das hier ist eine **vereinfachte Schritt-für-Schritt** Anleitung für sofortigen Start!

---

## ✅ VORAUSSETZUNGEN (5 MIN)

### 1. Node.js installieren
- Download: https://nodejs.org (LTS Version)
- Installieren (alles mit "Yes" bestätigen)
- Starte PowerShell neu

### 2. PostgreSQL installieren
- Download: https://www.postgresql.org/download/
- Installieren
- **MERKE DIR DAS PASSWORT** (z.B. "password123")
- Port: 5432 (default)

### 3. Starte pgAdmin (kommt mit PostgreSQL)
- Windows Start → pgAdmin 4
- Browser öffnet sich automatisch

---

## 🎯 SETUP (10 MIN)

### SCHRITT 1: Öffne PowerShell (als Admin!)
```
Windows Start → Powershell (Rechtsklick → Als Administrator ausführen)
```

### SCHRITT 2: Navigiere zu deinem Desktop/Projektordner
```powershell
cd $env:USERPROFILE\Desktop
mkdir song-nexus-v6.0
cd song-nexus-v6.0
```

### SCHRITT 3: Automatische Ordnerstruktur erstellen
```powershell
# Kopiere die setup.ps1 Datei in diesen Ordner
# Dann ausführen:
.\setup.ps1
```

**Oder manuell (wenn das nicht geht):**
```powershell
mkdir frontend, backend\routes, backend\db, backend\logs

# Dateien erstellen
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

### SCHRITT 4: Öffne in VS Code
```powershell
code .
```

### SCHRITT 5: Kopiere deine heruntergeladenen Dateien
**Im VS Code:**
1. Öffne `frontend/index.html`
2. Kopiere Inhalt von `song-nexus-v6.0-frontend.html` rein
3. Wiederhole für alle anderen Dateien (siehe Liste unten)

**Dateien zum Kopieren:**
| Heruntergeladene Datei | Zielort |
|---|---|
| song-nexus-v6.0-frontend.html | frontend/index.html |
| server.js | backend/server.js |
| auth.js | backend/routes/auth.js |
| payments.js | backend/routes/payments.js |
| users.js | backend/routes/users.js |
| tracks.js | backend/routes/tracks.js |
| package.json | backend/package.json |
| .env.example | backend/.env.example |
| schema.sql | backend/db/schema.sql |

### SCHRITT 6: Konfiguriere .env
```powershell
# Im VS Code: backend → .env (neu erstellen oder kopieren von .env.example)

# Füge ein:
NODE_ENV=development
PORT=3000
HOST=localhost

DB_HOST=localhost
DB_PORT=5432
DB_NAME=song_nexus_db
DB_USER=postgres
DB_PASSWORD=password123

JWT_SECRET=my-super-secret-jwt-key-min-32-chars-long-12345
JWT_EXPIRE=24h

PAYPAL_MODE=sandbox
PAYPAL_CLIENT_ID=AXxxxx (später)
PAYPAL_SECRET=EC_xxxx (später)

FRONTEND_URL=http://localhost
ALLOWED_ORIGINS=http://localhost

BCRYPT_ROUNDS=10
RATE_LIMIT_WINDOW=15
RATE_LIMIT_MAX_REQUESTS=100
```

---

## 🗄️ DATABASE SETUP (5 MIN)

### SCHRITT 1: pgAdmin öffnen
- Windows Start → pgAdmin 4
- Browser: http://localhost:5050
- Master password eingeben

### SCHRITT 2: Verbindung erstellen
```
Server → Create → Server
Name: localhost
Connection:
  Host: localhost
  Port: 5432
  User: postgres
  Password: password123 (was du bei Installation gesetzt hast)
Save
```

### SCHRITT 3: Datenbank erstellen
```
Servers → localhost → Databases (Rechtsklick) → Create Database
Name: song_nexus_db
Create
```

### SCHRITT 4: Schema importieren
```
Tools → Query Tool
Copy-Paste Inhalt von backend/db/schema.sql
F5 drücken
```

---

## ⚡ BACKEND STARTEN (2 MIN)

```powershell
# Starte PowerShell Terminal in VS Code (Ctrl+ö)
cd backend
npm install

# Warte bis fertig (2-3 Min)

npm run dev

# Output:
# ✅ SONG-NEXUS v6.0 Backend running on http://localhost:3000
```

**LASSE DIESES TERMINAL OFFEN!**

---

## 🌐 FRONTEND STARTEN (1 MIN)

### Option A: Mit Live Server (empfohlen)
```
1. VS Code → Extensions → Suche "Live Server"
2. Installiere
3. Öffne frontend/index.html
4. Rechtsklick → "Open with Live Server"
5. Browser öffnet sich automatisch
```

### Option B: Browser öffnen
```
http://localhost
(oder was Live Server zeigt)
```

---

## ✅ TEST (2 MIN)

### Test 1: Backend prüft
```
Browser: http://localhost:3000/api/tracks
Sollte leeres Array zeigen: []
```

### Test 2: Frontend geöffnet
```
Seite sollte laden mit Logo und Audio Player
```

### Test 3: Registrieren
```
1. Email: test@example.com
2. Username: testuser
3. Password: TestPass123!
4. Register
→ Sollte erfolgreich sein
```

### Test 4: Login
```
1. Gleiche Daten eingeben
2. Login
→ Sollte Dashboard zeigen
```

---

## 🎉 FERTIG!

**Herzlichen Glückwunsch!** ✨

Dein SONG-NEXUS v6.0 läuft jetzt lokal!

```
✅ Backend: http://localhost:3000
✅ Frontend: http://localhost
✅ Database: PostgreSQL läuft
✅ Authentifizierung: JWT funktioniert
✅ Paypal: Ready (Credentials später)
```

---

## 📱 PAYPAL SETUP (OPTIONAL ABER WICHTIG!)

### Kostenlos Sandbox Account:
1. https://developer.paypal.com
2. Sign In / Create Account
3. Dashboard → Sandbox
4. Accounts
5. Business Account wählen
6. Kopiere:
   - Client ID
   - Secret
7. In backend/.env einfügen:
   ```
   PAYPAL_CLIENT_ID=ABC...
   PAYPAL_SECRET=XYZ...
   ```
8. Backend neustarten (Ctrl+C, dann npm run dev)

### Test Card für Paypal:
```
4111 1111 1111 1111
Expiry: 12/25
CVV: 123
```

---

## 🐛 SCHNELLE FIXES

### "npm: Befehl nicht gefunden"
→ Node.js nicht installiert oder neustarten

### "Cannot connect to database"
→ PostgreSQL nicht gestartet oder falsches Password

### "CORS error"
→ Backend nicht auf Port 3000 oder Frontend URL falsch

### "Port 3000 in use"
```powershell
netstat -ano | findstr :3000
taskkill /PID 1234 /F
```

---

## 📚 VOLLSTÄNDIGE ANLEITUNG

Lies `COMPLETE_SETUP_GUIDE.md` für mehr Details!

---

## 🎯 NÄCHSTE SCHRITTE

1. **Testen:** Probiere alles aus
2. **Paypal:** Richte Sandbox Account ein
3. **Domain:** Kaufe eine Domain
4. **Deploy:** Stelle auf Server
5. **Live:** Website geht live!

---

## 💡 TIPPS

✅ Lasse Backend Terminal immer offen
✅ Frontend mit Live Server entwickeln
✅ pgAdmin für Database Management nutzen
✅ Chrome DevTools (F12) zum Debuggen
✅ Thunder Client für API Testing

---

**Viel Erfolg! 🚀**

Wenn was nicht funktioniert → Lese COMPLETE_SETUP_GUIDE.md oder frag um Hilfe!