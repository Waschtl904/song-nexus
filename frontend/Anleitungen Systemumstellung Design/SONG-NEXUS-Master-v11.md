# 🎵 SONG-NEXUS - Master Prompt v11.0
**Status: ✅ PRODUCTION READY - Terminal & Concurrently Fixed (Dec 19, 2025)**

---

## 📋 PROJECT OVERVIEW

**SONG-NEXUS** is a full-stack music streaming platform with advanced authentication, audio playback, and track management.

| Aspect | Details |
|--------|---------|
| **Tech Stack** | Node.js + Express (Backend) / ES6 Modules + Webpack (Frontend) |
| **Auth System** | WebAuthn (Biometric) + Password + Magic Link |
| **Database** | PostgreSQL with advanced track/user management |
| **Audio** | Streaming with waveform visualization + keyboard controls |
| **Frontend Build** | Webpack 5 bundling to single `app.bundle.js` (83.5 KiB) |
| **Terminal** | Optimized `concurrently` output with color-coding & deprecation fixes |

---

## 📅 ROADMAP & NEXT STEPS (Updated Dec 19, 2025)

We are currently in **Phase 3** of the optimization process.

### ✅ COMPLETED
- **Phase 1: Documentation Audit** (Identified missing setup/API docs)
- **Phase 2: Terminal Cleanup**
  - ✅ Fixed `concurrently` Windows prefix issue
  - ✅ Added color-coding (Blue=Backend, Magenta=Frontend)
  - ✅ Removed `[DEP0060]` warnings via `--no-deprecation`
  - ✅ Simplified startup logs

### 🚧 IN PROGRESS (Phase 3: Documentation & Hardening)
1. **API Documentation**
   - [ ] Document all endpoints in `routes/auth.js` & `routes/webauthn.js`
   - [ ] Define Request/Response formats
2. **Database Schema**
   - [ ] Create `schema.sql` or ERD diagram
   - [ ] Document User/Track relationships
3. **Environment Setup**
   - [ ] Create `.env.example` template
   - [ ] Secure Production Secrets

### 🔮 FUTURE (Phase 4: Optimization & Deployment)
- [ ] Deployment Guide (Vercel/VPS)
- [ ] Testing Strategy (Unit/E2E)
- [ ] PWA Implementation
- [ ] Lazy Loading for Modules

---

## 🏗️ ARCHITECTURE

### Frontend Structure (`/frontend`)
```
frontend/
├── js/                    # ES6 Modules (11 files)
│   ├── main.js           # Webpack entry point
│   └── [modules]         # auth.js, player.js, etc.
├── package.json          # ✅ FIXED: Scripts with --no-deprecation
└── dist/
    └── app.bundle.js     # ✅ Single production bundle
```

### Backend Structure (`/backend`)
```
backend/
├── server.js            # ✅ FIXED: Clean startup logs
├── routes/              # Auth, Tracks, WebAuthn
├── package.json         # ✅ FIXED: Scripts with --no-deprecation
└── logs/                # Application logs
```

---\

## 🔧 TERMINAL & SCRIPTS SETUP (v11)

### Root `package.json` (Optimized)
```json
"scripts": {
    "start": "concurrently -k -p \"[{name}]\" -n \"BACKEND,FRONTEND\" -c \"blue.bold,magenta.bold\" \"npm run server\" \"npm run client\"",
    "server": "cd backend && npm start",
    "client": "cd frontend && npm start"
}
```

### Frontend `package.json`
```json
"scripts": {
    "start": "node --no-deprecation server.js"
}
```

### Backend `package.json`
```json
"scripts": {
    "start": "node --no-deprecation server.js"
}
```

---\

## 🔐 AUTHENTICATION FLOWS

### 1. WebAuthn Biometric
1. User clicks "Biometric Login"
2. Browser prompts for fingerprint/face
3. Credential verified with backend
4. Token returned + user logged in

### 2. Password Auth
1. User enters email + password
2. Backend validates against database
3. Token issued if credentials correct

### 3. Magic Link
1. User enters email
2. Backend sends link to email
3. User clicks link → Frontend verifies token

---

## 📝 IMPORTANT NOTES

### Terminal Output
- **Blue Logs**: Backend Server (Port 3000)
- **Magenta Logs**: Frontend Server (Port 5500)
- **Clean Output**: No timestamps in prefix (Windows fix), no deprecation warnings

### ES6 Module System
- All imports use relative paths: `import { Auth } from './auth.js'`
- File extensions required: `./auth.js` NOT `./auth`

---

**Last Updated**: December 19, 2025 - 14:55 CET
**Status**: ✅ Phase 2 Complete - Ready for Phase 3 (Docs & API)