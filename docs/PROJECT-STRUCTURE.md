# 📁 SONG-NEXUS Project Structure

**Last Updated:** January 7, 2026  
**Version:** 1.0.1  

---

## 🂭 Overview

Complete visual guide to Song-Nexus project organization. This document explains:
- Root directory structure
- Backend API organization
- Frontend application layout
- Documentation files
- Configuration files

---

## 📁 Root Directory

```
SONG-NEXUS/
│
├── 📂 backend/                    # Express.js REST API Server
│   ├── 📂 certs/                  # SSL/TLS certificates
│   ├── 📂 db/                    # Database schema & migrations
│   ├── 📂 middleware/            # Express middleware
│   ├── 📂 routes/                # API endpoint definitions
│   ├── 📂 public/                # Static files (served at /)
│   ├── 📂 uploads/               # Audio file storage (tracks)
│   ├── 💤 server.js              # Express server entry point
│   ├── 💤 db.js                  # Database connection pool
│   ├── 📦 package.json           # Backend dependencies
│   ├── 💤 .env.example           # Environment variables template
│   └── 📜 .gitignore             # Ignore patterns
│
├── 📂 frontend/                   # React + Webpack Frontend
│   ├── 📂 admin/                  # 🊨 NEW: Admin Console
│   │   ├── index.html             # 🔐 Admin Hub main page
│   │   ├── design-editor.html     # 🎨 Design token editor
│   │   └── admin-upload.html      # 📤 Track upload interface
│   ├── 📂 html/                  # Main HTML pages
│   │   ├── index.html             # Homepage
│   │   ├── auth.html              # Login/registration page
│   │   ├── app.html               # Main player app
│   │   └── ...                    # Other pages
│   ├── 📂 js/                    # JavaScript modules
│   │   ├── main.js                # Webpack entry point
│   │   ├── app.js                 # Main application logic
│   │   ├── auth.js                # Authentication flows
│   │   ├── webauthn.js            # Biometric auth (frontend)
│   │   ├── player.js              # Audio player
│   │   ├── tracks.js              # Track management
│   │   ├── api-client.js          # API wrapper/utilities
│   │   └── ...                    # Other modules
│   ├── 📂 css/                    # Stylesheets
│   │   ├── main.css               # Main styles
│   │   ├── player.css             # Player styles
│   │   └── ...                    # Other styles
│   ├── 📂 assets/                 # Images & static files
│   │   ├── logo.png
│   │   ├── icons/
│   │   └── ...
│   ├── 📂 dist/                   # Webpack bundle output (generated)
│   │   ├── main.bundle.js         # Built app bundle
│   │   ├── main.bundle.js.map     # Source map
│   │   └── ...
│   ├── 📦 package.json           # Frontend dependencies
│   ├── 💤 webpack.config.js      # Webpack build configuration
│   ├── 💤 .env.example           # Environment variables template
│   └─┐ 📜 .gitignore             # Ignore patterns
│
├── 📂 docs/                       # 📖 Documentation
│   ├── MASTER-PROMPT-2026-AKTUELL.md  # 🊨 START HERE EACH SESSION!
│   ├── README.md                      # Project overview
│   ├── PROJECT-STRUCTURE.md           # This file - project organization
│   ├── ADMIN-GUIDE.md                 # 🊨 NEW: Admin Hub documentation
│   ├── DATABASE.md                    # Database schema & design
│   ├── API-Documentation-v1.md        # Complete API reference
│   ├── PRODUCTION-DEPLOYMENT.md       # Deployment & DevOps guide
│   └── SECURITY.md                    # Security best practices
│
├── 📂 assets/                     # Project branding & assets
│   └── 📂 images/                 # Screenshots, logos
│
├── 📦 package.json                   # Root package (for concurrently)
├── 💤 .gitignore                     # Global git ignore
├── 💤 .env.example                   # Root env template
├── 💤 LICENSE                        # MIT License
└── 📖 README.md                      # Main README (YOU ARE HERE)
```

---

## 🐕 Backend Structure (`backend/`)

### 🐕 Core Files

```
backend/
├── server.js                 # Main Express server
│   └── 📚: Initializes Express app, routes, middleware
│                 Listens on PORT (default: 3000)
│                 Sets up HTTPS with SSL certificates
│
├── db.js                     # PostgreSQL connection pool
│   └── 📚: Creates pg connection pool
│                 Exports pool for queries
│                 Handles connection errors
│
├── package.json              # Dependencies
│   └── 📚: Express, bcrypt, pg, dotenv, etc.
│
├── .env                      # Environment secrets (GITIGNORED)
│   └── 📚: DATABASE_URL, JWT_SECRET, PayPal keys, etc.
│
└── .env.example              # Template for .env
    └── 📚: Reference for required env variables
```

