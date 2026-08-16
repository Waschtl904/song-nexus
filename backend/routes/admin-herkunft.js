// ============================================================================
// 📜 HERKUNFTSNACHWEIS — Route für den Adminbereich (Issue #80)
// ============================================================================
//
// Liest und schreibt den Herkunftsnachweis eines Titels: den deutschen
// Originaltext, seine Entstehungszeit, den Hashwert darüber, welcher Dienst die
// Musik erzeugte und welche Fassung der Nutzungsbedingungen damals galt.
//
// Der Datensatz ist ein BEWEISMITTEL. Daraus folgen drei Dinge, die diese Route
// anders macht als eine gewöhnliche Verwaltungsroute:
//
//   1. Der Hashwert wird serverseitig berechnet. Ein mitgesendeter wird
//      abgewiesen (utils/herkunftsnachweis.js).
//   2. Jeder Schreibvorgang landet im Verlauf. Das erledigt ein Trigger in der
//      Datenbank, nicht diese Route — damit es auch bei einem Zugriff über psql
//      geschieht. Damit der Trigger weiß, WER geschrieben hat, setzt die Route
//      vor dem Schreiben `SET LOCAL app.benutzer_id`.
//   3. Die Titelkennung kommt aus dem Pfad, nicht aus dem Anfragekörper. Steht
//      im Körper eine abweichende, wird die Anfrage abgewiesen und nicht
//      stillschweigend eine der beiden gewählt. Dieselbe Lehre wie bei
//      `orders.track_id` in routes/payments.js.
//
// Kein CSRF-Prüfschritt, und das ist eine Entscheidung mit Begründung:
// `validateCSRFToken` weist jede Anfrage ohne Token mit 403 ab, und im Frontend
// gibt es an keiner Stelle Code, der ein CSRF-Token beschafft oder mitsendet.
// Diese Route würde damit vom Browser aus überhaupt nicht funktionieren. Der
// Zugangs-Cookie ist `sameSite: 'lax'`, was fremde Seiten an schreibenden
// Anfragen bereits hindert. Die fehlende CSRF-Kette im Frontend ist ein eigenes
// Anliegen und in einem eigenen Issue festgehalten.

'use strict';

const express = require('express');
const { pool } = require('../db');
const { verifyToken, requireAdmin } = require('../middleware/auth-middleware');
const { baueDatensatz, DIENSTE, MIN_TEXT_LAENGE } = require('../utils/herkunftsnachweis');

const router = express.Router();

/** Spalten des Nachweises in fester Reihenfolge, für Lesen und Schreiben. */
const SPALTEN = [
    'track_id',
    'text_original',
    'text_sprache',
    'text_erstellt_spaeteste',
    'text_erstellt_frueheste',
    'text_sha256',
    'text_ist_eigenes_werk',
    'musik_dienst',
    'musik_erzeugt_am',
    'musik_agb_fassung',
    'wasserzeichen_id',
    'notiz',
    'erfasst_von',
];

/**
 * Liest eine Titelkennung aus dem Pfad.
 * @returns {number|null} null, wenn es keine brauchbare Kennung ist.
 */
function titelKennung(rohwert) {
    if (!/^\d+$/.test(String(rohwert))) return null;
    const zahl = Number.parseInt(rohwert, 10);
    return Number.isSafeInteger(zahl) && zahl > 0 ? zahl : null;
}

// ============================================================================
// GET /api/admin/herkunft/vorgaben — was die Eingabemaske wissen muss
// ============================================================================
// Steht VOR der Route mit dem Platzhalter, sonst würde "vorgaben" als
// Titelkennung gelesen und mit 400 abgewiesen.

router.get('/vorgaben', verifyToken, requireAdmin, (req, res) => {
    res.json({
        dienste: DIENSTE,
        min_text_laenge: MIN_TEXT_LAENGE,
        heute: new Date().toISOString().slice(0, 10),
    });
});

// ============================================================================
// GET /api/admin/herkunft/:trackId — Nachweis lesen
// ============================================================================

router.get('/:trackId', verifyToken, requireAdmin, async (req, res) => {
    const trackId = titelKennung(req.params.trackId);
    if (trackId === null) {
        return res.status(400).json({ error: 'Unbrauchbare Titelkennung', code: 'BAD_TRACK_ID' });
    }

    try {
        const titel = await pool.query('SELECT id, name, artist FROM tracks WHERE id = $1', [trackId]);
        if (titel.rowCount === 0) {
            return res.status(404).json({ error: 'Titel nicht gefunden', code: 'TRACK_NOT_FOUND' });
        }

        const nachweis = await pool.query(
            'SELECT * FROM track_provenance WHERE track_id = $1',
            [trackId]
        );

        const verlauf = await pool.query(
            `SELECT id, vorgang, geschehen_am, geaendert_von
               FROM track_provenance_verlauf
              WHERE track_id = $1
              ORDER BY id DESC
              LIMIT 20`,
            [trackId]
        );

        res.json({
            track: titel.rows[0],
            // Absichtlich null und nicht ein leeres Objekt: "es gibt keinen
            // Nachweis" ist eine andere Aussage als "der Nachweis ist leer".
            herkunft: nachweis.rowCount > 0 ? nachweis.rows[0] : null,
            verlauf: verlauf.rows,
        });
    } catch (err) {
        console.error(`❌ Herkunftsnachweis lesen fehlgeschlagen (Titel ${trackId}): ${err.message}`);
        res.status(500).json({ error: 'Nachweis konnte nicht gelesen werden' });
    }
});

