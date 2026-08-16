/**
 * ============================================================================
 * HERKUNFTSNACHWEIS — Prüfregeln für die Beweiskette eines Titels (Issue #78)
 * ============================================================================
 *
 * Die Musik der Titel ist KI-erzeugt und damit voraussichtlich nicht
 * urheberrechtlich schutzfähig. Schutzfähig sein kann der Liedtext — aber nur,
 * wenn er von einem Menschen stammt. Der deutsche Originaltext wird selbst
 * geschrieben, die Übertragung ins Englische übernimmt eine KI. Nach
 * § 5 Abs 1 UrhG bleibt das Urheberrecht am bearbeiteten Werk davon unberührt.
 *
 * Damit das je etwas wert ist, muss belegbar sein, dass der deutsche Text VOR
 * der Erzeugung der Musik existierte. Dieses Modul prüft genau das.
 *
 * ---------------------------------------------------------------------------
 * Die Frage aus SECURITY-GUIDE Abschnitt 9: wer kann diesen Wert setzen?
 * ---------------------------------------------------------------------------
 *
 * Bei einem Beweismittel ist das die einzige Frage, die zählt.
 *
 *   - `text_sha256` berechnet der Server aus `text_original`. Ein mitgesendeter
 *     Hashwert wird VERWORFEN. Sonst wäre der Nachweis wertlos: Text A
 *     speichern, Hashwert von Text B mitschicken, und der Datensatz behauptet
 *     etwas, das nicht stimmt.
 *   - `erfasst_am` und `erfasst_von` kommen nie aus der Anfrage.
 *   - Es werden ausschließlich bekannte Felder übernommen. Ein unbekanntes
 *     Feld führt zur Ablehnung, nicht zum stillen Verwerfen — sonst merkt
 *     niemand, dass ein Tippfehler im Feldnamen die Angabe verschluckt hat.
 *   - `text_erstellt_am` MUSS aus der Anfrage kommen, weil es ein vergangenes
 *     Datum ist, das nur der Eigentümer kennt. Es wird aber eingegrenzt: nicht
 *     in der Zukunft, nicht vor dem Frühestdatum, nicht nach `musik_erzeugt_am`.
 *
 * ---------------------------------------------------------------------------
 * Was dieses Modul ausdrücklich NICHT tut
 * ---------------------------------------------------------------------------
 *
 * MIN_TEXT_LAENGE ist KEINE Prüfung der Schöpfungshöhe. Sie hält leere und
 * offensichtlich belanglose Einträge heraus, nichts weiter. Ob ein Text die
 * urheberrechtliche Schwelle erreicht, entscheidet ein Gericht: banale Zeilen
 * aus allgemeinen Begriffen bleiben schutzlos, auch wenn die Anforderungen an
 * Liedtexte niedrig sind (OLG Stuttgart). Der Datensatz belegt WANN und VON
 * WEM, nicht DASS ES KUNST IST.
 */

'use strict';

const crypto = require('crypto');

/** Mindestlänge des Originaltextes. Siehe Vorbehalt oben — keine Rechtsprüfung. */
const MIN_TEXT_LAENGE = 80;

/** Obergrenze gegen sehr große Eingaben. */
const MAX_TEXT_LAENGE = 20000;

/**
 * Frühestes zulässiges Datum.
 *
 * Ein Datum vor der ersten Nutzung eines Erzeugungsdienstes wäre entweder ein
 * Tippfehler oder eine Rückdatierung. Beides soll auffallen.
 */
const FRUEHESTES_DATUM = '2023-01-01';

/** Zugelassene Erzeugungsdienste. */
const DIENSTE = Object.freeze(['suno', 'music-ai', 'eigene-aufnahme', 'sonstiges']);

/**
 * Felder, die aus der Anfrage übernommen werden dürfen.
 *
 * Weiße Liste, nicht schwarze. Was hier nicht steht, kommt nicht durch —
 * einschließlich `text_sha256`, `erfasst_am` und `erfasst_von`.
 */
const ERLAUBTE_FELDER = Object.freeze([
  'track_id',
  'text_original',
  'text_sprache',
  'text_erstellt_am',
  'text_ist_eigenes_werk',
  'musik_dienst',
  'musik_erzeugt_am',
  'musik_agb_fassung',
  'wasserzeichen_id',
  'notiz',
]);

