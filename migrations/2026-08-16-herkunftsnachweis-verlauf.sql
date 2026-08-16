-- ============================================================================
-- Herkunftsnachweis: Aenderungsverlauf (Issue #80)
-- ============================================================================
-- In #80 stand die offene Frage: "Aenderungen an einem Beweismittel sollten
-- nachvollziehbar sein. Wenn ein Nachweis nachtraeglich geaendert werden kann,
-- ohne dass es auffaellt, ist er schwaecher."
--
-- ENTSCHIEDEN: eine anfuegende Verlaufstabelle mit Trigger, nicht Versionierung
-- der Hauptzeile.
--
-- Begruendung:
--   - `track_provenance` bleibt eine Zeile pro Titel. Wer den Nachweis lesen
--     will, liest eine Zeile. Kein "hole die neueste Fassung" an jeder Stelle.
--   - Der Verlauf haengt an einem TRIGGER und nicht an der Route. Damit wird er
--     auch dann geschrieben, wenn jemand mit psql direkt in die Tabelle
--     schreibt -- dieselbe Ueberlegung wie bei den Pruefbedingungen aus #78.
--     Eine Nachvollziehbarkeit, die sich durch Umgehen der Anwendung abschalten
--     laesst, ist keine.
--   - Vollstaendige alte und neue Zeile als jsonb. Damit ueberlebt der Verlauf
--     auch spaetere Spaltenaenderungen -- was bei #81 schon einmal noetig war.
--
-- BEWUSST OHNE FREMDSCHLUESSEL auf tracks. `track_provenance` haengt mit
-- ON DELETE CASCADE an `tracks`; der Verlauf soll das Loeschen aber UEBERLEBEN.
-- Gerade der Vorgang "Nachweis wurde geloescht" ist der interessanteste
-- Eintrag. Ein Fremdschluessel wuerde ihn mitloeschen.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.track_provenance_verlauf (
    id bigserial PRIMARY KEY,

    -- Absichtlich ohne Fremdschluessel, siehe Kopf.
    track_id integer NOT NULL,

    vorgang text NOT NULL,

    -- Setzt die Datenbank. Kommt nie aus einer Anfrage.
    geschehen_am timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,

    -- Wer es getan hat, sofern die Anwendung es mitgeteilt hat.
    -- Die Route setzt dazu vor dem Schreiben:
    --     SET LOCAL app.benutzer_id = '<id>'
    -- Bei einem Schreibzugriff ueber psql fehlt die Angabe und der Wert bleibt
    -- NULL. Das ist die richtige Antwort: unbekannt, nicht geraten.
    geaendert_von integer,

    alte_werte jsonb,
    neue_werte jsonb,

    CONSTRAINT track_provenance_verlauf_vorgang CHECK (
        vorgang IN ('einfuegen', 'aendern', 'loeschen')
    )
);

CREATE INDEX IF NOT EXISTS track_provenance_verlauf_track_idx
    ON public.track_provenance_verlauf (track_id, geschehen_am DESC);

-- ----------------------------------------------------------------------------
-- Der Trigger.
--
-- `current_setting('app.benutzer_id', true)` -- das zweite Argument sorgt
-- dafuer, dass eine fehlende Einstellung NULL ergibt und keinen Fehler wirft.
-- Ohne dieses `true` wuerde jeder direkte psql-Schreibzugriff abbrechen.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.track_provenance_verlauf_schreiben()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
    benutzer integer;
BEGIN
    BEGIN
        benutzer := nullif(current_setting('app.benutzer_id', true), '')::integer;
    EXCEPTION WHEN others THEN
        -- Ein unbrauchbarer Wert in der Einstellung darf den Schreibvorgang
        -- nicht verhindern. Dann eben unbekannt.
        benutzer := NULL;
    END;

    IF TG_OP = 'INSERT' THEN
        INSERT INTO public.track_provenance_verlauf
            (track_id, vorgang, geaendert_von, alte_werte, neue_werte)
        VALUES (NEW.track_id, 'einfuegen', benutzer, NULL, to_jsonb(NEW));
        RETURN NEW;

    ELSIF TG_OP = 'UPDATE' THEN
        -- Ein Schreibvorgang, der nichts aendert, erzeugt keinen Eintrag.
        IF to_jsonb(OLD) = to_jsonb(NEW) THEN
            RETURN NEW;
        END IF;
        INSERT INTO public.track_provenance_verlauf
            (track_id, vorgang, geaendert_von, alte_werte, neue_werte)
        VALUES (NEW.track_id, 'aendern', benutzer, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;

    ELSE
        INSERT INTO public.track_provenance_verlauf
            (track_id, vorgang, geaendert_von, alte_werte, neue_werte)
        VALUES (OLD.track_id, 'loeschen', benutzer, to_jsonb(OLD), NULL);
        RETURN OLD;
    END IF;
END
$$;

DROP TRIGGER IF EXISTS track_provenance_verlauf_trigger ON public.track_provenance;

CREATE TRIGGER track_provenance_verlauf_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.track_provenance
    FOR EACH ROW EXECUTE FUNCTION public.track_provenance_verlauf_schreiben();

-- ----------------------------------------------------------------------------
-- Rechte. Die Anwendung darf schreiben und lesen, aber NICHT loeschen oder
-- aendern -- der Verlauf ist anfuegend. Ohne DELETE und UPDATE kann eine
-- Schwachstelle in der Anwendung den Verlauf nicht bereinigen.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'song_nexus_user') THEN
        -- Erst alles entziehen, damit die Vorgaberechte aus schema_clean.sql
        -- (ALTER DEFAULT PRIVILEGES ... GRANT ALL) nicht durchschlagen.
        REVOKE ALL ON public.track_provenance_verlauf FROM song_nexus_user;
        GRANT SELECT, INSERT ON public.track_provenance_verlauf TO song_nexus_user;
        GRANT USAGE, SELECT ON SEQUENCE public.track_provenance_verlauf_id_seq
            TO song_nexus_user;
    ELSE
        RAISE NOTICE 'Rolle song_nexus_user nicht vorhanden - Rechtevergabe uebersprungen.';
    END IF;
END
$$;

COMMIT;

-- ============================================================================
-- Zum Nachsehen:
--
--   SELECT id, track_id, vorgang, geschehen_am, geaendert_von
--     FROM track_provenance_verlauf ORDER BY id;
--
--   SELECT privilege_type FROM information_schema.table_privileges
--    WHERE table_name = 'track_provenance_verlauf'
--      AND grantee = 'song_nexus_user' ORDER BY 1;
--
-- Erwartet werden dort genau INSERT und SELECT -- kein UPDATE, kein DELETE.
-- ============================================================================