// ============================================================================
// PUT /api/admin/herkunft/:trackId — Nachweis anlegen oder ändern
// ============================================================================

router.put('/:trackId', verifyToken, requireAdmin, async (req, res) => {
    const trackId = titelKennung(req.params.trackId);
    if (trackId === null) {
        return res.status(400).json({ error: 'Unbrauchbare Titelkennung', code: 'BAD_TRACK_ID' });
    }

    const koerper = req.body && typeof req.body === 'object' ? req.body : {};

    // Der Pfad ist maßgeblich. Eine abweichende Kennung im Körper wird nicht
    // stillschweigend verworfen — sonst glaubt der Aufrufer, er hätte Titel B
    // beschrieben, während Titel A geändert wurde.
    if (koerper.track_id !== undefined && Number(koerper.track_id) !== trackId) {
        return res.status(400).json({
            error: 'Die Titelkennung im Anfragekörper weicht von der im Pfad ab',
            code: 'TRACK_ID_MISMATCH',
        });
    }

    // Ein PUT ersetzt vollstaendig. Eine Anfrage ohne inhaltliche Angabe waere
    // damit ein stilles Leeren eines bestehenden Nachweises -- beim Beweismittel
    // der schlimmste denkbare Unfall. Beim Bauen der Tests aufgefallen: die
    // Prueffunktion laesst `{track_id: 7}` durch, weil ein Nachweis ohne Angaben
    // formal nicht falsch ist. Fuer die Route ist er es.
    const INHALTLICHE_FELDER = [
        'text_original',
        'text_erstellt_spaeteste',
        'text_erstellt_frueheste',
        'musik_dienst',
        'musik_erzeugt_am',
        'musik_agb_fassung',
        'wasserzeichen_id',
        'notiz',
    ];
    const hatInhalt = INHALTLICHE_FELDER.some((feld) =>
        Object.prototype.hasOwnProperty.call(koerper, feld)
    );
    if (!hatInhalt) {
        return res.status(400).json({
            error: 'Keine inhaltliche Angabe. Ein PUT ohne Inhalt wuerde einen bestehenden '
                + 'Nachweis leeren; zum Loeschen braucht es einen eigenen Weg.',
            code: 'EMPTY_BODY',
        });
    }

    const { fehler, datensatz } = baueDatensatz(
        { ...koerper, track_id: trackId },
        { benutzerId: req.user.id }
    );

    if (fehler.length > 0) {
        return res.status(400).json({ error: 'Angaben unbrauchbar', code: 'VALIDATION', fehler });
    }

    let verbindung;
    try {
        const titel = await pool.query('SELECT id FROM tracks WHERE id = $1', [trackId]);
        if (titel.rowCount === 0) {
            return res.status(404).json({ error: 'Titel nicht gefunden', code: 'TRACK_NOT_FOUND' });
        }

        verbindung = await pool.connect();
        await verbindung.query('BEGIN');

        // Damit der Trigger weiß, wer geschrieben hat. `SET LOCAL` gilt nur
        // innerhalb dieser Transaktion, deshalb steht es hier und nicht am Pool.
        // set_config statt SET LOCAL, weil SET keine Parameter annimmt und der
        // Wert sonst in die Anweisung eingesetzt werden müsste.
        await verbindung.query('SELECT set_config($1, $2, true)', [
            'app.benutzer_id',
            String(req.user.id),
        ]);

        const platzhalter = SPALTEN.map((_, i) => `$${i + 1}`).join(', ');
        const werte = SPALTEN.map((spalte) => datensatz[spalte]);
        const zuAktualisieren = SPALTEN.filter((s) => s !== 'track_id')
            .map((s) => `${s} = EXCLUDED.${s}`)
            .join(', ');

        const ergebnis = await verbindung.query(
            `INSERT INTO public.track_provenance (${SPALTEN.join(', ')})
             VALUES (${platzhalter})
             ON CONFLICT (track_id) DO UPDATE SET ${zuAktualisieren}, erfasst_am = CURRENT_TIMESTAMP
             RETURNING *`,
            werte
        );

        await verbindung.query('COMMIT');

        console.log(`📜 Herkunftsnachweis für Titel ${trackId} von Benutzer ${req.user.id} gespeichert`);
        res.json({ erfolg: true, herkunft: ergebnis.rows[0] });
    } catch (err) {
        if (verbindung) {
            await verbindung.query('ROLLBACK').catch(() => {});
        }

        // Die Pruefbedingungen der Datenbank sind die zweite Verteidigungslinie
        // (#78, #81). Schlägt eine an, ist das ein Fehler des Aufrufers und
        // kein Serverfehler — auch wenn die Anwendungsprüfung ihn durchgelassen
        // hat. Genau dann will man das im Protokoll sehen.
        if (err.code === '23514') {
            console.warn(`⚠️ Pruefbedingung ${err.constraint} verletzt (Titel ${trackId})`);
            return res.status(400).json({
                error: 'Die Angaben verletzen eine Pruefbedingung der Datenbank',
                code: 'DB_CONSTRAINT',
                bedingung: err.constraint,
            });
        }

        console.error(`❌ Herkunftsnachweis speichern fehlgeschlagen (Titel ${trackId}): ${err.message}`);
        res.status(500).json({ error: 'Nachweis konnte nicht gespeichert werden' });
    } finally {
        if (verbindung) verbindung.release();
    }
});

module.exports = router;