/** Felder, die der Server allein bestimmt. Kommen sie mit, ist das ein Fehler. */
const SERVERFELDER = Object.freeze(['text_sha256', 'erfasst_am', 'erfasst_von']);

/**
 * Bringt einen Text auf eine stabile Form, bevor der Hashwert gebildet wird.
 *
 * Normalisiert werden nur Dinge, die Werkzeuge verändern, ohne dass der Autor
 * es tut:
 *   - CRLF und CR werden zu LF. Ein Text, der unter Windows in Windsurf und
 *     später unter Linux gespeichert wird, ist derselbe Text. Ohne diesen
 *     Schritt wäre der Hashwert je nach Editor verschieden — und ein Nachweis,
 *     der vom Editor abhängt, ist keiner.
 *   - Unicode wird auf NFC gebracht. "ö" als ein Zeichen und "ö" als o mit
 *     kombinierendem Umlaut sehen gleich aus und sind verschiedene Bytes.
 *   - Leerzeichen und Tabulatoren am Zeilenende fallen weg.
 *   - Leerraum am Anfang und Ende des ganzen Textes fällt weg.
 *
 * NICHT normalisiert werden Leerzeilen im Text. Sie sind eine Entscheidung des
 * Autors und gliedern Strophen. Sie zu vereinheitlichen würde den Text ändern.
 */
function normalisiereText(text) {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFC')
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((zeile) => zeile.replace(/[ \t]+$/, ''))
    .join('\n')
    .trim();
}

/** SHA-256 über den normalisierten Text, als 64 Hexzeichen in Kleinschreibung. */
function textHash(text) {
  return crypto
    .createHash('sha256')
    .update(normalisiereText(text), 'utf8')
    .digest('hex');
}

/**
 * Prüft, ob eine Zeichenkette ein gültiges Datum in der Form JJJJ-MM-TT ist.
 *
 * Die Form allein genügt nicht: `2026-02-31` passt zum Muster und ist kein
 * Datum. Deshalb wird zusätzlich zurückgerechnet, ob der Kalender den Tag
 * hergibt.
 */
function istDatum(wert) {
  if (typeof wert !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(wert)) return false;
  const d = new Date(`${wert}T00:00:00Z`);
  if (Number.isNaN(d.getTime())) return false;
  return d.toISOString().slice(0, 10) === wert;
}

/**
 * Heutiges Datum als JJJJ-MM-TT.
 *
 * Datumsvergleiche laufen in diesem Modul als Zeichenkettenvergleich. Bei
 * ISO-Datumsangaben ist die lexikalische Ordnung dieselbe wie die zeitliche,
 * und es gibt keine Zeitzonenfallen — genau die Sorte Fehler, die sonst erst
 * am 31. Dezember um 23 Uhr auffällt.
 */
