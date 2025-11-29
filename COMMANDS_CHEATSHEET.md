# ⚡ SONG-NEXUS v6.0 – POWERSHELL BEFEHL-SPICKZETTEL

## 🎯 ALLE BEFEHLE ZUM KOPIEREN & EINFÜGEN

Kopiere diese Befehle einfach direkt in deine PowerShell (in VS Code)!

---

## 1️⃣ INITIAL SETUP (EINMALIG)

```powershell
# Desktop navigieren
cd $env:USERPROFILE\Desktop

# Projektordner erstellen
mkdir song-nexus-v6.0
cd song-nexus-v6.0

# Ordnerstruktur erstellen
mkdir frontend, backend\routes, backend\db, backend\logs

# Dateien erstellen
New-Item frontend\index.html -Force
New-Item backend\server.js -Force
New-Item backend\package.json -Force
New-Item backend\.env -Force
New-Item backend\.env.example -Force
New-Item backend\.gitignore -Force
New-Item backend\Dockerfile -Force
New-Item backend\docker-compose.yml -Force
New-Item backend\routes\auth.js -Force
New-Item backend\routes\payments.js -Force
New-Item backend\routes\users.js -Force
New-Item backend\routes\tracks.js -Force
New-Item backend\db\schema.sql -Force
New-Item README.md -Force

# VS Code öffnen
code .
```

---

## 2️⃣ DATENBANK SETUP (EINMALIG)

```powershell
# pgAdmin öffnen (manuell - Windows Start → pgAdmin 4)
# ODER Browser: http://localhost:5050

# Alternative: Command Line PostgreSQL
# (nur wenn du pgAdmin nicht nutzen willst)

# Datenbank erstellen
createdb -U postgres song_nexus_db

# Schema importieren
psql -U postgres -d song_nexus_db -f backend\db\schema.sql
```

---

## 3️⃣ BACKEND SETUP (EINMALIG)

```powershell
# Zum Backend Ordner navigieren
cd backend

# .env.example zu .env kopieren
Copy-Item .env.example .env

# .env bearbeiten (öffne in Editor)
code .env

# Dependencies installieren
npm install

# Überprüfe Installation
npm list

# Alle guten Befehle anzeigen
npm run
```

---

## 4️⃣ BACKEND STARTEN (JEDESMAL)

```powershell
cd backend
npm run dev

# Output sollte sein:
# ✅ SONG-NEXUS v6.0 Backend running on http://localhost:3000

# Mit Ctrl+C beenden
```

---

## 5️⃣ FRONTEND STARTEN (JEDESMAL)

```powershell
# Option A: Mit Live Server (empfohlen)
# - Rechtsklick auf frontend/index.html
# - "Open with Live Server"

# Option B: Browser manuell öffnen
# http://localhost (oder http://localhost:5500 bei Live Server)
```

---

## 6️⃣ DEBUGGING & TESTING

```powershell
# Backend API testen
curl http://localhost:3000/api/tracks

# PostgreSQL verbinden
psql -U postgres -d song_nexus_db

# Node Version checken
node --version

# npm Version checken
npm --version

# PostgreSQL Version checken
psql --version

# Ports prüfen (welche Programme nutzen welche Ports)
netstat -ano

# Port 3000 Prozess beenden
netstat -ano | findstr :3000
# (notiere die PID, dann:)
taskkill /PID 1234 /F

# Logs anschauen
Get-Content backend\logs\app.log
```

---

## 7️⃣ HÄUFIGE BEFEHLE

```powershell
# Aktuellen Ordner anzeigen
pwd

# Dateien auflisten
dir

# In Ordner gehen
cd backend

# Zurück gehen
cd ..

# Nach oben (root)
cd \

# Ordner erstellen
mkdir mein-ordner

# Datei erstellen
New-Item mein-file.txt

# Datei löschen
Remove-Item mein-file.txt

# Datei bearbeiten
code mein-file.txt
# oder
notepad mein-file.txt

# Dateiinhalt kopieren
Get-Content mein-file.txt | Set-Clipboard

# Ordner löschen
Remove-Item -Recurse mein-ordner

# Tree anzeigen
tree /F
# oder (wenn nicht verfügbar)
Get-ChildItem -Recurse

# Terminal clearing
Clear-Host
# oder kurz:
cls
```

---

## 8️⃣ GIT BEFEHLE (OPTIONAL)

```powershell
# Git repo initialisieren
git init

# Status checken
git status

# Alle Dateien staging
git add .

# Commit
git commit -m "Initial setup"

# Remote hinzufügen
git remote add origin https://github.com/dein-username/song-nexus.git

# Push
git push -u origin main
```

---

## 9️⃣ NPM BEFEHLE (WICHTIG!)

```powershell
# Dependencies installieren
npm install

# Development Mode starten
npm run dev

# Production Mode starten
npm start

# Neue Dependency installieren
npm install express

# Dependency löschen
npm uninstall express

# Update auf neueste Version
npm update

# Alle Packages prüfen
npm audit

# Security fixes
npm audit fix

# List alle installierten Packages
npm list
```