### 🐕 Routes (`backend/routes/`)

**API Endpoints organized by feature:**

```
backend/routes/
├── auth.js
│   ├── POST /api/auth/register           # User signup
│   ├── POST /api/auth/login               # User login
│   ├── POST /api/auth/verify              # Verify JWT
│   ├── POST /api/auth/logout              # Logout
│   ├── POST /api/auth/refresh-token       # Refresh JWT
│   ├── GET  /api/auth/me                  # Get current user
│   └── POST /api/auth/dev-login           # Dev mode login
│
├── webauthn.js
│   ├── POST /api/auth/webauthn/register-options
│   ├── POST /api/auth/webauthn/register-verify
│   ├── POST /api/auth/webauthn/authenticate-options
│   ├── POST /api/auth/webauthn/authenticate-verify
│   └── POST /api/auth/webauthn/register-password
│
├── tracks.js
│   ├── GET  /api/tracks                    # List all tracks
│   ├── GET  /api/tracks/:id                # Get track details
│   ├── GET  /api/tracks/audio/:filename    # Stream audio
│   └── GET  /api/tracks/genres/list        # List genres
│
├── admin-tracks.js                    # 🊨 ADMIN ONLY
│   ├── POST /api/admin/tracks/upload      # Upload track
│   ├── GET  /api/admin/tracks/list         # List all tracks
│   ├── PUT  /api/admin/tracks/:id          # Update track
│   └── DELETE /api/admin/tracks/:id       # Delete track
│
├── payments.js
│   ├── GET  /api/payments/config           # PayPal config
│   ├── POST /api/payments/create-order     # Create order
│   ├── POST /api/payments/capture-order/:id # Capture payment
│   ├── GET  /api/payments/history          # Payment history
│   ├── GET  /api/payments/user-purchases   # User purchases
│   └── GET  /api/payments/stats            # Payment statistics
│
├── users.js
│   ├── GET  /api/users/profile             # User profile
│   ├── GET  /api/users/stats               # User statistics
│   ├── GET  /api/users/purchases           # Purchased tracks
│   ├── GET  /api/users/play-history        # Play history
│   └── GET  /api/users/leaderboard         # Public leaderboard
│
└── play-history.js
    ├── POST /api/play-history/             # Log play
    ├── GET  /api/play-history/user/:userId # Get history
    ├── DELETE /api/play-history/user/:userId # Clear history
    └── GET  /api/play-history/stats/user/:userId # Stats
```

**Total:** 35 API endpoints (👈 see API-Documentation-v1.md for details)

### 🐕 Middleware (`backend/middleware/`)

```
backend/middleware/
├── auth-middleware.js
│   └── verifyToken()    - Verify JWT in Authorization header
│       generateJWT()    - Create signed JWT token
│       verifyAdmin()    - Check user role === 'admin'
│
└── cache-middleware.js
    └── cacheControl()   - Set cache headers
        rateLimit()      - Rate limiting for API
```

### 🐕 Database (`backend/db/`)

```
backend/db/
└── schema.sql                 # ✅ SINGLE SOURCE OF TRUTH
    ├── 10 tables:
    │   1. users                  - User accounts & auth
    │   2. tracks                 - Music metadata
    │   3. orders                 - PayPal orders
    │   4. purchases              - Track purchases
    │   5. play_history           - Play events
    │   6. play_stats             - Analytics
    │   7. webauthn_credentials   - Biometric keys
    │   8. magic_links            - Email login tokens
    │   9. magic_link_tokens      - Alternative tokens
    └── 10. design_system         - Theme configuration
    ├── 22 indexes for performance
    └── Triggers & constraints
```

**See DATABASE.md for complete schema documentation**

### 🐕 Storage

```
backend/
├── public/                   # Static files (CSS, JS, HTML)
│   └── Served at: https://localhost:3000/
│       Includes: Design CSS, images, etc.
│
├── certs/                    # SSL certificates
│   ├── cert.pem                # Public certificate
│   └── key.pem                 # Private key
│       Generated with mkcert for local HTTPS
│
└── uploads/                  # Audio files (GITIGNORED)
    └── track_[id]_[hash].mp3   # Audio file storage
        track_[id]_[hash].wav   # Alternative format
```

