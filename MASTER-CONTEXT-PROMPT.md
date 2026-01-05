# 🎵 SONG-NEXUS - MASTER CONTEXT PROMPT (v4 - PRODUCTION READY)

> **Use this prompt in new chat sessions to understand current project status**

**Last Updated:** January 5, 2026 (17:57 CET)  
**Status:** ✅ Production-Ready (Database & API Complete)  
**DB Schema:** ✅ VERIFIED (10 Tabellen, 22 Indexes, schema.sql im Root)  
**Documentation:** ✅ README.md, DATABASE.md, PRODUCTION-DEPLOYMENT.md, diese Datei

---

## 📄 DOCUMENTATION REFERENCE

| File | Purpose | Content |
|------|---------|----------|
| **[README.md](./README.md)** | Project Overview | Features, tech stack, quick start, API reference |
| **[DATABASE.md](./DATABASE.md)** | Database Documentation | All 10 tables, relationships, indexes, performance tips |
| **[PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)** | Deployment Guide | Step-by-step production deployment, SSL, monitoring |
| **[MASTER-CONTEXT-PROMPT.md](./MASTER-CONTEXT-PROMPT.md)** | This File | Project context for new chat sessions |
| **[schema.sql](./schema.sql)** | Database Schema | Complete PostgreSQL schema (10 tables, verified) |

---

## 📄 QUICK PROJECT SNAPSHOT

### ✅ FULLY WORKING
- ✅ Backend API (35 endpoints, Express.js)
- ✅ PostgreSQL Database (10 tables, 22 indexes)
- ✅ Audio Streaming & Player
- ✅ PayPal Integration (Sandbox tested)
- ✅ JWT Authentication (7 day TTL)
- ✅ Magic Link Email Auth
- ✅ HTTPS/SSL Support (mkcert)
- ✅ Webpack Bundle (83.5 KiB)
- ✅ User Stats & Analytics
- ✅ Admin Track Management
- ✅ Environment Config (.env.example files)
- ✅ Complete Documentation

### 🚧 IN DEVELOPMENT
- 🚧 WebAuthn Biometric (Backend done, frontend stabilization needed)
- 🚧 Design System (Color tokens, theme panel - partially working)
- 🚧 Frontend UI Polish

### 🔮 FUTURE
- Mobile app (React Native)
- Advanced search & filtering
- Playlists & social features
- Audio processing

---

## 📊 DATABASE (10 TABLES - VERIFIED)

### Schema Location
- **File:** [schema.sql](./schema.sql) (root directory, cleaned export)
- **Size:** 22 KB, 700+ lines
- **Verified:** January 5, 2026 via pgAdmin 4
- **Documentation:** [DATABASE.md](./DATABASE.md) (complete reference)

### Tables Overview

```
users                   ✓ User accounts & authentication (WebAuthn support)
tracks                  ✓ Music metadata with soft delete (is_deleted)
orders                  ✓ PayPal transactions
purchases               ✓ Track purchases per user
play_history            ✓ Play event tracking
play_stats              ✓ Advanced player analytics
webauthn_credentials    ✓ Biometric auth data
magic_links             ✓ Email-based login tokens
magic_link_tokens       ✓ Alternative token storage
design_system           ✓ Theme & design tokens (27 fields)
```

### Key Features
- **22 indexes** for performance
- **11 foreign keys** with CASCADE/SET NULL
- **9 unique constraints** for data integrity
- **3 check constraints** for validation
- **Soft deletes** on tracks (is_deleted flag)
- **JSONB storage** for complex data
- **Connection pooling** ready

**Full documentation:** [DATABASE.md](./DATABASE.md)

---

## 🚀 API ENDPOINTS (35 TOTAL)

### Authentication (7 endpoints)
```
POST   /api/auth/register
POST   /api/auth/login
POST   /api/auth/verify
GET    /api/auth/me
POST   /api/auth/refresh-token
POST   /api/auth/logout
POST   /api/auth/dev-login
```

### WebAuthn Biometric (5 endpoints)
```
POST   /api/auth/webauthn/register-options
POST   /api/auth/webauthn/register-verify
POST   /api/auth/webauthn/authenticate-options
POST   /api/auth/webauthn/authenticate-verify
POST   /api/auth/webauthn/register-password
```

