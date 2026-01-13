# 🎵 SONG-NEXUS

> **A modern, full-stack music streaming platform with advanced authentication, real-time audio playback, and secure admin management.**

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Tech Stack](https://img.shields.io/badge/Tech-Node.js%20|%20Express%20|%20React%20|%20PostgreSQL-informational?style=flat-square)

---

## 🖥️ YOUR WINDOWS 11 LAPTOP SETUP

### ⚠️ IMPORTANT: Your Single Working Directory

**All development work happens in ONE location ONLY:**

```
C:\Users\sebas\Desktop\SongSeite
```

**This directory contains:**
- ✅ All project code (backend/, frontend/)
- ✅ All documentation files (README.md, *.md)
- ✅ Database schema (schema.sql)
- ✅ Node.js packages (node_modules/)
- ✅ Environment configurations (.env files)
- ✅ Git repository (.git/)

**NEVER:**
- ❌ Create copies in other locations
- ❌ Work in different folders
- ❌ Mix with other projects

**Keep synchronized with GitHub:**
```powershell
cd C:\Users\sebas\Desktop\SongSeite
git pull origin main
```

---

## 🚀 Overview

**SONG-NEXUS** is a cutting-edge music streaming application built with modern web technologies. It features:

- 🔐 **Triple Authentication** - WebAuthn (Biometric), Password, Magic Link
- 🎵 **Advanced Audio Streaming** - Real-time playback with waveform visualization
- 💳 **Secure Payments** - PayPal integration for track purchases
- 📊 **Full Admin Dashboard** - Secure management console with JWT authentication
- 📤 **Track Management** - Upload, categorize, and monetize music
- 📈 **Analytics** - Play history, user statistics, leaderboards
- ⚡ **High Performance** - Webpack bundling, optimized API endpoints
- 🔒 **Security First** - JWT tokens, CORS, SSL/TLS encryption

---

## 📖 IMPORTANT: Read This First!

### 🎯 For Every Development Session:

**👉 Read [MASTER-PROMPT-2026-AKTUELL.md](./MASTER-PROMPT-2026-AKTUELL.md) FIRST!**

This file is in the **ROOT directory** and contains:
- ✅ Current project status (updated Jan 13, 2026)
- ✅ Known issues & workarounds
- ✅ Protected code sections (don't touch!)
- ✅ Safe-to-modify code sections
- ✅ Windows 11 PowerShell commands
- ✅ Next steps & priorities

**TL;DR:** Copy the content of `MASTER-PROMPT-2026-AKTUELL.md` into your Claude chat at the start of each session. This prevents regression bugs and redundancy problems.

### 📚 Documentation Versions

✅ **USE THESE CURRENT FILES:**
- MASTER-PROMPT-2026-AKTUELL.md (CURRENT - Jan 13, 2026)
- README.md (this file)
- DATABASE.md (root level)
- PRODUCTION-DEPLOYMENT.md (root level)
- docs/ADMIN-GUIDE.md
- docs/SETUP-WINDOWS.md
- docs/PROJECT-STRUCTURE.md

❌ **IGNORE (Legacy/outdated):**
- MASTER-PROMPT-2026-DEFINITIVE.md (old version)
- MASTER-CONTEXT-PROMPT.md (old version)
- REPOSITORY-STRUCTURE.md (use PROJECT-STRUCTURE.md instead)

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
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
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

# 4. Setup database (see Full Setup Guide below)
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

### Full Setup Guide

**📖 See [docs/SETUP-WINDOWS.md](./docs/SETUP-WINDOWS.md) for comprehensive Windows 11 setup instructions:**
- Detailed prerequisites
- PowerShell commands
- PostgreSQL setup
- Troubleshooting
- Daily workflow
- sync-repo.ps1 utility script

### Repository Sync

```powershell
# Keep your local repo synchronized with GitHub
.\sync-repo.ps1
```

---

## ✨ Features

### 🔐 Authentication System
- **WebAuthn Biometric** - Fingerprint/Face ID login (in development)
- **Email & Password** - Traditional registration & login
- **Magic Link** - One-click email authentication
- **JWT Tokens** - 7-day expiration, configurable via `.env`
- **Session Management** - Secure token refresh & logout

### 🎵 Audio Management
- **Streaming Player** - Real-time audio playback with controls
- **Waveform Visualization** - Visual track progress indicator
- **Keyboard Shortcuts** - Play, pause, seek with hotkeys
- **Preview Mode** - 40-second preview for paid tracks
- **Format Support** - MP3 & WAV audio files

### 💳 Payment Integration
- **PayPal SDK** - Seamless checkout experience
- **Purchase History** - Track all transactions
- **License Management** - Personal license per purchase
- **Payment Statistics** - Spending analytics & patterns

### 🛡️ Admin Console
- **Secure JWT Login** - Admin-only authentication
- **Track Upload** - Upload & publish music tracks
- **Design Editor** - Customize platform colors & branding
- **User Management** - Admin role assignment
- **Analytics Dashboard** - View platform statistics

### 📊 User Features
- **User Dashboard** - Profile, statistics, purchase history
- **Play History** - Complete record of listened tracks
- **Leaderboards** - Top users by plays & purchases
- **Genre Categorization** - Organize music by genre

### ⚡ Performance
- **Webpack 5 Bundling** - Single 83.5 KiB production bundle
- **Optimized API** - Fast endpoints with caching
- **Range Requests** - HTTP 206 for efficient streaming
- **CDN Ready** - Static assets easily deployable to CDN

---

## 🛡️ Admin Hub

**NEW in v1.0:** Secure admin dashboard with JWT authentication!

### Access Admin Hub
```
https://localhost:3000/admin/
```

### Features
- ✅ **JWT-based Login** - Secure admin authentication
- ✅ **Role-based Access** - Only users with `role='admin'` can access
- ✅ **Track Upload Tool** - Upload and manage music tracks (frontend/admin-upload.html)
- ✅ **Design Editor** - Customize platform colors and branding
- ✅ **Dev Login** - Quick authentication for localhost development
- ✅ **Cyberpunk UI** - Modern neon-themed interface

### Admin Login Methods

**Option 1: Dev Login (Localhost Only)**
1. Navigate to `https://localhost:3000/admin/`
2. Click "Dev Login (Localhost Only)" button
3. Automatically creates dev admin user
4. ✅ You're logged in!

**Option 2: Existing Admin Account**
1. Make sure your database user has `role='admin'`:
```sql
UPDATE users SET role='admin' WHERE email='your@email.com';
```
2. Navigate to `https://localhost:3000/admin/`
3. Enter credentials
4. ✅ Access granted!

### Admin Tools

| Tool | Path | Purpose |
|------|------|----------|
| **Admin Hub** | `https://localhost:3000/admin/` | Main admin console (JWT login) |
| **Track Upload** | `frontend/admin-upload.html` | Upload music, set metadata & prices |
| **Design Editor** | `frontend/admin/design-editor.html` | Customize colors, fonts, branding |
| **User Admin** | Coming soon | Manage users, assign roles, view statistics |

**See [docs/ADMIN-GUIDE.md](./docs/ADMIN-GUIDE.md) for detailed admin documentation**

---

## 🛠️ Tech Stack

### **Frontend**
- **Language:** JavaScript (ES6+)
- **Build Tool:** Webpack 5
- **Architecture:** Modular, component-based
- **CSS:** Custom styling with optimization
- **Bundle Size:** 83.5 KiB (production)

### **Backend**
- **Runtime:** Node.js 18+
- **Framework:** Express.js
- **Authentication:** WebAuthn, JWT, bcrypt
- **API:** REST with 35+ endpoints
- **Server:** HTTPS with mkcert (local SSL)

### **Database**
- **System:** PostgreSQL 12+
- **Schema:** 10 tables with 22 indexes
- **Tables:** users, tracks, orders, purchases, play_history, play_stats, magic_links, magic_link_tokens, webauthn_credentials, design_system
- **Connections:** Connection pooling with pg library

**See [DATABASE.md](./DATABASE.md) for complete schema documentation**

### **Security**
- **Encryption:** TLS 1.3, CORS, CSP headers
- **Auth:** JWT Bearer tokens, biometric verification
- **Validation:** Input sanitization, rate limiting
- **Storage:** Environment variables for secrets

---

## 🚀 Quick Start

**⚠️ Important:** First read [MASTER-PROMPT-2026-AKTUELL.md](./MASTER-PROMPT-2026-AKTUELL.md) for current status and setup details.

**For Windows 11 setup:** See [docs/SETUP-WINDOWS.md](./docs/SETUP-WINDOWS.md) for detailed instructions.

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org))
- **Git** ([Download](https://git-scm.com))
- **Windows 11 Pro** with PowerShell

### Installation

1. **Clone repository**
```bash
git clone https://github.com/Waschtl904/song-nexus.git
cd song-nexus
```

2. **Install dependencies**
```bash
npm install
cd frontend && npm install && cd ..
cd backend && npm install && cd ..
```

3. **Configure environment**
```bash
# Backend
cp backend/.env.example backend/.env
# Edit backend/.env with your secrets

# Frontend
cp frontend/.env.example frontend/.env
```

4. **Setup database**
```bash
# Create PostgreSQL database first
psql -U postgres
CREATE DATABASE song_nexus_dev;
\q

# Apply schema (single source of truth in ROOT)
psql -U postgres -d song_nexus_dev -f schema.sql
```

5. **Generate SSL certificates (development)**
```bash
cd backend
npm run generate-cert
cd ..
```

6. **Start development server**
```bash
npm start
# Runs Backend (port 3000) + Frontend (port 5500) with concurrently
```

7. **Access application**
```
Frontend:  https://localhost:5500
Backend:   https://localhost:3000
API:       https://localhost:3000/api
Admin:     https://localhost:3000/admin/
```

---

## 📁 Project Structure

```
SONG-NEXUS/
│
├── 📋 Documentation (ROOT LEVEL)
│   ├── README.md                           ✅ This file
│   ├── MASTER-PROMPT-2026-AKTUELL.md       🔴 START HERE EVERY SESSION!
│   ├── DATABASE.md                         ✅ Database schema documentation
│   ├── PRODUCTION-DEPLOYMENT.md            ✅ Deployment guide
│   ├── schema.sql                          ✅ DATABASE SCHEMA (single source of truth)
│   └── ...
│
├── 📂 docs/                              (New documentation folder)
│   ├── ADMIN-GUIDE.md                    ✅ Admin Hub documentation
│   ├── PROJECT-STRUCTURE.md              ✅ Complete project organization
│   └── SETUP-WINDOWS.md                  ✅ Windows 11 Pro setup guide (NEW)
│
├── 📂 backend/                             Express.js REST API Server
│   ├── 📂 routes/                         API endpoints
│   ├── 📂 middleware/                     Express middleware
│   ├── 📂 public/                         Static files
│   ├── 📂 certs/                          SSL certificates
│   ├── server.js                          Express server
│   ├── package.json
│   └── .env.example
│
├── 📂 frontend/                            React + Webpack Frontend
│   ├── 📂 admin/                          ✅ Admin Console
│   │   ├── index.html                   🔐 Admin Hub main page
│   │   └── design-editor.html            🎨 Design editor
│   ├── admin-upload.html                 📤 Track upload (in frontend root!)
│   ├── 📂 js/                            JavaScript modules
│   ├── 📂 css/                           Stylesheets
│   ├── 📂 assets/                        Images & static
│   ├── 📂 dist/                          Webpack output (generated)
│   ├── webpack.config.js
│   ├── package.json
│   └── .env.example
│
├── 📂 sync-repo.ps1                      ✅ Repository sync utility (PowerShell)
├── package.json                         Root package (concurrently)
├── .gitignore                           Git ignore patterns
├── .env.example                         Root env template
├── LICENSE                              MIT License
└── schema.sql                           DATABASE SCHEMA (ROOT!)
```

**See [docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md) for complete project organization**

---

## 📊 Database Schema

### ⚠️ CRITICAL: Database Schema Location

The SQL schema file is located at:

✅ **CORRECT:** `ROOT/schema.sql` (22 KB, CURRENT)
❌ **WRONG:** `backend/db/schema.sql` (doesn't exist, was deleted)

**Always reference:**
```powershell
psql -U postgres -d song_nexus_dev -f schema.sql
```

**Never use:**
```powershell
psql -U postgres -d song_nexus_dev -f backend/db/schema.sql  # ❌ This path is wrong!
```

### Quick Overview:

| Table | Purpose | Key Fields |
|-------|---------|----------|
| **users** | User accounts & credentials | id, email, username, password_hash, role, webauthn_credential |
| **tracks** | Music metadata & files | id, name, artist, genre, audio_filename, price, is_published |
| **orders** | PayPal transactions | id, user_id, paypal_order_id, amount, status |
| **purchases** | Track purchases per user | id, user_id, track_id, license_type, expires_at |
| **play_history** | Track play events | id, user_id, track_id, played_at, duration_played_seconds |
| **play_stats** | Advanced analytics | id, user_id, track_id, device_type, session_id |
| **webauthn_credentials** | Biometric auth data | id, user_id, credential_id, public_key, counter |
| **magic_links** | Email-based login | id, user_id, token, expires_at, ip_address |
| **magic_link_tokens** | Alternative magic links | id, user_id, token, expires_at |
| **design_system** | Theme & design tokens | id, color_primary, color_secondary, ... (27 tokens) |

**Full documentation:** See [DATABASE.md](./DATABASE.md)

**Schema file:** [schema.sql](./schema.sql) (✅ Single source of truth in ROOT, 10 tables, 22 optimized indexes)

---

## 📚 API Documentation

Full API documentation available in the API endpoints (35 total)

### Quick Reference

#### **Authentication (7 endpoints)**
```
POST   /api/auth/register               # Create account
POST   /api/auth/login                  # Login with password
POST   /api/auth/verify                 # Verify JWT token
GET    /api/auth/me                     # Get current user
POST   /api/auth/refresh-token          # Refresh JWT
POST   /api/auth/logout                 # Logout
POST   /api/auth/dev-login              # Dev-only quick login
```

#### **Admin Routes (4 endpoints - admin only)**
```
POST   /api/admin/tracks/upload        # Upload new track
GET    /api/admin/tracks/list          # List all tracks
PUT    /api/admin/tracks/:id           # Update track metadata
DELETE /api/admin/tracks/:id           # Soft delete track
```

#### **More endpoints** (WebAuthn, Tracks, Payments, Users, Play History)
See [backend/routes/](./backend/routes/) for complete endpoint list

---

## 🔐 Authentication

### WebAuthn (Biometric) Flow

1. **Registration**
   ```
   User clicks "Register with Biometric"
   ↓
   Browser generates credential challenge
   ↓
   User touches fingerprint/face
   ↓
   Credential sent to backend
   ↓
   Backend verifies & stores credential
   ↓
   JWT token issued → User logged in
   ```

2. **Login**
   ```
   User clicks "Login with Biometric"
   ↓
   Browser requests authentication
   ↓
   User touches fingerprint/face
   ↓
   Assertion sent to backend
   ↓
   Backend verifies credential
   ↓
   JWT token issued → User logged in
   ```

### Token Structure

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

---

## 🎮 Development

### Available Scripts

```bash
# Development
npm start              # Run both backend & frontend
npm run server         # Backend only
npm run client         # Frontend only

# Building
npm run build          # Webpack production build
npm run build:dev      # Webpack dev build

# Database
npm run db:setup       # Initialize database
npm run db:reset       # Reset all tables

# Testing (when implemented)
npm test              # Run all tests
npm run test:unit     # Unit tests only
npm run test:e2e      # End-to-end tests
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

**Frontend (.env)**
```env
VITE_API_URL=https://localhost:3000
VITE_PAYPAL_CLIENT_ID=your-paypal-client-id
VITE_ENV=development
```

### Development Workflow

1. **Make code changes**
```bash
# Edit files in frontend/js/ or backend/routes/
```

2. **Frontend changes auto-reload**
```bash
# Webpack dev server watches for changes
```

3. **Backend changes require restart**
```bash
# Press Ctrl+C, then npm start again
```

4. **Commit changes**
```bash
git add .
git commit -m "feat: add new feature"
git push origin main
```

---

## 🚀 Deployment

**Complete deployment guide:** See [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)

### Quick Deployment Steps

1. **Prepare environment**
   - Create `.env.production` with real secrets
   - Generate secure JWT_SECRET, SESSION_SECRET
   - Setup PayPal LIVE credentials

2. **Database**
   - Create PostgreSQL database on VPS/RDS
   - Apply `schema.sql` to production database
   - Setup automated backups

3. **Backend**
   - Clone repository on VPS
   - Install dependencies with `--production` flag
   - Start with PM2 (2+ instances for clustering)
   - Setup SSL certificates with Let's Encrypt

4. **Frontend**
   - Build with `npm run build`
   - Serve from Nginx with reverse proxy to backend
   - Configure caching headers for assets

5. **Monitoring**
   - Setup error tracking (Sentry, LogRocket)
   - Configure uptime monitoring
   - Setup log aggregation
   - Enable performance monitoring

**Full details:** [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)

---

## 📊 Project Status

### ✅ Completed (v1.0)
- WebAuthn biometric authentication (backend complete, frontend in development)
- Password-based auth with JWT
- Audio streaming with preview
- PayPal payment integration
- User statistics & leaderboards
- Admin track management
- Play history tracking
- Database schema (10 tables, verified)
- API documentation
- Deployment guide
- **NEW:** Secure Admin Hub with JWT login (v1.0.1)
- **NEW:** Windows 11 Pro setup guide (v1.0.2)
- **NEW:** Documentation audit & corrections (v1.0.3)

### 🚧 In Development (v1.1)
- [ ] WebAuthn frontend stabilization
- [ ] Design System refinement
- [ ] Unit & E2E testing framework
- [ ] Advanced search & filtering
- [ ] Playlist creation
- [ ] Social features (followers, recommendations)

### 🔮 Future (v2.0)
- [ ] Mobile app (React Native)
- [ ] Audio processing (normalization, EQ)
- [ ] Social sharing
- [ ] Streaming analytics
- [ ] Artist dashboard
- [ ] Multi-region deployment

---

## 🧪 Testing

Currently in development. When implemented:

```bash
# Unit Tests
npm run test:unit    # Backend & frontend unit tests

# End-to-End Tests
npm run test:e2e     # Full user flows
```

### Manual Testing Checklist

- [ ] Register with email/password
- [ ] Login with magic link
- [ ] Login with WebAuthn biometric
- [ ] Browse tracks
- [ ] Stream audio (preview + full)
- [ ] Purchase track via PayPal
- [ ] View play history
- [ ] Check user statistics
- [ ] **Admin:** Login to Admin Hub
- [ ] **Admin:** Upload new track
- [ ] **Admin:** Customize design

---

## 🤝 Contributing

Contributions welcome! Please follow these steps:

1. **Fork the repository**
```bash
git clone https://github.com/YOUR_USERNAME/song-nexus.git
```

2. **Create feature branch**
```bash
git checkout -b feature/your-feature-name
```

3. **Make changes & commit**
```bash
git commit -m "feat: describe your changes"
```

4. **Push & create Pull Request**
```bash
git push origin feature/your-feature-name
```

### Code Style
- Use ES6+ syntax
- Follow existing file structure
- Add comments for complex logic
- Test manually before PR

---

## 📚 Documentation

### Essential Reading (Most in ROOT!)
- **[MASTER-PROMPT-2026-AKTUELL.md](./MASTER-PROMPT-2026-AKTUELL.md)** - 👈 **START HERE EVERY SESSION!** (ROOT)
- **[DATABASE.md](./DATABASE.md)** - Complete database schema with diagrams (ROOT)
- **[PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)** - Full deployment guide (ROOT)
- **[docs/SETUP-WINDOWS.md](./docs/SETUP-WINDOWS.md)** - Windows 11 Pro setup guide (NEW)
- **[docs/ADMIN-GUIDE.md](./docs/ADMIN-GUIDE.md)** - Admin Hub documentation
- **[docs/PROJECT-STRUCTURE.md](./docs/PROJECT-STRUCTURE.md)** - Complete project organization

---

## 🐛 Troubleshooting

### Common Issues

**Q: SSL certificate error**
```bash
# Regenerate certificate
cd backend && npm run generate-cert
```

**Q: Database connection failed**
```bash
# Check PostgreSQL is running
# Verify DATABASE_URL in .env
# Check credentials
```

**Q: Port 3000 already in use**
```bash
# Use different port in .env
# Or kill process: netstat -ano | findstr :3000
```

**Q: Webpack bundle not updating**
```bash
# Clear dist folder
rm -rf frontend/dist
npm run build
```

**Q: Cannot access Admin Hub**
```bash
# Make sure your user has role='admin'
UPDATE users SET role='admin' WHERE email='your@email.com';
# Then refresh the page
```

**Q: Node/npm/psql commands not found (Windows PowerShell)**
See [docs/SETUP-WINDOWS.md](./docs/SETUP-WINDOWS.md) Troubleshooting section for Windows-specific fixes.

---

## 📝 Roadmap

### Q1 2026
- [x] Admin Hub with JWT login
- [x] Windows 11 Pro setup guide
- [x] Documentation audit & fixes
- [ ] WebAuthn frontend hardening
- [ ] Design system stabilization
- [ ] Unit testing framework

### Q2 2026
- [ ] Advanced search capabilities
- [ ] Playlist functionality
- [ ] Social features
- [ ] Mobile app (React Native)

### Q3 2026
- [ ] Audio processing features
- [ ] Artist dashboard
- [ ] Multi-region deployment
- [ ] Analytics enhancement

---

## 📄 License

MIT License © 2025 Song-Nexus Contributors

See `LICENSE` file for details.

---

## 👤 Author

**Sebastian** - Full-stack Developer
- 🌍 Gloggnitz, Lower Austria (Vienna, AT)
- 💻 Tool-maker turned Web Developer
- 🎵 Music Technology Enthusiast
- 📍 **Project Root:** `C:\Users\sebas\Desktop\SongSeite` (Windows 11 Pro)

---

## 📞 Support

- 📧 Email: sebastian.schmalnauer@gmx.at
- 🐛 Issues: [GitHub Issues](https://github.com/Waschtl904/song-nexus/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/Waschtl904/song-nexus/discussions)

---

## 🙏 Acknowledgments

- WebAuthn spec & implementation
- Express.js & Node.js community
- PostgreSQL database
- PayPal SDK
- Webpack ecosystem

---

**Last Updated:** January 13, 2026  
**Version:** 1.0.3  
**Status:** ✅ Production Ready  
**Local Setup:** ✅ Windows 11 Pro Documented

⭐ **If you find this project useful, please consider starring it on GitHub!**
