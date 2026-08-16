-- ============================================================================
-- Herkunftsnachweis: Entstehungsdatum als Spanne (Issue #81)
-- ============================================================================
-- Entwurfsfehler aus #78, aufgefallen am ersten echten Anwendungsfall.
--
-- Die Gedichte, die als Textgrundlage dienen, sind alt. Beim ersten lautet die
-- Angabe des Autors: "so ca. 2010 oder 2011".
--
-- Die Spalte `text_erstellt_am` war eine `date`-Spalte und verlangte damit
-- einen Tag. Den gibt es nicht. Wer "2010 oder 2011" als 2010-01-01 eintraegt,
-- ERFINDET Daten -- genau das, was die Migration zu orders.track_id
-- ausdruecklich als das schlechtere Vorgehen bezeichnet hat. Ein erfundener Tag
-- in einem Beweismittel ist schlimmer als eine ehrliche Unschaerfe, weil er bei
-- genauem Hinsehen die Glaubwuerdigkeit des ganzen Datensatzes beschaedigt.
--
-- Rechtlich gebraucht wird der Tag ohnehin nicht. Gebraucht wird die Aussage:
-- der Text existierte NICHT SPAETER ALS X. Nur die obere Grenze zaehlt, weil
-- sie vor der Erzeugung der Musik liegen muss.
--
-- Deshalb:
--   text_erstellt_am        ->  text_erstellt_spaeteste   (rechtlich maßgeblich)
--   neu                     ->  text_erstellt_frueheste   (optional, Unschaerfe)
--
-- "2010 oder 2011" heißt dann: frueheste 2010-01-01, spaeteste 2011-12-31.
-- Beides vor jedem Erzeugungsdatum, und damit vollstaendig ausreichend.
--
-- Die Tabelle ist neu und leer, es gehen keine Daten verloren.
--
-- Idempotent: kann mehrfach ausgefuehrt werden.
-- ============================================================================

BEGIN;

-- Erst die betroffenen Pruefbedingungen weg. Auch `track_provenance_spanne`,
-- damit ein zweiter Durchlauf nicht an einer schon vorhandenen scheitert.
ALTER TABLE public.track_provenance
    DROP CONSTRAINT IF EXISTS track_provenance_reihenfolge,
    DROP CONSTRAINT IF EXISTS track_provenance_eigenes_werk_braucht_beleg,
    DROP CONSTRAINT IF EXISTS track_provenance_spanne;

-- Umbenennen. In einen DO-Block gefasst, weil RENAME COLUMN kein IF EXISTS
-- kennt und ein zweiter Durchlauf sonst abbrechen wuerde.
DO $$
BEGIN
    IF EXISTS (
        SELECT 1 FROM information_schema.columns
         WHERE table_schema = 'public'
           AND table_name = 'track_provenance'
           AND column_name = 'text_erstellt_am'
    ) THEN
        ALTER TABLE public.track_provenance
            RENAME COLUMN text_erstellt_am TO text_erstellt_spaeteste;
        RAISE NOTICE 'Spalte text_erstellt_am umbenannt zu text_erstellt_spaeteste.';
    ELSE
        RAISE NOTICE 'text_erstellt_am nicht vorhanden - Umbenennung uebersprungen.';
    END IF;
END
$$;

-- Die untere Grenze der Spanne. Bewusst optional: wer den Tag genau kennt,
-- traegt nur die obere Grenze ein, und dann ist der Wert eben genau.
ALTER TABLE public.track_provenance
    ADD COLUMN IF NOT EXISTS text_erstellt_frueheste date;

COMMENT ON COLUMN public.track_provenance.text_erstellt_spaeteste IS
    'Spaetester Zeitpunkt, zu dem der Text existierte. Der rechtlich maßgebliche Wert: er muss vor musik_erzeugt_am liegen.';
COMMENT ON COLUMN public.track_provenance.text_erstellt_frueheste IS
    'Fruehester moeglicher Zeitpunkt. Optional, nur um eine Unschaerfe ehrlich abzubilden ("irgendwann 2010 oder 2011").';

-- Pruefbedingungen neu, jetzt auf der Spanne.
ALTER TABLE public.track_provenance
    -- Der Text muss vor der Musik da gewesen sein. Maßgeblich ist die OBERE
    -- Grenze: wenn der Text spaetestens am 31.12.2011 existierte und die Musik
    -- 2026 erzeugt wurde, ist die Reihenfolge belegt, ohne einen Tag zu kennen.
    ADD CONSTRAINT track_provenance_reihenfolge CHECK (
        text_erstellt_spaeteste IS NULL
        OR musik_erzeugt_am IS NULL
        OR text_erstellt_spaeteste <= musik_erzeugt_am
    ),

    -- Eine Spanne, die verkehrt herum liegt, ist keine Angabe, sondern ein
    -- Tippfehler.
    ADD CONSTRAINT track_provenance_spanne CHECK (
        text_erstellt_frueheste IS NULL
        OR text_erstellt_spaeteste IS NULL
        OR text_erstellt_frueheste <= text_erstellt_spaeteste
    ),

    -- Unveraendert in der Sache, nur auf den neuen Spaltennamen bezogen.
    ADD CONSTRAINT track_provenance_eigenes_werk_braucht_beleg CHECK (
        text_ist_eigenes_werk = false
        OR (
            text_original IS NOT NULL
            AND text_sha256 IS NOT NULL
            AND text_erstellt_spaeteste IS NOT NULL
        )
    );

COMMIT;

-- ============================================================================
-- Zum Nachsehen:
--
--   \d public.track_provenance
--
-- Erwartet werden text_erstellt_spaeteste und text_erstellt_frueheste, KEIN
-- text_erstellt_am mehr, und sechs Pruefbedingungen statt fuenf.
-- ============================================================================
