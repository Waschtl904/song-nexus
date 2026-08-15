-- ===========================================================================
-- Cleanup zu Issue #1: Accounts aus dem entfernten /api/auth/dev-login
-- ===========================================================================
--
-- Der Endpunkt legte bei jedem Aufruf einen User 'dev@localhost' mit
-- role = 'admin' an. Wurde die Anwendung jemals ueber ngrok oder einen
-- anderen oeffentlichen Tunnel erreichbar gemacht, koennen solche Accounts
-- auch von Dritten erzeugt worden sein.
--
-- Vor dem Ausfuehren ein Backup ziehen:
--     pg_dump -U <user> -d <db> -F c -f backup-vor-cleanup.dump
--
-- Ausfuehren:
--     psql -U <user> -d <db> -f migrations/2026-08-15_cleanup-dev-accounts.sql
-- ===========================================================================

BEGIN;

-- ---------------------------------------------------------------------------
-- SCHRITT 1: Bestandsaufnahme (nur lesen, nichts aendern)
-- Ergebnis pruefen, bevor Schritt 2 einkommentiert wird.
-- ---------------------------------------------------------------------------

-- 1a) Die bekannten Dev-Accounts
SELECT id, email, username, role, is_active, created_at
  FROM users
 WHERE email IN ('dev@localhost')
    OR username IN ('devuser', 'devadmin');

-- 1b) ALLE Admin-Accounts – hier gehoert nur dein eigener hinein.
--     Jeder unbekannte Eintrag ist ein Alarmsignal.
SELECT id, email, username, role, created_at
  FROM users
 WHERE role = 'admin'
 ORDER BY created_at;

-- 1c) Haben Dev-Accounts Spuren hinterlassen? Wenn ja, erst pruefen,
--     bevor geloescht wird (Fremdschluessel).
SELECT 'orders' AS tabelle, COUNT(*) AS anzahl
  FROM orders o
  JOIN users u ON u.id = o.user_id
 WHERE u.email = 'dev@localhost'
UNION ALL
SELECT 'play_history', COUNT(*)
  FROM play_history p
  JOIN users u ON u.id = p.user_id
 WHERE u.email = 'dev@localhost'
UNION ALL
SELECT 'webauthn_credentials', COUNT(*)
  FROM webauthn_credentials w
  JOIN users u ON u.id = w.user_id
 WHERE u.email = 'dev@localhost';

-- ---------------------------------------------------------------------------
-- SCHRITT 2: Entschaerfen
--
-- Bewusst NICHT sofort loeschen: ein DELETE kann an Fremdschluesseln
-- scheitern oder Kaufhistorie mitnehmen. Erst die Rechte entziehen und
-- deaktivieren – das stoppt jeden Zugriff sofort. Loeschen kann danach
-- in Ruhe erfolgen.
--
-- Zum Aktivieren die folgenden Zeilen einkommentieren.
-- ---------------------------------------------------------------------------

-- UPDATE users
--    SET role = 'user',
--        is_active = false,
--        password_hash = '!disabled-by-issue-1-cleanup'
--  WHERE email = 'dev@localhost'
--     OR username IN ('devuser', 'devadmin');

-- Zugehoerige WebAuthn-Credentials entfernen (sonst bleibt ein Login-Pfad offen):
-- DELETE FROM webauthn_credentials
--  WHERE user_id IN (SELECT id FROM users WHERE email = 'dev@localhost');

-- Offene Sessions/Tokens der Dev-Accounts invalidieren, falls solche
-- Tabellen vorhanden sind:
-- DELETE FROM magic_link_tokens
--  WHERE user_id IN (SELECT id FROM users WHERE email = 'dev@localhost');

-- ---------------------------------------------------------------------------
-- SCHRITT 3: Kontrolle
-- ---------------------------------------------------------------------------

-- SELECT id, email, username, role, is_active FROM users WHERE role = 'admin';

COMMIT;

-- ===========================================================================
-- WICHTIG, unabhaengig vom Ergebnis:
--
-- Falls die Instanz jemals oeffentlich erreichbar war, muss zusaetzlich das
-- JWT_SECRET rotiert werden (Issue #2). Ein bereits ausgestelltes Admin-Token
-- bleibt sonst bis zum Ablauf von JWT_EXPIRE (aktuell 7d) gueltig – das
-- Deaktivieren des Accounts allein entwertet ein ausgestelltes Token nicht,
-- solange die Middleware nur die Signatur prueft.
-- ===========================================================================
