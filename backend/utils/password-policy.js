/**
 * ============================================================================
 * PASSWORTREGEL — eine Stelle für alle Prüfungen
 * ============================================================================
 *
 * Vorher lag die Prüfung an drei Stellen getrennt, jeweils als
 * `password.length < 8` beziehungsweise `isLength({ min: 8 })`:
 *
 *   - routes/auth.js:15      POST /api/auth/register
 *   - routes/auth.js:315     POST /api/auth/password-reset/confirm
 *   - routes/webauthn.js:468 POST /api/auth/webauthn/register-password
 *
 * Der dritte ist der Weg, den das Frontend tatsächlich benutzt. Wer nur die
 * ersten beiden verschärft, ändert an der Wirklichkeit nichts.
 *
 * Am laufenden Server geprüft: `12345678` und `password123` wurden angenommen
 * und legten Konten an.
 *
 * Grundsatz: Länge zählt mehr als Zeichenklassen. Ein Zwang zu Sonderzeichen
 * erzeugt `Passwort1!` und keinen Zugewinn. Deshalb 12 Zeichen Mindestlänge
 * plus Abgleich gegen häufige Passwörter, aber keine Vorschriften zur
 * Zusammensetzung.
 */

'use strict';

const MIN_LAENGE = 12;

// Obergrenze gegen sehr große Eingaben. Nebenbei: bcrypt verarbeitet ohnehin
// nur die ersten 72 Byte, alles darüber ist wirkungslos — kein Sicherheits-
// problem, aber ein Grund, keine Romane anzunehmen.
const MAX_LAENGE = 200;

/**
 * Häufige Passwörter und Wortstämme.
 *
 * Bewusst als Stämme geführt: Durch die Mindestlänge von 12 Zeichen fallen
 * kurze Klassiker wie `qwertz` schon durch die Längenprüfung. Gefährlich sind
 * die Varianten mit angehängten Zahlen — `passwort1234`, `password2026`.
 * Deshalb wird zusätzlich der Stamm ohne angehängte Ziffern verglichen.
 */
const HAEUFIGE_STAEMME = new Set([
  // Englisch
  'password', 'passwords', 'letmein', 'welcome', 'monkey', 'dragon',
  'sunshine', 'princess', 'football', 'baseball', 'superman', 'batman',
  'iloveyou', 'trustno', 'whatever', 'qwerty', 'qwertyuiop', 'asdfgh',
  'zxcvbn', 'admin', 'administrator', 'root', 'guest', 'test', 'login',
  'master', 'shadow', 'michael', 'jennifer', 'jordan', 'harley',
  'freedom', 'starwars', 'computer', 'internet', 'samsung', 'google',
  'secret', 'changeme', 'default', 'temporary', 'temp',
  // Deutsch
  'passwort', 'passwoerter', 'geheim', 'sommer', 'winter', 'fruehling',
  'herbst', 'schatz', 'liebling', 'fussball', 'hallo', 'servus',
  'willkommen', 'sicherheit', 'blumen', 'sonne', 'sonnenschein',
  'lassmichrein', 'ichliebedich', 'einshalt', 'benutzer', 'nutzer',
  'anmeldung', 'kennwort', 'geheimnis', 'oesterreich', 'wien', 'salzburg',
  'muenchen', 'berlin', 'hamburg',
  // Tastaturmuster
  'qwertz', 'qwertzuiop', 'yxcvbnm', 'asdfghjkl', '1qaz2wsx', 'qazwsx',
  // Projektbezogen — naheliegend und deshalb schlecht
  'songnexus', 'song-nexus', 'nexus', 'musik', 'music', 'metal',
]);

/** Vollständige Passwörter, die trotz Länge verbreitet sind. */
const HAEUFIGE_PASSWOERTER = new Set([
  '123456789012', '1234567890123', '123456789123', '111111111111',
  '000000000000', 'qwertzuiopas', 'qwertyuiopas', 'abcdefghijkl',
  'passwortpasswort', 'passwordpassword', 'geheimgeheim',
]);

/** Kleinschreibung, Rand-Leerzeichen weg, Umlaute vereinheitlicht. */
function normalisiere(passwort) {
  return String(passwort)
    .trim()
    .toLowerCase()
    .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
    .replace(/ß/g, 'ss');
}

