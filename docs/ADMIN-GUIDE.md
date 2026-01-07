# 🛡️ SONG-NEXUS ADMIN HUB GUIDE

**Version:** 1.0.1  
**Created:** January 7, 2026  
**Updated:** January 7, 2026  

---

## 💫 Overview

The **Admin Hub** is the central management console for Song-Nexus platform administrators. It provides a secure, JWT-authenticated dashboard for managing tracks, customizing platform branding, and accessing user analytics.

### Features

- 🔐 **Secure JWT Authentication** - Admin-only access with token-based auth
- 🎵 **Track Management** - Upload, edit, and publish music
- 🎨 **Design Editor** - Customize colors, fonts, and branding
- 📋 **User Analytics** - View platform statistics (coming v1.1)
- 📤 **File Management** - Upload audio files with metadata
- 🔒 **Security** - HTTPS only, rate limiting, input validation

### Tech Stack

- **Frontend:** Vanilla JavaScript, Webpack bundled
- **Styling:** Custom CSS with CSS variables, cyberpunk theme
- **Authentication:** JWT tokens, localStorage session management
- **Backend API:** Express.js REST endpoints
- **Security:** CORS, JWT verification, Admin role validation

---

## 🚀 Quick Start

### 1. Access Admin Hub

```
https://localhost:3000/admin/
```

### 2. Login Methods

#### Option A: Dev Login (Localhost Only) - RECOMMENDED FOR DEVELOPMENT

**Best for:** Local development, quick testing

1. Navigate to `https://localhost:3000/admin/`
2. Click **"Dev Login (Localhost Only)"** button
3. System automatically creates dev admin user
4. ✅ You're logged in!

**How it works:**
- Frontend sends POST to `/api/auth/dev-login`
- Backend creates temporary admin user with role `admin`
- JWT token issued and stored in localStorage
- Session persists until logout

**Note:** Only works on `localhost` or `127.0.0.1`. Attempting on production domain will show alert.

---

#### Option B: Existing Admin Account - PRODUCTION

**Best for:** Production, multiple admins, security

**Prerequisites:** Your database user must have `role='admin'`

1. **Set admin role in database:**
```sql
-- Update your user to have admin role
UPDATE users SET role='admin' WHERE email='your@email.com';

-- Verify the update
SELECT id, email, role FROM users WHERE email='your@email.com';
```

2. **Navigate to Admin Hub:**
```
https://localhost:3000/admin/
```

3. **Enter credentials:**
   - Email or Username: `your-username` or `your@email.com`
   - Password: Your account password

4. **Click Login button**

5. ✅ **Session established!** Token stored in localStorage

**Error Messages:**
- "Login failed" → Check email/username and password
- "Admin access required" → Your account doesn't have `role='admin'` in database
- "Connection refused" → Backend not running on port 3000

---

### 3. Session Management

**Session Bar (Top right when logged in)**
```
✓ Session Active | User: john@example.com | Role: admin | Logout
```

**Token Storage:**
- **Key:** `songNexusAdminToken` (JWT)
- **Storage:** Browser localStorage
- **Expiry:** 7 days from login (configurable in backend `.env`)
- **Persistence:** Survives page refresh

**Verify Token on Page Load:**
- When you visit `/admin/`, the page automatically checks for valid token
- If token exists and valid → Shows admin content
- If token expired or missing → Shows login panel

**Logout:**
- Click **"Logout"** button in session bar
- Token removed from localStorage
- Redirects to login panel
- Session ends on backend

---

## 📤 Admin Tools

### Tool 1: Track Upload

**Purpose:** Upload music files, set metadata, publish tracks

**Access:** Admin Hub → Click "Go to Upload" button

**URL:** `https://localhost:3000/admin-upload.html`

**Features:**
- 📤 Upload MP3 or WAV files
- 🎵 Set track metadata (name, artist, genre)
- 💲 Set pricing
- 📈 Preview track before publishing
- ✅ Publish/unpublish tracks
- 🗝️ Edit track information
- 🗑️ Delete tracks (soft delete)

**File Requirements:**
- **Format:** MP3 or WAV
- **Size:** Max 500 MB (configurable)
- **Bitrate:** 128 kbps to 320 kbps recommended
- **Sample Rate:** 44.1 kHz or 48 kHz

