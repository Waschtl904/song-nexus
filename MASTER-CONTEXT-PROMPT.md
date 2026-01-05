# 🎵 SONG-NEXUS - MASTER CONTEXT PROMPT (v3 - ACTUAL DB)

> **Verwendbar für neue Chat-Sessions um aktuellen Projekt-Status zu verstehen**

**Letztes Update:** 5. Januar 2026 (14:42 CET)  
**Status:** ✅ Production-Ready (nach Fixes)  
**DB Schema:** ✅ VERIFIED aus pgAdmin 4 (10 Tabellen)  
**Nächster Step:** Design-System stabilisieren → WebAuthn härten → Production deployen

---

## 📍 AKTUELLER PROJEKT-STATUS

### ✅ Was FERTIG & GETESTET ist:
- ✅ Backend API komplett (35 Endpoints)
- ✅ Audio Streaming mit Player
- ✅ PayPal Integration (Sandbox getestet)
- ✅ PostgreSQL Schema mit 10 Tabellen (VERIFIZIERT)
- ✅ JWT Authentication (7 Tage TTL)
- ✅ Express Server mit HTTPS support (mkcert)
- ✅ Frontend Webpack Bundle (83.5 KiB)
- ✅ Magic Link Authentication
- ✅ WebAuthn Credentials Table
- ✅ Play Stats & Analytics
- ✅ Design System API Endpoints
- ✅ `.env.example` Dateien (backend + frontend)
- ✅ `PRODUCTION-DEPLOYMENT.md` Guide
- ✅ Master-Context-Prompt mit echtem Schema

### 🚧 Was IN ARBEIT ist:
- 🚧 WebAuthn biometric implementation (fragil, siehe Probleme)
- 🚧 Frontend Design & UI (Theme-System instabil)
- 🚧 Color/Theme Panel (nur Primärfarbe + Text funktionieren)
- 🚧 WebAuthn Button-Integration (anfällig für Bruch bei Code-Änderungen)

### 📊 Datenbank-Schema (10 Tabellen - REAL):

**Tables in PostgreSQL (song_nexus_dev) - aus pgAdmin 4:**
```
✅ design_system           - Theme/Design-Token Speicherung
✅ magic_link_tokens       - Alte Magic-Link Tokens (Archiv/Migration)
✅ magic_links             - Email-basiertes Login (Magic Links)
✅ orders                  - PayPal Transaktionen
✅ play_history            - Track Play Events für Analytics
✅ play_stats              - Erweiterte Player-Statistiken
✅ purchases               - Gekaufte Tracks pro User
✅ tracks                  - Music Metadata & Files
✅ users                   - User Accounts & Credentials
✅ webauthn_credentials    - Biometric Auth (Fingerprint/Face)
```

**Schema Source:** pgAdmin 4 Direct Verification ✅ (5.1.2026)

---

## 🔴 KRITISCHE PROBLEME

### Problem 1: Design-System nicht stabil
**Symptom:** Theme-Panel ändert Farben, aber nur bei Primärfarbe und Text. Andere Komponenten nicht betroffen.  
**Ursache:** Color-Tokens nicht richtig in allen Komponenten implementiert  
**Impact:** **KANN NICHT AN DESIGN ARBEITEN BIS GELÖST**

**Workaround:** Screenshots vergleichen, Fehler identifizieren, CSS fixen  
**Files:** `frontend/css/design-system.css`

### Problem 2: WebAuthn-Implementierung fragil
**Symptom:** Button-Listener verschwinden wenn andere Bugs gefixt werden  
**Ursache:** WebAuthn-Logic zu tight mit DOM-Elementen gekoppelt  
**Impact:** **KANN NICHT SICHER AN OTHER FEATURES ARBEITEN**

**Lösung:** WebAuthn in separates Module isolieren, explizit Event-Listener registrieren  
**Files:** `frontend/js/webauthn.js`, `frontend/js/auth.js`

### Problem 3: Design-Verlust bei Code-Changes
**Symptom:** Originales Design sieht anders aus als jetzt  
**Ursache:** Theme-Panel / CSS-Variablen nicht konsistent über alle Komponenten  
**Evidence:** Screenshots (noch zu senden)

---

## 🎯 EMPFOHLENE ARBEITSREIHENFOLGE

### Phase 1: Design-System stabilisieren (SOFORT)
**Dauer:** ~4-6 Stunden  
**Ziel:** Theme-Panel 100% funktional für alle Colors

