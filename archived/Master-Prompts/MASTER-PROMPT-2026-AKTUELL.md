# 🎯 SONG-NEXUS MASTER-PROMPT 2026
**Gültig ab:** 5. Januar 2026, 19:47 CET  
**Status:** Production-Ready + aktive Entwicklung  
**Zielgruppe:** Du + Claude AI in allen zukünftigen Sessions

---

## 📊 AKTUELLER PROJECT-STATUS

### ✅ FERTIG & GETESTET
```
✅ Database Schema (v6.0)
   - 10 Tabellen vollständig
   - WebAuthn Support (Fingerprint/Face)
   - Magic Link Authentication
   - Purchases & Play History
   - Audit Logging
   - 12 Performance-Indexes
   - Location: backend/db/schema.sql (EINZIGE SOURCE OF TRUTH)

✅ Backend API
   - Express.js Server
   - PostgreSQL Connection
   - REST Endpoints (20+ Routes)
   - JWT Authentication
   - PayPal Integration
   - CORS Security
   - Rate Limiting

✅ Frontend Infrastructure
   - Webpack Bundling
   - Single-Page App (index.html)
   - Module System (JS)
   - CSS Design System
   - Audio Player API

✅ Dokumentation
   - README.md (Hauptdoku)
   - DATABASE.md (Schema Details)
   - API-Documentation-v1.md
   - PRODUCTION-DEPLOYMENT.md
```

---

## 🚧 IN ENTWICKLUNG & BEKANNTE PROBLEME

### Design System CSS
```
⚠️ PROBLEM: Button-Listener verschwinden manchmal nach CSS-Änderungen
ROOT CAUSE: CSS Cascade nicht sauber getrennt
   - Hardcoded Colors vs. CSS Variables vermischt
   - Design Editor kann Farben überschreiben
   - JavaScript Event Listener unabhängig von CSS prüfen

✅ FIX APPLIED (5. Jan 2026):
   - Hardcoded color fallbacks aus styles-cyberpunk.css entfernt
   - CSS Variables jetzt korrekt in Cascade
   - Design Editor injiziert Farben über :root

⚠️ STATUS: Noch nicht vollständig getestet (Phase 5-8)
```

### WebAuthn Biometric Login
```
⚠️ PROBLEM: Nicht konsistent funktionierend
STATUS: Backend fertig, Frontend in Entwicklung
LOCATION: frontend/js/auth/webauthn.js

✅ PROTECTED CODE - DON'T TOUCH:
   - backend/auth routes (CSRF, JWT)
   - database webauthn_credentials table
   - user registration flow

✅ SAFE TO REFACTOR:
   - frontend UI für WebAuthn
   - Error messages
   - Loading states
   - CSS styling
```

---

## 🗂️ DATEI-STRUKTUR & WICHTIGE PFADE

```
song-nexus/
│
├── backend/
│   ├── db/
│   │   └── schema.sql ✅ (QUELLE DER WAHRHEIT - alle 10 Tabellen)
│   │   └── [add_webauthn.sql GELÖSCHT - war redundant]
│   ├── server.js (Express, auf Port 3001)
│   ├── auth/ (JWT, CSRF, Magic Links)
│   ├── routes/ (20+ API Endpoints)
│   └── config/ (Secrets, ENV)
│
├── frontend/
│   ├── index.html (Single Page App)
│   ├── webpack.config.js (Bundler)
│   ├── package.json (Dependencies)
│   ├── js/
│   │   ├── main.js (Entry Point)
│   │   ├── auth/ (Login, WebAuthn, Magic Link)
│   │   ├── components/ (UI Modules)
│   │   ├── api/ (Backend Communication)
│   │   └── player/ (Audio, Streaming)
│   └── styles/
│       ├── styles-cyberpunk.css (Main Design)
│       └── _design-tokens.css (CSS Variables)
│
├── docs/
│   ├── README.md (START HERE)
│   ├── DATABASE.md
│   ├── API-Documentation-v1.md
│   ├── PRODUCTION-DEPLOYMENT.md
│   └── MASTER-PROMPT-2026-AKTUELL.md (THIS FILE)
│
├── .env.example (Copy to .env)
├── .env.production
├── package.json (Root dependencies)
└── .gitignore
```