---

## 📂 Frontend Structure (`frontend/`)

### 📂 Pages (`frontend/html/`)

```
frontend/html/
├── index.html                # Homepage
│   └── Main landing page with track showcase
│       Webpack bundles JS modules into this
│
├── auth.html                 # Login & registration
│   └── Login form, signup form
│       WebAuthn biometric option
│
├── app.html                  # Main player interface
│   └── Audio player with controls
│       Waveform visualization
│       Track list & metadata
│
└── ...                       # Other pages as needed
```

### 📂 Admin Pages (`frontend/admin/`) - NEW!

```
frontend/admin/                    # 🊨 ADMIN CONSOLE (NEW)
├── index.html                # 🔐 Admin Hub main dashboard
│   └── JWT login interface
│       Cyberpunk UI with neon styling
│       Links to admin tools
│       Session management
│
├── design-editor.html        # 🎨 Design token customization
│   └── Color picker interface
│       Font selection
│       Real-time preview
│
└── admin-upload.html         # 📤 Track upload form
    └── File picker
        Metadata input fields
        Upload progress
        Published status toggle
```

### 📂 JavaScript Modules (`frontend/js/`)

```
frontend/js/
├── main.js                   # Webpack entry point
│   └── Imports all modules
│       Creates main bundle
│
├── app.js                    # Main app logic
│   └── Initialize application
│       Route handling
│       Component management
│
├── auth.js                   # Authentication flows
│   └── Register user
│       Login flows
│       Token management
│       Logout
│
├── webauthn.js               # Biometric authentication
│   └── WebAuthn registration
│       WebAuthn login
│       Credential management
│
├── api-client.js             # API wrapper
│   └── fetch() wrapper
│       Request/response handling
│       Error management
│       Token injection in headers
│
├── player.js                 # Audio player
│   └── Play/pause controls
│       Seek functionality
│       Volume control
│       Waveform rendering
│
├── tracks.js                 # Track management
│   └── Fetch tracks from API
│       Display track list
│       Filter by genre
│       Sort functionality
│
└── ...                       # Other modules
```

### 📂 Stylesheets (`frontend/css/`)

```
frontend/css/
├── main.css                  # Global styles
│   └── Base styles, typography
│       CSS variables for theming
│
├── player.css                # Player component styles
│   └── Player controls
│       Waveform styling
│
├── auth.css                  # Auth form styles
│   └── Login/signup forms
│
└── ...                       # Other stylesheets
```

### 📂 Build Output (`frontend/dist/`) - Generated

```
frontend/dist/                     # Webpack output (GITIGNORED)
├── main.bundle.js            # Bundled application code
│   └── All JS modules combined
│       Minified for production
│
├── main.bundle.js.map        # Source map for debugging
│   └── Maps bundle back to source
│
└── ...                       # Other assets
```

### 📂 Configuration

```
frontend/
├── webpack.config.js          # Build configuration
│   └── Entry: js/main.js
│       Output: dist/main.bundle.js
│       Loaders for JS, CSS, images
│       Dev server on port 5500
│
├── package.json              # Dependencies
│   └── webpack, webpack-cli
│       babel for transpilation
│       dev-server
│
└── .env.example              # Environment template
    └── VITE_API_URL, PAYPAL_CLIENT_ID
```

---

## 📖 Documentation (`docs/`)

```
docs/
├── MASTER-PROMPT-2026-AKTUELL.md     # 🊨 START HERE!
│   └── Current project status
│       Known issues & workarounds
│       Protected code sections
│       Next priorities
│
├── README.md                          # Project overview
│   └── Features, quick start
│       Installation instructions
│       Tech stack overview
│
├── PROJECT-STRUCTURE.md               # This file
│   └── Visual directory organization
│       File purposes & organization
│
├── ADMIN-GUIDE.md                     # 🊨 Admin Hub documentation
│   └── Admin login methods
│       Admin tools guide
│       Troubleshooting
│       Best practices
│
├── DATABASE.md                        # Database documentation
│   └── Schema diagrams
│       Table descriptions
│       Relationships & indexes
│
├── API-Documentation-v1.md            # API reference
│   └── All 35 endpoints documented
│       Request/response examples
│       Error codes
│
├── PRODUCTION-DEPLOYMENT.md           # Deployment guide
│   └── VPS setup instructions
│       SSL certificates
│       Nginx reverse proxy
│       PM2 process manager
│
└── SECURITY.md                        # Security guide (planned)
    └── Security best practices
        Input validation
        CORS configuration
        Rate limiting
```

