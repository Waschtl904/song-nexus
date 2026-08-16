# 🎵 SONG-NEXUS Master Prompt

**Stand:** 15. August 2026
**Branch:** `dev/v1.0` (führend — `main` ist veraltet, siehe Issue #5)
**Repository:** [Waschtl904/song-nexus](https://github.com/Waschtl904/song-nexus)
**System:** Windows 11 Pro, Windsurf, PowerShell
**Node:** 22.17.1 (Pflicht: >= 22, siehe unten)

---

## 📋 So benutzt du diese Datei

Diese Datei in eine neue KI-Sitzung kopieren, damit der Assistent den Projektstand kennt.

**Wichtiger Hinweis, aus Erfahrung entstanden:** Diese Datei kann veralten. Im August 2026 hat ein Doku-basiertes Audit den Projektstand deutlich unterschätzt, weil die Doku noch den Mai-Zustand beschrieb, der Code aber vom Juni war. Behandle die folgenden Angaben als Startpunkt und **verifiziere kritische Aussagen am Code**:

```powershell
cd C:\Users\sebas\Desktop\SongSeite
git log --oneline -10                    # Was ist wirklich zuletzt passiert?
cd backend; npm test                     # Wie viele Tests laufen wirklich?
gh pr list                               # Liegt noch etwas Offenes?
gh issue list --state open               # Was ist bekannt offen?
```

Die Wahrheit steht im Code und in den Issues, nicht in Markdown-Dateien.

---

## ✅ Aktueller Stand

### Gesamtbild
🟢 Backend funktionsfähig, **67 Jest-Tests grün** (3 Suites: auth, tracks, payments)
🟢 CI läuft bei jedem Push (GitHub Actions, 4 Jobs)
🟢 `npm audit`: 0 Vulnerabilities in Backend und Frontend
🟢 Rechtsseiten vorhanden: Impressum, Datenschutz
🟢 Soft-Launch-Schalter vorhanden: Verkauf standardmäßig AUS
🔴 **Noch nicht deployed** — kein VPS, keine Domain (Issue #6)
🔴 AGB und Widerrufsbelehrung fehlen (Issue #14) → **kein Verkauf erlaubt**

### Was im August 2026 passiert ist (7 PRs)
| PR | Inhalt |
|---|---|
| #23 | `POST /api/auth/dev-login` **entfernt** — legte Admin-Accounts ohne Guard an |
| #25 | `backend/routes/auth-simple.js` **entfernt** — ungehärteter Zweitpfad |
| #26 | CI eingerichtet |
| #27 | Echte Secrets aus `.env.production.example` entfernt, `.gitignore` reparieren |
| #28 | 11 Vulnerabilities → 0, multer 2.x, nodemailer 9.x, `xss-clean` entfernt |
| #29 | `setInterval` in `payments.js` unref-ed (hing die CI auf) |
| #30 | `PAYMENTS_ENABLED`-Schalter für den Soft-Launch |
| #31 | Totlinks, echte 404-Seite, Rechtslinks auf allen Seiten |
| #32 | `@ref`-Auflösung im Design-System reparieren |
| #34 | `secrets-neu.txt` wird jetzt wirklich ignoriert |
| #35 | Frontend-Deps auf 0 Lücken, `USE_HTTPS` war wirkungslos |

---

## 🔐 Authentifizierung

### Passwort-Login
✅ Funktioniert. `/register`, `/login`, `/verify`, `/me`, `/logout`, `/refresh-token`
✅ JWT liegt in einem **HttpOnly-Cookie** (`auth_token`), nicht mehr im localStorage
✅ bcryptjs, Rate-Limit 5 Versuche / 15 min auf `/login`

### Passwort-Reset
✅ `/password-reset/request`, `/password-reset/verify`, `/password-reset/confirm`
✅ Mailversand über `backend/utils/mailer.js` (GMX-SMTP, nodemailer 9)
⚠️ Ohne `SMTP_USER` und `SMTP_PASS` in der `.env` ist der Versand stillschweigend deaktiviert

### WebAuthn (Biometrie)
✅ Backend komplett, Tabelle `webauthn_credentials`
⚠️ Cross-Browser-Tests offen (Issue #20). Safari nur eingeschränkt. Passwort-Login ist der Fallback
⚠️ `WEBAUTHN_RP_ID` und `WEBAUTHN_ORIGIN` müssen **exakt** zur Domain passen, sonst schlägt es fehl

### Magic Link
✅ Vorhanden, Tabelle `magic_link_tokens` (NICHT `magic_links`, die wurde entfernt)

### ⛔ dev-login existiert nicht mehr
`POST /api/auth/dev-login` legte einen User mit `role='admin'` an und gab ein gültiges JWT zurück — **ohne `NODE_ENV`-Guard**, öffentlich gemountet. Ein einzelner POST genügte für einen vollständigen Admin-Takeover.

Ersatz für die lokale Entwicklung:

```powershell
cd backend
npm run seed:dev-admin
```

Das Skript läuft nur über die CLI, verweigert den Start bei `NODE_ENV=production`, prüft dass `DB_HOST` lokal ist und erzeugt ein zufälliges Passwort. Danach normaler Login über das Formular.

**Nicht wieder als HTTP-Endpunkt einbauen.** Sechs Regressionstests in `backend/__tests__/auth.test.js` verhindern das, inklusive einer statischen Quellcode-Prüfung.

---

## 💳 Zahlungen: standardmäßig AUS

`PAYMENTS_ENABLED` in der `.env` steuert den Verkauf. **Fail-closed:** nur der exakte Wert `true` aktiviert Zahlungen. `TRUE`, `1`, `yes` oder ein fehlendes Flag gelten als deaktiviert.

Bei deaktiviertem Verkauf:
- `POST /api/payments/create-order` und `/capture-order` antworten mit `503` und `code: PAYMENTS_DISABLED`
- Der Guard sitzt **vor** `verifyToken` — die Antwort verrät nicht, ob ein Login geholfen hätte
- `/config` liefert `payments_enabled: false` und keine PayPal-Client-ID
- Lesende Routen und der Download bleiben absichtlich offen, damit bereits Gekauftes erreichbar bleibt
- Im Frontend zeigen Bezahltracks `BALD` statt eines Preises

**Erst einschalten, wenn:** PayPal live ist (#11), der Webhook steht (#12), AGB und Widerrufsbelehrung veröffentlicht sind (#14).

**Wichtig:** Es gibt im Frontend derzeit **überhaupt keinen Kauf-Button**. `createPayPalOrder()` in `api-client.js` wird von keiner Stelle aufgerufen. Der Checkout muss mit #12 gebaut werden.

---

## 🎯 Geschützter Code

| Datei | Warum |
|---|---|
| `frontend/js/webauthn.js` | Sicherheitskritisch, nur bei echtem Bug anfassen |
| `frontend/js/auth.js` | JWT-Handling, Token-Refresh, Logout-Sequenz |
| `backend/middleware/auth-middleware.js` | Einzige Quelle für Token-Prüfung und Cookies |
| `backend/routes/payments.js` | Finanzlogik. Änderungen nur mit Tests |

### Datenbankschema
**Führende Datei: `schema_clean.sql` (Root).**
`schema.sql` im Root ist **veraltet** und enthält Redundanzen — nicht verwenden.
`backend/db/schema.sql` existiert nicht.

Niemals direkt ändern, nur per Migration: `users`, `webauthn_credentials`, `tracks`, `orders`, `purchases`.
Migrationstooling fehlt noch (Issue #19), Änderungen aktuell per SQL-Datei in `migrations/`.

---

## 🟢 Gefahrlos änderbar

- CSS in `frontend/styles/` und `frontend/css/` (CSS-Variablen nutzen, **kein `!important`**)
- HTML-Templates (Struktur beibehalten, IDs nicht umbenennen — JS hängt daran)
- Neue Routen unter `/api/tracks` und `/api/play-history`
- Texte und Übersetzungen

---

## 📦 Datenbank (9 aktive Tabellen)

| Tabelle | Beschreibung |
|---|---|
| users | Konten. Kein `webauthn_credential`-jsonb mehr |
| tracks | Musik. `price_eur` und `duration_seconds` sind die **einzigen** Preis-/Dauerspalten |
| orders | PayPal-Transaktionen |
| purchases | Käufe und Lizenztypen |
| play_history | Play-Events |
| play_stats | Analytics |
| magic_link_tokens | Magic-Link-Auth |
| webauthn_credentials | Biometrie |
| design_system | Design-Tokens, max. 1 aktive Zeile |

Aktive Tracks: `WHERE is_published = true AND is_deleted = false`

---

## ⚠️ Bekannte offene Punkte

### 1. Token-Widerruf fehlt (Issue #24)
`requireAdmin` liest die Rolle **direkt aus dem JWT**, ohne Rückfrage an die Datenbank. Ein ausgestelltes Admin-Token bleibt bis zum Ablauf von `JWT_EXPIRE` (aktuell `7d`) gültig — auch wenn der Account deaktiviert oder degradiert wird. Der einzige echte Widerruf ist derzeit das Rotieren von `JWT_SECRET`, was alle Nutzer auslogged.

### 2. Download-Tokens nur im Prozessspeicher (Issue #13)
`downloadTokens` in `payments.js` ist eine `Map`. Nach jedem Restart sind offene Download-Links ungültig, im PM2-Cluster funktionieren sie gar nicht zuverlässig.

### 3. Kein PayPal-Webhook (Issue #12)
Der Kaufabschluss hängt am Client-Redirect. Schließt der Kunde den Tab, bleibt die Order auf `CREATED` und der bezahlte Track ungeschaltet.

### 4. `@ref` wird zur Laufzeit nicht aufgelöst (Issue #33)
`init.js` liest `design.config.json` im Browser und schreibt `@ref`-Rohtext in CSS-Variablen. Der Build-Pfad ist repariert, der Laufzeit-Pfad nicht.

### 5. Design-Token-Refresh braucht Reload
CSS-Variablen aktualisieren sich nicht ohne Seitenneuladen. Workaround: `Ctrl+Shift+R`.

### 6. Audio-Streaming braucht HTTPS
Lokal über mkcert lösen: `cd backend && npm run generate-cert`

---

## 🛠️ Setup und Befehle (PowerShell)

### Voraussetzung
**Node >= 22.** Nicht optional: `nodemailer 9` zieht `@peculiar/x509` mit (`>= 22`), `webpack-dev-server 6` verlangt `>= 22.15.0`. Beide `package.json` haben ein `engines`-Feld.

### Frische Installation
```powershell
cd C:\Users\sebas\Desktop\SongSeite
npm ci
cd backend;  npm ci;  cd ..
cd frontend; npm ci;  cd ..

# Env-Dateien aus den Vorlagen anlegen
Copy-Item backend\.env.example backend\.env
# Secrets erzeugen:
.\scripts\generate-secrets.ps1

# Datenbank
psql -U postgres -c "CREATE DATABASE song_nexus_dev;"
psql -U postgres -d song_nexus_dev -f schema_clean.sql   # NICHT schema.sql!

# Zertifikate für lokales HTTPS
cd backend; npm run generate-cert; cd ..

# Lokalen Admin anlegen
cd backend; npm run seed:dev-admin; cd ..
```

### Entwicklung
```powershell
npm run dev          # Backend + Frontend parallel
cd backend;  npm test          # 150 Tests in 5 Suiten
cd backend;  npm run test:handles   # nur zur Diagnose offener Handles
cd frontend; npm run build     # PFLICHT nach Änderungen in frontend/js/
```

**Wichtig:** `frontend/dist/` ist in `.gitignore` und wird nie mitgeliefert. Nach jeder Änderung in `frontend/js/` ist `npm run build` nötig, sonst siehst du im Browser den alten Code. HTML, `styles/main.css` und `blog/blog.js` brauchen keinen Build.

### Vor jedem Pull
```powershell
git status           # unversionierte oder geänderte Dateien blockieren den Pull
git pull origin dev/v1.0
```

---

## 📊 API-Endpunkte

### Authentifizierung (9)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify
GET    /api/auth/me
POST   /api/auth/logout
POST   /api/auth/refresh-token
POST   /api/auth/password-reset/request
POST   /api/auth/password-reset/verify
POST   /api/auth/password-reset/confirm
```
⛔ `POST /api/auth/dev-login` — **entfernt**, liefert 404

### WebAuthn (5)
```
POST   /api/auth/webauthn/register-options
POST   /api/auth/webauthn/register-verify
POST   /api/auth/webauthn/authenticate-options
POST   /api/auth/webauthn/authenticate-verify
GET    /api/auth/webauthn/credentials
```

### Tracks (4)
```
GET    /api/tracks
GET    /api/tracks/:id
GET    /api/tracks/genres/list
GET    /api/tracks/audio/:filename      # 40s-Preview bei Bezahltracks
```

### Payments (8)
```
GET    /api/payments/config              # liefert payments_enabled
POST   /api/payments/create-order        # 503 wenn Verkauf aus
POST   /api/payments/capture-order/:id   # 503 wenn Verkauf aus
GET    /api/payments/user-purchases
GET    /api/payments/history
GET    /api/payments/stats
GET    /api/payments/download/:trackId
GET    /api/payments/download-file/:token
```

### Admin (4), Users (5), Play History (4)
Unverändert, siehe `backend/routes/`.

---

## 📁 Wichtige Dateien

```
schema_clean.sql                     ← führendes Schema
schema.sql                           ← VERALTET, nicht verwenden
migrations/                          ← SQL-Migrationen
scripts/generate-secrets.ps1         ← Secrets erzeugen (Windows)
LAUNCH-PLAN.md                       ← Weg zum Launch, 4 Milestones
.github/workflows/ci.yml             ← CI: Tests, Audit, Build, Secret-Scan

backend/
  server.js                          ← Middleware, CORS, CSP, Fail-fast bei Secrets
  app.js                             ← Express-App für Tests
  routes/auth.js                     ← kein dev-login mehr
  routes/payments.js                 ← PAYMENTS_ENABLED-Guard
  middleware/auth-middleware.js      ← JWT, Cookies, requireAdmin
  utils/mailer.js                    ← nodemailer 9
  scripts/seed-dev-admin.js          ← Ersatz für dev-login
  __tests__/                         ← 150 Tests in 5 Suiten

frontend/
  index.html                         ← Startseite
  404.html                           ← echte Fehlerseite
  impressum.html, datenschutz.html   ← Rechtsseiten
  purchases.html, password-reset.html
  blog/index.html, blog/blog.js      ← Blog-Übersicht aus posts.json
  server.js                          ← Static + API-Proxy, HTTP- und HTTPS-Modus
  webpack.config.js                  ← Build + @ref-Auflösung
  js/tracks-loader.js                ← Track-Karten, liest payments_enabled
  styles/main.css                    ← Haupt-Stylesheet
  styles/_design-tokens.css          ← generiert, wird versioniert
```

Entfernt und nicht wieder anlegen: `backend/routes/auth-simple.js`, `frontend/webpack/design-config-loader.js`.

---

## 🚀 Nächste Schritte

**Vor dem Live-Gang (Soft-Launch mit Gratis-Tracks):**
1. Issue #6 — Hetzner-VPS: nginx, PM2, PostgreSQL, Let's Encrypt
2. Issue #7 — DB-Backups **inklusive getestetem Restore**
3. Issue #24 — Token-Widerruf
4. Issue #5 — `dev/v1.0` nach `main` mergen

**Vor dem ersten Verkauf:**
5. Issue #14 — AGB und Widerrufsbelehrung
6. Issue #12 — PayPal-Webhook plus Kauf-Button
7. Issue #13 — Download-Tokens persistieren
8. Issue #11 — PayPal live
9. Issue #15 — Gewerbe, USt, OSS
10. Issue #16 — E2E-Test der Kaufkette

**Für den VPS beachten:**
- `USE_HTTPS=false` hinter nginx (TLS terminiert nginx)
- `TRUST_PROXY=true`, sonst greift das Rate-Limiting auf die nginx-IP
- `npm run build` im Frontend ist Teil des Deployments
- `WEBAUTHN_RP_ID` und `WEBAUTHN_ORIGIN` auf die echte Domain setzen
- `PAYMENTS_ENABLED` nicht setzen (bleibt aus)

---

## 📋 Checkliste vor jedem Commit

- [ ] `cd backend && npm test` — 67 grün
- [ ] `cd frontend && npm run build` bei Änderungen in `frontend/js/`
- [ ] Keine Secrets in versionierten Dateien
- [ ] Kein `!important` in neuem CSS
- [ ] Kein neuer HTTP-Endpunkt, der Rechte vergibt, ohne Guard und Test

---

## 📝 Metadaten

**Zuletzt geprüft:** 15. August 2026, gegen den Code auf `dev/v1.0`
**Testzahl verifiziert durch:** `cd backend && npm test`
**Veraltete Dokumente entfernt:** `MASTER-PROMPT-2026-DEFINITIVE.md`, `MASTER-CONTEXT-PROMPT.md`, `REPOSITORY-STRUCTURE.md`

**Aktuelle Begleitdokumente:**
- `README.md`
- `LAUNCH-PLAN.md` — Weg zum Launch
- `DATABASE.md`
- `PRODUCTION-DEPLOYMENT.md`, `docs/DEPLOYMENT-HETZNER.md`
- `docs/SECURITY-GUIDE.md`
- `docs/ADMIN-GUIDE.md`
- `docs/PROJECT-STRUCTURE.md`
- `docs/SETUP-WINDOWS.md`
