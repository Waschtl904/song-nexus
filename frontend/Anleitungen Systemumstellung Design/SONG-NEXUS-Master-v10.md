# 🎵 SONG-NEXUS - Master Prompt v10.0
**Status: ✅ PRODUCTION READY - Webpack Bundle Fixed (Dec 19, 2025)**

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

---

## 🏗️ ARCHITECTURE

### Frontend Structure (`/frontend`)
```
frontend/
├── js/                    # ES6 Modules (11 files)
│   ├── main.js           # Webpack entry point - initializes all modules
│   ├── config.js         # API endpoints + token management
│   ├── api-client.js     # REST API client (all backend calls)
│   ├── auth.js           # Auth modal + WebAuthn + Magic Link
│   ├── webauthn.js       # WebAuthn biometric authentication
│   ├── app.js            # Main app controller
│   ├── ui.js             # UI initialization + helpers
│   ├── audio-player.js   # Audio playback engine with visualization
│   ├── player.js         # Player state management
│   ├── player-draggable.js  # Draggable player UI
│   ├── tracks.js         # Track listing + management
│   ├── tracks-loader.js  # Pagination loader
│   └── [other modules]
├── index.html            # Main page
├── admin-upload.html     # Admin track upload
├── webpack.config.js     # ✅ FIXED: No splitChunks (single bundle)
├── package.json          # Dependencies
└── dist/
    └── app.bundle.js     # ✅ Single production bundle

```

### Backend Structure (`/backend`)
```
backend/
├── routes/
│   ├── auth.js          # Auth endpoints (WebAuthn + Magic Link)
│   ├── tracks.js        # Track CRUD operations
│   └── admin-tracks.js  # Admin track management
├── middleware/
│   ├── auth-middleware.js
│   └── error-handlers.js
├── server.js            # Express server setup
└── package.json         # Dependencies
```

---

## 🔧 WEBPACK CONFIGURATION (FIXED v10)

### Current webpack.config.js
```javascript
const path = require('path');
const webpack = require('webpack');

module.exports = {
    mode: 'production',
    entry: path.resolve(__dirname, 'js', 'main.js'),

    output: {
        path: path.resolve(__dirname, 'dist'),
        filename: 'app.bundle.js',
        publicPath: '/dist/'
    },

    devtool: 'source-map',

    module: {
        rules: [
            {
                test: /\.js$/,
                exclude: /node_modules\/(?!@simplewebauthn)/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [
                            ['@babel/preset-env', {
                                targets: { browsers: ['last 2 versions'] },
                                modules: false  // ✅ CRITICAL: Let Webpack handle modules
                            }]
                        ],
                        plugins: [
                            '@babel/plugin-proposal-class-properties',
                            '@babel/plugin-proposal-export-default-from'
                        ]
                    }
                }
            }
        ]
    },

    resolve: {
        extensions: ['.js', '.json']
    },

    optimization: {
        minimize: true
    },

    plugins: [
        new webpack.DefinePlugin({
            'process.env.NODE_ENV': JSON.stringify('production')
        })
    ],

    performance: {
        hints: 'warning',
        maxEntrypointSize: 512000,
        maxAssetSize: 512000
    }
};
```

### Why This Works
- ✅ **Single Bundle**: All modules bundled into `app.bundle.js` (83.5 KiB)
- ✅ **No splitChunks**: Prevents the "Multiple chunks emit" error
- ✅ **Clean Output**: One file, easy to deploy
- ✅ **Source Maps**: Debug-friendly with `.map` file

### ❌ What Was Removed
- ❌ `BundleAnalyzerPlugin` (not needed, not installed)
- ❌ `runtimeChunk: 'single'` (caused chunk conflicts)
- ❌ `splitChunks` config (THIS WAS THE PROBLEM!)

---

## 🔴 CRITICAL BUG FIX (Dec 19, 2025)

### The Problem
```
Error: Conflict: Multiple chunks emit assets to the same filename app.bundle.js
(chunks 792 and 121)
```

### Root Cause
The old webpack.config.js had:
```javascript
splitChunks: {
    chunks: 'initial',
    minSize: 100000,
    cacheGroups: {
        vendor: {
            test: /[\\/]node_modules[\\/]/,
            name: 'vendors',  // ← Tried to create separate chunk
            priority: 10
        }
    }
}
```

This told Webpack to create **TWO chunks** (`main` + `vendors`), but both tried to write to the **SAME filename** (`app.bundle.js`), causing the conflict.

### The Solution
**Remove splitChunks entirely**. Bundle everything into one file. Clean, simple, works!

---

## 📦 MODULES OVERVIEW

### Main Entry Point (main.js)
- Imports all 11 ES6 modules
- Exposes them to `window` for global access
- Initializes on `DOMContentLoaded`
- Loads: Config → UI → Auth → App → Magic Link check

