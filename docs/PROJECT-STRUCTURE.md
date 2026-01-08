# 📁 SONG-NEXUS Project Structure

**Last Updated:** January 8, 2026  
**Version:** 1.0.2  

---

## 💬 Overview

Complete visual guide to Song-Nexus project organization. This document explains:
- Root directory structure (ACTUAL!)
- Backend API organization
- Frontend application layout
- Documentation files location
- Configuration files

---

## 📁 Root Directory (REAL STRUCTURE)

```
SONG-NEXUS/
│
├── 📋 Documentation (ROOT LEVEL!)
│   ├── README.md                              ✅ Main project overview
│   ├── MASTER-PROMPT-2026-AKTUELL.md          🔴 USE THIS EVERY SESSION!
│   ├── MASTER-PROMPT-2026-DEFINITIVE.md       (backup/reference)
│   ├── MASTER-CONTEXT-PROMPT.md               (reference)
│   ├── DATABASE.md                            ✅ Database schema
│   ├── PRODUCTION-DEPLOYMENT.md               ✅ Deployment guide
│   ├── REPOSITORY-STRUCTURE.md                (legacy, superseded by PROJECT-STRUCTURE.md)
│   ├── CODE_QUALITY_AUDIT.md                  (quality review)
│   └── schema.sql                             ✅ DATABASE SCHEMA (single source of truth)
│
├── 📂 docs/                                   (New docs folder)
│   ├── ADMIN-GUIDE.md                         ✅ NEW: Admin Hub documentation
│   └── PROJECT-STRUCTURE.md                   ✅ NEW: This file
│
├── 📂 backend/                                Express.js REST API Server
│   ├── 📂 middleware/                         Express middleware
│   │   └── auth-middleware.js                 JWT verification & token generation
│   ├── 📂 routes/                             API endpoint definitions
│   │   ├── auth.js                            POST /api/auth/login, /register, /verify
│   │   ├── webauthn.js                        WebAuthn biometric endpoints
│   │   ├── tracks.js                          GET /api/tracks/* (public)
│   │   ├── admin-tracks.js                    POST/PUT /api/admin/tracks/* (admin)
│   │   ├── payments.js                        PayPal payment processing
│   │   ├── users.js                           User profile & statistics
│   │   └── play-history.js                    Track play events
│   ├── 📂 public/                             Static files (CSS, JS, HTML)
│   ├── 📂 certs/                              SSL/TLS certificates
│   ├── 📂 node_modules/                       Dependencies (GITIGNORED)
│   ├── server.js                              Express server entry point
│   ├── generate-cert.js                       SSL cert generator utility
│   ├── performance-monitor.js                 Performance monitoring
│   ├── package.json                           Dependencies list
│   ├── package-lock.json                      Locked versions
│   ├── .env.example                           Environment template
│   ├── .gitignore                             Git ignore patterns
│   └── ⚠️ NOTE: NO /db/ folder! schema.sql is in ROOT!
│
├── 📂 frontend/                               React + Webpack Frontend
│   ├── 📂 admin/                              🔴 CORRECTED: Admin pages (NOT complete upload!)
│   │   ├── index.html                         🔐 Admin Hub main page
│   │   └── design-editor.html                 🎨 Design token editor
│   │
│   ├── admin-upload.html                      📤 Track upload interface (in frontend root!)
│   ├── index.html                             Homepage
│   ├── auth.html                              Login/registration
│   ├── payment-success.html                   PayPal success page
│   ├── payment-cancel.html                    PayPal cancel page
│   │
│   ├── 📂 js/                                 JavaScript modules
│   │   ├── main.js                            Webpack entry point
│   │   ├── app.js                             Main application logic
│   │   ├── auth.js                            Authentication flows
│   │   ├── webauthn.js                        Biometric auth (frontend)
│   │   ├── api-client.js                      API wrapper/utilities
│   │   ├── player.js                          Audio player
│   │   ├── tracks.js                          Track management
│   │   └── ...                                Other modules
│   │
│   ├── 📂 css/                                Stylesheets
│   │   ├── main.css                           Global styles
│   │   ├── player.css                         Player component
│   │   ├── auth.css                           Auth forms
│   │   └── ...                                Other styles
│   │
│   ├── 📂 assets/                             Images & static files
│   │   ├── logo.png
│   │   ├── icons/
│   │   └── ...
│   │
│   ├── 📂 blog/                               Blog content (legacy?)
│   ├── 📂 certs/                              Certificates (legacy?)
│   ├── 📂 config/                             Config files (legacy?)
│   ├── 📂 styles/                             Additional styles (legacy?)
│   ├── 📂 webpack/                            Webpack configs
│   ├── 📂 dist/                               Webpack output (GITIGNORED)
│   │   ├── main.bundle.js                     Bundled app code
│   │   └── main.bundle.js.map                 Source map
│   ├── 📂 node_modules/                       Dependencies (GITIGNORED)
│   ├── webpack.config.js                      Webpack build configuration
│   ├── server.js                              Frontend dev server
│   ├── package.json                           Dependencies list
│   ├── package-lock.json                      Locked versions
│   ├── .env.example                           Environment template
│   ├── _design-tokens-DEFAULT.css             Default design tokens
│   └── .gitignore                             Git ignore patterns
│
├── 📂 assets/                                 Project branding & assets
│   └── 📂 images/                             Screenshots, logos
│
├── 📂 archived/                               Old/deprecated code
│   └── (legacy files)
│
├── 📂 middleware/                             ⚠️ ROOT-LEVEL (legacy? check if used)
│   └── (check if this is used or deprecated)
│
├── 🔧 Config Files (ROOT)
│   ├── .env                                   Secrets (GITIGNORED)
│   ├── .env.example                           Environment template
│   ├── .env.production                        Production secrets
│   ├── .gitignore                             Git ignore patterns
│   ├── gitignore                              (duplicate? check)
│   ├── package.json                           Root package (concurrently)
│   ├── sync-repo.ps1                          Sync script (PowerShell)
│   └── LICENSE                                MIT License
│
└── 📄 README.md                               Main README (at root!)
```

