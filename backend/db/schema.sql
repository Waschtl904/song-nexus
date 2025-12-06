-- ============================================================================
-- 📊 DATABASE SCHEMA FOR SONG-NEXUS v6.0 (mit WebAuthn & Magic Link)
-- ============================================================================

-- ✅ EXISTIERENDE TABELLEN (unverändert)

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW(),
  
  -- 🔐 NEU: WebAuthn Support
  webauthn_credential JSONB
);


-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  description TEXT,
  price DECIMAL(10, 2) DEFAULT 0.00,
  is_free BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT NOW()
);


-- Create orders table (for Paypal transactions)
CREATE TABLE IF NOT EXISTS orders (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
  amount DECIMAL(10, 2) NOT NULL,
  description VARCHAR(255),
  status VARCHAR(50) DEFAULT 'CREATED',
  created_at TIMESTAMP DEFAULT NOW(),
  completed_at TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);


-- Create play_history table (for analytics)
CREATE TABLE IF NOT EXISTS play_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id),
  name VARCHAR(255),
  artist VARCHAR(255),
  played_at TIMESTAMP DEFAULT NOW(),
  duration_seconds INTEGER
);


-- ========================================================================
-- 🆕 NEUE TABELLEN FÜR WEBAUTHN & MAGIC LINK
-- ========================================================================

-- Magic Links Table (für Email-basiertes Login)
CREATE TABLE IF NOT EXISTS magic_links (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  used_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);


-- WebAuthn Credentials Table (für Fingerprint/Face)
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  credential_id VARCHAR(255) UNIQUE NOT NULL,
  public_key BYTEA NOT NULL,
  counter INTEGER DEFAULT 0,
  transports TEXT[],
  created_at TIMESTAMP DEFAULT NOW(),
  last_used TIMESTAMP
);


-- ========================================================================
-- 🔍 INDEXES FÜR PERFORMANCE
-- ========================================================================

-- Bestehende Indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_play_history_user_id ON play_history(user_id);
CREATE INDEX IF NOT EXISTS idx_play_history_track_id ON play_history(track_id);

-- 🆕 Neue Indexes für WebAuthn & Magic Link
CREATE INDEX IF NOT EXISTS idx_magic_links_user_id ON magic_links(user_id);
CREATE INDEX IF NOT EXISTS idx_magic_links_token ON magic_links(token);
CREATE INDEX IF NOT EXISTS idx_magic_links_expires ON magic_links(expires_at);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_user_id ON webauthn_credentials(user_id);
CREATE INDEX IF NOT EXISTS idx_webauthn_credentials_id ON webauthn_credentials(credential_id);


-- ========================================================================
-- 📝 AUDIT LOGGING
-- ========================================================================

CREATE TABLE IF NOT EXISTS audit_log (
  id SERIAL PRIMARY KEY,
  user_id INTEGER,
  action VARCHAR(100) NOT NULL,
  resource VARCHAR(100),
  resource_id INTEGER,
  details JSONB,
  ip_address INET,
  user_agent TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);


-- ========================================================================
-- 🎵 PURCHASES TABLE (für gekaufte Tracks)
-- ========================================================================

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id INTEGER NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  price DECIMAL(10, 2) NOT NULL,
  purchase_date TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, track_id)
);

CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_track_id ON purchases(track_id);


-- ========================================================================
-- ✅ MIGRATIONS COMPLETE
-- ========================================================================
-- Diese Datei ist jetzt ready für:
-- 1. WebAuthn (Fingerprint/Face Login)
-- 2. Magic Link (Email-basiertes Login)
-- 3. Purchases (Track-Verwaltung)
-- 4. Audit Logging (Security)
-- ========================================================================