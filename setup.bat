@echo off
REM ============================================================================
REM SONG-NEXUS v6.0 - Automatisches Setup Script
REM Dieser Code erstellt die komplette Ordnerstruktur
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ███████████████████████████████████████████████████████████████████████████
echo.
echo     ⚡ SONG-NEXUS v6.0 - AUTOMATISCHES SETUP SCRIPT ⚡
echo.
echo ███████████████████████████████████████████████████████████████████████████
echo.

REM Aktuelles Verzeichnis speichern
set "SCRIPT_DIR=%~dp0"

REM Ordnerstruktur erstellen
echo [1/10] Erstelle Ordnerstruktur...
mkdir frontend 2>nul
mkdir backend 2>nul
mkdir backend\routes 2>nul
mkdir backend\db 2>nul
mkdir backend\logs 2>nul

REM Dateien erstellen
echo [2/10] Erstelle Frontend Datei...
type nul > frontend\index.html

echo [3/10] Erstelle Backend Hauptdatei...
type nul > backend\server.js

echo [4/10] Erstelle Routes...
type nul > backend\routes\auth.js
type nul > backend\routes\payments.js
type nul > backend\routes\users.js
type nul > backend\routes\tracks.js

echo [5/10] Erstelle Konfigurationsdateien...
type nul > backend\package.json
type nul > backend\.env
type nul > backend\.env.example
type nul > backend\.gitignore
type nul > backend\Dockerfile
type nul > backend\docker-compose.yml

echo [6/10] Erstelle Datenbank Schema...
type nul > backend\db\schema.sql

echo [7/10] Erstelle README Datei...
type nul > README.md

echo.
echo ✅ ORDNERSTRUKTUR ERFOLGREICH ERSTELLT!
echo.
echo Aktuelle Struktur:
echo.
tree /F
echo.

REM Hinweise
echo ============================================================================
echo.
echo 📋 NÄCHSTE SCHRITTE:
echo.
echo 1. Kopiere deine heruntergeladenen Dateien in die entsprechenden Ordner:
echo    - song-nexus-v6.0-frontend.html → frontend\index.html
echo    - server.js → backend\server.js
echo    - auth.js → backend\routes\auth.js
echo    - payments.js → backend\routes\payments.js
echo    - users.js → backend\routes\users.js
echo    - tracks.js → backend\routes\tracks.js
echo    - package.json → backend\package.json
echo    - .env.example → backend\.env.example
echo    - docker-compose.yml → backend\docker-compose.yml
echo    - Dockerfile → backend\Dockerfile
echo    - schema.sql → backend\db\schema.sql
echo.
echo 2. Öffne backend\.env.example und kopiere Inhalt nach backend\.env
echo.
echo 3. Fülle .env mit deinen Werten:
echo    - Database Password
echo    - Paypal Client ID & Secret
echo    - JWT Secret
echo.
echo 4. Installiere Dependencies:
echo    cd backend
echo    npm install
echo.
echo 5. Starte Backend:
echo    npm run dev
echo.
echo 6. Öffne Frontend in Browser:
echo    http://localhost:3000
echo.
echo ============================================================================
echo.
echo ✨ Setup abgeschlossen! Weitere Anleitung in COMPLETE_SETUP_GUIDE.md
echo.
pause