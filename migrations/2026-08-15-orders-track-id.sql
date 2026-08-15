-- ============================================================================
-- orders.track_id ergänzen
-- ============================================================================
-- Die Tabelle orders speicherte Benutzer, PayPal-ID, Betrag, Währung,
-- Beschreibung und Status — aber NICHT, welcher Track bestellt wurde.
--
-- Beim Freischalten kam die track_id deshalb aus dem Anfragekörper des
-- Browsers. Geprüft wurde nur, ob die PayPal-Bestellung zum angemeldeten
-- Benutzer gehört. Damit waren bezahltes und freigeschaltetes Produkt nicht
-- miteinander verbunden: einen günstigen Track bestellen, bezahlen, und beim
-- Freischalten die ID eines teureren Tracks senden.
--
-- Mit dieser Spalte wird die Zuordnung beim Anlegen der Bestellung
-- festgeschrieben und beim Freischalten von dort gelesen.
--
-- Bewusst NULL erlaubt: Bestellungen, die vor dieser Änderung angelegt
-- wurden, haben keine track_id. Sie auf einen Wert zu zwingen würde Daten
-- erfinden. Der Code behandelt NULL ausdrücklich als Fehlerfall.

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS track_id INTEGER;

ALTER TABLE public.orders
  DROP CONSTRAINT IF EXISTS orders_track_id_fkey;

ALTER TABLE public.orders
  ADD CONSTRAINT orders_track_id_fkey
  FOREIGN KEY (track_id) REFERENCES public.tracks(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_orders_track_id ON public.orders(track_id);

-- Kontrolle
DO $$
DECLARE anzahl INTEGER;
BEGIN
  SELECT count(*) INTO anzahl
  FROM information_schema.columns
  WHERE table_name = 'orders' AND column_name = 'track_id';

  IF anzahl = 1 THEN
    RAISE NOTICE 'OK: orders.track_id vorhanden';
  ELSE
    RAISE EXCEPTION 'orders.track_id fehlt nach der Migration';
  END IF;
END $$;