**Schritte:**
1. Screenshots von Original vs Current vergleichen
2. Audit: Alle CSS-Variablen in `design-system.css` durchgehen
3. Fix: Komponenten die hardcoded Colors haben → CSS-Variablen verwenden
4. Test: Theme-Panel mit ALLEN Color-Tokens testen
5. Verify: Screenshots vergleichen nach Fixes

**Warum JETZT?** Ohne das kannst du nicht sicher am Design arbeiten.

### Phase 2: WebAuthn stabilisieren (PARALLEL)
**Dauer:** ~3-4 Stunden  
**Ziel:** WebAuthn vollständig entkoppelt, nicht betroffen von Code-Changes

**Schritte:**
1. Refactor: WebAuthn Module isolieren (separate file)
2. Init: Event-Listener explizit in init-Function registrieren
3. Error-Handle: Missing elements gracefully (log warning, nicht crash)
4. Test: Manuell Button-Clicks durchspielen nach Code-Changes

**Warum PARALLEL?** Braucht nicht auf Phase 1 zu warten.

### Phase 3: Production Config (danach)
**Dauer:** ~2 Stunden  
**Ziel:** .env.example, Deployment-Guide, alles ready

**Status:** ✅ DONE
- backend/.env.example ✅ erstellt
- frontend/.env.example ✅ erstellt
- PRODUCTION-DEPLOYMENT.md ✅ erstellt

### Phase 4: Design Work (erst danach!)
**Dauer:** Abhängig von Umfang  
**Ziel:** Finales Design implementiert

**Schritte:**
1. Screenshots vergleichen (Original vs Current)
2. Fehlende UI-Elemente identifizieren
3. CSS/HTML fixen
4. Responsive Design testen
5. Cross-browser testing

---

## 📊 DATENBANK DETAILS (10 Tabellen - VERIFIZIERT)

### 1. **users**
User Accounts & Authentication
```
id, email (UNIQUE), username (UNIQUE), password_hash, 
webauthn_credential (JSONB?), created_at, updated_at
```

### 2. **tracks**
Music Metadata & File Information
```
id, name, artist, genre, description, price, is_free, 
audio_filename, duration_seconds, created_at, deleted_at
```

### 3. **orders**
PayPal Transactions
```
id, user_id (FK→users), paypal_order_id (UNIQUE), amount, 
description, status, currency, transaction_id, created_at, completed_at, updated_at
```

### 4. **purchases**
Kauf-History (Track pro User)
```
id, user_id (FK→users), track_id (FK→tracks), price, 
license_type, expires_at, purchased_at, UNIQUE(user_id, track_id)
```

### 5. **play_history**
Track Play Events
```
id, user_id (FK→users), track_id (FK→tracks), 
played_at, duration_played_seconds, session_id
```

### 6. **play_stats**
Erweiterte Player-Statistiken
```
id, user_id (FK→users), track_id (FK→tracks), 
is_paid, device_type, duration_played_seconds, played_at, session_id
```

### 7. **webauthn_credentials**
Biometric Auth (Fingerprint/Face/Pin)
```
id, user_id (FK→users), credential_id (UNIQUE), 
public_key (BYTEA), counter, transports (TEXT[]), 
created_at, last_used
```

### 8. **magic_links**
Email-basiertes Login
```
id, user_id (FK→users), token (UNIQUE), 
expires_at, used_at, created_at, ip_address, user_agent
```

### 9. **magic_link_tokens**
Altere Magic-Link Implementation (Archiv)
```
id, user_id (FK→users), token (UNIQUE), 
expires_at, created_at, cmax, cmin, tableid
```

### 10. **design_system**
Theme/Design-Token Speicherung
```
id, background_image_url, border_radius, button_background_color,
button_border_radius, button_padding, button_text_color,
color_accent_green, color_accent_red, color_background,
color_primary, color_secondary, ... (70+ color/style tokens),
created_at, updated_at
```

---

## 📁 WICHTIGE DATEIEN REFERENCE

### Backend
```
backend/
├── server.js                    # Express server (HTTPS, 35 Endpoints)
├── .env.example                 # ✅ Template mit allen Variablen
├── db/
│   ├── schema.sql               # ✅ CURRENT (10 tables, verified)
│   └── add_webauthn.sql         # WebAuthn extension
├── routes/
│   ├── auth.js                  # Email/Password
│   ├── magic-links.js           # Magic Link routes
│   ├── webauthn.js              # Biometric (FRAGIL!)
│   ├── tracks.js                # Track CRUD
│   ├── payments.js              # PayPal
│   ├── purchases.js             # Purchase tracking
│   ├── design-system.js         # Theme API
│   └── analytics.js             # Play stats
└── middleware/
    ├── auth-middleware.js       # JWT verification
    ├── cache-middleware.js      # Response caching
    └── error-handler.js         # Error handling
```