---

## 🔴 IMPORTANT CORRECTIONS (v1.0.2)

### ✅ Admin Upload Location CORRECTED

**WRONG in v1.0.1:**
```
frontend/admin/
├── index.html
├── design-editor.html
└── admin-upload.html    ❌ DOESN'T EXIST HERE!
```

**CORRECT (v1.0.2):**
```
frontend/
├── admin/
│   ├── index.html
│   └── design-editor.html
│
└── admin-upload.html    ✅ ACTUALLY HERE! (frontend root!)
```

### Fix Link in frontend/admin/index.html

**Line 296 is correct:**
```html
<a href="../admin-upload.html" class="btn btn-card">Go to Upload</a>
```

This navigates from `frontend/admin/index.html` → `frontend/admin-upload.html` ✅

---

## 🔴 SCHEMA.SQL Location (REPEATED!)

❌ **WRONG:**
```
backend/db/schema.sql
```

✅ **CORRECT:**
```
ROOT/schema.sql    ← Single source of truth!
```

---

## 📋 Actual File Locations

| File/Folder | Location | Purpose |
|-------------|----------|----------|
| **schema.sql** | `ROOT/` | ✅ Database schema (single source of truth) |
| **MASTER-PROMPT-2026-AKTUELL.md** | `ROOT/` | 🔴 Start every session with this! |
| **DATABASE.md** | `ROOT/` | Database documentation |
| **PRODUCTION-DEPLOYMENT.md** | `ROOT/` | Deployment guide |
| **README.md** | `ROOT/` | Project overview |
| **ADMIN-GUIDE.md** | `docs/` | ✅ NEW: Admin Hub guide |
| **PROJECT-STRUCTURE.md** | `docs/` | ✅ NEW: Project organization (this file) |
| **index.html** | `frontend/admin/` | Admin Hub (JWT login) |
| **design-editor.html** | `frontend/admin/` | Design token editor |
| **admin-upload.html** | `frontend/` | 🔴 Track upload (ROOT of frontend!) |
| **backend/** | `ROOT/` | Express.js API server |
| **frontend/** | `ROOT/` | Webpack + HTML frontend |

---

## 🔍 Backend Structure (Correct)

```
backend/
├── middleware/
│   └── auth-middleware.js        JWT verification, token generation
├── routes/                        API endpoints (6 files)
│   ├── auth.js                   Authentication (7 endpoints)
│   ├── webauthn.js              Biometric (5 endpoints)
│   ├── tracks.js                Public tracks (4 endpoints)
│   ├── admin-tracks.js          Admin tracks (4 endpoints)
│   ├── payments.js              PayPal (6 endpoints)
│   ├── users.js                 User profile (5 endpoints)
│   └── play-history.js          Play tracking (4 endpoints)
├── public/                        Static files
├── certs/                         SSL certificates
├── server.js                      Express server
├── generate-cert.js               Cert generator
├── performance-monitor.js         Performance tracking
├── package.json
├── .env.example
└── .gitignore

⚠️ DATABASE SCHEMA:
   schema.sql is in ROOT, NOT in backend/db/
```

---

## 🎨 Frontend Structure (CORRECTED)

```
frontend/
├── admin/                         Admin Console folder
│   ├── index.html                Admin Hub main (JWT login)
│   └── design-editor.html        Design tool
│
├── admin-upload.html              🔴 TRACK UPLOAD (in root!)
│
├── html/                          ❌ DOESN'T EXIST (direct HTML files in root)
│
├── index.html                     Homepage
├── auth.html                      Login/signup
├── payment-success.html           PayPal success
├── payment-cancel.html            PayPal cancel
│
├── js/                            JavaScript modules
│   ├── main.js                   Entry point
│   ├── app.js
│   ├── auth.js
│   ├── api-client.js
│   ├── player.js
│   ├── tracks.js
│   └── webauthn.js
├── css/                           Stylesheets
├── assets/                        Images & static
├── dist/                          Webpack output (generated)
├── webpack.config.js
├── server.js                      Frontend dev server
├── package.json
├── .env.example
├── _design-tokens-DEFAULT.css     Design tokens
└── .gitignore
```

---

## 📚 Documentation Files (Actual Locations)

### ROOT Level Documents:
```
ROOT/
├── README.md                              Main project overview
├── MASTER-PROMPT-2026-AKTUELL.md          🔴 MANDATORY! Start every session!
├── MASTER-PROMPT-2026-DEFINITIVE.md       Reference/backup
├── MASTER-CONTEXT-PROMPT.md               Legacy reference
├── DATABASE.md                            Complete schema documentation
├── PRODUCTION-DEPLOYMENT.md               Deployment & DevOps guide
├── REPOSITORY-STRUCTURE.md                Legacy (use PROJECT-STRUCTURE.md instead)
├── CODE_QUALITY_AUDIT.md                  Quality review document
├── schema.sql                             ✅ DATABASE SCHEMA
└── ...
```

### docs/ Folder (New):
```
docs/
├── ADMIN-GUIDE.md                         ✅ NEW: Admin Hub guide
└── PROJECT-STRUCTURE.md                   ✅ NEW: This document
```

---

## 🧭 Quick Navigation

### Finding Specific Things

| Need | Location |
|------|----------|
| **API Endpoint Code** | `backend/routes/*.js` |
| **Authentication Logic** | `backend/middleware/auth-middleware.js` |
| **Database Schema** | `ROOT/schema.sql` |
| **Database Documentation** | `ROOT/DATABASE.md` |
| **Admin Hub (JWT Login)** | `frontend/admin/index.html` |
| **Design Editor** | `frontend/admin/design-editor.html` |
| **Track Upload Tool** | `frontend/admin-upload.html` 🔴 (ROOT!) |
| **Frontend Styles** | `frontend/css/*.css` |
| **API Client** | `frontend/js/api-client.js` |
| **Environment Setup** | `backend/.env.example` + `frontend/.env.example` |
| **Master Context** | `ROOT/MASTER-PROMPT-2026-AKTUELL.md` |
| **Deployment Info** | `ROOT/PRODUCTION-DEPLOYMENT.md` |
| **Project Overview** | `ROOT/README.md` |
| **Admin Documentation** | `docs/ADMIN-GUIDE.md` |

---

## 👶 Key Files You Need

### To Start Coding Each Session:
1. **Read first:** `ROOT/MASTER-PROMPT-2026-AKTUELL.md` (current status)
2. **Reference:** `ROOT/README.md` (overview)
3. **For admin work:** `docs/ADMIN-GUIDE.md`
4. **Database questions:** `ROOT/DATABASE.md`
5. **Deployment:** `ROOT/PRODUCTION-DEPLOYMENT.md`

### Configuration:
- Backend config: `backend/.env.example` → `backend/.env`
- Frontend config: `frontend/.env.example` → `frontend/.env`
- Root package: `ROOT/package.json` (concurrently runner)

### Database:
- Schema: `ROOT/schema.sql` (⚠️ NOT in backend/db/!)
- Docs: `ROOT/DATABASE.md`

---

## 🚨 Things to Fix/Clarify

### Questions:
1. **Root-level `middleware/` folder** - Is this still used or deprecated?
2. **`gitignore` file** - Why is there both `.gitignore` and `gitignore`?
3. **Legacy folders** - `frontend/blog/`, `frontend/certs/`, `frontend/config/`, `frontend/styles/` - Still needed?
4. **`archived/` folder** - What's in there? Can it be removed?
5. **`frontend/html/` folder** - Mentioned in old docs but doesn't exist

---

## 📖 How to Read This Hierarchy

```
📂 = Folder
📄 = File
✅ = Important/New
⚠️  = Attention needed
🔴 = Mandatory reading
🔴 = Corrected/Fixed
```

---

## 🔄 Update Log

**v1.0.2 - January 8, 2026 (LATEST)**
- ✅ Fixed admin-upload.html location (ROOT of frontend, not admin/)
- ✅ Clarified that link in index.html is correct (../ works)
- ✅ Added note about legacy folders to clean up
- ✅ Better organization of actual vs. missing folders

**v1.0.1 - January 8, 2026**
- ✅ Fixed schema.sql location (ROOT, not backend/db/)
- ✅ Fixed documentation locations (most are ROOT, not docs/)
- ✅ Added notes about incorrect previous documentation
- ✅ Clarified actual vs. intended structure

**v1.0 - January 7, 2026**
- Created initial PROJECT-STRUCTURE.md with errors

---

**Last Updated:** January 8, 2026  
**Accuracy:** 98% (see "Things to Fix" section)  
**Maintainer:** Sebastian