**Metadata Fields:**
```javascript
{
  name: "Track Title",           // Required
  artist: "Artist Name",          // Required
  genre: "genre-slug",           // Required (select from list)
  description: "Track description", // Optional
  price: 0.99,                   // Required (USD)
  is_published: true              // Optional (default: false)
}
```

**Example Workflow:**
1. Click "Choose File" and select MP3
2. Enter track title: "Summer Nights"
3. Enter artist: "The Synthetics"
4. Select genre: "Synthwave"
5. Set price: "$1.99"
6. Click "Upload Track"
7. Wait for upload confirmation
8. Click "Publish" to make visible to users

**API Endpoint:** `POST /api/admin/tracks/upload` (admin-only)

---

### Tool 2: Design Editor

**Purpose:** Customize platform colors, fonts, and branding

**Access:** Admin Hub → Click "Go to Editor" button

**URL:** `https://localhost:3000/admin/design-editor.html`

**Features:**
- 🎨 Customize primary colors
- 🎯 Change accent colors
- 💺 Select fonts
- 🕐 Real-time preview
- 💾 Save design configuration
- 🔄 Reset to defaults
- 🌘 Dark/Light mode toggle

**Customizable Elements:**
```javascript
{
  color_primary: "#00ff41",      // Main brand color
  color_secondary: "#00d9ff",    // Accent color
  color_success: "#26a827",      // Success states
  color_error: "#ff4757",        // Error states
  color_warning: "#e67e22",      // Warning states
  font_family_base: "Inter",     // Main font
  font_family_mono: "Fira Code", // Code/mono font
  border_radius: "8px",          // Corner roundness
  // ... 20+ more tokens
}
```

**Theme Tokens:**
Design configurations stored in database table: `design_system`

**Real-time Preview:**
- Split-screen interface
- Left: Color controls
- Right: Live preview
- Changes apply instantly

**Example Workflow:**
1. Click "Design Editor" from Admin Hub
2. Select "Primary Color" input
3. Choose new color: `#ff6b6b` (red)
4. See live preview update on right side
5. Click "Save Design"
6. Confirmation message appears
7. Changes apply to platform immediately

**API Endpoint:** `PUT /api/admin/design` (admin-only, coming v1.1)

---

## 🔐 Authentication Details

### JWT Token Flow

```
1. User submits credentials
   ↓
2. Frontend POST to /api/auth/login or /api/auth/dev-login
   ↓
3. Backend validates credentials
   ↓
4. Backend checks user role === 'admin'
   ↓
5. Backend generates JWT token
   ↓
6. Frontend receives token + user data
   ↓
7. Token stored in localStorage['songNexusAdminToken']
   ↓
8. Token sent in Authorization header for API calls
   ↓
9. Backend verifies token + role for each request
```

### Token Structure

```json
{
  "header": {
    "alg": "HS256",
    "typ": "JWT"
  },
  "payload": {
    "userId": 1,
    "email": "admin@example.com",
    "username": "admin",
    "role": "admin",
    "iat": 1704630000,
    "exp": 1705234800
  },
  "signature": "..."
}
```

### Token Verification

**Each API call includes:**
```javascript
Headers: {
  'Authorization': 'Bearer eyJhbGc...',
  'Content-Type': 'application/json'
}
```

**Backend validates:**
1. Token signature matches JWT_SECRET
2. Token not expired
3. User role = 'admin'
4. User exists and not deleted

**If invalid:** 401 Unauthorized response

---

## 📁 File Structure

```
frontend/admin/
├── index.html              # 🔐 MAIN: Admin Hub console
├── design-editor.html      # 🎨 Design customization tool
└── admin-upload.html       # 📤 Track upload interface

backend/routes/
├── auth.js                # POST /api/auth/login (admin check)
├── admin-tracks.js        # Track upload endpoints
└── (design routes - v1.1)  # Design customization endpoints
```

---

## 🧘 Best Practices

### Security

1. **Use HTTPS Only**
   - Always access via `https://`, never `http://`
   - Prevents token interception

2. **Never Share Admin Credentials**
   - Each admin should have unique account
   - No shared passwords between admins

3. **Regular Token Review**
   - Tokens expire after 7 days
   - Login again to refresh
   - Automatically logout on token expiry

