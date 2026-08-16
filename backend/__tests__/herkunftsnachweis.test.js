/**
 * Tests des Herkunftsnachweises (Issue #78).
 *
 * Die Sicherheitsfälle stehen vorn, weil der Datensatz ein Beweismittel ist.
 * Wenn der Browser den Hashwert oder den erfassenden Benutzer setzen kann,
 * beweist er nichts mehr — und das würde man an einem fehlgeschlagenen Test
 * gern sofort sehen und nicht erst vor Gericht.
 *
 * Alle Datumsvergleiche laufen gegen ein festes `heute`. Sonst wären die Tests
 * morgen anders als heute.
 */

const {
  MIN_TEXT_LAENGE,
  MAX_TEXT_LAENGE,
  FRUEHESTES_DATUM,
  DIENSTE,
  normalisiereText,
  textHash,
  istDatum,
  pruefeHerkunft,
  baueDatensatz,
} = require('../utils/herkunftsnachweis');

const HEUTE = '2026-08-16';

/** Ein Text, der die Mindestlänge sicher überschreitet. */
const TEXT =
  'Im Gitter der Primzahlen sucht ein Beweis seinen Weg,\n' +
  'zwischen Nullstellen und einer Vermutung, die nicht schweigt.\n' +
  'Fünf Ecken ohne Wiederholung, ein Muster ohne Mitte.';

/** Eine Eingabe, die durchgehen muss. Grundlage für die Abwandlungen. */
function gueltig(aenderungen = {}) {
  return {
    track_id: 7,
    text_original: TEXT,
    text_sprache: 'de',
    text_erstellt_spaeteste: '2026-08-01',
    text_ist_eigenes_werk: true,
    musik_dienst: 'suno',
    musik_erzeugt_am: '2026-08-05',
    musik_agb_fassung: '2026-07',
    wasserzeichen_id: 'a3f19c0d4b7e2856f10932ab5cd7e401',
    notiz: 'Erste Fassung.',
    ...aenderungen,
  };
}

const pruefe = (e) => pruefeHerkunft(e, { heute: HEUTE });