/**
 * Entfernt angehängte Ziffern und übliche Anhängsel, um den Wortstamm zu
 * erhalten: `Passwort1234!` wird zu `passwort`.
 */
function stamm(passwort) {
  return normalisiere(passwort)
    .replace(/[0-9!?.,_\-+*#$@]+$/, '')
    .replace(/^[0-9!?.,_\-+*#$@]+/, '');
}

/** Besteht die Eingabe nur aus einem einzigen wiederholten Zeichen? */
function nurEinZeichen(passwort) {
  return new Set(passwort).size <= 2;
}

/**
 * Erkennt fortlaufende Folgen wie `abcdefghijkl` oder `123456789012`.
 * Geprüft wird, ob mindestens 8 Zeichen in Folge auf- oder absteigen.
 */
function istFolge(passwort) {
  const p = normalisiere(passwort);
  let auf = 1, ab = 1;
  for (let i = 1; i < p.length; i++) {
    const d = p.charCodeAt(i) - p.charCodeAt(i - 1);
    auf = d === 1 ? auf + 1 : 1;
    ab = d === -1 ? ab + 1 : 1;
    if (auf >= 8 || ab >= 8) return true;
  }
  return false;
}

/**
 * Prüft ein Passwort und gibt die gefundenen Probleme als Liste zurück.
 * Leere Liste bedeutet: in Ordnung.
 *
 * @param {string} passwort
 * @param {{username?: string, email?: string}} kontext
 * @returns {string[]} verständliche Meldungen auf Deutsch
 */
function pruefePasswort(passwort, kontext = {}) {
  const probleme = [];

  if (typeof passwort !== 'string' || passwort.length === 0) {
    return ['Passwort fehlt.'];
  }

  if (passwort.length < MIN_LAENGE) {
    probleme.push(
      `Mindestens ${MIN_LAENGE} Zeichen nötig (aktuell ${passwort.length}).`
    );
  }

  if (passwort.length > MAX_LAENGE) {
    probleme.push(`Höchstens ${MAX_LAENGE} Zeichen.`);
  }

  const norm = normalisiere(passwort);
  const st = stamm(passwort);

  if (HAEUFIGE_PASSWOERTER.has(norm) || HAEUFIGE_STAEMME.has(st) || HAEUFIGE_STAEMME.has(norm)) {
    probleme.push('Dieses Passwort ist zu bekannt — bitte etwas anderes wählen.');
  }

  if (/^\d+$/.test(passwort)) {
    probleme.push('Nicht ausschließlich Zahlen verwenden.');
  }

  if (nurEinZeichen(passwort)) {
    probleme.push('Zu wenig verschiedene Zeichen.');
  }

  if (istFolge(passwort)) {
    probleme.push('Keine fortlaufenden Zeichenfolgen verwenden.');
  }

  // Benutzername oder E-Mail-Bestandteil im Passwort: wer den Namen kennt,
  // kennt damit einen großen Teil des Passworts.
  const teile = [];
  if (kontext.username) teile.push(String(kontext.username));
  if (kontext.email) teile.push(String(kontext.email).split('@')[0]);

  for (const teil of teile) {
    const t = normalisiere(teil);
    if (t.length >= 4 && norm.includes(t)) {
      probleme.push('Das Passwort darf den Benutzernamen oder die E-Mail-Adresse nicht enthalten.');
      break;
    }
  }

  return probleme;
}

/**
 * Fertiger Prüfer für express-validator.
 *
 *   body('password').custom(passwortValidator())
 *
 * Liest Benutzername und E-Mail aus dem Anfragekörper, damit auch geprüft
 * werden kann, ob das Passwort diese enthält.
 */
function passwortValidator() {
  return (wert, { req }) => {
    const probleme = pruefePasswort(wert, {
      username: req.body?.username,
      email: req.body?.email,
    });
    if (probleme.length > 0) {
      throw new Error(probleme.join(' '));
    }
    return true;
  };
}

module.exports = {
  MIN_LAENGE,
  MAX_LAENGE,
  pruefePasswort,
  passwortValidator,
};
