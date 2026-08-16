-- ============================================================================
-- Herkunftsnachweis pro Titel (Issue #78)
-- ============================================================================
-- Die Musik der Titel ist KI-erzeugt und damit voraussichtlich nicht
-- urheberrechtlich schutzfaehig. Schutzfaehig sein KANN der Liedtext -- aber
-- nur, wenn er von einem Menschen stammt.
--
-- Der deutsche Originaltext wird selbst geschrieben, die Uebertragung ins
-- Englische uebernimmt eine KI. Nach § 5 Abs 1 UrhG bleibt das Urheberrecht
-- am bearbeiteten Werk davon unberuehrt.
--
-- Der Haken ist der Nachweis: ein deutscher Text, der nachtraeglich
-- geschrieben wird, ist als Beweis wertlos. Er muss VOR der Erzeugung der
-- Musik existieren und datierbar sein. Genau das haelt diese Tabelle fest.
--
-- Bewusst eine eigene Tabelle und keine Spalten an `tracks`:
--   1. Es ist ein Beweismittel mit eigener Lebensdauer, kein Anzeigefeld.
--   2. Nicht jeder Titel wird einen Nachweis haben. Zehn ueberwiegend leere
--      Spalten an `tracks` waeren das falsche Werkzeug.
--   3. `tracks` wird bei jedem Seitenaufruf gelesen. Der Nachweis fast nie.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- ============================================================================

BEGIN;

CREATE TABLE IF NOT EXISTS public.track_provenance (
    -- 1:1 zu tracks. PRIMARY KEY auf der Fremdschluesselspalte erzwingt das,
    -- ohne dass es eine zusaetzliche eindeutige Bedingung braucht.
    track_id integer PRIMARY KEY
        REFERENCES public.tracks(id) ON DELETE CASCADE,

    -- Der Text, wie er geschrieben wurde. Unveraendert, mit Zeilenumbruechen.
    text_original text,

    -- Sprache des Originals. Kleingeschriebener Zweibuchstabencode.
    text_sprache character varying(8) NOT NULL DEFAULT 'de',

    -- Der rechtlich entscheidende Wert: wann der Text entstand.
    -- Absichtlich `date` und nicht `timestamp`. Eine Uhrzeit wuerde eine
    -- Genauigkeit vorgeben, die niemand belegen kann.
    text_erstellt_am date,

    -- SHA-256 ueber den NORMALISIERTEN Text, serverseitig berechnet.
    -- Ein vom Browser mitgeschickter Hashwert wird verworfen -- sonst waere
    -- der Nachweis faelschbar: Text A speichern, Hashwert von Text B senden.
    text_sha256 character(64),

    -- Erklaerung des Eigentuemers, dass der Text selbst formuliert wurde.
    -- Keine Tatsachenfeststellung, eine Angabe. Deshalb der Vorgabewert false.
    text_ist_eigenes_werk boolean NOT NULL DEFAULT false,

    -- Welcher Dienst die Musik erzeugte, und wann.
    musik_dienst character varying(40),
    musik_erzeugt_am date,

    -- Welche Fassung der Nutzungsbedingungen damals galt. Die Erlaubnis zur
    -- Vermarktung stuetzt sich allein darauf, und die Bedingungen aendern sich.
    musik_agb_fassung character varying(40),

    -- 128-Bit-Kennung des Wasserzeichens aus #77, als 32 Hexzeichen.
    wasserzeichen_id character varying(32),

    notiz text,

    -- Setzt der Server. Kommt nie aus der Anfrage.
    erfasst_am timestamp without time zone NOT NULL DEFAULT CURRENT_TIMESTAMP,
    erfasst_von integer REFERENCES public.users(id),

    -- ------------------------------------------------------------------------
    -- Pruefbedingungen als zweite Verteidigungslinie.
    -- Die Anwendung prueft dasselbe in utils/herkunftsnachweis.js. Diese
    -- Bedingungen greifen auch dann, wenn jemand mit psql direkt schreibt.
    -- ------------------------------------------------------------------------

    -- Der Text muss vor der Musik da gewesen sein. Das ist der Kern des
    -- Nachweises, deshalb steht er auch in der Datenbank.
    CONSTRAINT track_provenance_reihenfolge CHECK (
        text_erstellt_am IS NULL
        OR musik_erzeugt_am IS NULL
        OR text_erstellt_am <= musik_erzeugt_am
    ),

    -- Wer erklaert, der Text sei sein eigenes Werk, muss Text, Hashwert und
    -- Datum liefern. Eine Erklaerung ohne Beleg ist keine.
    CONSTRAINT track_provenance_eigenes_werk_braucht_beleg CHECK (
        text_ist_eigenes_werk = false
        OR (
            text_original IS NOT NULL
            AND text_sha256 IS NOT NULL
            AND text_erstellt_am IS NOT NULL
        )
    ),

    -- Hashwert nur als 64 Hexzeichen in Kleinschreibung.
    CONSTRAINT track_provenance_sha256_hex CHECK (
        text_sha256 IS NULL OR text_sha256 ~ '^[0-9a-f]{64}$'
    ),

    -- Wasserzeichen-Kennung nur als 32 Hexzeichen in Kleinschreibung.
    CONSTRAINT track_provenance_wasserzeichen_hex CHECK (
        wasserzeichen_id IS NULL OR wasserzeichen_id ~ '^[0-9a-f]{32}$'
    ),

    -- Sprache als Zweibuchstabencode in Kleinschreibung.
    CONSTRAINT track_provenance_sprache_form CHECK (
        text_sprache ~ '^[a-z]{2}$'
    )
);

-- Zum Nachschlagen einer gefundenen Datei anhand ihrer Wasserzeichen-Kennung.
-- Genau der Vorgang aus #77: fremde Datei einlesen, Kennung auslesen, Titel
-- bestimmen. Ohne diesen Index waere das ein vollstaendiger Tabellendurchlauf.
CREATE INDEX IF NOT EXISTS track_provenance_wasserzeichen_idx
    ON public.track_provenance (wasserzeichen_id)
    WHERE wasserzeichen_id IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Rechtevergabe.
--
-- ACHTUNG, hier stand zuerst eine falsche Begruendung: dass die Anwendung die
-- neue Tabelle ohne diese Vergabe nicht lesen koenne. Das ist NICHT der Fall.
-- schema_clean.sql setzt in Zeile 365:
--
--   ALTER DEFAULT PRIVILEGES FOR ROLE postgres IN SCHEMA public
--       GRANT ALL ON TABLES TO song_nexus_user;
--
-- Neue Tabellen, die `postgres` in diesem Schema anlegt, bekommen die Rechte
-- fuer `song_nexus_user` also automatisch. An einer Testdatenbank nachgesehen:
-- die Rolle hatte nach der Migration SELECT, INSERT, UPDATE, DELETE und drei
-- weitere Rechte, auch ohne die Zeilen unten.
--
-- Die Vergabe bleibt trotzdem stehen, aber aus einem anderen Grund: die
-- Vorgaberechte haengen an `FOR ROLE postgres`. Wer die Migration als eine
-- andere Rolle einspielt -- etwa als eigener Superuser auf dem Server --
-- erzeugt eine Tabelle ohne diese Rechte, und die Anwendung koennte sie dann
-- tatsaechlich nicht lesen. Die Vergabe kostet nichts und deckt diesen Fall ab.
--
-- In einen DO-Block gefasst, damit die Migration nicht abbricht, wenn die
-- Rolle in einer bestimmten Umgebung anders heisst oder fehlt. Auch das ist
-- erprobt: bei fehlender Rolle kommt ein NOTICE und kein Fehler.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'song_nexus_user') THEN
        GRANT SELECT, INSERT, UPDATE, DELETE
            ON public.track_provenance TO song_nexus_user;
    ELSE
        RAISE NOTICE 'Rolle song_nexus_user nicht vorhanden - Rechtevergabe uebersprungen.';
    END IF;
END
$$;

COMMIT;

-- ============================================================================
-- Zum Nachsehen, ob es gewirkt hat:
--
--   \d public.track_provenance
--
--   SELECT conname FROM pg_constraint
--    WHERE conrelid = 'public.track_provenance'::regclass;
--
-- Erwartet werden fuenf Pruefbedingungen, ein Primaerschluessel und ein
-- Fremdschluessel je auf tracks und users.
-- ============================================================================
