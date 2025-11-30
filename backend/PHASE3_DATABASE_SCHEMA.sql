-- ============================================================================
-- 🎵 SONG-NEXUS v6.0 - Phase 3: Database Schema
-- ============================================================================
-- Dieser SQL-Code erstellt alle Tabellen für Phase 3 Integration
-- Ausführung: psql -U postgres -d song_nexus_dev -f PHASE3_DATABASE_SCHEMA.sql

-- ============================================================================
-- 1️⃣ USERS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    role VARCHAR(50) DEFAULT 'user' CHECK (role IN ('user', 'admin')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_login TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

-- ============================================================================
-- 2️⃣ TRACKS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS tracks (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    artist VARCHAR(255) NOT NULL,
    genre VARCHAR(100),
    description TEXT,
    audio_filename VARCHAR(255) NOT NULL UNIQUE,
    duration_seconds INT,
    file_size_bytes BIGINT,
    price_eur DECIMAL(10, 2) DEFAULT 0.99,
    play_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_published BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_tracks_artist ON tracks(artist);
CREATE INDEX IF NOT EXISTS idx_tracks_genre ON tracks(genre);
CREATE INDEX IF NOT EXISTS idx_tracks_name ON tracks(name);

-- ============================================================================
-- 3️⃣ ORDERS / PAYMENTS TABLE
-- ============================================================================

CREATE TABLE IF NOT EXISTS orders (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    paypal_order_id VARCHAR(255) UNIQUE NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'EUR',
    description TEXT,
    status VARCHAR(50) DEFAULT 'CREATED' CHECK (status IN ('CREATED', 'APPROVED', 'COMPLETED', 'FAILED', 'CANCELLED')),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    completed_at TIMESTAMP,
    paypal_payer_email VARCHAR(255),
    paypal_payer_id VARCHAR(255),
    transaction_id VARCHAR(255)
);

CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_paypal_order_id ON orders(paypal_order_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

-- ============================================================================
-- 4️⃣ PURCHASES TABLE (User-Track Junction)
-- ============================================================================

CREATE TABLE IF NOT EXISTS purchases (
    id SERIAL PRIMARY KEY,
    user_id INT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    track_id INT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    order_id INT NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
    purchased_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    download_url VARCHAR(512),
    license_type VARCHAR(50) DEFAULT 'personal' CHECK (license_type IN ('personal', 'commercial', 'unlimited'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_purchases_user_track ON purchases(user_id, track_id);
CREATE INDEX IF NOT EXISTS idx_purchases_user_id ON purchases(user_id);
CREATE INDEX IF NOT EXISTS idx_purchases_track_id ON purchases(track_id);

-- ============================================================================
-- 5️⃣ PLAY_STATS TABLE (Tracking Listens)
-- ============================================================================

CREATE TABLE IF NOT EXISTS play_stats (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE CASCADE,
    track_id INT NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
    played_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    duration_played_seconds INT,
    session_id VARCHAR(255),
    device_type VARCHAR(50),
    is_paid_user BOOLEAN DEFAULT FALSE
);

CREATE INDEX IF NOT EXISTS idx_play_stats_track_id ON play_stats(track_id);
CREATE INDEX IF NOT EXISTS idx_play_stats_user_id ON play_stats(user_id);
CREATE INDEX IF NOT EXISTS idx_play_stats_played_at ON play_stats(played_at);

-- ============================================================================
-- 6️⃣ AUDIT LOG TABLE (für Admin Dashboard später)
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    user_id INT REFERENCES users(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100),
    entity_id INT,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    ip_address INET
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- ============================================================================
-- ✅ SEED DATA (für Testing)
-- ============================================================================

INSERT INTO users (email, username, password_hash, role, is_active)
VALUES (
    'admin@song-nexus.local',
    'admin',
    '$2a$10$dXJ3SW6G7P50eS3qsqQ1Le0DH1j4ysKYO1eJ5V6p6KyKfUNlVakyC',
    'admin',
    TRUE
)
ON CONFLICT DO NOTHING;

INSERT INTO tracks (name, artist, genre, description, audio_filename, price_eur, is_published)
VALUES (
    'The Spell',
    'Song-Nexus AI',
    'metal',
    'Ein experimentelles Metal-Stück mit KI-Generierung',
    'THE SPELL.mp3',
    0.99,
    TRUE
)
ON CONFLICT DO NOTHING;

-- ============================================================================
-- 📊 VIEWS für einfachere Queries
-- ============================================================================

CREATE OR REPLACE VIEW user_stats_view AS
SELECT 
    u.id,
    u.username,
    COUNT(DISTINCT p.id) as total_purchases,
    COUNT(DISTINCT ps.id) as total_plays,
    SUM(o.amount) as total_spent,
    MAX(o.completed_at) as last_purchase
FROM users u
LEFT JOIN purchases p ON u.id = p.user_id
LEFT JOIN play_stats ps ON u.id = ps.user_id
LEFT JOIN orders o ON p.order_id = o.id AND o.status = 'COMPLETED'
GROUP BY u.id, u.username;

CREATE OR REPLACE VIEW track_stats_view AS
SELECT 
    t.id,
    t.name,
    t.artist,
    COUNT(DISTINCT ps.id) as total_plays,
    COUNT(DISTINCT p.user_id) as total_purchases,
    SUM(o.amount) as total_revenue
FROM tracks t
LEFT JOIN play_stats ps ON t.id = ps.track_id
LEFT JOIN purchases p ON t.id = p.track_id
LEFT JOIN orders o ON p.order_id = o.id AND o.status = 'COMPLETED'
GROUP BY t.id, t.name, t.artist;

-- ============================================================================
-- ✅ FERTIG! Die Datenbank ist jetzt ready für Phase 3
-- ============================================================================
