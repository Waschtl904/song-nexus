# 🎵 SONG-NEXUS Master Prompt
**Datum:** 6. Januar 2026, 15:10 CET  
**Status:** Production Ready + Today's Updates  
**System:** Windows 11 Pro, VSCode, PowerShell  
**Repository:** [Waschtl904/song-nexus](https://github.com/Waschtl904/song-nexus)

---

## 📋 QUICK START (Read This First!)

**For every new development session:**

1. Copy this file into your Claude chat
2. Read "Current Status" section
3. Check "Known Issues & Workarounds"
4. Proceed with development

**Why?** Prevents regression bugs. Single source of truth.

---

## ✅ Current Status (6. January 2026)

### Overall Status
🟢 Production Ready v1.0
🟢 All major features working
🟢 CSS refactor complete (no !important)
🟢 Design system API integration working
🟢 Play button fixed & visible
🟢 Documentation current

### What Changed Today (6. Jan)
✅ CSS Refactor: Removed ALL !important declarations
   - Proper CSS specificity hierarchy
   - Better maintainability
   - Design system variables integrated

✅ Play Button: Metal button fully functional
   - WebP format image
   - Correct positioning & clipping
   - Hover/active states working

✅ Design System: Backend API integration
   - Dynamic theme loading
   - CSS variables from database
   - Color changes apply globally

✅ Bug Fixes:
   - Logout race condition fixed
   - HTTPS server startup corrected
   - Duplicate dependencies removed
   - Morgan logger added

✅ Code Quality: Comprehensive audit completed
   - Architecture validated
   - Dependencies verified
   - Security checks passed

✅ Documentation: README fully updated
   - Accurate feature list
   - Current API endpoints (35 total)
   - Deployment guide included

### Web Commits Summary (Last 20 commits)
1. ✅ Code quality audit report added
2. ✅ CSS refactor - remove !important
3. ✅ Metal play button image added (WebP)
4. ✅ Play button positioning fixed
5. ✅ Card styling refined
6. ✅ Design system loader module created
7. ✅ Cyberpunk design restored with CSS variables
8. ✅ HTTPS server startup duplicates removed
9. ✅ Bcrypt dependency cleaned up
10. ✅ NPM scripts & morgan dependency fixed

---

## 🔐 Authentication Status

### WebAuthn (Biometric)
✅ Backend: COMPLETE & WORKING
   - Registration endpoint: /api/auth/webauthn/register-options ✅
   - Authentication endpoint: /api/auth/webauthn/authenticate-options ✅
   - Credential verification: SECURE ✅
   - Database storage: webauthn_credentials table ✅

⚠️ Frontend: IN DEVELOPMENT
   - UI for biometric login: Implemented
   - Browser API integration: Working
   - Error handling: Improved
   - Note: Testing required in specific browser/device combinations

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

USE CSS VARIABLES FOR:
  ✅ Colors: var(--color-primary), var(--color-accent-orange)
  ✅ Spacing: var(--space-16), var(--space-32)
  ✅ Typography: var(--font-size-lg), var(--font-weight-semibold)
  ✅ Effects: var(--shadow-lg), var(--radius-base)

DANGEROUS TO MODIFY:
  ⛔ Color hardcodes (if any remain)
  ⛔ !important declarations (REMOVED - don't re-add)
  ⛔ Inline styles with hardcoded values

### Recent Fix
Problem: !important declarations breaking specificity
Solution: COMPLETE REFACTOR on 6. Jan
  - Removed ALL !important from CSS
  - Proper cascade hierarchy implemented
  - Design system variables prioritized
  - Result: Cleaner, more maintainable CSS

Status: DO NOT RE-ADD !important!

---

## 🎯 Protected Code (DO NOT TOUCH!)

### WebAuthn Module
File: frontend/js/webauthn.js
Status: CRITICAL SECURITY CODE
Action: READ-ONLY (unless critical bug)

If something breaks:
  1. CHECK browser console for errors
  2. VERIFY device supports WebAuthn
  3. CHECK credential registration in database
  4. ONLY THEN modify code

Why protected?
  - Biometric authentication = security-critical
  - Changes can break user logins
  - Testing requires specific hardware
  - Even small changes can cause regressions

### Authentication Flow
File: frontend/js/auth.js
Status: CRITICAL AUTHENTICATION
Action: VERY CAREFUL MODIFICATIONS ONLY

Protected sections:
  - JWT token handling
  - Token refresh logic
  - Logout sequence (JUST FIXED - don't break!)
  - Session management

What's safe:
  - UI text/labels
  - Error messages
  - Form styling (use CSS variables)

### Backend Database Schema
File: backend/db/schema.sql
Status: PRODUCTION DATABASE
Action: MIGRATIONS ONLY (never direct schema changes)

To modify schema:
  1. Create new SQL migration file
  2. Test on dev database first
  3. Never modify existing tables directly
  4. Always add backwards compatibility

Tables to never delete/modify core fields:
  - users (id, email, password_hash, webauthn_credential)
  - webauthn_credentials (security-critical)
  - tracks (audio_filename references)
  - orders/purchases (financial data)

---

## 🟢 Safe to Modify (Safe Zones)

### UI & Styling (100% Safe)
✅ SAFE TO CHANGE:
  - CSS files (use CSS variables!)
  - HTML templates (styling only)
  - Button designs
  - Layout & spacing
  - Colors (via CSS variables)
  - Animations & transitions
  - Responsive breakpoints

HOW TO MODIFY SAFELY:
  1. Only use CSS variables for colors
  2. Test in browser (DevTools)
  3. Check mobile responsiveness
  4. No hardcoded colors!
  5. Use semantic CSS class names

### Track/Audio Features (Safe)
✅ SAFE TO MODIFY:
  - Track upload form UI
  - Audio player controls
  - Waveform visualization
  - Genre categorization
  - Track metadata display
  - Search/filtering UI

AVOID MODIFYING:
  - Audio stream endpoints (backend)
  - Authentication before playback
  - Payment integration

### User Dashboard (Safe)
✅ SAFE TO MODIFY:
  - Statistics display
  - Play history UI
  - Purchase history formatting
  - Leaderboard styling
  - User profile fields (display only)

BACKEND SAFETY:
  - Never bypass auth checks
  - Always validate user ownership
  - Keep payment data separate

---

## ⚠️ Known Issues & Workarounds

### 1. WebAuthn Browser Support
Issue: WebAuthn not available on some devices
Status: EXPECTED BEHAVIOR
Workaround:
  - Provide password login as fallback ✅
  - Show friendly error message ✅
  - Users can register with magic link ✅

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

Priority: LOW (not critical for development)

### 3. Audio Streaming in Development
Issue: HTTPS required for audio streaming
Status: EXPECTED (security requirement)
Solution: Use mkcert for local SSL ✅
Command: cd backend && npm run generate-cert

Test audio streaming:
  PowerShell: Invoke-WebRequest -Uri https://localhost:3000/api/tracks/audio/filename.mp3 -SkipCertificateCheck
  Note: SkipCertificateCheck needed for self-signed certs

### 4. PostgreSQL Connection Issues
Issue: Database connection refuses
Check:
  1. PostgreSQL is running: Get-Service postgresql* (PowerShell)
  2. Port 5432 is open: netstat -an | findstr 5432
  3. DATABASE_URL in .env is correct
  4. Credentials match your PostgreSQL setup

Default LOCAL database:
  User: postgres
  Password: postgres
  Database: song_nexus_dev
  Host: localhost:5432

### 5. Port Already in Use
Issue: "Port 3000 already in use" or "Port 5500 already in use"
PowerShell fix:
  # Find process using port 3000
  Get-Process -Id (Get-NetTCPConnection -LocalPort 3000).OwningProcess
  
  # Kill process
  Stop-Process -Id [PID] -Force
  
  # OR change port in .env
  PORT=3001  # Use different port

Alternative: Use different ports in .env
  Frontend: FRONTEND_PORT=5501
  Backend: PORT=3001

---

## 🛠️ Windows 11 PowerShell Commands

### Project Setup
# Clone repo
git clone https://github.com/Waschtl904/song-nexus.git
cd song-nexus

# Install all dependencies
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..

# Setup environment files
Copy-Item backend/.env.example backend/.env
Copy-Item frontend/.env.example frontend/.env

# Edit .env files with your values
notepad backend/.env
notepad frontend/.env

# Create PostgreSQL database
psql -U postgres
CREATE DATABASE song_nexus_dev;
\q

# Apply database schema
psql -U postgres -d song_nexus_dev -f backend/db/schema.sql

# Generate SSL certificates for local development
cd backend
npm run generate-cert
cd ..

### Development
# Start both backend and frontend
npm start

# Backend only (port 3000)
npm run server

# Frontend only (port 5500, requires backend running)
npm run client

# Build frontend (Webpack)
npm run build

# Dev build (faster, with source maps)
npm run build:dev

### Database Management
# View PostgreSQL service status
Get-Service postgresql*

# Start PostgreSQL (if stopped)
Start-Service postgresql-x64-[version]

# Connect to database
psql -U postgres -d song_nexus_dev

# Useful psql commands:
# \dt = list tables
# \d table_name = describe table
# SELECT * FROM users LIMIT 5; = query data
# \q = quit psql

### Debugging
# Check if ports are in use
netstat -ano | findstr :3000
netstat -ano | findstr :5500
netstat -ano | findstr :5432

# Kill process using port
$pid = (Get-NetTCPConnection -LocalPort 3000).OwningProcess
Stop-Process -Id $pid -Force

# View Node.js processes
Get-Process node

# Check environment variables
$env:DATABASE_URL
$env:JWT_SECRET

# Create .env file quickly
@"
DATABASE_URL=postgres://postgres:postgres@localhost:5432/song_nexus_dev
JWT_SECRET=dev-secret-key-change-in-production
NODE_ENV=development
PORT=3000
"@ | Set-Content backend/.env

### Git Workflow
# Check status
git status

# Add changes
git add .

# Commit
git commit -m "feat: add new feature"
git commit -m "fix: resolve bug"
git commit -m "docs: update documentation"

# Push to main
git push origin main

# Create feature branch
git checkout -b feature/your-feature-name
git push origin feature/your-feature-name

# View logs
git log --oneline -10

### File Operations
# Create directories
New-Item -ItemType Directory -Path "frontend/config"
New-Item -ItemType Directory -Path "backend/uploads"

# Search for text in files
Select-String -Path "frontend/js/*.js" -Pattern "var(--color" | Select-Object -First 10

# Find all CSS files
Get-ChildItem -Path "frontend" -Filter "*.css" -Recurse

# View file contents
Get-Content frontend/css/main.css | Select-Object -First 50

# Copy file
Copy-Item frontend/.env.example frontend/.env

---

## 📊 API Endpoints (35 Total)

### Authentication (7)
POST   /api/auth/register               ✅
POST   /api/auth/login                  ✅
POST   /api/auth/verify                 ✅
GET    /api/auth/me                     ✅
POST   /api/auth/refresh-token          ✅
POST   /api/auth/logout                 ✅ (RACE CONDITION FIXED)
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

SONG-NEXUS/
├── frontend/
│   ├── js/
│   │   ├── main.js                 # Webpack entry
│   │   ├── app.js                  # Main app logic
│   │   ├── auth.js                 # 🔴 PROTECTED: Auth flows
│   │   ├── webauthn.js             # 🔴 PROTECTED: Biometric auth
│   │   ├── player.js               # Audio player
│   │   ├── api-client.js           # API wrapper
│   │   ├── design-system-loader.js # 🟢 CSS variables loader
│   │   └── ...
│   ├── css/
│   │   ├── main.css                # 🟢 SAFE: Use CSS variables
│   │   ├── player.css              # 🟢 SAFE: Audio player styling
│   │   ├── design-tokens.css       # 🟢 SAFE: CSS variable definitions
│   │   └── ...
│   ├── html/
│   │   ├── index.html              # Main entry
│   │   ├── app.html                # Player UI
│   │   └── ...
│   └── assets/                     # Images (including play button)
│
├── backend/
│   ├── routes/
│   │   ├── auth.js                 # 🔴 PROTECTED: Password/magic link
│   │   ├── webauthn.js             # 🔴 PROTECTED: Biometric auth
│   │   ├── tracks.js               # 🟢 SAFE: Track endpoints
│   │   ├── payments.js             # 🟡 CAREFUL: PayPal integration
│   │   └── ...
│   ├── middleware/
│   │   ├── auth-middleware.js       # 🔴 PROTECTED: JWT verification
│   │   └── cache-middleware.js      # 🟢 SAFE: Response caching
│   ├── db/
│   │   └── schema.sql              # 🔴 PROTECTED: Database schema
│   ├── uploads/                    # Audio files storage
│   ├── server.js                   # 🔴 PROTECTED: Express setup
│   ├── db.js                       # 🔴 PROTECTED: Database connection
│   └── ...
│
├── README.md                       # ✅ Current & accurate
├── MASTER-PROMPT-2026-AKTUELL.md   # 👈 THIS FILE
├── DATABASE.md                     # ✅ Complete schema
├── API-Documentation-v1.md         # ✅ API reference
└── PRODUCTION-DEPLOYMENT.md        # ✅ Deployment guide

---

## 🚀 Next Steps / Priorities

### Immediate (Next Session)
1. ✅ Pull latest code to your machine
2. ✅ Run npm install (all three: root, frontend, backend)
3. ✅ Test login (password + WebAuthn)
4. ✅ Verify play button visible
5. ✅ Check CSS variables loaded

### Short Term (This Week)
Priority 1: WebAuthn Frontend Stabilization
  - Test on different browsers
  - Improve error messages
  - Add loading indicators
  - Status: IN DEVELOPMENT

Priority 2: Design System Real-time Updates
  - Implement dynamic CSS injection
  - Avoid page reload for color changes
  - Status: API READY, FRONTEND PENDING

Priority 3: Unit Tests
  - Authentication tests
  - API endpoint tests
  - Status: NOT STARTED

### Medium Term (Next 2-4 Weeks)
1. Advanced Search & Filtering
2. Playlist Creation
3. Social Features (followers)
4. Mobile Optimization
5. Performance Monitoring

---

## 🎯 What to Copy to Next Chat

When starting a new development session:

1. **Copy the "Current Status" section** (✅ Current Status - 6. January)
2. **Copy the "Protected Code" section** (🔴 Know what NOT to touch)
3. **Copy the "Safe to Modify" section** (🟢 Know what you CAN change)
4. **Copy "Known Issues & Workarounds"** (Handle problems quickly)
5. **Copy "PowerShell Commands"** (For Windows 11 specific tasks)

**Pro Tip:** Save this entire file. Copy it into every new Claude chat at the start. Takes 10 seconds, prevents regression bugs completely.

---

## 📞 Quick Reference Checklist

Before starting work:
- [ ] Read "Current Status" section
- [ ] Check "Known Issues" for your use case
- [ ] Know which files are 🔴 PROTECTED
- [ ] Know which files are 🟢 SAFE
- [ ] Have PowerShell commands ready
- [ ] Database running? (Get-Service postgresql*)
- [ ] npm install done? (npm install all 3 directories)
- [ ] .env files configured?

During development:
- [ ] Using CSS variables for colors?
- [ ] Testing in browser DevTools?
- [ ] Checking console for errors?
- [ ] Committing regularly?

Before pushing:
- [ ] npm run build (success?)
- [ ] All features tested?
- [ ] No console errors?
- [ ] git commit with clear message?
- [ ] git push origin main?

---

## 📝 Document Metadata

| Aspect | Detail |
|--------|--------|
| **Created** | 6. Januar 2026, 15:10 CET |
| **Last Updated** | 6. Januar 2026, 15:10 CET |
| **Status** | ✅ Current & Accurate |
| **Version** | 2.0 (Updated from v1.0) |
| **Scope** | Complete project overview |
| **Audience** | Sebastian (developer) |
| **Language** | English (with PowerShell examples) |
| **Changes Today** | All CSS refactors, bug fixes, play button, design system integration documented |

---

## 🔗 Related Files

All documentation is current as of 6. January 2026:

- **[README.md](./README.md)** - Project overview, features, tech stack
- **[DATABASE.md](./DATABASE.md)** - Complete database schema
- **[API-Documentation-v1.md](./API-Documentation-v1.md)** - All 35 endpoints
- **[PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)** - Deployment steps

**Old/Archived files:**
- SONG-NEXUS-Master-v10.md (use for architecture reference only)
- MASTER-ENTRY-PROMPT.md (v1, now archived)
- Various old implementation checklists (refer to README for current status)

---

## ✅ File Now on GitHub!

**Status:** MASTER-PROMPT-2026-AKTUELL.md is now live on GitHub! 🎉

**URL:** https://github.com/Waschtl904/song-nexus/blob/main/MASTER-PROMPT-2026-AKTUELL.md

**Next Step:** Pull the file to your local machine:

```powershell
cd C:\Users\sebas\Desktop\SongSeite
git pull origin main
```

**Result:** File syncs automatically! ✅
