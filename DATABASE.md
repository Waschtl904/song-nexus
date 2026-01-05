# 📊 DATABASE DOCUMENTATION

> **Complete database schema reference for Song-Nexus**

**Version:** 1.0  
**Updated:** January 5, 2026  
**Status:** ✅ Production Ready

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Tables & Fields](#tables--fields)
3. [Relationships](#relationships)
4. [Indexes](#indexes)
5. [Constraints](#constraints)
6. [Setup & Migration](#setup--migration)
7. [Backup & Recovery](#backup--recovery)
8. [Performance Tips](#performance-tips)
9. [Access Control](#access-control)

---

## 🐦 Overview

**Database System:** PostgreSQL 12+  
**Total Tables:** 10  
**Total Sequences:** 10 (auto-increment IDs)  
**Total Indexes:** 22  
**Total Foreign Keys:** 11  
**Primary Keys:** 10  
**Unique Constraints:** 9  

**Schema File:** [schema.sql](./schema.sql) (22 KB, 700+ lines)

---

## 🗄 Tables & Fields

### 1. **users** - User Accounts & Credentials

Stores user account information and authentication data.

```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(50) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(20) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    is_active BOOLEAN DEFAULT true,
    webauthn_credential JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Constraints | Purpose |
|-------|------|-------------|----------|
| `id` | SERIAL | PRIMARY KEY | Unique identifier |
| `email` | VARCHAR(255) | UNIQUE, NOT NULL | Login email |
| `username` | VARCHAR(50) | UNIQUE, NOT NULL | Display name |
| `password_hash` | VARCHAR(255) | NOT NULL | bcrypt hashed password |
| `role` | VARCHAR(20) | CHECK (user\|admin) | Permission level |
| `is_active` | BOOLEAN | DEFAULT true | Account status |
| `webauthn_credential` | JSONB | - | Biometric auth data (deprecated) |
| `created_at` | TIMESTAMP | DEFAULT NOW() | Account creation date |
| `last_login` | TIMESTAMP | - | Last login timestamp |
| `updated_at` | TIMESTAMP | DEFAULT NOW() | Last profile update |

**Key Relationships:**
- `users.id` → `webauthn_credentials.user_id` (1:many)
- `users.id` → `magic_links.user_id` (1:many)
- `users.id` → `magic_link_tokens.user_id` (1:many)
- `users.id` → `orders.user_id` (1:many)
- `users.id` → `purchases.user_id` (1:many)
- `users.id` → `play_history.user_id` (1:many)
- `users.id` → `play_stats.user_id` (1:many)

---

### 2. **tracks** - Music Metadata & Files

Stores information about music tracks available on platform.

```sql
CREATE TABLE tracks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    artist VARCHAR(100) NOT NULL,
    genre VARCHAR(50),
    description TEXT,
    audio_filename VARCHAR(255) UNIQUE NOT NULL,
    price_eur NUMERIC(10,2) DEFAULT 0.99,
    duration_seconds INTEGER,
    file_size_bytes BIGINT,
    play_count INTEGER DEFAULT 0,
    is_published BOOLEAN DEFAULT false,
    is_free BOOLEAN DEFAULT false,
    price NUMERIC(10,2) DEFAULT 0.99,
    free_preview_duration INTEGER DEFAULT 40,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Purpose |
|-------|------|----------|
| `id` | SERIAL | Unique track identifier |
| `name` | VARCHAR(100) | Track title |
| `artist` | VARCHAR(100) | Artist name |
| `genre` | VARCHAR(50) | Music genre (rock, pop, metal, etc.) |
| `description` | TEXT | Track description/notes |
| `audio_filename` | VARCHAR(255) | File path (UNIQUE) |
| `price_eur` | NUMERIC(10,2) | Price in EUR |
| `duration_seconds` | INTEGER | Track length |
| `file_size_bytes` | BIGINT | Audio file size |
| `play_count` | INTEGER | Total plays |
| `is_published` | BOOLEAN | Public availability |
| `is_free` | BOOLEAN | Free preview available |
| `free_preview_duration` | INTEGER | Preview length (seconds) |
| `is_deleted` | BOOLEAN | Soft delete flag |
| `deleted_at` | TIMESTAMP | Deletion timestamp |
| `created_at` | TIMESTAMP | Upload date |
| `updated_at` | TIMESTAMP | Last update |

**Key Relationships:**
- `tracks.id` → `purchases.track_id` (1:many)
- `tracks.id` → `play_history.track_id` (1:many)
- `tracks.id` → `play_stats.track_id` (1:many)

---

### 3. **orders** - PayPal Transaction Records

Stores payment orders and transaction information.

```sql
CREATE TABLE orders (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
    amount NUMERIC(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    description TEXT,
    status VARCHAR(20) DEFAULT 'CREATED' 
        CHECK (status IN ('CREATED', 'COMPLETED', 'FAILED', 'PENDING')),
    paypal_payer_email VARCHAR(255),
    transaction_id VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Purpose |
|-------|------|----------|
| `id` | SERIAL | Order ID |
| `user_id` | INTEGER | Buyer (FK → users) |
| `paypal_order_id` | VARCHAR(255) | PayPal reference |
| `amount` | NUMERIC(10,2) | Payment amount |
| `currency` | VARCHAR(3) | Currency code |
| `status` | VARCHAR(20) | CREATED \| COMPLETED \| FAILED \| PENDING |
| `description` | TEXT | Order notes |
| `paypal_payer_email` | VARCHAR(255) | Buyer email |
| `transaction_id` | VARCHAR(255) | PayPal transaction ID |
| `created_at` | TIMESTAMP | Order creation |
| `completed_at` | TIMESTAMP | Payment completion |
| `updated_at` | TIMESTAMP | Last status update |

---

### 4. **purchases** - Track Purchases per User

Tracks which users have purchased which tracks.

```sql
CREATE TABLE purchases (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    order_id INTEGER REFERENCES orders(id) ON DELETE SET NULL,
    license_type VARCHAR(50) DEFAULT 'personal'
        CHECK (license_type IN ('personal', 'commercial', 'streaming')),
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP,
    UNIQUE(user_id, track_id)
);
```

| Field | Type | Purpose |
|-------|------|----------|
| `id` | SERIAL | Purchase ID |
| `user_id` | INTEGER | Buyer (FK → users) |
| `track_id` | INTEGER | Track (FK → tracks) |
| `order_id` | INTEGER | Associated order (FK → orders) |
| `license_type` | VARCHAR(50) | personal \| commercial \| streaming |
| `purchased_at` | TIMESTAMP | Purchase date |
| `expires_at` | TIMESTAMP | License expiration (if applicable) |

**Constraint:** UNIQUE(user_id, track_id) - One purchase per user per track

---

### 5. **play_history** - Track Play Events

Records every time a user plays a track (analytics).

```sql
CREATE TABLE play_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_played_seconds INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id, track_id, played_at)
);
```

| Field | Type | Purpose |
|-------|------|----------|
| `id` | SERIAL | Event ID |
| `user_id` | INTEGER | User who played |
| `track_id` | INTEGER | Track played |
| `played_at` | TIMESTAMP | Play timestamp |
| `duration_played_seconds` | INTEGER | How long user listened |
| `created_at` | TIMESTAMP | Record creation |

**Constraint:** UNIQUE(user_id, track_id, played_at) - One record per play event

---

### 6. **play_stats** - Advanced Player Analytics

Detailed statistics about track plays (device, session, user type).

```sql
CREATE TABLE play_stats (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    duration_played_seconds INTEGER DEFAULT 0,
    session_id VARCHAR(255),
    device_type VARCHAR(50) DEFAULT 'web',
    is_paid_user BOOLEAN DEFAULT false,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Purpose |
|-------|------|----------|
| `id` | SERIAL | Stat ID |
| `user_id` | INTEGER | User |
| `track_id` | INTEGER | Track |
| `duration_played_seconds` | INTEGER | Duration |
| `session_id` | VARCHAR(255) | Browser session |
| `device_type` | VARCHAR(50) | web \| mobile \| desktop |
| `is_paid_user` | BOOLEAN | Subscription status |
| `played_at` | TIMESTAMP | Timestamp |

---

### 7. **webauthn_credentials** - Biometric Authentication Data

Stores user's biometric authentication credentials (fingerprint, face, etc.).

```sql
CREATE TABLE webauthn_credentials (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    credential_id VARCHAR(255) UNIQUE NOT NULL,
    public_key BYTEA NOT NULL,
    counter INTEGER DEFAULT 0,
    transports TEXT[],
    created_at TIMESTAMP DEFAULT NOW(),
    last_used TIMESTAMP
);
```

| Field | Type | Purpose |
|-------|------|----------|
| `id` | SERIAL | Credential ID |
| `user_id` | INTEGER | Owner (FK → users) |
| `credential_id` | VARCHAR(255) | WebAuthn credential ID |
| `public_key` | BYTEA | Public key for verification |
| `counter` | INTEGER | Signature counter (security) |
| `transports` | TEXT[] | usb \| ble \| nfc \| internal |
| `created_at` | TIMESTAMP | Registration date |
| `last_used` | TIMESTAMP | Last authentication |

---

### 8. **magic_links** - Email-Based Authentication

Tokens for passwordless email login.

```sql
CREATE TABLE magic_links (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW(),
    ip_address INET,
    user_agent VARCHAR(500),
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

| Field | Type | Purpose |
|-------|------|----------|
| `id` | SERIAL | Link ID |
| `user_id` | INTEGER | User (FK → users) |
| `token` | VARCHAR(255) | Magic token (UNIQUE) |
| `expires_at` | TIMESTAMP | Expiration time |
| `used_at` | TIMESTAMP | When used (NULL = unused) |
| `created_at` | TIMESTAMP | Creation time |
| `ip_address` | INET | Requester IP |
| `user_agent` | VARCHAR(500) | Browser info |
| `updated_at` | TIMESTAMP | Last update |

---

### 9. **magic_link_tokens** - Alternative Magic Link Storage

Legacy/backup magic link token storage.

```sql
CREATE TABLE magic_link_tokens (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    used_at TIMESTAMP,
    created_at TIMESTAMP DEFAULT NOW()
);
```

**Note:** Simplified version of `magic_links`. Current implementation prefers `magic_links` table.

---

### 10. **design_system** - Theme & Design Tokens

Stores customizable design system colors and styles.

```sql
CREATE TABLE design_system (
    id SERIAL PRIMARY KEY,
    color_primary VARCHAR(7),
    color_secondary VARCHAR(7),
    color_accent_teal VARCHAR(7),
    color_accent_green VARCHAR(7),
    color_accent_red VARCHAR(7),
    color_text_primary VARCHAR(7),
    color_background VARCHAR(7),
    background_image_url VARCHAR(500),
    logo_url VARCHAR(500),
    hero_image_url VARCHAR(500),
    font_family_base VARCHAR(100),
    font_size_base INTEGER,
    font_weight_normal INTEGER,
    font_weight_bold INTEGER,
    spacing_unit INTEGER,
    border_radius INTEGER,
    button_background_color VARCHAR(7),
    button_text_color VARCHAR(7),
    button_border_radius INTEGER,
    button_padding VARCHAR(20),
    player_background_image_url VARCHAR(500),
    player_button_color VARCHAR(7),
    player_button_size INTEGER,
    is_active BOOLEAN DEFAULT true,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_by VARCHAR(100)
);
```

**Fields:** 27 design tokens (colors, fonts, spacing, etc.)

| Category | Fields |
|----------|--------|
| **Colors** | color_primary, color_secondary, color_accent_* (5 colors) |
| **Text** | color_text_primary, font_family_base, font_size_base, font_weight_* |
| **Layout** | spacing_unit, border_radius |
| **Buttons** | button_background_color, button_text_color, button_border_radius, button_padding |
| **Assets** | background_image_url, logo_url, hero_image_url, player_background_image_url |
| **Player** | player_button_color, player_button_size |
| **Metadata** | is_active, updated_at, updated_by |

---

## 🔗 Relationships

### Relationship Diagram

```
users (PK: id)
  └─ 1:many → webauthn_credentials
  └─ 1:many → magic_links
  └─ 1:many → magic_link_tokens
  └─ 1:many → orders
       └─ 1:many → purchases
  └─ 1:many → purchases
  └─ 1:many → play_history
  └─ 1:many → play_stats

tracks (PK: id)
  └─ 1:many → purchases
  └─ 1:many → play_history
  └─ 1:many → play_stats

orders (PK: id)
  └─ 1:many → purchases
```

### Foreign Key Constraints

| From | To | On Delete | Purpose |
|------|----|-----------|---------|
| webauthn_credentials.user_id | users.id | CASCADE | Delete creds when user deleted |
| magic_links.user_id | users.id | CASCADE | Delete tokens when user deleted |
| magic_link_tokens.user_id | users.id | CASCADE | Delete tokens when user deleted |
| orders.user_id | users.id | CASCADE | Delete orders when user deleted |
| purchases.user_id | users.id | CASCADE | Delete purchases when user deleted |
| purchases.track_id | tracks.id | CASCADE | Delete purchase when track deleted |
| purchases.order_id | orders.id | SET NULL | Keep purchase, unlink order |
| play_history.user_id | users.id | CASCADE | Delete history when user deleted |
| play_history.track_id | tracks.id | CASCADE | Delete history when track deleted |
| play_stats.user_id | users.id | CASCADE | Delete stats when user deleted |
| play_stats.track_id | tracks.id | CASCADE | Delete stats when track deleted |

---

## 🗒️ Indexes

**Total: 22 indexes** for optimized query performance.

### Users & Authentication
```sql
idx_users_email                    -- Email lookups
idx_magic_links_token              -- Token validation
idx_magic_links_user_id            -- User magic links
idx_magic_links_expires_at         -- Expired token cleanup
idx_magic_links_used_at (partial)  -- Find unused tokens
idx_magic_link_user                -- Token/user lookup
idx_magic_link_expires             -- Token expiration
idx_webauthn_credentials_id        -- Credential lookups
```

### Tracks
```sql
idx_tracks_published_created_optimized    -- List published tracks (most common)
idx_tracks_published_created              -- Publish + sort by date
idx_tracks_published_deleted_created      -- Handle soft deletes
idx_tracks_audio_filename (partial)       -- File lookups (non-deleted)
idx_tracks_genre                          -- Genre filtering
idx_tracks_is_deleted (partial)           -- Filter deleted tracks
```

### Payments & Purchases
```sql
idx_orders_user_id                 -- User's orders
idx_purchases_user_id              -- User's purchases
```

### Analytics
```sql
idx_play_history_user_id           -- User's play history
idx_play_history_track_id          -- Track's plays
idx_play_history_played_at         -- Time-based queries
idx_play_stats_user_id             -- User analytics
idx_play_stats_track_id            -- Track analytics
```

---

## 🔓 Constraints

### Primary Keys (10)
- design_system_pkey
- magic_link_tokens_pkey
- magic_links_pkey
- orders_pkey
- play_history_pkey
- play_stats_pkey
- purchases_pkey
- tracks_pkey
- users_pkey
- webauthn_credentials_pkey

### Unique Constraints (9)
```sql
users_email_key                    -- Email must be unique
users_username_key                 -- Username must be unique
tracks_audio_filename_key          -- File must be unique
orders_paypal_order_id_key         -- PayPal IDs unique
magic_links_token_key              -- Tokens unique
magic_link_tokens_token_key        -- Tokens unique
purchases_user_id_track_id_key     -- One purchase per user/track
play_history_user_id_track_id_played_at_key  -- One play record per event
webauthn_credentials_credential_id_key       -- Credentials unique
```

### Check Constraints (3)
```sql
users_role_check                   -- role IN ('user', 'admin')
orders_status_check                -- status IN ('CREATED', 'COMPLETED', 'FAILED', 'PENDING')
purchases_license_type_check       -- license_type IN ('personal', 'commercial', 'streaming')
```

---

## 🚀 Setup & Migration

### Initial Setup

```bash
# 1. Create database
psql -U postgres
CREATE DATABASE song_nexus_dev;
\q

# 2. Apply schema
psql -U postgres -d song_nexus_dev -f schema.sql

# 3. Verify tables
psql -U postgres -d song_nexus_dev -c '\dt'
```

### Expected Output
```
                   List of relations
 Schema |         Name         | Type  | Owner
--------+----------------------+-------+----------
 public | design_system        | table | postgres
 public | magic_link_tokens    | table | postgres
 public | magic_links          | table | postgres
 public | orders               | table | postgres
 public | play_history         | table | postgres
 public | play_stats           | table | postgres
 public | purchases            | table | postgres
 public | tracks               | table | postgres
 public | users                | table | postgres
 public | webauthn_credentials | table | postgres
(10 rows)
```

### Verify Sequences

```bash
psql -U postgres -d song_nexus_dev -c '\ds'
```

Should show 10 sequences (one for each table's ID).

---

## 💾 Backup & Recovery

### Full Backup

```bash
# Create full backup
pg_dump -U postgres -d song_nexus_dev > backup.sql

# Compressed backup (recommended)
pg_dump -U postgres -d song_nexus_dev | gzip > backup_$(date +%Y%m%d_%H%M%S).sql.gz
```

### Backup Specific Tables

```bash
# Backup users and tracks only
pg_dump -U postgres -d song_nexus_dev -t users -t tracks > backup_users_tracks.sql
```

### Restore from Backup

```bash
# Restore from compressed backup
gunzip -c backup_20260105.sql.gz | psql -U postgres -d song_nexus_dev

# Or decompress first
gunzip backup_20260105.sql.gz
psql -U postgres -d song_nexus_dev -f backup_20260105.sql
```

### Automatic Daily Backups

```bash
#!/bin/bash
# File: /usr/local/bin/backup-db.sh

DB_NAME=song_nexus_dev
DB_USER=postgres
BACKUP_DIR=/var/backups/postgres
TIMESTAMP=$(date +"%Y%m%d_%H%M%S")

mkdir -p $BACKUP_DIR
pg_dump -U $DB_USER $DB_NAME | gzip > $BACKUP_DIR/backup_$TIMESTAMP.sql.gz

# Keep only last 30 days
find $BACKUP_DIR -name "backup_*.sql.gz" -mtime +30 -delete

echo "Backup completed: $BACKUP_DIR/backup_$TIMESTAMP.sql.gz"
```

```bash
# Add to crontab (daily at 2 AM)
crontab -e
# Add: 0 2 * * * /usr/local/bin/backup-db.sh
```

---

## ⚡ Performance Tips

### Query Optimization

1. **Always use indexes when filtering:**
   ```sql
   -- ✅ GOOD - Uses idx_users_email
   SELECT * FROM users WHERE email = 'user@example.com';
   
   -- ✅ GOOD - Uses idx_tracks_published_created_optimized
   SELECT * FROM tracks WHERE is_published = true AND is_deleted = false 
   ORDER BY created_at DESC LIMIT 20;
   
   -- ❌ BAD - Full table scan
   SELECT * FROM tracks WHERE description LIKE '%music%';
   ```

2. **Leverage partial indexes for soft deletes:**
   ```sql
   -- ✅ GOOD - Partial index helps
   SELECT * FROM tracks WHERE is_deleted = false AND genre = 'rock';
   ```

3. **Use LIMIT for pagination:**
   ```sql
   -- ✅ GOOD - Limit results
   SELECT * FROM play_history WHERE user_id = 1 ORDER BY played_at DESC LIMIT 50;
   
   -- ❌ BAD - Can return thousands of rows
   SELECT * FROM play_history WHERE user_id = 1;
   ```

### Connection Pooling

```javascript
// Node.js with pg library
const { Pool } = require('pg');

const pool = new Pool({
  max: 20,                    // Max connections
  idleTimeoutMillis: 30000,  // Idle timeout
  connectionTimeoutMillis: 2000
});
```

### Vacuum & Analyze

```bash
# Weekly maintenance
psql -U postgres -d song_nexus_dev -c "VACUUM ANALYZE;"
```

### Monitor Query Performance

```sql
-- Slow queries log
ALTER SYSTEM SET log_min_duration_statement = 1000;  -- Log queries >1s
SELECT pg_reload_conf();

-- Check slow query log
psql -U postgres -d song_nexus_dev -c "\o /tmp/queries.log"
```

---

## 🔐 Access Control

### User Roles

Database has two application roles:

1. **postgres** - Superuser (admin, schema creation)
2. **song_nexus_user** - Application user (read/write tables)

### Grant Permissions

```sql
-- All tables to song_nexus_user
GRANT ALL ON ALL TABLES IN SCHEMA public TO song_nexus_user;

-- All sequences to song_nexus_user
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO song_nexus_user;

-- Future tables/sequences
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON TABLES TO song_nexus_user;
ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public 
  GRANT ALL ON SEQUENCES TO song_nexus_user;
```

### Environment Variable

```env
# In .env files
DATABASE_URL=postgres://song_nexus_user:password@localhost:5432/song_nexus_dev
```

---

## 📚 Additional Resources

- **PostgreSQL Docs:** [postgresql.org/docs](https://www.postgresql.org/docs)
- **Schema File:** [schema.sql](./schema.sql)
- **README:** [README.md](./README.md)
- **Deployment Guide:** [PRODUCTION-DEPLOYMENT.md](./PRODUCTION-DEPLOYMENT.md)

---

**Last Updated:** January 5, 2026  
**Version:** 1.0.0  
**Status:** ✅ Production Ready