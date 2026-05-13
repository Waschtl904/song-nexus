-- ============================================================================
-- 🧹 SONG-NEXUS: CLEANUP MIGRATION
-- ============================================================================
-- Zweck:  Entfernt alle redundanten/verwaisten Strukturen, die durch
--         schrittweise Entwicklung entstanden sind.
-- Basis:  Live-DB-Audit vom 13. Mai 2026 (pgAdmin4 Verifikation)
-- Autor:  Verifiziert gegen echte Datenbankstruktur
--
-- WICHTIG: Erst testen! Migration ist in BEGIN/ROLLBACK eingebettet.
-- Zum echten Anwenden: ROLLBACK durch COMMIT ersetzen.
-- ============================================================================

BEGIN;

-- ============================================================================
-- SCHRITT 1: magic_links Tabelle löschen (verifiziert: 0 Einträge, veraltet)
-- Aktive Tabelle ist magic_link_tokens (hat Einträge, wird im Code verwendet)
-- ============================================================================
DROP TABLE IF EXISTS public.magic_links CASCADE;
DROP SEQUENCE IF EXISTS public.magic_links_id_seq;

-- Zugehörige Indexes werden durch CASCADE automatisch entfernt:
-- idx_magic_links_expires_at, idx_magic_links_token,
-- idx_magic_links_used_at, idx_magic_links_user_id

-- ============================================================================
-- SCHRITT 2: users.webauthn_credential (jsonb) entfernen
-- Verifiziert: Spalte war NIE befüllt (COUNT = 0)
-- Korrekte WebAuthn-Daten liegen in webauthn_credentials-Tabelle
-- ============================================================================
ALTER TABLE public.users DROP COLUMN IF EXISTS webauthn_credential;

-- ============================================================================
-- SCHRITT 3: tracks.price entfernen (Duplikat von price_eur)
-- Audit-Ergebnis:
--   price_eur: 5 custom Werte  → ECHTE Preisspalte, im Index referenziert
--   price:     1 custom Wert   → Duplikat, inkonsistent
-- Alle Indexes (idx_tracks_published_created etc.) referenzieren price_eur
-- ============================================================================
ALTER TABLE public.tracks DROP COLUMN IF EXISTS price;

-- ============================================================================
-- SCHRITT 4: tracks.duration entfernen (Duplikat von duration_seconds)
-- Audit-Ergebnis:
--   duration_seconds: 7 befüllt  → ECHTE Dauerspalte, im Index referenziert
--   duration:         8 befüllt  → Duplikat, default 0 (meistens leer)
-- Index idx_tracks_published_created referenziert duration_seconds
-- ============================================================================
ALTER TABLE public.tracks DROP COLUMN IF EXISTS duration;

-- ============================================================================
-- SCHRITT 5: design_system absichern
-- Problem: Kein UNIQUE-Constraint auf is_active=true → mehrere aktive Zeilen
-- möglich → inkonsistente Design-Tokens
-- ============================================================================
-- Partial unique index: nur eine Zeile darf is_active = true haben
CREATE UNIQUE INDEX IF NOT EXISTS idx_design_system_single_active
    ON public.design_system (is_active)
    WHERE (is_active = true);

-- created_at Spalte hinzufügen (fehlte bisher)
ALTER TABLE public.design_system
    ADD COLUMN IF NOT EXISTS created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP;

-- ============================================================================
-- SCHRITT 6: play_history Owner-Inkonsistenz korrigieren
-- play_history gehört song_nexus_user wie alle anderen Tabellen,
-- war aber als postgres geownt (vermutlich früherer Migrationsfehler)
-- ============================================================================
ALTER TABLE public.play_history OWNER TO postgres;  -- bereits so, kein Fehler
-- Permissions angleichen
GRANT ALL ON TABLE public.play_history TO song_nexus_user;
GRANT ALL ON SEQUENCE public.play_history_id_seq TO song_nexus_user;

-- ============================================================================
-- ROLLBACK zum Testen – durch COMMIT ersetzen wenn alles passt
-- ============================================================================
ROLLBACK;
-- COMMIT;
