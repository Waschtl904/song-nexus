-- 1️⃣ WebAuthn Credential zur users-Tabelle hinzufügen
ALTER TABLE users ADD COLUMN webauthn_credential JSONB;

-- 2️⃣ Magic Links Tabelle erstellen
CREATE TABLE magic_links (
  id SERIAL PRIMARY KEY,
  user_id INT NOT NULL,
  token VARCHAR(255) UNIQUE NOT NULL,
  expires_at TIMESTAMP,
  used_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