function heuteAlsDatum() {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Prüft eine Eingabe für den Herkunftsnachweis.
 *
 * @param {object} eingabe  Rohe Angaben, üblicherweise aus dem Anfragekörper.
 * @param {object} [opt]
 * @param {string} [opt.heute]  Heutiges Datum, einspeisbar für Tests.
 * @returns {string[]}  Liste der Beanstandungen. Leer heißt in Ordnung.
 */
function pruefeHerkunft(eingabe, opt = {}) {
  const fehler = [];
  const heute = opt.heute || heuteAlsDatum();

  if (eingabe === null || typeof eingabe !== 'object' || Array.isArray(eingabe)) {
    return ['Die Angaben fehlen oder sind kein Objekt.'];
  }

  // --- Felder, die der Server allein bestimmt ------------------------------
  for (const feld of SERVERFELDER) {
    if (Object.prototype.hasOwnProperty.call(eingabe, feld)) {
      fehler.push(
        `Das Feld "${feld}" wird vom Server gesetzt und darf nicht mitgesendet werden.`
      );
    }
  }

  // --- Unbekannte Felder ---------------------------------------------------
  for (const feld of Object.keys(eingabe)) {
    if (!ERLAUBTE_FELDER.includes(feld) && !SERVERFELDER.includes(feld)) {
      fehler.push(`Unbekanntes Feld "${feld}".`);
    }
  }

  // --- track_id -----------------------------------------------------------
  if (!Number.isInteger(eingabe.track_id) || eingabe.track_id < 1) {
    fehler.push('track_id fehlt oder ist keine positive ganze Zahl.');
  }

  // --- text_original ------------------------------------------------------
  const hatText = typeof eingabe.text_original === 'string';
  if (Object.prototype.hasOwnProperty.call(eingabe, 'text_original')) {
    if (!hatText) {
      fehler.push('text_original muss eine Zeichenkette sein.');
    } else {
      const normalisiert = normalisiereText(eingabe.text_original);
      if (normalisiert.length === 0) {
        fehler.push('text_original ist leer.');
      } else if (normalisiert.length < MIN_TEXT_LAENGE) {
        fehler.push(
          `text_original ist mit ${normalisiert.length} Zeichen zu kurz ` +
            `(mindestens ${MIN_TEXT_LAENGE}).`
        );
      } else if (normalisiert.length > MAX_TEXT_LAENGE) {
        fehler.push(`text_original ist länger als ${MAX_TEXT_LAENGE} Zeichen.`);
      }
    }
  }

  // --- text_sprache -------------------------------------------------------
  if (Object.prototype.hasOwnProperty.call(eingabe, 'text_sprache')) {
    if (typeof eingabe.text_sprache !== 'string' || !/^[a-z]{2}$/.test(eingabe.text_sprache)) {
      fehler.push('text_sprache muss ein Zweibuchstabencode in Kleinschreibung sein, etwa "de".');
    }
  }

  // --- text_ist_eigenes_werk ---------------------------------------------
  const erklaertEigenesWerk = eingabe.text_ist_eigenes_werk === true;
  if (
    Object.prototype.hasOwnProperty.call(eingabe, 'text_ist_eigenes_werk') &&
    typeof eingabe.text_ist_eigenes_werk !== 'boolean'
  ) {
    fehler.push('text_ist_eigenes_werk muss true oder false sein.');
  }

  // --- Datumsangaben ------------------------------------------------------
  for (const feld of ['text_erstellt_am', 'musik_erzeugt_am']) {
    if (!Object.prototype.hasOwnProperty.call(eingabe, feld)) continue;
    const wert = eingabe[feld];
    if (!istDatum(wert)) {
      fehler.push(`${feld} muss ein Datum in der Form JJJJ-MM-TT sein.`);
      continue;
    }
    if (wert > heute) {
      fehler.push(`${feld} liegt in der Zukunft.`);
    }
    if (wert < FRUEHESTES_DATUM) {
      fehler.push(`${feld} liegt vor ${FRUEHESTES_DATUM}.`);
    }
  }

  // --- Die Reihenfolge, auf die es ankommt --------------------------------
  // Der Text muss vor der Musik da gewesen sein. Andernfalls belegt der
  // Datensatz nichts: ein Text, der nach der Erzeugung entstand, kann nicht
  // die Grundlage der Erzeugung gewesen sein.
  if (istDatum(eingabe.text_erstellt_am) && istDatum(eingabe.musik_erzeugt_am)) {
    if (eingabe.text_erstellt_am > eingabe.musik_erzeugt_am) {
      fehler.push(
        'text_erstellt_am liegt nach musik_erzeugt_am. Der Text muss vor der ' +
          'Erzeugung der Musik entstanden sein, sonst belegt der Nachweis nichts.'
      );
    }
  }

  // --- Erklärung braucht Beleg -------------------------------------------
  if (erklaertEigenesWerk) {
    const normalisiert = hatText ? normalisiereText(eingabe.text_original) : '';
    if (normalisiert.length === 0) {
      fehler.push('text_ist_eigenes_werk ist gesetzt, aber text_original fehlt.');
    }
    if (!istDatum(eingabe.text_erstellt_am)) {
      fehler.push('text_ist_eigenes_werk ist gesetzt, aber text_erstellt_am fehlt.');
    }
  }

  // --- musik_dienst ------------------------------------------------------
  if (Object.prototype.hasOwnProperty.call(eingabe, 'musik_dienst')) {
    if (!DIENSTE.includes(eingabe.musik_dienst)) {
      fehler.push(`musik_dienst muss einer von: ${DIENSTE.join(', ')}.`);
    }
  }

  // --- musik_agb_fassung -------------------------------------------------
  if (Object.prototype.hasOwnProperty.call(eingabe, 'musik_agb_fassung')) {
    const w = eingabe.musik_agb_fassung;
    if (typeof w !== 'string' || w.trim().length === 0 || w.length > 40) {
      fehler.push('musik_agb_fassung muss eine Zeichenkette mit höchstens 40 Zeichen sein.');
    }
  }

  // --- wasserzeichen_id --------------------------------------------------
  // 128 Bit aus #77, als 32 Hexzeichen. Kleinschreibung wird verlangt und
  // nicht stillschweigend umgewandelt, damit derselbe Wert nur eine Schreibweise
  // hat und der Index zuverlässig trifft.
  if (Object.prototype.hasOwnProperty.call(eingabe, 'wasserzeichen_id')) {
    const w = eingabe.wasserzeichen_id;
    if (typeof w !== 'string' || !/^[0-9a-f]{32}$/.test(w)) {
      fehler.push('wasserzeichen_id muss aus 32 Hexzeichen in Kleinschreibung bestehen.');
    }
  }

  // --- notiz -------------------------------------------------------------
  if (Object.prototype.hasOwnProperty.call(eingabe, 'notiz')) {
    if (typeof eingabe.notiz !== 'string' || eingabe.notiz.length > 5000) {
      fehler.push('notiz muss eine Zeichenkette mit höchstens 5000 Zeichen sein.');
    }
  }

  return fehler;
}

/**
 * Baut aus einer geprüften Eingabe den Datensatz zum Speichern.
 *
 * Der Hashwert wird hier berechnet, aus dem normalisierten Text. Er wird
 * niemals aus der Eingabe übernommen — auch dann nicht, wenn dort einer steht,
 * denn in diesem Fall hat `pruefeHerkunft` die Eingabe schon abgelehnt.
 *
 * @param {object} eingabe
 * @param {object} opt
 * @param {number} opt.benutzerId  Angemeldeter Benutzer, aus dem Token.
 * @param {string} [opt.heute]
 * @returns {{fehler: string[], datensatz: object|null}}
 */
function baueDatensatz(eingabe, opt = {}) {
  const fehler = pruefeHerkunft(eingabe, opt);
  if (fehler.length > 0) return { fehler, datensatz: null };

  if (!Number.isInteger(opt.benutzerId) || opt.benutzerId < 1) {
    return {
      fehler: ['erfasst_von fehlt. Der Benutzer muss aus dem Token kommen, nicht aus der Anfrage.'],
      datensatz: null,
    };
  }

  const text =
    typeof eingabe.text_original === 'string' ? normalisiereText(eingabe.text_original) : null;

  return {
    fehler: [],
    datensatz: {
      track_id: eingabe.track_id,
      text_original: text,
      text_sprache: eingabe.text_sprache || 'de',
      text_erstellt_am: eingabe.text_erstellt_am || null,
      // Serverseitig berechnet. Der einzige Grund, warum der Datensatz
      // überhaupt etwas beweist.
      text_sha256: text ? textHash(text) : null,
      text_ist_eigenes_werk: eingabe.text_ist_eigenes_werk === true,
      musik_dienst: eingabe.musik_dienst || null,
      musik_erzeugt_am: eingabe.musik_erzeugt_am || null,
      musik_agb_fassung: eingabe.musik_agb_fassung || null,
      wasserzeichen_id: eingabe.wasserzeichen_id || null,
      notiz: eingabe.notiz || null,
      erfasst_von: opt.benutzerId,
    },
  };
}

module.exports = {
  MIN_TEXT_LAENGE,
  MAX_TEXT_LAENGE,
  FRUEHESTES_DATUM,
  DIENSTE,
  ERLAUBTE_FELDER,
  SERVERFELDER,
  normalisiereText,
  textHash,
  istDatum,
  pruefeHerkunft,
  baueDatensatz,
};
