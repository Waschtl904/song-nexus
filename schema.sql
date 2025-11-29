-- ============================================================================
-- 📊 DATABASE SCHEMA FOR SONG-NEXUS v6.0
-- ============================================================================

-- Create users table
CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  username VARCHAR(50) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

-- Create tracks table
CREATE TABLE IF NOT EXISTS tracks (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  artist VARCHAR(255) NOT NULL,
  genre VARCHAR(100),
  description TEXT,
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
  played_at TIMESTAMP DEFAULT NOW(),
  duration_seconds INTEGER
);

-- Create indexes for performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_paypal_order_id ON orders(paypal_order_id);
CREATE INDEX idx_play_history_user_id ON play_history(user_id);
CREATE INDEX idx_play_history_track_id ON play_history(track_id);

-- Add audit logging
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