### Frontend
```
frontend/
├── webpack.config.js            # Build configuration
├── .env.example                 # ✅ Template mit allen Variablen
├── js/
│   ├── webauthn.js              # Biometric (FRAGIL!)
│   ├── auth.js                  # Auth flows
│   ├── magic-links.js           # Magic link handler
│   ├── player.js                # Audio player
│   ├── api-client.js            # API wrapper
│   └── main.js                  # Webpack entry
├── css/
│   └── design-system.css        # Theme (UNSTABLE!)
└── html/
    ├── index.html               # Main entry
    ├── auth.html                # Login/signup
    └── player.html              # Player page
```

### Root
```
.
├── README.md                    # Project overview
├── schema.sql                   # ⚠️ OUTDATED (use backend/db/schema.sql)
├── .env.production              # 🔐 REAL config (DO NOT COMMIT!)
├── MASTER-CONTEXT-PROMPT.md     # ✅ This file (v3 - with 10 tables)
├── PRODUCTION-DEPLOYMENT.md     # ✅ Full deployment guide
├── backend/db/schema.sql        # ✅ CURRENT Schema (10 tables verified)
├── package.json                 # Root package
└── .gitignore                   # (should ignore .env files)
```

---

## 🔧 CLEANUP PENDING

**Status:** ✅ READY zu cleanen

Gelöschte Dateien die noch in Git sind:
- PHASE-5-IMPLEMENTATION.md
- PHASE-6-IMPLEMENTATION.md
- PHASE-7-IMPLEMENTATION.md
- PROGRESS-TRACKER.md
- LIVE-PROGRESS-REPORT.md
- MASTER-ENTRY-PROMPT.md
- backend/server copy.js (2x)
- frontend/server copy.js
- frontend/webpack.config copy.js

**Cleanup Command (wenn bereit):**
```bash
git rm PHASE-*.md PROGRESS-*.md LIVE-*.md MASTER-ENTRY-PROMPT.md "backend/server copy.js" "backend/server copy 2.js" "frontend/server copy.js" "frontend/webpack.config copy.js" 2>/dev/null
git commit -m "cleanup: remove archived phase files and backups"
git push origin main
```

---

## 📸 SCREENSHOTS-VERGLEICH (TODO)

**Needed von dir:**
1. Original Design Screenshot (wie es sein sollte)
2. Current Zustand Screenshot (wie es jetzt aussieht)

**Mit Screenshots können wir:**
- Differences klar identifizieren
- CSS-Fixes schreiben
- Regression-Tests schreiben
- Sicherstellen dass nicht wieder bricht

---

## 🎯 IMMEDIATE ACTION ITEMS

### Diese Woche:
1. ✅ `.env.example` Dateien erstellen
2. ✅ PRODUCTION-DEPLOYMENT.md schreiben
3. ✅ MASTER-CONTEXT-PROMPT mit echtem Schema
4. 📸 Screenshots senden (Original vs Current) - **TODO**
5. 🧹 Repository cleanup durchführen
6. 🎨 Design-System Audit starten
7. 🔐 WebAuthn Refactor planen

### Nächste Phase:
1. Design-System Fixes (Phase 1)
2. WebAuthn Refactor (Phase 2)
3. Screenshots 1:1 replizieren
4. Production Test-Deployment
5. Full Production Deploy

---

## 📞 WENN STUCK

| Problem | Lösung | Datei |
|---------|--------|-------|
| Design kaputtgegangen | Check CSS-Variablen | `frontend/css/design-system.css` |
| WebAuthn bricht | Verifiziere Button-Listener | `frontend/js/webauthn.js` |
| DB Fragen | Siehe schema.sql & pgAdmin | `backend/db/schema.sql` |
| ENV-Variablen unklar | Siehe .env.example Dateien | `.env.example` |
| Production Fragen | Siehe Deployment Guide | `PRODUCTION-DEPLOYMENT.md` |
| Neuer Chat brauchts Context | Use this Prompt | Dieses File |

---

**🎯 Next Major Step:** Design-System stabilisieren (Phase 1)

**Wichtig:** Diesen Prompt immer aktuell halten! Nach jedem großen Change updaten.