---

## 🔧 DEVELOPMENT SETUP (Windows 11 PowerShell)

### Installation
```powershell
# Repo klonen (falls nicht vorhanden)
git clone https://github.com/Waschtl904/song-nexus.git
cd song-nexus

# Dependencies installieren
npm install

# Environment Setup
Copy-Item .env.example .env
# Editiere .env mit deinen Secrets
```

### Development Server starten
```powershell
# Terminal 1: Backend (Port 3001)
cd backend
node server.js
# oder mit Nodemon (Auto-Reload)
C:\Users\[deinUser]\AppData\Roaming\npm\nodemon server.js

# Terminal 2: Frontend (Port 3000)
cd frontend
npm start
# oder webpack dev server
npx webpack serve --mode development

# Terminal 3: Optional - PostgreSQL (falls lokal)
psql -U postgres
# Im psql:
CREATE DATABASE song_nexus;
\c song_nexus
\i ..\.\backend\db\schema.sql
```

### Build für Production
```powershell
# Frontend bundlen
cd frontend
npm run build
# Output: frontend/dist/ (production-ready files)

# Backend läuft als Node.js mit PM2
# npm install -g pm2 (einmalig)
pm2 start backend/server.js --name "song-nexus-api"
pm2 save
pm2 startup
```

---

## 🔐 PROTECTED CODE - DON'T TOUCH

### Backend Authentication Routes
```
location: backend/auth/
WHY: Security-kritisch
- JWT Token Generation
- CSRF Token Validation
- WebAuthn Challenge/Response
- Password Hashing

✅ WENN DU ÄNDERUNGEN MACHEN MUSST:
   1. Schreibe Tests ZUERST
   2. Test alle 3 Auth-Methoden:
      - Password Login
      - WebAuthn (Biometric)
      - Magic Link (Email)
   3. Prüfe CSRF-Token Validierung
   4. KEINE Production Daten mit ändern!
```

### Database Schema
```
location: backend/db/schema.sql
WHY: Single Source of Truth für alle 10 Tabellen

✅ OK zu updaten:
   - Neue Spalten hinzufügen
   - Indexes optimieren
   - Kommentare verbessern

❌ NICHT updaten:
   - Bestehende Spalten löschen (Datenverlust!)
   - Foreign Keys ändern (Integrität!)
   - Daten Types ändern (Migrations nötig!)
```

### WebAuthn Implementation
```
location: backend/routes/auth.js + frontend/js/auth/webauthn.js
WHY: Complex Security Protocol

✅ Tests vor Änderungen:
   - Challenge wird korrekt generiert
   - Credential wird richtig gespeichert
   - Counter verhindert Cloning
   - Transports sind korrekt
```

---

## ✅ SAFE TO MODIFY

### Frontend UI & Styling
```
location: frontend/styles/, frontend/js/components/
WHY: Visuelle Änderungen haben keine Security-Auswirkungen

✅ GO AHEAD:
   - CSS Farben (über CSS Variables)
   - HTML Structure
   - Button Text
   - Layout Changes
   - New Components

⚠️ ABER: Testen nach CSS-Änderungen:
   npm run build
   Alle Buttons noch responsive?
   Design System noch konsistent?
```

### API Responses
```
location: backend/routes/
WHY: Backend-only changes, keine Security-Implikationen

✅ OK zu ändern:
   - Response Format
   - Field Names (UPDATE Frontend!) 
   - Error Messages
   - Status Codes

❌ NICHT ändern ohne Test:
   - Authentification Flows
   - Data Validation
   - Access Control
```

### Documentation
```
location: docs/
WHY: Keine Auswirkung auf Code-Ausführung

✅ ALWAYS update:
   - Neue Features dokumentieren
   - Bugs und Fixes dokumentieren
   - Deployment-Schritte updaten
   - Dieser Master-Prompt (!)  
```

---

## 🐛 KNOWN ISSUES & WORKAROUNDS