### Tracks (4 endpoints)
```
GET    /api/tracks
GET    /api/tracks/:id
GET    /api/tracks/audio/:filename
GET    /api/tracks/genres/list
```

### Admin (4 endpoints)
```
POST   /api/admin/tracks/upload
GET    /api/admin/tracks/list
PUT    /api/admin/tracks/:id
DELETE /api/admin/tracks/:id
```

### Payments (6 endpoints)
```
GET    /api/payments/config
POST   /api/payments/create-order
POST   /api/payments/capture-order/:id
GET    /api/payments/user-purchases
GET    /api/payments/history
GET    /api/payments/stats
```

### Users (5 endpoints)
```
GET    /api/users/profile
GET    /api/users/stats
GET    /api/users/purchases
GET    /api/users/play-history
GET    /api/users/leaderboard
```

### Play History (4 endpoints)
```
POST   /api/play-history/
GET    /api/play-history/user/:userId
DELETE /api/play-history/user/:userId
GET    /api/play-history/stats/user/:userId
```

---

## 📁 PROJECT STRUCTURE

```
SONG-NEXUS/
├── backend/
│   ├── certs/                  # SSL certificates
│   ├── middleware/             # JWT auth, caching, error handling
│   ├── routes/                 # 8 endpoint files (35 total)
│   ├── uploads/                # Audio file storage
│   ├── server.js               # Express server
│   ├── db.js                   # Database connection
│   ├── .env.example            # ✅ Template (all variables)
│   └── package.json
│
├── frontend/
│   ├── js/                     # App logic modules
│   ├── html/                   # HTML templates
│   ├── css/                    # Stylesheets
│   ├── dist/                   # Webpack bundle
│   ├── .env.example            # ✅ Template
│   ├── webpack.config.js
│   └── package.json
│
├── schema.sql                  # ✅ DATABASE SCHEMA (10 tables, verified)
├── README.md                   # ✅ Project overview
├── DATABASE.md                 # ✅ Schema documentation
├── PRODUCTION-DEPLOYMENT.md    # ✅ Deployment guide
├── MASTER-CONTEXT-PROMPT.md    # ✅ This file
├── package.json                # Root package
└── .gitignore                  # (includes .env files)
```

---

## 🛠️ TECH STACK

**Frontend:**
- JavaScript ES6+
- Webpack 5
- HTML/CSS
- 83.5 KiB production bundle

**Backend:**
- Node.js 18+
- Express.js
- PostgreSQL 12+
- JWT authentication
- bcrypt password hashing
- HTTPS with mkcert

**Database:**
- PostgreSQL (10 tables, 22 indexes)
- Native queries with pg library
- Connection pooling
- Soft deletes on tracks

**Security:**
- TLS 1.3 encryption
- CORS headers
- JWT Bearer tokens
- WebAuthn biometric auth
- Input validation/sanitization

---

## 🚧 KNOWN ISSUES & SOLUTIONS

### Issue 1: Design System Instability
**Problem:** Theme panel changes only work partially (primary + text colors OK, others not)
**Root Cause:** CSS variables not consistently applied to all components
**Status:** In development
**Next Steps:** Audit all components, ensure CSS variable usage

### Issue 2: WebAuthn Fragility
**Problem:** Frontend event listeners sometimes lost after code changes
**Root Cause:** WebAuthn logic too tightly coupled to DOM elements
**Status:** In development
**Solution:** Refactor into separate module, explicit listener registration

### Issue 3: Old Files in Git
**Problem:** Archived PHASE-*.md files still in repository
**Status:** Pending cleanup
**Action:** Use cleanup command below

---

## 💡 IMMEDIATE ACTION ITEMS

### This Session
1. ✅ Update README.md with schema.sql reference
2. ✅ Create DATABASE.md (complete schema documentation)
3. ✅ Update MASTER-CONTEXT-PROMPT.md (this file)
4. ✅ Update PRODUCTION-DEPLOYMENT.md (reference links)

### Next Priority
1. Design System stabilization (Phase 1)
2. WebAuthn frontend refactor (Phase 2)
3. Repository cleanup (archived files)
4. Production test deployment

---

## 📋 QUICK COMMANDS