4. **Logout When Done**
   - Click "Logout" button before closing browser
   - Clears sensitive data from localStorage
   - Prevents unauthorized access on shared devices

5. **Check Role Assignment**
   - Verify user has `role='admin'` in database
   - Only give admin access to trusted users
   - Audit admin users regularly

### Admin Account Management

**Adding New Admin:**
```sql
-- Method 1: Update existing user
UPDATE users SET role='admin' WHERE id=5;

-- Method 2: Create new admin (if registration is open)
-- User registers normally, then:
UPDATE users SET role='admin' WHERE email='newemail@example.com';

-- Verify
SELECT email, role FROM users WHERE role='admin';
```

**Removing Admin Access:**
```sql
-- Change role back to 'user'
UPDATE users SET role='user' WHERE id=5;
```

**Audit Admin Users:**
```sql
-- List all admins
SELECT id, email, username, created_at FROM users WHERE role='admin'
ORDER BY created_at DESC;
```

---

## 🐛 Troubleshooting

### Issue: "Admin access required" Error

**Problem:** Login succeeds but shows "Admin access required"

**Cause:** Your user account doesn't have `role='admin'` in database

**Solution:**
```sql
-- 1. Check your current role
SELECT id, email, role FROM users WHERE email='your@email.com';

-- 2. Update to admin
UPDATE users SET role='admin' WHERE email='your@email.com';

-- 3. Logout and login again
-- Go to Admin Hub and click "Logout"
-- Then login again with same credentials
```

---

### Issue: "Connection refused" Error

**Problem:** Cannot connect to backend API

**Cause:** Backend server not running

**Solution:**
```bash
# Terminal 1: Check backend is running
cd backend
npm start

# Should see: "Server running on port 3000"

# Terminal 2: Check port 3000 is open
# Windows PowerShell:
netstat -ano | findstr :3000

# If occupied, change .env PORT to 3001 and restart
```

---

### Issue: "Token invalid or expired" After Refresh

**Problem:** Page refresh shows login panel again

**Cause:** Token stored incorrectly or localStorage cleared

**Solution:**
1. Check browser console (F12) for errors
2. Check localStorage is enabled (not in incognito?)
3. Try Dev Login again
4. Check token timestamp: `localStorage.getItem('songNexusAdminToken')`

---

### Issue: Dev Login Not Working

**Problem:** "Dev login only available on localhost" message

**Cause:** Accessing from non-localhost domain

**Solution:**
- Use `https://localhost:3000/admin/` NOT `https://192.168.1.100:3000/admin/`
- Or use `https://127.0.0.1:3000/admin/`
- Dev login intentionally blocked on production domains

---

### Issue: Upload Fails with CORS Error

**Problem:** File upload returns CORS error

**Cause:** Backend CORS configuration missing admin endpoint

**Solution:**
```javascript
// backend/server.js - ensure admin routes have CORS:
app.use('/api/admin', cors(corsOptions));

// Then restart backend:
Ctrl+C
npm start
```

---

## 📚 API Reference

### Admin Authentication Endpoints

#### Dev Login (Localhost Only)
```javascript
POST /api/auth/dev-login

Headers: {
  'Content-Type': 'application/json'
}

Response 200:
{
  token: "eyJhbGc...",
  user: {
    id: 1,
    email: "dev@localhost",
    username: "dev",
    role: "admin"
  }
}
```

#### Regular Login
```javascript
POST /api/auth/login

Body: {
  username: "john@example.com",  // or email
  password: "securepassword"
}

Headers: {
  'Content-Type': 'application/json'
}

Response 200:
{
  token: "eyJhbGc...",
  user: {
    id: 1,
    email: "john@example.com",
    username: "john",
    role: "admin"
  }
}

Response 401: { error: "Admin access required" }
```

#### Verify Token
```javascript
POST /api/auth/verify

Headers: {
  'Authorization': 'Bearer eyJhbGc...'
}

Response 200:
{
  valid: true,
  user: { ... }
}
```

#### Logout
```javascript
POST /api/auth/logout

Headers: {
  'Authorization': 'Bearer eyJhbGc...'
}

Response 200:
{ message: "Logged out successfully" }
```

---

### Admin Track Endpoints