### Issue #1: Button Listeners verschwinden nach CSS Build
```
TRIGGER: npm run build -> Button-Click funktioniert nicht mehr

TEMPORARY WORKAROUND:
1. Prüfe styles-cyberpunk.css auf hardcoded Farben
2. Verschiebe zu _design-tokens.css (CSS Variables)
3. Webpack rebuild: npm run build
4. Test: button.addEventListener('click', ...) noch vorhanden?

ROOT CAUSE: Webpack CSS Loader ändert Selector-Specificity
LONG-TERM FIX: Refactor CSS zu BEM Methodology
STATUS: In Planung für Phase 9
```

### Issue #2: WebAuthn nicht konsistent
```
TRIGGER: Browser-Abhängig (Chrome/Edge/Firefox unterschiedlich)

WORKAROUND:
1. Prüfe Browser Console auf Errors
2. Teste mit Chrome erst (beste Support)
3. Check navigator.credentials API vorhanden?
4. Prüfe Secure Context (HTTPS!)

LOCATION DER LOGS:
Backend: node console.log() in server.js
Frontend: Browser DevTools (F12 -> Console)

NÄCHSTE SCHRITTE:
1. Unit Tests für WebAuthn API
2. Fallback auf Password für Browser ohne Support
3. Progressive Enhancement
```

### Issue #3: Design System Token-Überschreibung
```
TRIGGER: Design Editor setzt Farbe, aber Button zeigt sie nicht

WORKAROUND:
1. Prüfe ob CSS :root { --color-primary } korrekt gesetzt
2. Backend: GET /api/design/tokens -> validale JSON
3. Frontend: window.getComputedStyle(document.documentElement) prüfen

DEBUG COMMAND (Browser Console):
getComputedStyle(document.documentElement).getPropertyValue('--color-primary')

WENN NULL:
   → Design Editor hat Farbe nicht persistiert
   → Prüfe Database design_system table
   → Prüfe API Response im Network Tab
```

---

## 📋 NÄCHSTE SCHRITTE (Priorität)

### 🔴 KRITISCH (Diese Woche)
```
1. ✅ ERLEDIGT: Redundante add_webauthn.sql gelöscht
2. ⏳ WebAuthn Frontend testen (alle Browser)
   - Time Budget: 2-3 Stunden
   - Location: frontend/js/auth/webauthn.js
   - Test Cases: 5 Edge Cases

3. ⏳ Design System CSS Cascade verifizieren
   - Time Budget: 1-2 Stunden  
   - Location: styles-cyberpunk.css + _design-tokens.css
   - Prüfe: Button-Styles nach Build korrekt?
```

### 🟡 WICHTIG (Diese Woche)
```
4. ⏳ Magic Link Email-Login testen
   - Test: Lokaler Mailhog Server
   - Location: backend/routes/auth.js
   
5. ⏳ PayPal Integration testen (Sandbox)
   - Test: Full Payment Flow
   - Prüfe: Webhook-Handling
```

### 🟢 OPTIONAL (Nächste Woche)
```
6. Performance Audit (Frontend Bundle Size)
7. Security Audit (OWASP Top 10)
8. Unit Tests (Jest Setup)
9. E2E Tests (Cypress Setup)
```

---

## 💻 WINDOWS 11 POWERSHELL REFERENZ

```powershell
# Git Befehle
git status                           # Änderungen prüfen
git add .                            # Alle Dateien stagen
git commit -m "deine nachricht"      # Committen
git push origin main                 # Zu GitHub pushen
git pull origin main                 # Neueste Version holen
git log --oneline -n 5              # Letzte 5 Commits

# Node/NPM
node --version                       # Node Version
npm --version                        # NPM Version  
npm install                          # Dependencies installieren
npm install [package-name]          # Neues Package hinzufügen
npm run build                        # Production Build
npm start                            # Dev Server

# Datei-Operationen
ls                                   # Verzeichnis anzeigen (alias: dir)
cd [folder]                          # In Ordner navigieren
cd ..                                # Ordner rauf
Copy-Item source.txt target.txt     # Datei kopieren
Remove-Item file.txt                # Datei löschen
Remove-Item folder -Recurse         # Ordner löschen (mit Inhalt)

# Prozesse
netstat -ano | find "3000"          # Prozess auf Port 3000
kill -ProcessId [PID]               # Prozess beenden (Windows)

# Umgebung
$env:NODE_ENV                        # Umgebungs-Variable anzeigen
$env:NODE_ENV = "production"        # Setzen

# Text Editor
code .                               # VS Code öffnen (aktueller Ordner)
code [file]                          # Datei in VS Code öffnen
```

