SET LOCAL search_path=public,pg_catalog;
-- Apply as the separate migration owner, before starting the new application.
ALTER TABLE users ADD COLUMN IF NOT EXISTS token_version integer NOT NULL DEFAULT 1;
CREATE OR REPLACE FUNCTION bump_token_version() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.password_hash IS DISTINCT FROM OLD.password_hash
     OR NEW.role IS DISTINCT FROM OLD.role OR NEW.is_active IS DISTINCT FROM OLD.is_active THEN
    NEW.token_version := OLD.token_version + 1;
  END IF;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS users_revoke_tokens ON users;
CREATE TRIGGER users_revoke_tokens BEFORE UPDATE ON users
FOR EACH ROW EXECUTE FUNCTION bump_token_version();
CREATE TABLE IF NOT EXISTS auth_sessions (
  id uuid PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_version integer NOT NULL, refresh_hash text UNIQUE NOT NULL,
  expires_at timestamptz NOT NULL, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS auth_sessions_user ON auth_sessions(user_id);
CREATE INDEX IF NOT EXISTS auth_sessions_expiry ON auth_sessions(expires_at);
CREATE TABLE IF NOT EXISTS web_sessions (
  sid varchar PRIMARY KEY, sess json NOT NULL, expire timestamp(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS web_sessions_expiry ON web_sessions(expire);
CREATE TABLE IF NOT EXISTS webauthn_challenges (
  session_id text NOT NULL, purpose text NOT NULL, challenge text NOT NULL,
  context jsonb NOT NULL DEFAULT '{}', expires_at timestamptz NOT NULL,
  PRIMARY KEY(session_id, purpose)
);
CREATE INDEX IF NOT EXISTS webauthn_challenges_expiry ON webauthn_challenges(expires_at);
CREATE TABLE IF NOT EXISTS download_tokens (
  token_hash text PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  track_id integer NOT NULL REFERENCES tracks(id) ON DELETE CASCADE,
  token_version integer NOT NULL, expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS download_tokens_expiry ON download_tokens(expires_at);
-- New hashed, purpose-bound tokens invalidate the old plaintext reset/link tokens.
CREATE TABLE IF NOT EXISTS account_links (
  token_hash text PRIMARY KEY, user_id integer NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose text NOT NULL CHECK (purpose IN ('reset','login')), token_version integer NOT NULL,
  expires_at timestamptz NOT NULL
);
CREATE INDEX IF NOT EXISTS account_links_expiry ON account_links(expires_at);

ALTER TABLE webauthn_credentials ALTER COLUMN counter TYPE bigint;