describe('Herkunftsnachweis', () => {
  // ==========================================================================
  describe('SICHERHEIT: wer kann diesen Wert setzen?', () => {
    test('ein mitgesendeter text_sha256 wird abgelehnt', () => {
      const fehler = pruefe(gueltig({ text_sha256: 'f'.repeat(64) }));
      expect(fehler.join(' ')).toMatch(/text_sha256/);
    });

    test('ein mitgesendetes erfasst_von wird abgelehnt', () => {
      const fehler = pruefe(gueltig({ erfasst_von: 1 }));
      expect(fehler.join(' ')).toMatch(/erfasst_von/);
    });

    test('ein mitgesendetes erfasst_am wird abgelehnt', () => {
      const fehler = pruefe(gueltig({ erfasst_am: '2020-01-01T00:00:00' }));
      expect(fehler.join(' ')).toMatch(/erfasst_am/);
    });

    test('ein unbekanntes Feld wird abgelehnt und nicht stillschweigend verworfen', () => {
      const fehler = pruefe(gueltig({ text_orginal: 'Tippfehler im Feldnamen' }));
      expect(fehler.join(' ')).toMatch(/Unbekanntes Feld/);
    });

    test('baueDatensatz berechnet den Hashwert selbst', () => {
      const { fehler, datensatz } = baueDatensatz(gueltig(), {
        benutzerId: 3,
        heute: HEUTE,
      });
      expect(fehler).toEqual([]);
      expect(datensatz.text_sha256).toBe(textHash(TEXT));
    });

    test('baueDatensatz verweigert ohne Benutzer aus dem Token', () => {
      const { fehler, datensatz } = baueDatensatz(gueltig(), { heute: HEUTE });
      expect(datensatz).toBeNull();
      expect(fehler.join(' ')).toMatch(/erfasst_von/);
    });

    test('baueDatensatz übernimmt erfasst_von nicht aus der Eingabe', () => {
      const { datensatz } = baueDatensatz(gueltig(), { benutzerId: 42, heute: HEUTE });
      expect(datensatz.erfasst_von).toBe(42);
    });
  });

  // ==========================================================================
  describe('Die Reihenfolge, auf die es rechtlich ankommt', () => {
    test('Text vor Musik wird angenommen', () => {
      expect(
        pruefe(gueltig({ text_erstellt_spaeteste: '2026-08-01', musik_erzeugt_am: '2026-08-05' }))
      ).toEqual([]);
    });

    test('Text am selben Tag wie die Musik wird angenommen', () => {
      expect(
        pruefe(gueltig({ text_erstellt_spaeteste: '2026-08-05', musik_erzeugt_am: '2026-08-05' }))
      ).toEqual([]);
    });

    test('Text NACH der Musik wird abgelehnt', () => {
      const fehler = pruefe(
        gueltig({ text_erstellt_spaeteste: '2026-08-06', musik_erzeugt_am: '2026-08-05' })
      );
      expect(fehler.join(' ')).toMatch(/vor der Erzeugung der Musik/);
    });
  });

  // ==========================================================================
  describe('Unscharfe Entstehungszeit (#81)', () => {
    // Der Anlassfall: ein Gedicht, geschrieben "so ca. 2010 oder 2011".
    // Genau dieser Fall wurde von der ersten Fassung abgewiesen, weil das
    // Fruehestdatum bei 2023-01-01 lag und die Spalte einen Tag verlangte.
    test('REGRESSION: ein Gedicht von 2010 oder 2011 wird angenommen', () => {
      expect(
        pruefe(
          gueltig({
            text_erstellt_frueheste: '2010-01-01',
            text_erstellt_spaeteste: '2011-12-31',
            musik_erzeugt_am: '2026-08-05',
          })
        )
      ).toEqual([]);
    });

    test('nur die obere Grenze genuegt — wer den Tag kennt, braucht keine Spanne', () => {
      const e = gueltig({ text_erstellt_spaeteste: '2011-12-31' });
      expect(pruefe(e)).toEqual([]);
    });

    test('eine verkehrt herum liegende Spanne wird abgelehnt', () => {
      const fehler = pruefe(
        gueltig({ text_erstellt_frueheste: '2012-01-01', text_erstellt_spaeteste: '2011-12-31' })
      );
      expect(fehler.join(' ')).toMatch(/liegt nach text_erstellt_spaeteste/);
    });

    test('gleiche Grenzen sind eine gueltige Spanne', () => {
      expect(
        pruefe(
          gueltig({ text_erstellt_frueheste: '2011-12-31', text_erstellt_spaeteste: '2011-12-31' })
        )
      ).toEqual([]);
    });

    test('eine untere Grenze ohne obere wird abgelehnt', () => {
      const e = gueltig({ text_erstellt_frueheste: '2010-01-01' });
      delete e.text_erstellt_spaeteste;
      const fehler = pruefe(e);
      expect(fehler.join(' ')).toMatch(/ohne text_erstellt_spaeteste/);
    });

    test('das alte Feld text_erstellt_am nennt seinen neuen Namen', () => {
      const e = gueltig({ text_erstellt_am: '2011-12-31' });
      const fehler = pruefe(e);
      expect(fehler.join(' ')).toMatch(/heißt jetzt "text_erstellt_spaeteste"/);
      expect(fehler.join(' ')).not.toMatch(/Unbekanntes Feld/);
    });
  });

  // ==========================================================================
  describe('Normalisierung des Textes', () => {
    test('Windows- und Unix-Zeilenenden ergeben denselben Hashwert', () => {
      const unix = 'Erste Zeile\nZweite Zeile';
      const windows = 'Erste Zeile\r\nZweite Zeile';
      expect(textHash(windows)).toBe(textHash(unix));
    });

    test('altes Mac-Zeilenende ergibt denselben Hashwert', () => {
      expect(textHash('Erste Zeile\rZweite Zeile')).toBe(textHash('Erste Zeile\nZweite Zeile'));
    });

    test('Leerzeichen am Zeilenende ändern den Hashwert nicht', () => {
      expect(textHash('Zeile   \nZweite')).toBe(textHash('Zeile\nZweite'));
    });

    test('zusammengesetzte und vorkomponierte Umlaute ergeben denselben Hashwert', () => {
      const vorkomponiert = 'Fünf Ecken';
      const zusammengesetzt = 'Fu\u0308nf Ecken';
      expect(vorkomponiert).not.toBe(zusammengesetzt);
      expect(textHash(zusammengesetzt)).toBe(textHash(vorkomponiert));
    });

    test('Leerzeilen im Text bleiben erhalten und ändern den Hashwert', () => {
      expect(textHash('Strophe\n\nStrophe')).not.toBe(textHash('Strophe\nStrophe'));
    });

    test('Leerraum am Anfang und Ende fällt weg', () => {
      expect(normalisiereText('\n\n  Text  \n\n')).toBe('Text');
    });

    test('ein anderer Text ergibt einen anderen Hashwert', () => {
      expect(textHash('Text A')).not.toBe(textHash('Text B'));
    });

    test('der Hashwert besteht aus 64 Hexzeichen in Kleinschreibung', () => {
      expect(textHash(TEXT)).toMatch(/^[0-9a-f]{64}$/);
    });

    test('normalisiereText verträgt Nicht-Zeichenketten', () => {
      expect(normalisiereText(null)).toBe('');
      expect(normalisiereText(undefined)).toBe('');
      expect(normalisiereText(42)).toBe('');
    });
  });

  // ==========================================================================
  describe('Datumsprüfung', () => {
    test('ein gültiges Datum wird erkannt', () => {
      expect(istDatum('2026-08-16')).toBe(true);
    });

    test('der 31. Februar passt zum Muster und ist kein Datum', () => {
      expect(istDatum('2026-02-31')).toBe(false);
    });

    test('deutsche Schreibweise wird abgelehnt', () => {
      expect(istDatum('16.08.2026')).toBe(false);
    });

    test('eine Zeitangabe wird abgelehnt', () => {
      expect(istDatum('2026-08-16T12:00:00')).toBe(false);
    });

    test('ein Datum in der Zukunft wird abgelehnt', () => {
      const fehler = pruefe(gueltig({ text_erstellt_spaeteste: '2026-08-17' }));
      expect(fehler.join(' ')).toMatch(/Zukunft/);
    });

    test('das heutige Datum wird angenommen', () => {
      expect(
        pruefe(gueltig({ text_erstellt_spaeteste: HEUTE, musik_erzeugt_am: HEUTE }))
      ).toEqual([]);
    });

    test(`ein Datum vor ${FRUEHESTES_DATUM} wird abgelehnt`, () => {
      const fehler = pruefe(gueltig({ text_erstellt_spaeteste: '1949-12-31' }));
      expect(fehler.join(' ')).toMatch(new RegExp(FRUEHESTES_DATUM));
    });

    test('das Fruehestdatum ist nur ein Tippfehlerschutz, kein Zeitfenster', () => {
      // Vor #81 lag die Grenze bei 2023-01-01 und hat echte alte Texte
      // abgewiesen. Diese Zusicherung soll einen Rueckfall sofort zeigen.
      expect(FRUEHESTES_DATUM < '2000-01-01').toBe(true);
    });
  });

  // ==========================================================================
  describe('Erklärung braucht Beleg', () => {
    test('eigenes Werk ohne Text wird abgelehnt', () => {
      const e = gueltig();
      delete e.text_original;
      const fehler = pruefe(e);
      expect(fehler.join(' ')).toMatch(/text_original fehlt/);
    });

    test('eigenes Werk ohne Datum wird abgelehnt', () => {
      const e = gueltig();
      delete e.text_erstellt_spaeteste;
      const fehler = pruefe(e);
      expect(fehler.join(' ')).toMatch(/text_erstellt_spaeteste fehlt/);
    });

    test('ohne Erklärung darf der Text fehlen', () => {
      const e = gueltig({ text_ist_eigenes_werk: false });
      delete e.text_original;
      delete e.text_erstellt_spaeteste;
      expect(pruefe(e)).toEqual([]);
    });

    test('text_ist_eigenes_werk muss ein Wahrheitswert sein', () => {
      const fehler = pruefe(gueltig({ text_ist_eigenes_werk: 'ja' }));
      expect(fehler.join(' ')).toMatch(/true oder false/);
    });
  });

  // ==========================================================================
  describe('Feldprüfungen', () => {
    test('eine vollständige gültige Eingabe wird angenommen', () => {
      expect(pruefe(gueltig())).toEqual([]);
    });

    test('track_id muss eine positive ganze Zahl sein', () => {
      expect(pruefe(gueltig({ track_id: 0 })).join(' ')).toMatch(/track_id/);
      expect(pruefe(gueltig({ track_id: -1 })).join(' ')).toMatch(/track_id/);
      expect(pruefe(gueltig({ track_id: 1.5 })).join(' ')).toMatch(/track_id/);
      expect(pruefe(gueltig({ track_id: '7' })).join(' ')).toMatch(/track_id/);
    });

    test('ein zu kurzer Text wird abgelehnt', () => {
      const fehler = pruefe(gueltig({ text_original: 'Zu kurz.' }));
      expect(fehler.join(' ')).toMatch(new RegExp(String(MIN_TEXT_LAENGE)));
    });

    test('ein Text an der Mindestlänge wird angenommen', () => {
      const genau = 'a'.repeat(MIN_TEXT_LAENGE);
      expect(pruefe(gueltig({ text_original: genau }))).toEqual([]);
    });

    test('ein zu langer Text wird abgelehnt', () => {
      const fehler = pruefe(gueltig({ text_original: 'a'.repeat(MAX_TEXT_LAENGE + 1) }));
      expect(fehler.join(' ')).toMatch(new RegExp(String(MAX_TEXT_LAENGE)));
    });

    test('ein Text aus nur Leerraum gilt als leer', () => {
      const fehler = pruefe(gueltig({ text_original: '   \n\n  \t ' }));
      expect(fehler.join(' ')).toMatch(/leer/);
    });

    test('text_sprache muss ein Zweibuchstabencode sein', () => {
      expect(pruefe(gueltig({ text_sprache: 'DE' })).join(' ')).toMatch(/text_sprache/);
      expect(pruefe(gueltig({ text_sprache: 'deu' })).join(' ')).toMatch(/text_sprache/);
      expect(pruefe(gueltig({ text_sprache: 'en' }))).toEqual([]);
    });

    test('nur zugelassene Dienste werden angenommen', () => {
      for (const dienst of DIENSTE) {
        expect(pruefe(gueltig({ musik_dienst: dienst }))).toEqual([]);
      }
      expect(pruefe(gueltig({ musik_dienst: 'irgendwas' })).join(' ')).toMatch(/musik_dienst/);
    });

    test('die Wasserzeichen-Kennung muss 32 Hexzeichen klein sein', () => {
      expect(pruefe(gueltig({ wasserzeichen_id: 'A3F19C0D4B7E2856F10932AB5CD7E401' })).join(' '))
        .toMatch(/wasserzeichen_id/);
      expect(pruefe(gueltig({ wasserzeichen_id: 'a3f19c' })).join(' ')).toMatch(/wasserzeichen_id/);
      expect(pruefe(gueltig({ wasserzeichen_id: 'z'.repeat(32) })).join(' '))
        .toMatch(/wasserzeichen_id/);
    });

    test('eine leere musik_agb_fassung wird abgelehnt', () => {
      expect(pruefe(gueltig({ musik_agb_fassung: '   ' })).join(' ')).toMatch(/musik_agb_fassung/);
    });

    test('keine Angaben werden abgelehnt', () => {
      expect(pruefeHerkunft(null).length).toBeGreaterThan(0);
      expect(pruefeHerkunft('Text').length).toBeGreaterThan(0);
      expect(pruefeHerkunft([]).length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  describe('Aufbau des Datensatzes', () => {
    test('text_sprache bekommt de als Vorgabe', () => {
      const e = gueltig();
      delete e.text_sprache;
      const { datensatz } = baueDatensatz(e, { benutzerId: 1, heute: HEUTE });
      expect(datensatz.text_sprache).toBe('de');
    });

    test('der gespeicherte Text ist der normalisierte', () => {
      const { datensatz } = baueDatensatz(
        gueltig({ text_original: `\r\n  ${TEXT}   \r\n` }),
        { benutzerId: 1, heute: HEUTE }
      );
      expect(datensatz.text_original).toBe(normalisiereText(TEXT));
      expect(datensatz.text_sha256).toBe(textHash(TEXT));
    });

    test('fehlende Angaben werden zu null und nicht zu undefined', () => {
      const e = gueltig({ text_ist_eigenes_werk: false });
      delete e.text_original;
      delete e.text_erstellt_spaeteste;
      delete e.notiz;
      const { datensatz } = baueDatensatz(e, { benutzerId: 1, heute: HEUTE });
      expect(datensatz.text_original).toBeNull();
      expect(datensatz.text_erstellt_spaeteste).toBeNull();
      expect(datensatz.text_erstellt_frueheste).toBeNull();
      expect(datensatz.notiz).toBeNull();
      expect(datensatz.text_sha256).toBeNull();
    });

    test('die Spanne landet vollstaendig im Datensatz', () => {
      const { datensatz } = baueDatensatz(
        gueltig({ text_erstellt_frueheste: '2010-01-01', text_erstellt_spaeteste: '2011-12-31' }),
        { benutzerId: 1, heute: HEUTE }
      );
      expect(datensatz.text_erstellt_frueheste).toBe('2010-01-01');
      expect(datensatz.text_erstellt_spaeteste).toBe('2011-12-31');
    });

    test('eine ungültige Eingabe liefert keinen Datensatz', () => {
      const { fehler, datensatz } = baueDatensatz(gueltig({ track_id: 0 }), {
        benutzerId: 1,
        heute: HEUTE,
      });
      expect(datensatz).toBeNull();
      expect(fehler.length).toBeGreaterThan(0);
    });
  });
});
