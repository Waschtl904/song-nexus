# 🎵 SONG-NEXUS - MASTER CONTEXT PROMPT (v2)

> **Verwendbar für neue Chat-Sessions um aktuellen Projekt-Status zu verstehen**

**Letztes Update:** 5. Januar 2026  
**Status:** ✅ Production-Ready (nach Fixes)  
**Nächster Step:** Design-System stabilisieren → WebAuthn härten → Production deployen

---

## 📍 AKTUELLER PROJEKT-STATUS

### ✅ Was FERTIG & GETESTET ist:
- ✅ Backend API komplett (35 Endpoints)
- ✅ Audio Streaming mit Player
- ✅ PayPal Integration (Sandbox getestet)
- ✅ PostgreSQL Schema (schema.sql)
- ✅ JWT Authentication (7 Tage TTL)
- ✅ Express Server mit HTTPS support (mkcert)
- ✅ Frontend Webpack Bundle (83.5 KiB)
- ✅ Design-System API Endpoints (GET /api/design-system, PUT /api/design-system/:id)
- ✅ `.env.example` Dateien (backend + frontend)
- ✅ PRODUCTION-DEPLOYMENT.md Guide
- ✅ Master-Context-Prompt für neue Sessions

### 🚧 Was IN ARBEIT ist:
- 🚧 WebAuthn biometric implementation (fragil, siehe Probleme)
- 🚧 Frontend Design & UI (Theme-System instabil)
- 🚧 Color/Theme Panel (nur Primärfarbe + Text funktionieren)
- 🚧 WebAuthn Button-Integration (anfällig für Bruch bei Code-Änderungen)

### 📊 Datenbank-Schema (Real):
**Tables in PostgreSQL:**
```
users              - User accounts & credentials
tracks             - Music metadata & files
orders             - PayPal transactions
play_history       - Track play events for analytics
audit_log          - Security audit logging
design_system      - Theme/Design configuration (NEW)
```

**Achtung:** Tabellennamen sind NICHT design_system sondern die echten Namen oben!

---

## 🔴 KRITISCHE PROBLEME

### Problem 1: Design-System nicht stabil
**Symptom:** Theme-Panel ändert Farben, aber nur bei Primärfarbe und Text. Andere Komponenten nicht betroffen.  
**Ursache:** Color-Tokens nicht richtig in allen Komponenten implementiert  
**Impact:** **KANN NICHT AN DESIGN ARBEITEN BIS GELÖST**

**Workaround:** Screenshots vergleichen, Fehler identifizieren, dann CSS fixen  
**Dateien:** `frontend/css/design-system.css`

### Problem 2: WebAuthn-Implementierung fragil
**Symptom:** Button-Listener verschwinden wenn andere Bugs gefixt werden  
**Ursache:** WebAuthn-Logic zu tight mit DOM-Elementen gekoppelt  
**Impact:** **KANN NICHT SICHER AN OTHER FEATURES ARBEITEN**

**Lösung:** WebAuthn in separates Module isolieren, explizit Event-Listener registrieren  
**Dateien:** `frontend/js/webauthn.js`, `frontend/js/auth.js`

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
1. Refactor: WebAuthn Module isolieren (separate file, kein DOM-zugriff in Logik)
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

## 📁 WICHTIGE DATEIEN REFERENCE

### Backend
```
backend/
├── server.js                    # Express server (HTTPS, Design-System API)
├── .env.example                 # ✅ NEU - Template für alle Variablen
├── schema.sql                   # PostgreSQL schema
├── routes/
│   ├── webauthn.js             # Biometric auth (FRAGIL!)
│   ├── auth.js                 # Email/Password auth
│   ├── tracks.js               # Track endpoints
│   ├── payments.js             # PayPal integration
│   └── ...
└── middleware/
    ├── auth-middleware.js      # JWT verification
    └── cache-middleware.js     # Response caching
```

### Frontend
```
frontend/
├── webpack.config.js           # Build configuration
├── .env.example                # ✅ NEU - Template für alle Variablen
├── js/
│   ├── webauthn.js            # Biometric frontend (FRAGIL!)
│   ├── auth.js                # Auth flows
│   ├── player.js              # Audio player
│   ├── api-client.js          # API wrapper
│   └── main.js                # Webpack entry
├── css/
│   └── design-system.css      # Theme system (UNSTABLE!)
└── html/
    ├── index.html             # Main entry
    └── auth.html              # Login/signup
```

### Root
```
.
├── README.md                   # Project overview (ok)
├── schema.sql                  # Database schema (ok)
├── .env.production             # ✅ REAL config (DO NOT COMMIT!)
├── PRODUCTION-DEPLOYMENT.md    # ✅ NEU - Full deployment guide
├── MASTER-CONTEXT-PROMPT.md    # ✅ NEU - Dieses File (always aktuell halten)
├── package.json                # Root package
└── .gitignore                  # (needs .env.production added)
```

---

## 🔧 ENV-VARIABLEN KURZ-REFERENZ

### Backend (.env.production) - KEY VARIABLES
```env
NODE_ENV=production
DB_HOST=localhost
DB_NAME=song_nexus_prod
DB_USER=song_nexus_user
DB_PASSWORD=xxxxx (32+ chars)

JWT_SECRET=xxxxx (32+ chars)
SESSION_SECRET=xxxxx (32+ chars)

FRONTEND_URL=https://yourdomain.com
WEBAUTHN_RP_ID=yourdomain.com
WEBAUTHN_ORIGIN=https://yourdomain.com

PAYPAL_MODE=live (or sandbox)
PAYPAL_CLIENT_ID=xxxxx
PAYPAL_CLIENT_SECRET=xxxxx
```