### Core Modules

| Module | Purpose | Key Methods |
|--------|---------|-------------|
| **config.js** | API endpoints + token management | `getAuthToken()`, `setAuthToken()`, API_ENDPOINTS |
| **api-client.js** | REST API client for all backend calls | `.get()`, `.post()`, `.put()`, `.delete()`, `.request()` |
| **auth.js** | Complete auth system (modal + WebAuthn + Magic Link) | `.init()`, `.loginWithPassword()`, `.authenticateWithBiometric()`, `.loginWithMagicLink()` |
| **webauthn.js** | WebAuthn biometric authentication | `.registerWithBiometric()`, `.authenticateWithBiometric()`, `.verifyMagicLink()` |
| **audio-player.js** | Audio playback + waveform visualization | `.play()`, `.pause()`, `.setVolume()`, `.loadTrack()` |
| **tracks.js** | Track listing + management | `.loadTracks()`, `.filterTracks()` |
| **tracks-loader.js** | Pagination loader | `new TracksLoader(container, pageSize)` |
| **ui.js** | UI initialization + helpers | `.init()`, `.showError()`, `.updateAuthUI()` |
| **app.js** | Main app controller | `.init()`, loads tracks + blog posts, handles events |
| **player.js** | Player state management | `.init()`, `.play()`, `.pause()` |
| **player-draggable.js** | Draggable player UI | `.init()` |

---

## 🚀 BUILD & DEPLOYMENT

### Development
```powershell
cd frontend
npm install
npm run watch      # Watch mode with auto-reload
npm run dev        # Dev server with hot reload
```

### Production Build
```powershell
cd frontend
npm run build      # Creates dist/app.bundle.js (83.5 KiB)
npm run start      # Serve with Express + HTTPS
```

### Important
- Build process removes old `/dist` folder
- Source maps generated for debugging
- All 11 modules bundled into single file
- Ready for immediate deployment

---

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
4. User logged in

### 3. Magic Link
1. User enters email
2. Backend sends link to email
3. User clicks link with token in URL
4. Frontend verifies token
5. User auto-logged in

---

## 📱 KEY FEATURES

- ✅ **Biometric Authentication** (WebAuthn)
- ✅ **Password Registration & Login**
- ✅ **Magic Link Email Authentication**
- ✅ **Audio Streaming with Waveform**
- ✅ **Track Pagination & Search**
- ✅ **Admin Upload System**
- ✅ **Dark Mode**
- ✅ **Keyboard Shortcuts** (Space/Arrow Keys)
- ✅ **Responsive Design**
- ✅ **ES6 Modules + Webpack Bundling**

---

## 🛠️ TROUBLESHOOTING

### Webpack Build Fails
**Solution**: Ensure webpack.config.js has NO `splitChunks` config. Use the v10 config above.

### Modules Not Loading
**Solution**: Check `main.js` initializes in correct order:
1. UI.init()
2. Auth.init()  ← Sets up modal handlers
3. Auth.updateUI()
4. App.init()

### Auth Modal Not Appearing
**Solution**: Ensure Auth.init() runs AFTER DOM is ready. Check for correct element IDs in index.html.

### API Calls Failing
**Solution**: Verify backend running on port 3000. Check token in localStorage (DevTools → Application → Storage).

---

## 📝 IMPORTANT NOTES

### ES6 Module System
- All imports use relative paths: `import { Auth } from './auth.js'`
- File extensions required: `./auth.js` NOT `./auth`
- Webpack handles module resolution
- Babel transpiles to ES5 for older browsers

### API Client Pattern
```javascript
// All API calls go through APIClient
await APIClient.post('/endpoint', data);
await APIClient.get('/endpoint');
```

### Auth Token Management
```javascript
// Token stored in localStorage as 'auth_token'
// Token expires after 15 minutes (default)
// Check: getAuthToken() returns token or null
```

---

## 🎯 NEXT STEPS / IMPROVEMENTS

- [ ] Add error logging/monitoring
- [ ] Implement analytics tracking
- [ ] Add offline mode with service workers
- [ ] Optimize bundle size (currently 83.5 KiB)
- [ ] Add unit tests
- [ ] Implement lazy-loading with dynamic imports
- [ ] Add Progressive Web App (PWA) support

---

## 📞 SUPPORT

**If webpack build fails:**
1. Delete `/dist` and `.webpack_cache`
2. Verify webpack.config.js matches v10 above
3. Check for `modules: false` in Babel preset
4. Ensure NO `splitChunks` in optimization

**If auth fails:**
1. Verify backend running: `npm run start` from `/backend`
2. Check API endpoints in `config.js`
3. Verify WebAuthn credentials registered
4. Check browser console for error messages

---

**Last Updated**: December 19, 2025 - 13:07 CET  
**Status**: ✅ Production Ready - Single Bundle Deployment