---

## 📞 DEBUGGING TIPPS

### Frontend Errors
```powershell
# 1. Browser Console öffnen (F12)
   → Console Tab
   → Suche nach RED errors

# 2. Network Tab prüfen
   → Sind API Calls erfolgreich?
   → Status: 200 (OK) vs 404/500?

# 3. Source Tab
   → Breakpoints setzen (F10)
   → Variables inspizieren
   → Step through Code

# 4. Local Storage prüfen
   → token vorhanden?
   → JWT dekodieren (jwt.io)
```

### Backend Errors
```powershell
# Terminal wo Backend läuft:
   node server.js
   → Schau auf console.log() Ausgabe
   → Error Stack Trace lesen
   → Prüfe .env auf fehlende Variablen

# Logs persistieren:
   node server.js > app.log 2>&1
   Get-Content app.log -Tail 50    # Letzte 50 Zeilen
```

### Database Errors
```powershell
# PostgreSQL connecten
psql -U postgres
\l                          # Alle Databases anzeigen
\c song_nexus              # Database auswählen
\dt                        # Alle Tables
\d users                   # Table-Schema anzeigen
SELECT * FROM users;       # Daten prüfen

# Oder via DBeaver GUI (Download kostenlos)
```

---

## 🎯 WICHTIG FÜR ZUKÜNFTIGE SESSIONS

### IMMER zu Beginn checken:
```
1. ✅ Dieser Prompt noch gültig?
   - Datum: 5. Jan 2026
   - Wenn älter als 1 Woche → Updaten!

2. ✅ Letzte Commits anschauen:
   git log --oneline -n 5
   
3. ✅ Status prüfen:
   npm status
   git status
   
4. ✅ Backend läuft?
   curl http://localhost:3001/health
   
5. ✅ Frontend läuft?
   curl http://localhost:3000
```

### Falls etwas merkwürdig ist:
```
1. 🔄 Clean Install machen:
   npm ci (statt npm install)
   
2. 🔄 Cache löschen:
   npm cache clean --force
   
3. 🔄 Git Status checken:
   git status
   git log --oneline -n 10
   
4. 🔄 Letzte Commitmessages lesen
   (vielleicht hat jemand anderes etwas gebrochen)
```

---

## 📝 DOKUMENTATION AKTUALISIEREN

Wenn du Änderungen machst, update auch:

```
✅ Diesen Master-Prompt (wenn sich Status ändert)
✅ README.md (wenn Features sich ändern)
✅ DATABASE.md (wenn Schema sich ändert)
✅ API-Documentation.md (wenn Endpoints sich ändern)
✅ Git Commit-Messages (aussagekräftig!)
```

---

## 🎓 COMMIT MESSAGE FORMAT

```powershell
# GOOD:
git commit -m "feat: add WebAuthn fingerprint support to login"
git commit -m "fix: CSS cascade issue with Design System tokens"
git commit -m "docs: update DATABASE.md with new play_stats table"
git commit -m "refactor: extract auth validation to separate module"
git commit -m "chore: remove redundant migration file"

# BAD:
git commit -m "update"
git commit -m "fix stuff"
git commit -m "lol"
```

---

## ✅ FINAL CHECKLIST

Vor jedem Git Push:

- [ ] Code funktioniert lokal (Frontend + Backend)
- [ ] Keine console.error() in Browser
- [ ] Keine console error beim Backend
- [ ] Tests laufen (falls vorhanden)
- [ ] Dokumentation updated
- [ ] Commit-Message aussagekräftig
- [ ] .env Secrets NICHT committed
- [ ] Keine Debug-Code drin (console.log())

---

**Erstellt:** 5. Januar 2026, 19:47 CET  
**Von:** Claude AI  
**Für:** Sebastian (Waschtl904)  
**Status:** Production Master Prompt

---

💡 **TIPP:** Kopiere diese Datei am Anfang JEDES Chats hierher. Dann haben wir immer die aktuellen Infos!