#### Upload Track
```javascript
POST /api/admin/tracks/upload

Headers: {
  'Authorization': 'Bearer eyJhbGc...'
  // NO 'Content-Type': multipart handled by browser
}

Body: FormData {
  file: File,              // Audio file
  name: "Track Title",     // String
  artist: "Artist Name",   // String
  genre: "electronic",     // String (slug)
  description: "Desc...",  // String (optional)
  price: 0.99              // Number
}

Response 200:
{
  message: "Track uploaded successfully",
  track: {
    id: 42,
    name: "Track Title",
    artist: "Artist Name",
    audio_filename: "track_42_xxxxx.mp3",
    price: 0.99,
    is_published: false,
    created_at: "2026-01-07T..."
  }
}
```

#### Get Track List
```javascript
GET /api/admin/tracks/list

Headers: {
  'Authorization': 'Bearer eyJhbGc...'
}

Response 200: [
  {
    id: 1,
    name: "Track Name",
    artist: "Artist",
    price: 0.99,
    is_published: true,
    plays: 150,
    created_at: "2026-01-01T..."
  }
]
```

---

## 🗑️ Maintenance

### Monitoring Admin Sessions

**Backend logs admin logins:**
```javascript
// backend/routes/auth.js
console.log(`Admin login: ${user.email} at ${new Date()}`);
```

**Check recent logins:**
```bash
# Tail backend logs
npm start 2>&1 | grep "Admin login"
```

### Token Expiration

**Default:** 7 days

**To change token expiry time:**
```bash
# Edit backend/.env
JWT_EXPIRE=14d  # Change to 14 days

# Restart backend
Ctrl+C
npm start
```

**Valid formats:** `7d`, `14d`, `1w`, `24h`, `1440m`

---

### Database Backups

**Backup admin-created data:**
```bash
# Backup design_system table
pg_dump -U postgres song_nexus_dev -t design_system > design_backup.sql

# Backup tracks table
pg_dump -U postgres song_nexus_dev -t tracks > tracks_backup.sql

# Full backup
pg_dump -U postgres song_nexus_dev > full_backup.sql
```

---

## 🎯 UI/UX Guide

### Admin Hub Dashboard

**Layout:**
```
[HEADER]
🔐 SONG-NEXUS ADMIN
Secure Content Management System

[SESSION BAR]
✓ Session Active | User: admin@example.com | Role: admin | Logout

[ADMIN GRID]
┌─────────┐  ┌─────────┐
│ 📤 Track Upload │  │ 🎨 Design Editor │
│ Upload & manage   │  │ Customize colors  │
│ [Go to Upload]    │  │ [Go to Editor]    │
└─────────┘  └─────────┘

[FOOTER]
🎵 Song-Nexus Admin Console v1.0
© 2026 | Secure • Nerdy • Functional
```

### Color Scheme

- **Background:** Dark navy (#0a0e27)
- **Surface:** Slightly lighter (#10141f)
- **Primary:** Neon green (#00ff41) - Buttons, accents
- **Accent:** Cyan (#00d9ff) - Hovers, highlights
- **Error:** Red (#ff4757) - Validation errors
- **Success:** Green (#26a827) - Success messages

### Fonts

- **Monospace Font:** Used for Admin Hub
  - Primary: "Fira Code"
  - Fallback: "JetBrains Mono"
  - System: "Courier New"

**Terminal Font Note:**
You asked about terminal fonts - for Admin Console it doesn't matter which terminal font you use personally (VS Code, PowerShell, etc.). The Admin Hub frontend uses Fira Code by default but falls back gracefully. Choose whatever you prefer for YOUR dev environment! 🌙

---

## 📝 Coming in v1.1

- [ ] Advanced user management
- [ ] Platform analytics dashboard
- [ ] Design token export (CSS variables)
- [ ] Batch track upload
- [ ] Track editing interface
- [ ] Admin activity log
- [ ] User role management UI
- [ ] Backup & restore interface

---

## 📚 Additional Resources

- **[README.md](../README.md)** - Project overview
- **[DATABASE.md](./DATABASE.md)** - Database schema
- **[API-Documentation-v1.md](./API-Documentation-v1.md)** - All API endpoints
- **[PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)** - Deployment guide

---

**Last Updated:** January 7, 2026  
**Version:** 1.0.1