---

## 🔟 POWERSHELL TIPPS

```powershell
# Sudo Equivalent (als Admin ausführen)
# Rechtsklick auf PowerShell → Als Administrator ausführen

# History anzeigen (was du vorher eingegeben hast)
Get-History

# Command ausführen mit History
#5  (führt 5. Befehl nochmal aus)

# Alias erstellen (Shortcut)
Set-Alias -Name ll -Value Get-ChildItem

# Env Variablen anzeigen
$env:PATH

# Aktuelles Datum/Zeit
Get-Date

# Help für Befehl
Get-Help node
Get-Help npm
```

---

## 1️⃣1️⃣ SCHNELLE LÖSUNGEN

```powershell
# 1. Backend crasht? Terminal neustarten
# Strg+C zum stoppen, dann "npm run dev" nochmal

# 2. Port 3000 in use?
netstat -ano | findstr :3000
taskkill /PID [NUMMER] /F
npm run dev

# 3. Node/npm nicht gefunden?
# Neuinstallation:
# - Node.js deinstallieren
# - PC neustarten
# - Node.js neu installieren
# - PowerShell neustarten

# 4. Database connection error?
# PostgreSQL prüfen:
# - Windows Start → Services
# - PostgreSQL prüfen (sollte "Running" sein)

# 5. npm install hängt?
# Strg+C drücken, dann:
npm cache clean --force
npm install

# 6. Dependencies fehlen?
npm install --legacy-peer-deps
```

---

## 1️⃣2️⃣ KOMPLETTE COMMAND CHAIN (ALLES AUF EINMAL)

Copy-paste das in PowerShell (als Admin!):

```powershell
# INITIAL SETUP
cd $env:USERPROFILE\Desktop
mkdir song-nexus-v6.0
cd song-nexus-v6.0
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

# VS CODE ÖFFNEN
code .

Write-Host "✅ Setup komplett! Kopiere jetzt deine Dateien rein!" -ForegroundColor Green
Write-Host "Dann: cd backend && npm install" -ForegroundColor Cyan
```

---

## 📋 CHECKLISTE VOR DEM START

```powershell
# Prüfe Node.js
node --version        # ≥ 18.0.0 ?

# Prüfe npm
npm --version         # ≥ 9.0.0 ?

# Prüfe PostgreSQL
psql --version        # ≥ 12.0 ?

# Prüfe Datenbank
psql -U postgres -d song_nexus_db -c "SELECT 1"

# Prüfe Backend Dependencies
cd backend
npm list              # Alles installed?

# Prüfe Port 3000
netstat -ano | findstr :3000  # Nicht in use?
```

---

## 🎉 ERFOLGS-SIGNALE

Du kannst folgende Befehle testen:

```powershell
# Backend läuft?
Invoke-WebRequest http://localhost:3000/api/tracks

# Response: []

# Frontend erreichbar?
Invoke-WebRequest http://localhost

# Response: 200 OK

# Database verbunden?
psql -U postgres -d song_nexus_db -c "SELECT COUNT(*) FROM users;"
```

---

## 🆘 WENN ES NICHT FUNKTIONIERT

```powershell
# 1. Terminal neustarten
# Ctrl+Alt+Entf → Powershell schließen → Neu öffnen

# 2. Services neustarten
Stop-Service postgresql-x64-15   # PostgreSQL neustarten
Start-Service postgresql-x64-15

# 3. Ports neustarten
netstat -ano | findstr :3000
taskkill /PID [Nummer] /F

# 4. Komplett Cache löschen
npm cache clean --force
Remove-Item node_modules -Recurse -Force
npm install

# 5. Computer neustarten
Restart-Computer

# 6. Von vorne beginnen
Remove-Item -Recurse -Force song-nexus-v6.0
# (dann nochmal alle Schritte von vorne)
```

---

## 💡 PRO TIPPS

```powershell
# 1. Mehrere Terminals öffnen (Ctrl+Shift+ö)
# - Terminal 1: Backend (npm run dev)
# - Terminal 2: Andere Befehle

# 2. Tastatur Shortcuts
# - Strg+C: Befehl unterbrechen
# - Pfeil Oben/Unten: Command History
# - Tab: Auto-Completion

# 3. .env sicher speichern
code backend\.env
# Speichern mit Ctrl+S

# 4. Logs ansehen
Get-Content -Tail 10 backend\logs\app.log
# (Letzte 10 Zeilen)

# 5. Backend schnell neustarten
# Strg+C, dann Pfeil Oben, Enter
```

---

## 📚 REFERENZEN

- Node.js Doku: https://nodejs.org/docs
- npm Doku: https://docs.npmjs.com
- PostgreSQL Doku: https://www.postgresql.org/docs
- PowerShell Doku: https://docs.microsoft.com/powershell

---

**Viel Erfolg! 🚀**

**Wenn was nicht funktioniert, kopiere den Error und google ihn!**