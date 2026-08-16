# 🎵 SONG-NEXUS

> **A modern, full-stack music streaming platform with advanced authentication, real-time audio streaming, and PayPal payment integration.**

![Status](https://img.shields.io/badge/Status-Pre--Launch-orange?style=flat-square)
![CI](https://github.com/Waschtl904/song-nexus/actions/workflows/ci.yml/badge.svg?branch=dev%2Fv1.0)
![Version](https://img.shields.io/badge/Version-6.3.0-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Tech Stack](https://img.shields.io/badge/Tech-Node.js%20|%20Express%20|%20PostgreSQL%20|%20Jest-informational?style=flat-square)
![Tests](https://img.shields.io/badge/Tests-150%20passing-brightgreen?style=flat-square)
![Node](https://img.shields.io/badge/Node-%3E%3D22-brightgreen?style=flat-square)
![Audit](https://img.shields.io/badge/npm%20audit-0%20vulnerabilities-brightgreen?style=flat-square)

---

## ⚡ Aktueller Branch

Der führende Branch ist **`dev/v1.0`**, nicht `main`. `main` ist veraltet (Issue #5).

```powershell
git pull origin dev/v1.0
```

**Vor jedem Pull `git status` prüfen.** Unversionierte oder lokal geänderte Dateien lassen den Pull abbrechen — das ist die häufigste Stolperstelle in diesem Projekt.

Der lokale Arbeitspfad steht bewusst nicht mehr hier, sondern in `docs/SETUP-WINDOWS.md`.

---

## 🚀 Overview

**SONG-NEXUS** is a music streaming application built with modern web technologies. It features:

- 🔐 **Triple Authentication** – WebAuthn (Biometric), Password, Magic Link
- 🎵 **Advanced Audio Streaming** – HTTP Range Requests, 40s Preview for paid tracks
- 💳 **Zahlungen** – PayPal-Anbindung vorhanden, aber **standardmäßig abgeschaltet**; im Frontend existiert noch kein Kauf-Button (Issue #12)
- 📊 **Full Admin Dashboard** – Secure management console with JWT authentication
- 📤 **Track Management** – Upload, categorize, and monetize music
- 📈 **Analytics** – Play history, user statistics, leaderboards
- ⚡ **High Performance** – Webpack bundling, optimized API endpoints
- 🔒 **Security First** – JWT tokens, CORS, Helmet, rate limiting, SSL/TLS
- 🧪 **Getestet** – 67 Jest-Tests (Auth, Tracks, Payments), CI bei jedem Push
- 🔌 **Soft-Launch-Modus** – Verkauf ist standardmäßig deaktiviert (`PAYMENTS_ENABLED`)
- ⚖️ **Rechtsseiten** – Impressum und Datenschutz vorhanden; AGB und Widerruf fehlen noch (Issue #14)

---

## 📖 IMPORTANT: Read This First!

### 🎯 For Every Development Session:

**👉 Read [MASTER-PROMPT-2026-AKTUELL.md](./MASTER-PROMPT-2026-AKTUELL.md) FIRST!**

This file contains:
- ✅ Current project status
- ✅ Known issues & workarounds
- ✅ Protected code sections (don't touch!)
- ✅ Safe-to-modify code sections
- ✅ Windows 11 PowerShell commands
- ✅ Next steps & priorities

**TL;DR:** Copy the content of `MASTER-PROMPT-2026-AKTUELL.md` into your AI chat at the start of each session. This prevents regression bugs and redundancy problems.

### 📚 Documentation Versions

✅ **USE THESE CURRENT FILES:**
- MASTER-PROMPT-2026-AKTUELL.md (CURRENT)
- README.md (this file – updated May 14, 2026)
- DATABASE.md (root level)
- PRODUCTION-DEPLOYMENT.md (root level)
- docs/ADMIN-GUIDE.md
- docs/SETUP-WINDOWS.md
- docs/PROJECT-STRUCTURE.md

✅ **Ebenfalls aktuell:**
- LAUNCH-PLAN.md — Weg zum Launch, 4 Milestones
- docs/SECURITY-GUIDE.md
- docs/DEPLOYMENT-HETZNER.md

**Entfernt am 15.08.2026:** `MASTER-PROMPT-2026-DEFINITIVE.md`, `MASTER-CONTEXT-PROMPT.md`
und `REPOSITORY-STRUCTURE.md`. Drei veraltete Dokumente, die als "ignorieren"
markiert waren, haben bei jedem Wiedereinstieg Zeit gekostet und zu
widersprüchlichen Annahmen geführt. Die Git-Historie bewahrt sie.

---

## 📋 Table of Contents

- [Your Windows 11 Setup](#-your-windows-11-laptop-setup)
- [Master Prompt](#important-read-this-first)
- [Local Development Setup](#local-development-setup-windows-11-pro)
- [Quick Start](#quick-start)
- [Features](#features)
- [Admin Hub](#-admin-hub)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Database Schema](#database-schema)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Testing](#-testing)
- [Development](#development)
- [Deployment](#deployment)
- [License](#license)

---

## 💻 Local Development Setup (Windows 11 Pro)

### Your Project Root Directory

```
C:\Users\sebas\Desktop\SongSeite
```

**This is your main working directory.** All development happens here.

### Quick Setup (Windows PowerShell)

```powershell
# 1. Navigate to project
cd C:\Users\sebas\Desktop\SongSeite

# 2. Install all dependencies
npm install && cd backend && npm install && cd .. && cd frontend && npm install && cd ..

# 3. Setup environment files
cp backend\.env.example backend\.env
cp frontend\.env.example frontend\.env

# 4. Setup database
psql -U postgres
CREATE DATABASE song_nexus_dev;
\q
psql -U postgres -d song_nexus_dev -f schema.sql

# 5. Generate SSL certificates
cd backend && npm run generate-cert && cd ..

# 6. Start development
npm start
```

**Access at:**
- Frontend: `https://localhost:5500`
- Backend: `https://localhost:3000`
- Admin Hub: `https://localhost:3000/admin/`

**Full guide:** See [docs/SETUP-WINDOWS.md](./docs/SETUP-WINDOWS.md)

---

## ✨ Features

### 🔐 Authentication System
- **WebAuthn Biometric** – Fingerprint/Face ID login (backend complete)
- **Email & Password** – Traditional registration & login
- **Magic Link** – One-click email authentication
- **JWT Tokens** – 7-day expiration, configurable via `.env`
- **Session Management** – Secure token refresh & logout

### 🎵 Audio Management
- **HTTP Streaming** – Range request support (206 Partial Content)
- **Preview Mode** – 40-second preview for paid tracks (speed-calculated byte range)
- **Free Track Access** – Full file access for everyone, no auth required
- **Paid Track Access** – Token + purchase verification required for full stream
- **Security:** Invalid token → Preview only. No token → Preview only.
- **Format Support** – MP3 & WAV audio files

### 💳 Payment Integration
- **PayPal SDK** – Seamless checkout experience
- **Purchase History** – Track all transactions
- **License Management** – Personal license per purchase
- **Payment Statistics** – Spending analytics & patterns

### 🛡️ Admin Console
- **Secure JWT Login** – Admin-only authentication
- **Track Upload** – Upload & publish music tracks
- **Design Editor** – Customize platform colors & branding
- **User Management** – Admin role assignment
- **Analytics Dashboard** – View platform statistics

### 📊 User Features
- **User Dashboard** – Profile, statistics, purchase history
- **Play History** – Complete record of listened tracks
- **Leaderboards** – Top users by plays & purchases
- **Genre Categorization** – Organize music by genre

---

## 🛡️ Admin Hub

### Access
```
https://localhost:3000/admin/
```

### Features
- ✅ **JWT-based Login** – Secure admin authentication
- ✅ **Role-based Access** – Only users with `role='admin'` can access
- ✅ **Track Upload Tool** – Upload and manage music tracks
- ✅ **Design Editor** – Customize platform colors and branding
- ✅ **Dev Login** – Quick authentication for localhost development

### Admin Tools

| Tool | Path | Purpose |
|------|------|----------|
| **Admin Hub** | `https://localhost:3000/admin/` | Main admin console (JWT login) |
| **Track Upload** | `frontend/admin-upload.html` | Upload music, set metadata & prices |
| **Design Editor** | `frontend/admin/design-editor.html` | Customize colors, fonts, branding |

**See [docs/ADMIN-GUIDE.md](./docs/ADMIN-GUIDE.md) for detailed admin documentation.**

---

## 🛠️ Tech Stack

### **Backend**
- **Runtime:** Node.js **>= 22** (Pflicht, siehe unten)
- **Framework:** Express.js v4
- **Version:** 6.3.0
- **Authentication:** WebAuthn, JWT (jsonwebtoken), bcryptjs
- **API:** REST with 35+ endpoints
- **Server:** HTTPS with mkcert (local SSL)
- **Security:** Helmet, CORS, express-rate-limit, csrf-csrf, mongo-sanitize
- **Uploads:** multer 2.x · **Mail:** nodemailer 9.x
- **Testing:** Jest 29 + Supertest 7 (**150 Tests**, alle grün)

> **Warum Node >= 22 zwingend ist:** `nodemailer 9` zieht `@peculiar/x509` mit (`node >= 22`),
> `webpack-dev-server 6` verlangt `>= 22.15.0`. Beide `package.json` haben ein `engines`-Feld.

### **Frontend**
- **Language:** JavaScript (ES6+)
- **Build Tool:** Webpack 5
- **Architecture:** Modular, component-based
- **Bundle Size:** 83.5 KiB (production)

### **Database**
- **System:** PostgreSQL 12+
- **Schema:** 10 tables with 22 indexes
- **Tables:** users, tracks, orders, purchases, play_history, play_stats, magic_links, magic_link_tokens, webauthn_credentials, design_system
- **Connections:** Connection pooling with `pg` library

**See [DATABASE.md](./DATABASE.md) for complete schema documentation**

### **Security Middleware**
- TLS 1.3, CORS, CSP headers (Helmet)
- JWT Bearer tokens, biometric verification
- Input sanitization, rate limiting
- Environment variables for all secrets

---

## 📁 Project Structure

```
SONG-NEXUS/
│
├── 📋 Documentation (ROOT LEVEL)
│   ├── README.md                           ✅ This file (updated May 14, 2026)
│   ├── MASTER-PROMPT-2026-AKTUELL.md       🔴 START HERE EVERY SESSION!
│   ├── DATABASE.md                         ✅ Database schema documentation
│   ├── PRODUCTION-DEPLOYMENT.md            ✅ Deployment guide
│   └── schema_clean.sql                    ✅ DATABASE SCHEMA (führend)
│   └── schema.sql                          ⚠️ VERALTET, nicht verwenden
│
├── 📂 docs/
│   ├── ADMIN-GUIDE.md                      ✅ Admin Hub documentation
│   ├── PROJECT-STRUCTURE.md                ✅ Complete project organization
│   └── SETUP-WINDOWS.md                    ✅ Windows 11 Pro setup guide
│
├── 📂 migrations/                          SQL-Migrationen, nach Datum benannt
│   ├── 2026-08-15-orders-track-id.sql      orders.track_id – Bestellung kennt ihren Track
│   └── 2026-08-15_cleanup-dev-accounts.sql
│
├── 📂 backend/                             Express.js REST API Server (v6.3.0)
│   ├── 📂 routes/
│   │   ├── auth.js                         Auth endpoints (register, login, verify, me, logout, refresh)
│   │   ├── tracks.js                       Tracks + Audio streaming with access control
│   │   └── payments.js                     PayPal integration
│   │   └── admin-tracks.js                 Upload; misst Dauer selbst, Preis ist Pflicht
│   ├── 📂 middleware/
│   │   └── auth-middleware.js              JWT verification (sync + async)
│   ├── 📂 utils/
│   │   ├── audio-rate.js                   Datenrate aus dem Dateikopf (WAV exakt, MP3 aus dem Rahmen)
│   │   ├── password-policy.js              Passwortregel – die einzige Quelle
│   │   ├── cache-invalidator.js            Zwischenspeicher der Trackliste leeren
│   │   └── mailer.js                       Versand von E-Mails
│   ├── 📂 scripts/
│   │   ├── seed-dev-admin.js               Admin-Konto für die Entwicklung anlegen
│   │   └── dauer-pruefen.js                duration_seconds gegen die Dateien prüfen
│   ├── 📂 __tests__/                       ✅ 150 Tests in 5 Suiten
│   │   ├── auth.test.js                    Anmeldung, Registrierung, Token
│   │   ├── tracks.test.js                  Trackliste + Zugriffsschutz auf Audiodateien
│   │   ├── payments.test.js                Bestellung, Freischaltung, Preisautorität
│   │   ├── password-policy.test.js         die Passwortregel
│   │   ├── audio-rate.test.js              Datenrate – ohne fs-Mock, mit echten Dateien
│   │   ├── setup.js                        Test setup & teardown
│   │   └── README.md                       Strategie und bekannte Fallstricke
│   ├── 📂 public/
│   │   └── audio/                          MP3/WAV files served by streaming endpoint
│   ├── 📂 certs/                           SSL certificates
│   ├── server.js                           Express server entry point
│   ├── app.js                              Express app (exported for testing)
│   ├── package.json                        v6.3.0 – Version wird von server.js daraus gelesen
│   └── .env.example
│
├── 📂 frontend/                            React + Webpack Frontend
│   ├── 📂 admin/
│   │   ├── index.html                      🔐 Admin Hub main page
│   │   └── design-editor.html              🎨 Design editor
│   ├── admin-upload.html                   📤 Track upload
│   ├── 📂 js/                              JavaScript modules
│   │   └── password-policy.js              gespiegelte Fassung der Backend-Regel
│   ├── 📂 css/                             Stylesheets
│   ├── 📂 dist/                            Webpack output (generated)
│   └── webpack.config.js
│
├── sync-repo.ps1                           ✅ Repository sync utility (PowerShell)
├── package.json                            Root package (concurrently)
├── schema_clean.sql                        DATABASE SCHEMA (ROOT – führend)
└── schema.sql                              ⚠️ VERALTET, enthält Redundanzen
```

---

## 📊 Database Schema

### ⚠️ CRITICAL: Schema Location

✅ **CORRECT:** `ROOT/schema.sql` (CURRENT)
❌ **WRONG:** `backend/db/schema.sql` (doesn't exist)

```powershell
# Always use:
psql -U postgres -d song_nexus_dev -f schema.sql
```

### Quick Overview

| Table | Purpose | Key Fields |
|-------|---------|-----------|
| **users** | User accounts | id, email, username, password_hash, role |
| **tracks** | Music metadata | id, name, artist, genre, audio_filename, price, is_published |
| **orders** | PayPal transactions | id, user_id, paypal_order_id, amount, status |
| **purchases** | Track purchases | id, user_id, track_id, license_type, expires_at |
| **play_history** | Play events | id, user_id, track_id, played_at, duration_played_seconds |
| **play_stats** | Advanced analytics | id, user_id, track_id, device_type, session_id |
| **webauthn_credentials** | Biometric auth | id, user_id, credential_id, public_key, counter |
| **magic_links** | Email-based login | id, user_id, token, expires_at |
| **magic_link_tokens** | Alt magic links | id, user_id, token, expires_at |
| **design_system** | Theme tokens | id, color_primary, color_secondary, … (27 tokens) |

**Full docs:** See [DATABASE.md](./DATABASE.md)

---

## 📚 API Documentation

### Authentication (7 endpoints)
```
POST   /api/auth/register         # Create account
POST   /api/auth/login            # Login with password or email
POST   /api/auth/verify           # Verify JWT token
GET    /api/auth/me               # Get current user profile
POST   /api/auth/refresh-token    # Refresh JWT
POST   /api/auth/logout           # Logout (requires token)
```

> **Entfernt:** `POST /api/auth/dev-login` existiert nicht mehr (Issue #1).
> Der Endpunkt legte einen Admin-Account ohne serverseitigen Guard an.
> Lokalen Admin stattdessen per CLI anlegen: `cd backend && npm run seed:dev-admin`

### Tracks & Audio
```
GET    /api/tracks                # List tracks (pagination, search, genre)
GET    /api/tracks/:id            # Track details
GET    /api/tracks/genres/list    # Available genres
GET    /api/tracks/audio/:file    # Stream audio (access-controlled)
```

**Audio access logic:**
- Free track → Full file (200) for everyone
- Paid track, no token → 40s preview (206)
- Paid track, token, no purchase → 40s preview (206)
- Paid track, token + purchase → Full file (200)
- Invalid/expired token → treated as no token (preview)

### Admin Routes (admin role required)
```
POST   /api/admin/tracks/upload   # Upload new track
GET    /api/admin/tracks/list     # List all tracks
PUT    /api/admin/tracks/:id      # Update track metadata
DELETE /api/admin/tracks/:id      # Soft delete track
```

### Payments
```
POST   /api/payments/paypal/create-order    # Create PayPal order
POST   /api/payments/paypal/capture-order   # Capture after approval
GET    /api/payments/history                # Purchase history (auth required)
```

---

## 🔐 Authentication

### JWT Token Structure

```json
{
  "userId": 1,
  "email": "user@example.com",
  "role": "user",
  "iat": 1703011200,
  "exp": 1703616000
}
```

**Token Expiry:** 7 days (configurable in `.env`)

### Security Guarantees (verified by tests)
- Tokens signed with wrong secret → 403 rejected
- Expired tokens → 403 rejected
- Tampered role claims (e.g. `role: admin`) with wrong secret → no admin access
- Deleted user accounts → 404 on `/me`

---

## 🧪 Testing

**Test runner:** Jest 29 + Supertest 7  
**All tests run in-band** (`--runInBand`) for DB isolation

### Available Commands

```bash
npm test                  # Run all tests once (--runInBand --detectOpenHandles)
npm run test:watch        # Watch mode during development
npm run test:coverage     # Coverage report (routes/**/*.js)
```

### Test Status (as of May 14, 2026)

| File | Tests | Status |
|------|-------|--------|
| `__tests__/auth.test.js` | 25 | ✅ All passing |
| `__tests__/tracks.test.js` | 14 | ✅ All passing |
| `__tests__/payments.test.js` | — | ✅ All passing |

### What is tested

**Auth (25 tests):**
- Registration: success, duplicate email, missing fields, short password, short username, invalid email
- Login: success, wrong password, user not found, empty fields, login by email
- Token verify: valid, no token, invalid, expired
- `/me`: with token, no token, deleted account
- Logout: with token, without token
- Token refresh: works, no token, user deleted
- Security: wrong-secret token rejected, forged admin role rejected

**Tracks & Audio (14 tests):**
- List with pagination metadata
- Empty list
- Search via query param
- Track details by ID
- Track not found (404)
- Genre list
- Audio: free track full (200), free track with Range (206)
- Audio: premium no token → preview (206)
- Audio: premium token, no purchase → preview (206)
- Audio: premium token + purchase → full (200)
- Audio: invalid token → preview (206)
- Empty filename → 400
- File not found → 404

---

## 🎮 Development

### Available Scripts

```bash
# Development
npm start              # Run both backend & frontend (concurrently)
npm run server         # Backend only
npm run client         # Frontend only

# Building
npm run build          # Webpack production build
npm run build:dev      # Webpack dev build

# Testing
npm test               # All tests
npm run test:watch     # Watch mode
npm run test:coverage  # With coverage report
```

### Environment Variables

**Backend (.env)**
```env
DATABASE_URL=postgres://user:pass@localhost:5432/song_nexus_dev
JWT_SECRET=your-secret-key
JWT_EXPIRE=7d
NODE_ENV=development
PORT=3000
PAYPAL_CLIENT_ID=your-paypal-client-id
PAYPAL_SECRET=your-paypal-secret
```

### Development Workflow

```bash
# 1. Pull latest
cd C:\Users\sebas\Desktop\SongSeite\backend
git pull

# 2. Make changes

# 3. Run tests
npm test

# 4. Commit
git add .
git commit -m "feat: your change"
git push origin main
```

---

## 🚀 Deployment

**Deployment auf Hetzner-VPS (operativ, deutsch):**
[docs/DEPLOYMENT-HETZNER.md](./docs/DEPLOYMENT-HETZNER.md) — mit Skripten unter
`scripts/deploy/`, die sich am Ende selbst überprüfen.

**Allgemeine Fassung (englisch, auch Managed-DB):**
[PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)

### Quick Steps

1. Create `.env.production` with real secrets
2. Setup PostgreSQL on VPS/RDS → apply `schema.sql`
3. Clone repo, `npm install --production`
4. Run with PM2 (2+ instances)
5. Nginx reverse proxy with Let's Encrypt SSL

---

## 📊 Project Status

### ✅ Completed
- WebAuthn biometric auth (backend complete, frontend in development)
- Password & email auth with JWT
- HTTP audio streaming with Range support (206/200)
- 40-second preview for paid tracks
- PayPal payment integration
- User statistics & leaderboards
- Admin track management
- Play history tracking
- Database schema (10 tables, 22 indexes)
- **Jest-Testsuite: 150 Tests, alle grün** (Auth, Tracks, Payments)
- CI über GitHub Actions: Tests, `npm audit`, Frontend-Build, Secret-Scan
- Secure Admin Hub with JWT login
- Windows 11 Pro setup guide

### 🚧 In Development (v6.3+)
- [ ] WebAuthn frontend stabilization
- [ ] Design system refinement
- [ ] E2E tests (Playwright)
- [ ] Advanced search & filtering
- [ ] Playlist creation

### 🔮 Future (v7.0+)
- [ ] Mobile app (React Native)
- [ ] Audio processing (normalization, EQ)
- [ ] Social features
- [ ] Streaming analytics
- [ ] Artist dashboard

---

## 🐛 Troubleshooting

**Q: SSL certificate error**
```bash
cd backend && npm run generate-cert
```

**Q: Database connection failed**
Check PostgreSQL is running, verify `DATABASE_URL` in `.env`, check credentials.

**Q: Port 3000 already in use**
```bash
netstat -ano | findstr :3000
# Then kill the process, or change PORT in .env
```

**Q: Webpack bundle not updating**
```bash
rm -rf frontend/dist
npm run build
```

**Q: Cannot access Admin Hub**
```sql
UPDATE users SET role='admin' WHERE email='your@email.com';
```

**Q: Tests fail with DB errors**
Make sure `NODE_ENV=test` is set and your test DB exists. See `__tests__/setup.js`.

---

## 📚 Documentation Index

| File | Purpose |
|------|---------|
| [MASTER-PROMPT-2026-AKTUELL.md](./MASTER-PROMPT-2026-AKTUELL.md) | 🔴 START HERE – session context |
| [DATABASE.md](./DATABASE.md) | Complete DB schema |
| [docs/DEPLOYMENT-HETZNER.md](./docs/DEPLOYMENT-HETZNER.md) | **Deployment auf Hetzner-VPS** — operative Anleitung mit Skripten |
| [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) | Deployment, allgemeine Fassung |
| [docs/SETUP-WINDOWS.md](./docs/SETUP-WINDOWS.md) | Windows 11 setup |
| [docs/ADMIN-GUIDE.md](./docs/ADMIN-GUIDE.md) | Admin Hub docs |
| [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md) | Project organization |

---

## 📄 License

MIT License © 2025–2026 Song-Nexus Contributors – See `LICENSE` for details.

---

## 👤 Author

**Sebastian** – Tool-maker turned Web Developer  
📍 Bad Ischl, Oberösterreich, AT | 📧 sebastian.schmalnauer@gmx.at  
🐛 [GitHub Issues](https://github.com/Waschtl904/song-nexus/issues)

---

**Zuletzt aktualisiert:** 15. August 2026 (gegen den Code auf `dev/v1.0` geprüft)  
**Backend-Version:** 6.3.0 · **Frontend-Version:** 8.0.0  
**Status:** 🟠 Pre-Launch — Code bereit für Soft-Launch, Deployment offen (Issue #6)  
**Tests:** ✅ 67 grün · **npm audit:** ✅ 0 Vulnerabilities  
**Fahrplan:** siehe [LAUNCH-PLAN.md](./LAUNCH-PLAN.md)