### Local Development
```bash
# Setup
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# Configure
cp backend/.env.example backend/.env
cp frontend/.env.example frontend/.env

# Database
psql -U postgres -d song_nexus_dev -f schema.sql

# Run
npm start              # Both backend + frontend
npm run server         # Backend only
npm run client         # Frontend only
```

### Database Backups
```bash
# Full backup
pg_dump -U postgres -d song_nexus_dev | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz

# Restore
gunzip -c backup_20260105.sql.gz | psql -U postgres -d song_nexus_dev
```

### Cleanup Archived Files
```bash
git rm PHASE-*.md PROGRESS-*.md LIVE-*.md MASTER-ENTRY-PROMPT.md 2>/dev/null
git commit -m "cleanup: remove archived phase files"
git push origin main
```

---

## 📚 ENVIRONMENT VARIABLES

### Backend (.env)
```env
NODE_ENV=development
PORT=3000
DATABASE_URL=postgres://user:pass@localhost:5432/song_nexus_dev
JWT_SECRET=your-random-32-char-secret
JWT_EXPIRE=7d
PAYPAL_CLIENT_ID=sandbox-id
PAYPAL_CLIENT_SECRET=sandbox-secret
WEBAUTHN_RP_ID=localhost
WEBAUTHN_ORIGIN=https://localhost:5500
```

### Frontend (.env)
```env
VITE_API_URL=https://localhost:3000
VITE_PAYPAL_CLIENT_ID=sandbox-id
VITE_ENVIRONMENT=development
```

---

## 📝 WHEN STUCK

| Problem | Where to Look | Solution |
|---------|---------------|----------|
| Database questions | [DATABASE.md](./DATABASE.md) | Full table/index/constraint reference |
| Schema structure | [schema.sql](./schema.sql) | Raw SQL definitions |
| API endpoint info | [README.md](./README.md) | Quick API reference |
| Deployment steps | [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md) | Complete deployment guide |
| Design System broken | `frontend/css/design-system.css` | Check CSS variables |
| WebAuthn issue | `frontend/js/webauthn.js` | Check event listeners |
| .env template | `.env.example` files | All required variables |
| General overview | [README.md](./README.md) | Features, tech stack, structure |

---

## 📋 IMPORTANT FILES

### Must Know
- **schema.sql** - Database schema (apply with: `psql -d song_nexus_dev -f schema.sql`)
- **.env.example** - Template for secrets (copy to .env, update values)
- **server.js** - Main backend entry point
- **webpack.config.js** - Frontend bundler config

### DO NOT COMMIT
- `.env` files (with real secrets)
- `node_modules/`
- `frontend/dist/` (regenerated on build)
- `backend/uploads/` (audio files)
- `backend/certs/` (local SSL, regenerate with npm run generate-cert)

### GIT IGNORE
```
.env
.env.production
node_modules/
frontend/dist/
backend/uploads/
backend/certs/
*.log
.DS_Store
```

---

## 🚀 NEXT MAJOR MILESTONES

### Q1 2026
- [ ] Design System fully functional
- [ ] WebAuthn frontend stable
- [ ] Unit test framework setup
- [ ] Full test coverage (50%+)

### Q2 2026
- [ ] Mobile app MVP (React Native)
- [ ] Playlist functionality
- [ ] Social sharing features
- [ ] Advanced search

### Q3 2026
- [ ] Production deployment
- [ ] Performance optimization
- [ ] Audio processing pipeline
- [ ] Analytics dashboard

---

## 🙏 KEY PEOPLE

**Author:** Sebastian (Full-stack developer)
- Location: Vienna, Austria
- Expertise: WebAuthn, Full-stack, Music tech
- Contact: sebastian.schmalnauer@gmx.at (inferred)

---

## 📄 DOCUMENT HISTORY

| Version | Date | Changes |
|---------|------|----------|
| v4 | Jan 5, 2026 | Updated with DATABASE.md, fixed schema.sql paths |
| v3 | Jan 4, 2026 | Added 10 tables from pgAdmin export |
| v2 | Dec 28, 2025 | Initial comprehensive version |
| v1 | Dec 20, 2025 | Basic project outline |

---

**🎵 Song-Nexus - Production-Ready Music Streaming Platform**

✅ Database: Verified  
✅ API: Complete  
✅ Documentation: Comprehensive  
🚧 Frontend: In Progress

**Status:** Ready for production deployment after final frontend stabilization.