---

## 💤 Configuration Files

```
ROOT/
├── .env                        # Actual secrets (GITIGNORED)
│   └── DATABASE_URL
│       JWT_SECRET
│       PayPal credentials
│
├── .env.example                # Template for developers
│   └── All required vars documented
│       No real secrets included
│
├── .gitignore                  # Global git ignore patterns
│   └── node_modules/
│       dist/
│       .env
│       uploads/
│
├── package.json               # Root package
│   └── Scripts: npm start, npm run build
│       Uses concurrently to run backend + frontend
│
└── LICENSE                    # MIT License
    └── Full license text
```

---

## 📁 Directory Sizes

```
backend/
  ├─ routes/          ~15 KB   (6 files, 35 endpoints)
  ├─ middleware/      ~3 KB    (2 files)
  ├─ db/              ~25 KB   (schema.sql with indexes)
  ├─ uploads/         ~500 MB  (audio files, GITIGNORED)
  └─ Total ~600+ MB

frontend/
  ├─ js/              ~30 KB   (10+ modules)
  ├─ css/             ~15 KB   (stylesheets)
  ├─ html/            ~8 KB    (5 pages)
  ├─ admin/           ~50 KB   (3 admin pages)
  ├─ dist/            ~83 KB   (bundled, generated)
  └─ Total ~200+ KB

docs/
  └─ Total ~150 KB    (5 markdown files)
```

---

## 💏 Typical Workflow

### 1. Start Development
```
PowerShell ⇒ cd song-nexus
            ⇒ npm start
            ⇒ Both backend & frontend start
```

### 2. Make Changes
```
Edit: backend/routes/tracks.js
Edit: frontend/js/player.js

Frontend: Auto-reload (Webpack watches)
Backend:  Requires manual restart (Ctrl+C, npm start)
```

### 3. Test Admin
```
Browser ⇒ https://localhost:3000/admin/
        ⇒ Click "Dev Login"
        ⇒ Access admin tools
```

### 4. Commit Changes
```
PowerShell ⇒ git add .
            ⇒ git commit -m "feat: add new feature"
            ⇒ git push origin main
```

---

## 🏽 Naming Conventions

### Files
- **API routes:** kebab-case (admin-tracks.js)
- **Components:** camelCase (apiClient.js)
- **Styles:** kebab-case (player.css)
- **HTML pages:** kebab-case or camelCase (auth.html, admin-upload.html)
- **Database:** snake_case (play_history, webauthn_credentials)

### Directories
- **Module collections:** plural (routes/, middleware/, uploads/)
- **Code organization:** descriptive (js/, css/, html/)
- **Config:** root level (.env, package.json)

### Database Tables
- **Singular nouns preferred:** user (not users), track (not tracks)
- **Composite names:** snake_case (webauthn_credentials, play_history)
- **Junction tables:** alphabetical order (user_tracks, not tracks_users)

---

## 🔍 Finding Things

| Need | Location | File |
|------|----------|------|
| **API endpoint** | backend/routes/ | auth.js, tracks.js, admin-tracks.js |
| **Auth logic** | backend/middleware/ | auth-middleware.js |
| **Database schema** | backend/db/ | schema.sql |
| **Frontend page** | frontend/html/ | index.html, app.html |
| **Admin interface** | frontend/admin/ | index.html |
| **API client code** | frontend/js/ | api-client.js |
| **Styling** | frontend/css/ | *.css files |
| **Config** | root + backend/ + frontend/ | .env, .env.example |
| **Docs** | docs/ | *.md files |

---

## 🔒 Protected vs Modifiable

### 🔒 Protected (Don't modify without reason)
- `backend/db/schema.sql` - Database structure
- `backend/middleware/auth-middleware.js` - Auth logic
- `frontend/js/api-client.js` - API wrapper

### 🗑️ Safe to Modify
- `frontend/css/` - Styling
- `frontend/html/` - HTML structure
- `backend/routes/` - API endpoints (when tested!)
- Documentation files (docs/)

**See MASTER-PROMPT-2026-AKTUELL.md for detailed protection info**

---

**Last Updated:** January 7, 2026  
**Version:** 1.0.1  
**Maintainer:** Sebastian
