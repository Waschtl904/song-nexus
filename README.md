# 🎵 SONG-NEXUS

> **A modern, full-stack music streaming platform with advanced authentication, real-time audio playback, and secure payment integration.**

![Status](https://img.shields.io/badge/Status-Production%20Ready-brightgreen?style=flat-square)
![Version](https://img.shields.io/badge/Version-1.0-blue?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)
![Tech Stack](https://img.shields.io/badge/Tech-Node.js%20|%20Express%20|%20React%20|%20PostgreSQL-informational?style=flat-square)

---

## 🚀 Overview

**SONG-NEXUS** is a cutting-edge music streaming application built with modern web technologies. It features:

- 🔐 **Triple Authentication** - WebAuthn (Biometric), Password, Magic Link
- 🎵 **Advanced Audio Streaming** - Real-time playback with waveform visualization
- 💳 **Secure Payments** - PayPal integration for track purchases
- 📊 **Full Track Management** - Upload, categorize, and monetize music
- 📈 **Analytics** - Play history, user statistics, leaderboards
- ⚡ **High Performance** - Webpack bundling, optimized API endpoints
- 🔒 **Security First** - JWT tokens, CORS, SSL/TLS encryption

---

## 📋 Table of Contents

- [Features](#features)
- [Tech Stack](#tech-stack)
- [Quick Start](#quick-start)
- [Project Structure](#project-structure)
- [API Documentation](#api-documentation)
- [Authentication](#authentication)
- [Development](#development)
- [Deployment](#deployment)
- [Contributing](#contributing)
- [License](#license)

---

## ✨ Features

### 🔐 Authentication System
- **WebAuthn Biometric** - Fingerprint/Face ID login (production-ready)
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

### 📊 User Features
- **User Dashboard** - Profile, statistics, purchase history
- **Play History** - Complete record of listened tracks
- **Leaderboards** - Top users by plays & purchases
- **Track Management** - Upload & publish music (admin)
- **Genre Categorization** - Organize music by genre

### ⚡ Performance
- **Webpack 5 Bundling** - Single 83.5 KiB production bundle
- **Optimized API** - Fast endpoints with caching
- **Range Requests** - HTTP 206 for efficient streaming
- **CDN Ready** - Static assets easily deployable to CDN

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
- **ORM:** Native queries with connection pooling
- **Schema:** User, track, payment, analytics tables
- **Migrations:** Versioned schema updates

### **Security**
- **Encryption:** TLS 1.3, CORS, CSP headers
- **Auth:** JWT Bearer tokens, biometric verification
- **Validation:** Input sanitization, rate limiting
- **Storage:** Environment variables for secrets

---

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ ([Download](https://nodejs.org))
- **PostgreSQL** 12+ ([Download](https://www.postgresql.org))
- **Git** ([Download](https://git-scm.com))

### Installation

1. **Clone repository**
```bash
git clone https://github.com/Waschtl904/song-nexus.git
cd SONGSSEITE
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
cd backend
node db.js  # Creates tables
cd ..
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
```

---

## 📁 Project Structure

```
SONGSSEITE/
├── backend/
│   ├── certs/                      # SSL certificates
│   ├── db/                         # Database files
│   ├── middleware/
│   │   ├── auth-middleware.js      # JWT verification
│   │   └── cache-middleware.js     # Response caching
│   ├── routes/
│   │   ├── auth.js                 # Password & email auth
│   │   ├── webauthn.js             # Biometric auth
│   │   ├── tracks.js               # Track endpoints
│   │   ├── admin-tracks.js         # Admin upload/manage
│   │   ├── payments.js             # PayPal integration
│   │   ├── users.js                # User profile & stats
│   │   └── play-history.js         # Play tracking
│   ├── public/                     # Static files
│   ├── uploads/                    # Audio storage
│   ├── server.js                   # Express server
│   ├── db.js                       # Database connection
│   ├── package.json
│   └── .env.example
│
├── frontend/
│   ├── js/
│   │   ├── main.js                 # Webpack entry point
│   │   ├── app.js                  # Main app logic
│   │   ├── auth.js                 # Auth flows
│   │   ├── webauthn.js             # Biometric frontend
│   │   ├── player.js               # Audio player
│   │   ├── tracks.js               # Track management
│   │   ├── api-client.js           # API wrapper
│   │   └── ...                     # Other modules
│   ├── html/
│   │   ├── index.html              # Main entry
│   │   ├── auth.html               # Login/signup
│   │   ├── app.html                # Player UI
│   │   └── ...                     # Other pages
│   ├── css/                        # Stylesheets
│   ├── assets/                     # Images & static
│   ├── dist/                       # Webpack bundle
│   ├── package.json
│   └── webpack.config.js
│
├── assets/
│   └── images/                     # Project branding
│
├── schema.sql                      # Database schema
├── package.json                    # Root package
└── README.md                       # This file
```

---

## 📚 API Documentation

Full API documentation available in `API-Documentation-v1.md`

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

#### **WebAuthn Biometric (5 endpoints)**
```
POST   /api/auth/webauthn/register-options     # Start biometric signup
POST   /api/auth/webauthn/register-verify      # Complete biometric signup
POST   /api/auth/webauthn/authenticate-options # Start biometric login
POST   /api/auth/webauthn/authenticate-verify  # Complete biometric login
POST   /api/auth/webauthn/register-password    # Register with password
```

#### **Tracks (4 endpoints)**
```
GET    /api/tracks                     # Get all tracks (paginated)
GET    /api/tracks/:id                 # Get track details
GET    /api/tracks/audio/:filename     # Stream audio
GET    /api/tracks/genres/list         # Get available genres
```

#### **Admin (4 endpoints)**
```
POST   /api/admin/tracks/upload        # Upload new track
GET    /api/admin/tracks/list          # List all tracks
PUT    /api/admin/tracks/:id           # Update track metadata
DELETE /api/admin/tracks/:id           # Soft delete track
```

#### **Payments (6 endpoints)**
```
GET    /api/payments/config            # Get PayPal config
POST   /api/payments/create-order      # Create PayPal order
POST   /api/payments/capture-order/:id # Capture payment
GET    /api/payments/user-purchases    # Get user purchases
GET    /api/payments/history           # Get payment history
GET    /api/payments/stats             # Get user statistics
```

#### **Users (5 endpoints)**
```
GET    /api/users/profile              # Get user profile
GET    /api/users/stats                # Get user statistics
GET    /api/users/purchases            # Get purchased tracks
GET    /api/users/play-history         # Get play history
GET    /api/users/leaderboard          # Get public leaderboard
```

#### **Play History (4 endpoints)**
```
POST   /api/play-history/              # Log track play
GET    /api/play-history/user/:userId  # Get user play history
DELETE /api/play-history/user/:userId  # Clear play history
GET    /api/play-history/stats/user/:userId # Get play statistics
```

**Total: 35 endpoints** ✅

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
DATABASE_URL=postgres://user:pass@localhost:5432/song_nexus
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

### Vercel (Frontend)

```bash
# Connect repo to Vercel
# Vercel auto-deploys on push to main

# Configuration (vercel.json)
{
  "buildCommand": "npm run build",
  "outputDirectory": "frontend/dist"
}
```

### VPS or Self-Hosted (Backend)

```bash
# 1. SSH into server
ssh user@your-server.com

# 2. Clone repository
git clone https://github.com/Waschtl904/song-nexus.git
cd song-nexus

# 3. Install dependencies
npm install
cd backend && npm install && cd ..
cd frontend && npm install && cd ..

# 4. Setup environment
cp backend/.env.example backend/.env
# Edit .env with production secrets

# 5. Setup database
cd backend && npm run db:setup && cd ..

# 6. Build frontend
cd frontend && npm run build && cd ..

# 7. Start with PM2 (recommended)
npm install -g pm2
pm2 start backend/server.js --name song-nexus
pm2 save

# 8. Setup reverse proxy (Nginx)
# Configure nginx to forward requests to localhost:3000
```

---

## 📊 Database Schema

**Key Tables:**

```sql
users               -- User accounts & credentials
credentials         -- WebAuthn biometric data
tracks              -- Music metadata & files
purchases           -- User track purchases
play_history        -- Track play events
payment_orders      -- PayPal transaction records
```

Full schema in `schema.sql`

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
- [ ] Login with WebAuthn biometric
- [ ] Browse tracks
- [ ] Stream audio (preview + full)
- [ ] Purchase track via PayPal
- [ ] View play history
- [ ] Check user statistics
- [ ] Admin: Upload new track

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
# Or kill process: lsof -ti:3000 | xargs kill -9
```

**Q: Webpack bundle not updating**
```bash
# Clear dist folder
rm -rf frontend/dist
npm run build
```

---

## 📝 Roadmap

### ✅ Completed (v1.0)
- WebAuthn biometric authentication
- Password-based auth with JWT
- Audio streaming with preview
- PayPal payment integration
- User statistics & leaderboards
- Admin track management
- Play history tracking

### 🚧 In Development (v1.1)
- [ ] Unit & E2E testing framework
- [ ] Advanced search & filtering
- [ ] Playlist creation
- [ ] Social features (followers, recommendations)
- [ ] Mobile app (React Native)

### 🔮 Future (v2.0)
- [ ] Audio processing (normalization, EQ)
- [ ] Social sharing
- [ ] Streaming analytics
- [ ] Artist dashboard
- [ ] Multi-region deployment

---

## 📄 License

MIT License © 2025 Song-Nexus Contributors

See `LICENSE` file for details.

---

## 👤 Author

**Sebastian** - Full-stack Developer
- 🌍 Vienna, Austria
- 💻 WebAuthn & Full-Stack Specialist
- 🎵 Music Technology Enthusiast

---

## 📞 Support

- 📧 Email: [your-email@example.com]
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

**Last Updated:** December 19, 2025  
**Version:** 1.0.0  
**Status:** ✅ Production Ready

⭐ **If you find this project useful, please consider starring it on GitHub!**