### Frontend (.env.production) - KEY VARIABLES
```env
VITE_API_URL=https://yourdomain.com
VITE_ENVIRONMENT=production
VITE_WEBAUTHN_RP_ID=yourdomain.com
VITE_WEBAUTHN_ORIGIN=https://yourdomain.com
VITE_PAYPAL_MODE=live
VITE_PAYPAL_CLIENT_ID=xxxxx
```

**🔐 NEVER commit .env.production to git!**

---

## 📊 DATENBANK DETAILS

### Tabellen (Exact Names aus schema.sql):
1. **users**
   - id (PRIMARY KEY)
   - email (UNIQUE)
   - username (UNIQUE)
   - password_hash
   - created_at
   - updated_at

2. **tracks**
   - id (PRIMARY KEY)
   - name
   - artist
   - genre
   - description
   - created_at

3. **orders**
   - id (PRIMARY KEY)
   - user_id (FK → users)
   - paypal_order_id (UNIQUE)
   - amount
   - description
   - status
   - created_at
   - completed_at

4. **play_history**
   - id (PRIMARY KEY)
   - user_id (FK → users)
   - track_id (FK → tracks)
   - played_at
   - duration_seconds

5. **audit_log**
   - id (PRIMARY KEY)
   - user_id
   - action
   - resource
   - resource_id
   - details (JSONB)
   - ip_address
   - user_agent
   - created_at

### Indexes für Performance:
- users(email)
- orders(user_id)
- orders(paypal_order_id)
- play_history(user_id)
- play_history(track_id)

---

## 🚀 SCHNELL-DEPLOYMENT NACH FIXES

**Wenn Phase 1-3 fertig:**

```bash
# 1. Local test
npm start
# Test auf https://localhost:5500

# 2. Build
cd frontend && npm run build && cd ..

# 3. Push
git add -A
git commit -m "fix: stabilize design system and webauthn"
git push origin main

# 4. Deploy (siehe PRODUCTION-DEPLOYMENT.md)
ssh user@your-server.com
cd song-nexus
git pull origin main
cd backend && npm install --production && cd ..
pm2 restart song-nexus-backend
cd frontend && npm run build && cd ..
sudo systemctl restart nginx

# 5. Verify
curl https://yourdomain.com/api/health
```

---

## 💡 TIPPS FÜR ZUKÜNFTIGE ENTWICKLUNG

### Zur Design-Stabilität:
1. **Immer** CSS-Variablen für Colors nutzen
2. **Tests** für Theme-Panel schreiben
3. **Snapshot-Tests** nach Design-Changes
4. **Never** hardcoded Colors
5. **Documentation** für neue Colors

### Zur WebAuthn-Stabilität:
1. WebAuthn Module **vollständig entkoppelt**
2. Event-Listener **explizit** im init-Hook
3. Error-handling für **missing elements**
4. **Defensive programming** - assume DOM könnte anders sein
5. **Unit-Tests** für WebAuthn-Logik

### Zur Code-Qualität:
1. **Branches für Features** (nicht direkt auf main)
2. **Selbst-Review** vor Merge (catch bugs früher)
3. **Automated Tests** (Jest, Vitest)
4. **Git Hooks** (pre-commit Tests)
5. **Docs aktuell** (besser als Memory)

---

## 🧹 CLEANUP PENDING

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

**Cleanup Command:**
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
1. ✅ `.env.example` Dateien erstellen → DONE
2. ✅ PRODUCTION-DEPLOYMENT.md schreiben → DONE
3. ✅ MASTER-CONTEXT-PROMPT aktualisieren → DONE
4. 📸 Screenshots senden (Original vs Current)
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
| ENV-Variablen unklar | Siehe `.env.example` Dateien | `backend/.env.example` |
| Production Fragen | Siehe Deployment Guide | `PRODUCTION-DEPLOYMENT.md` |
| Neuer Chat brauchts Context | Use this Prompt | `MASTER-CONTEXT-PROMPT.md` |
| Datenbank Fragen | Siehe schema.sql | `schema.sql` |

---

## 📚 USEFUL LINKS

- **GitHub Repo:** https://github.com/Waschtl904/song-nexus
- **Backend Server:** https://localhost:3000
- **Frontend:** https://localhost:5500
- **API Docs:** In README.md
- **Database Schema:** schema.sql

---

## 📋 CHECKLIST FÜR PRODUCTION READY

- [ ] Design-System stabilisiert (Phase 1)
- [ ] WebAuthn hardeniert (Phase 2)
- [ ] Screenshots vergleicht und gefixt
- [ ] `.env.example` Dateien vorhanden ✅
- [ ] PRODUCTION-DEPLOYMENT.md vorhanden ✅
- [ ] Keine console.logs in production code
- [ ] Error tracking configured (Sentry)
- [ ] Database backups automated
- [ ] SSL certificates ready (Let's Encrypt)
- [ ] Nginx config ready
- [ ] PM2 ecosystem config ready
- [ ] Monitoring alerts configured
- [ ] Rollback plan documented ✅
- [ ] Post-deployment checklist reviewed ✅

---

**🎯 Next Major Step:** Design-System stabilisieren (Phase 1)

**Wichtig:** Diesen Prompt immer aktuell halten! Nach jedem großen Change updaten.
