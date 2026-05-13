# 🎵 SONG-NEXUS Master Prompt
**Datum:** 13. Mai 2026 (aktualisiert nach Live-DB-Audit)  
**Status:** Production Ready + DB bereinigt (Schema v1.1)  
**System:** Windows 11 Pro, Windsurf (VSCode-Fork), PowerShell / Git Bash  
**Repository:** [Waschtl904/song-nexus](https://github.com/Waschtl904/song-nexus)

---

## 📋 QUICK START (Read This First!)

**For every new development session:**

1. Copy this file into your chat
2. Read "Current Status" section
3. Check "Known Issues & Workarounds"
4. Proceed with development

**Why?** Prevents regression bugs. Single source of truth.

---

## ✅ Current Status (13. Mai 2026)

### Overall Status
🟢 Production Ready v1.1
🟢 All major features working
🟢 CSS refactor complete (no !important)
🟢 Design system API integration working
🟢 Play button fixed & visible
🟢 Database schema cleaned & verified (v1.1)
🟢 Documentation aligned with live DB

### Was sich seit Februar 2026 geändert hat
✅ Live-DB-Audit durchgeführt (13. Mai 2026, pgAdmin4)
✅ Schema v1.1: Redundante Tabellen und Spalten entfernt
✅ `magic_links` Tabelle entfernt (veraltet, 0 Einträge – aktiv: `magic_link_tokens`)
✅ `users.webauthn_credential` (jsonb) entfernt (nie befüllt)
✅ `tracks.price` entfernt (Duplikat von `price_eur`)
✅ `tracks.duration` entfernt (Duplikat von `duration_seconds`)
✅ `design_system`: UNIQUE index auf `is_active=true` hinzugefügt
✅ Repo bereinigt: node_modules nicht mehr getrackt, .env.production.example
✅ `schema_clean.sql` ist jetzt die führende Schema-Datei
✅ `migration_cleanup.sql` auf Live-DB angewendet
✅ `DATABASE.md` vollständig aktualisiert

---

## 🔐 Authentication Status

### WebAuthn (Biometric)
✅ Backend: COMPLETE & WORKING
   - Registration endpoint: /api/auth/webauthn/register-options ✅
   - Authentication endpoint: /api/auth/webauthn/authenticate-options ✅
   - Credential verification: SECURE ✅
   - Database storage: webauthn_credentials table ✅
   - HINWEIS: users.webauthn_credential (jsonb) wurde entfernt – nur webauthn_credentials-Tabelle ist aktiv

⚠️ Frontend: IN DEVELOPMENT
   - UI for biometric login: Implemented
   - Browser API integration: Working
   - Error handling: Improved
   - Note: Cross-browser testing noch ausstehend

Status: DO NOT CHANGE webauthn.js unless critical bug!

### Password Authentication
✅ WORKING PERFECTLY
   - Registration: /api/auth/register ✅
   - Login: /api/auth/login ✅
   - Token verification: /api/auth/verify ✅
   - Token refresh: /api/auth/refresh-token ✅
   - Logout: /api/auth/logout ✅ (race condition FIXED)
   - Bcrypt hashing: bcryptjs ✅

Status: PRODUCTION GRADE

### Magic Link Authentication
✅ WORKING
   - Magic link generation: ✅
   - Email sending: Configured ✅
   - Token expiration: 1 hour ✅
   - Aktive Tabelle: magic_link_tokens (NICHT magic_links – diese Tabelle wurde entfernt)

Status: SECONDARY AUTH METHOD (not primary)

---

## 🎨 Design System Status

### CSS Variables (55 tokens total)
✅ WORKING & INTEGRATED
   - Primary colors: var(--color-primary) [#00cc77 default]
   - Accent colors: var(--color-accent-*) [#ffaa00 default]
   - Spacing tokens: var(--space-*)
   - Typography tokens: var(--font-*)
   - Shadow tokens: var(--shadow-*)
   - Border radius tokens: var(--radius-*)

✅ Backend Integration:
   - design_system table: Stores all 27 core tokens
   - API endpoint: /api/design-system/tokens
   - Dynamic loading: Works on page load
   - Real-time updates: Partially implemented
   - WICHTIG: Immer mit WHERE is_active = true LIMIT 1 abfragen (UNIQUE constraint)

✅ Frontend Integration:
   - CSS variables apply correctly
   - Webpack doesn't break variable references
   - Color changes apply globally
   - No hardcoded colors in critical files

### Frontend Files Using CSS Variables
SAFE TO MODIFY (use CSS variables):
  ✅ frontend/css/main.css
  ✅ frontend/css/player.css
  ✅ frontend/css/design-tokens.css
  ✅ frontend/css/tracks.css

DANGEROUS TO MODIFY:
  ⛔ Color hardcodes (if any remain)
  ⛔ !important declarations (REMOVED - don't re-add)
  ⛔ Inline styles with hardcoded values

Status: DO NOT RE-ADD !important!

---

## 🎯 Protected Code (DO NOT TOUCH!)

### WebAuthn Module
File: frontend/js/webauthn.js
Status: CRITICAL SECURITY CODE
Action: READ-ONLY (unless critical bug)

### Authentication Flow
File: frontend/js/auth.js
Status: CRITICAL AUTHENTICATION
Action: VERY CAREFUL MODIFICATIONS ONLY

Protected sections:
  - JWT token handling
  - Token refresh logic
  - Logout sequence (JUST FIXED - don't break!)
  - Session management

### Backend Database Schema
Führende Datei: schema_clean.sql (Root) ← DIESE verwenden!
Historisch:      schema.sql (Root)      ← veraltet, enthält Redundanzen
NIEMALS:         backend/db/schema.sql  ← existiert nicht mehr

Status: MIGRATIONS ONLY (never direct schema changes)

Tabellen die NIEMALS direkt geändert werden dürfen:
  - users (id, email, password_hash – KEIN webauthn_credential mehr)
  - webauthn_credentials (security-critical)
  - tracks (audio_filename references – Preisspalte: price_eur, Dauerspalte: duration_seconds)
  - orders/purchases (financial data)

---

## 🟢 Safe to Modify (Safe Zones)

### UI & Styling (100% Safe)
✅ SAFE TO CHANGE:
  - CSS files (use CSS variables!)
  - HTML templates (styling only)
  - Button designs, Layout & spacing
  - Colors (via CSS variables)
  - Animations & transitions
  - Responsive breakpoints

### Track/Audio Features (Safe)
✅ SAFE TO MODIFY:
  - Track upload form UI
  - Audio player controls
  - Genre categorization
  - Track metadata display

AVOID MODIFYING:
  - Audio stream endpoints (backend)
  - Authentication before playback
  - Payment integration

---

## 📦 Datenbankzustand (Stand 13. Mai 2026)

### Aktive Tabellen (9)
| Tabelle | Beschreibung |
|---|---|
| users | Benutzerkonten (OHNE webauthn_credential jsonb) |
| tracks | Musik (price_eur + duration_seconds sind die einzigen Preis-/Dauerspalten) |
| orders | PayPal-Transaktionen |
| purchases | Käufe + Lizenztypen |
| play_history | Play-Events |
| play_stats | Erweiterte Analytics |
| magic_link_tokens | Magic-Link-Auth (einzige aktive Magic-Link-Tabelle) |
| webauthn_credentials | Biometrische Credentials |
| design_system | Design-Tokens (Admin, max. 1 aktive Zeile) |

### Wichtige Spaltenhinweise
- tracks.price_eur → einzige Preisspalte (tracks.price entfernt)
- tracks.duration_seconds → einzige Dauerspalte (tracks.duration entfernt)
- Aktive Tracks: WHERE is_published = true AND is_deleted = false (aktuell: 4 Stück)

---

## ⚠️ Known Issues & Workarounds

### 1. WebAuthn Browser Support
Issue: WebAuthn not available on some devices
Status: EXPECTED BEHAVIOR
Workaround: Provide password login as fallback ✅

Testing:
  - Desktop Chrome: ✅ Works
  - Desktop Firefox: ✅ Works
  - Mobile Chrome Android: ✅ Works
  - Safari macOS: ⚠️ Limited support
  - Windows Hello: ✅ Works

### 2. Design Token Refresh
Issue: CSS variables don't update without page reload
Status: PARTIAL (API ready, frontend optimization pending)
Workaround: Hard refresh (Ctrl+Shift+R) to see changes
Next step: Implement dynamic CSS injection without reload
Priority: LOW

### 3. Audio Streaming in Development
Issue: HTTPS required for audio streaming
Status: EXPECTED (security requirement)
Solution: Use mkcert for local SSL ✅
Command: cd backend && npm run generate-cert

### 4. PostgreSQL Connection Issues
Check:
  1. PostgreSQL is running: Get-Service postgresql* (PowerShell)
  2. Port 5432 is open: netstat -an | findstr 5432
  3. DATABASE_URL in .env is correct

Default LOCAL database:
  User: postgres
  Database: song_nexus_dev
  Host: localhost:5432

### 5. Port Already in Use
PowerShell fix:
  $pid = (Get-NetTCPConnection -LocalPort 3000).OwningProcess
  Stop-Process -Id $pid -Force

---

## 🛠️ Setup-Befehle

### Frische Installation
```powershell
# Clone repo
git clone https://github.com/Waschtl904/song-nexus.git
cd song-nexus

# Dependencies installieren
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Env-Dateien anlegen
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env
notepad backend/.env
notepad frontend/.env

# Datenbank anlegen
psql -U postgres -c "CREATE DATABASE song_nexus_dev;"

# Schema einspielen – schema_clean.sql ist die führende Datei!
psql -U postgres -d song_nexus_dev -f schema_clean.sql

# SSL-Zertifikate generieren
cd backend && npm run generate-cert && cd ..
```

### Development
```powershell
npm start          # Backend + Frontend
npm run server     # Backend only (port 3000)
npm run client     # Frontend only (port 5500)
npm run build      # Webpack production build
npm run build:dev  # Webpack dev build
```

### Git Workflow
```bash
git status
git add .
git commit -m "feat: add new feature"
git push origin main
```

---

## 📊 API Endpoints (35 Total) ✅ COMPLETE

### Authentication (7)
POST   /api/auth/register               ✅
POST   /api/auth/login                  ✅
POST   /api/auth/verify                 ✅
GET    /api/auth/me                     ✅
POST   /api/auth/refresh-token          ✅
POST   /api/auth/logout                 ✅
POST   /api/auth/dev-login              ✅

### WebAuthn Biometric (5)
POST   /api/auth/webauthn/register-options     ✅
POST   /api/auth/webauthn/register-verify      ✅
POST   /api/auth/webauthn/authenticate-options ✅
POST   /api/auth/webauthn/authenticate-verify  ✅
POST   /api/auth/webauthn/register-password    ✅

### Tracks (4)
GET    /api/tracks                     ✅
GET    /api/tracks/:id                 ✅
GET    /api/tracks/audio/:filename     ✅
GET    /api/tracks/genres/list         ✅

### Admin (4)
POST   /api/admin/tracks/upload        ✅
GET    /api/admin/tracks/list          ✅
PUT    /api/admin/tracks/:id           ✅
DELETE /api/admin/tracks/:id           ✅

### Payments (6)
GET    /api/payments/config            ✅
POST   /api/payments/create-order      ✅
POST   /api/payments/capture-order/:id ✅
GET    /api/payments/user-purchases    ✅
GET    /api/payments/history           ✅
GET    /api/payments/stats             ✅

### Users (5)
GET    /api/users/profile              ✅
GET    /api/users/stats                ✅
GET    /api/users/purchases            ✅
GET    /api/users/play-history         ✅
GET    /api/users/leaderboard          ✅

### Play History (4)
POST   /api/play-history/              ✅
GET    /api/play-history/user/:userId  ✅
DELETE /api/play-history/user/:userId  ✅
GET    /api/play-history/stats/user/:userId ✅

---

## 📁 Project Structure (Key Files)

```
SONG-NEXUS/
├── frontend/
│   ├── js/
│   │   ├── auth.js                 # 🔴 PROTECTED
│   │   ├── webauthn.js             # 🔴 PROTECTED
│   │   ├── player.js
│   │   ├── design-system-loader.js # 🟢 CSS variables loader
│   │   └── ...
│   └── css/
│       ├── main.css                # 🟢 SAFE
│       ├── player.css              # 🟢 SAFE
│       └── ...
│
├── backend/
│   ├── routes/
│   │   ├── auth.js                 # 🔴 PROTECTED
│   │   ├── webauthn.js             # 🔴 PROTECTED
│   │   ├── tracks.js               # 🟢 SAFE
│   │   └── payments.js             # 🟡 CAREFUL
│   ├── server.js                   # 🔴 PROTECTED
│   └── db.js                       # 🔴 PROTECTED
│
├── schema_clean.sql                # ✅ FÜHRENDES SCHEMA (v1.1)
├── schema.sql                      # ⚠️ Veraltet (v1.0, mit Redundanzen)
├── migration_cleanup.sql           # ✅ Migration v1.0→v1.1 (bereits angewendet)
├── DATABASE.md                     # ✅ Aktuelle DB-Dokumentation
├── README.md                       # ✅ Projektübersicht
└── MASTER-PROMPT-2026-AKTUELL.md   # 👈 DIESE DATEI
```

---

## 🚀 Next Steps / Priorities

### Sofort (Nächste Session)
1. ✅ git pull origin main
2. ✅ npm install (root, frontend, backend)
3. ✅ Login testen (Passwort + WebAuthn)
4. ✅ CSS variables check

### Kurzfristig
Priority 1: Testing & Tooling
  - Jest für Backend-Auth-Tests einrichten
  - ESLint + Stylelint konfigurieren
  - Minimaler GitHub Actions Workflow
  - Status: NOT STARTED

Priority 2: WebAuthn Frontend Stabilization
  - Cross-browser tests
  - Error messages verbessern
  - Status: IN DEVELOPMENT

Priority 3: Design System Real-time Updates
  - Dynamic CSS injection ohne Page-Reload
  - Status: API READY, FRONTEND PENDING

### Mittelfristig
1. Advanced Search & Filtering
2. Playlist Creation
3. Social Features
4. Mobile Optimization

---

## 📋 Quick Reference Checklist

Vor der Arbeit:
- [ ] git pull origin main
- [ ] PostgreSQL läuft? (Get-Service postgresql*)
- [ ] npm install erledigt?
- [ ] .env files konfiguriert?
- [ ] Welche Dateien sind 🔴 PROTECTED?

Während der Entwicklung:
- [ ] CSS variables für Farben verwendet?
- [ ] Browser DevTools offen?
- [ ] Regelmäßig committen?

Vor dem Push:
- [ ] npm run build erfolgreich?
- [ ] Alle Features getestet?
- [ ] Keine Console-Errors?
- [ ] git push origin main?

---

## 📝 Document Metadata

| Aspect | Detail |
|--------|--------|
| **Erstellt** | 6. Januar 2026 |
| **Letzte Aktualisierung** | 13. Mai 2026, 14:35 CEST |
| **Status** | ✅ Verifiziert gegen Live-DB |
| **Version** | 3.0 (nach DB-Audit und Schema-Bereinigung) |
| **Autor** | Sebastian |

---

## 🔗 Related Files

- **[README.md](./README.md)** – Projektübersicht, Features, Tech Stack
- **[DATABASE.md](./DATABASE.md)** – ✅ Aktuelle DB-Dokumentation (v1.1)
- **[schema_clean.sql](./schema_clean.sql)** – ✅ Führendes Schema (v1.1)
- **[migration_cleanup.sql](./migration_cleanup.sql)** – Migration v1.0→v1.1 (bereits angewendet)
- **[PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)** – Deployment

**Veraltete Dateien (ignorieren):**
- schema.sql – v1.0, enthält Redundanzen
- MASTER-PROMPT-2026-DEFINITIVE.md – überholt
- MASTER-CONTEXT-PROMPT.md – überholt
- REPOSITORY-STRUCTURE.md – überholt
