/**
 * ============================================================================
 * PASSWORTREGEL — Frontend-Fassung
 * ============================================================================
 *
 * Spiegelt `backend/utils/password-policy.js`. Zweck ist ausschließlich eine
 * sofortige Rückmeldung im Formular, damit niemand erst nach dem Absenden
 * erfährt, dass das Passwort nicht genügt.
 *
 * ENTSCHEIDEND IST DAS BACKEND. Diese Datei prüft nichts verbindlich — sie
 * läuft im Browser und ist damit beliebig umgehbar. Wird die Regel geändert,
 * muss sie an beiden Stellen geändert werden. Änderungen hier ohne
 * Entsprechung im Backend sind wirkungslos, Änderungen im Backend ohne
 * Entsprechung hier führen zu Fehlermeldungen, die erst spät auftauchen.
 *
 * Absichtlich als klassisches Skript geschrieben, damit es sowohl per
 * `<script src>` in auth.html und password-reset.html als auch gebündelt von
 * webpack verwendet werden kann. So gibt es eine Datei statt zwei Kopien.
 */

(function (global, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) {
    module.exports = api;          // webpack / Node
  }
  global.PasswortRegel = api;       // klassisches <script src>
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const MIN_LAENGE = 12;
  const MAX_LAENGE = 200;

  const HAEUFIGE_STAEMME = new Set([
    'password', 'passwords', 'letmein', 'welcome', 'monkey', 'dragon',
    'sunshine', 'princess', 'football', 'baseball', 'superman', 'batman',
    'iloveyou', 'trustno', 'whatever', 'qwerty', 'qwertyuiop', 'asdfgh',
    'zxcvbn', 'admin', 'administrator', 'root', 'guest', 'test', 'login',
    'master', 'shadow', 'michael', 'jennifer', 'jordan', 'harley',
    'freedom', 'starwars', 'computer', 'internet', 'samsung', 'google',
    'secret', 'changeme', 'default', 'temporary', 'temp',
    'passwort', 'passwoerter', 'geheim', 'sommer', 'winter', 'fruehling',
    'herbst', 'schatz', 'liebling', 'fussball', 'hallo', 'servus',
    'willkommen', 'sicherheit', 'blumen', 'sonne', 'sonnenschein',
    'lassmichrein', 'ichliebedich', 'einshalt', 'benutzer', 'nutzer',
    'anmeldung', 'kennwort', 'geheimnis', 'oesterreich', 'wien', 'salzburg',
    'muenchen', 'berlin', 'hamburg',
    'qwertz', 'qwertzuiop', 'yxcvbnm', 'asdfghjkl', '1qaz2wsx', 'qazwsx',
    'songnexus', 'song-nexus', 'nexus', 'musik', 'music', 'metal',
  ]);

  const HAEUFIGE_PASSWOERTER = new Set([
    '123456789012', '1234567890123', '123456789123', '111111111111',
    '000000000000', 'qwertzuiopas', 'qwertyuiopas', 'abcdefghijkl',
    'passwortpasswort', 'passwordpassword', 'geheimgeheim',
  ]);

  function normalisiere(passwort) {
    return String(passwort)
      .trim()
      .toLowerCase()
      .replace(/ä/g, 'ae').replace(/ö/g, 'oe').replace(/ü/g, 'ue')
      .replace(/ß/g, 'ss');
  }

  function stamm(passwort) {
    return normalisiere(passwort)
      .replace(/[0-9!?.,_\-+*#$@]+$/, '')
      .replace(/^[0-9!?.,_\-+*#$@]+/, '');
  }

  function nurEinZeichen(passwort) {
    return new Set(passwort).size <= 2;
  }

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
   * @param {string} passwort
   * @param {{username?: string, email?: string}} kontext
   * @returns {string[]} Probleme; leere Liste bedeutet in Ordnung
   */
  function pruefePasswort(passwort, kontext) {
    kontext = kontext || {};
    const probleme = [];

    if (typeof passwort !== 'string' || passwort.length === 0) {
      return ['Passwort fehlt.'];
    }

    if (passwort.length < MIN_LAENGE) {
      probleme.push('Mindestens ' + MIN_LAENGE + ' Zeichen nötig (aktuell ' + passwort.length + ').');
    }
    if (passwort.length > MAX_LAENGE) {
      probleme.push('Höchstens ' + MAX_LAENGE + ' Zeichen.');
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

    const teile = [];
    if (kontext.username) teile.push(String(kontext.username));
    if (kontext.email) teile.push(String(kontext.email).split('@')[0]);

    for (let i = 0; i < teile.length; i++) {
      const t = normalisiere(teile[i]);
      if (t.length >= 4 && norm.indexOf(t) !== -1) {
        probleme.push('Das Passwort darf den Benutzernamen oder die E-Mail-Adresse nicht enthalten.');
        break;
      }
    }

    return probleme;
  }

  /** Kurzform: erste Meldung oder null. */
  function ersterFehler(passwort, kontext) {
    const probleme = pruefePasswort(passwort, kontext);
    return probleme.length > 0 ? probleme[0] : null;
  }

  /**
   * Hängt eine laufende Rückmeldung an ein Passwortfeld.
   *
   * @param {HTMLInputElement} feld
   * @param {HTMLElement} anzeige  Element für den Hinweistext
   * @param {() => object} kontextGeber  liefert username/email zum Prüfzeitpunkt
   */
  function beobachteFeld(feld, anzeige, kontextGeber) {
    if (!feld || !anzeige) return;

    function aktualisiere() {
      const wert = feld.value;
      if (wert.length === 0) {
        anzeige.textContent = 'Mindestens ' + MIN_LAENGE + ' Zeichen.';
        anzeige.dataset.zustand = 'neutral';
        return;
      }
      const kontext = typeof kontextGeber === 'function' ? kontextGeber() : {};
      const probleme = pruefePasswort(wert, kontext);
      if (probleme.length === 0) {
        anzeige.textContent = 'Passwort in Ordnung.';
        anzeige.dataset.zustand = 'gut';
      } else {
        anzeige.textContent = probleme[0];
        anzeige.dataset.zustand = 'schlecht';
      }
    }

    feld.addEventListener('input', aktualisiere);
    feld.addEventListener('blur', aktualisiere);
    aktualisiere();
  }

  return {
    MIN_LAENGE: MIN_LAENGE,
    MAX_LAENGE: MAX_LAENGE,
    pruefePasswort: pruefePasswort,
    ersterFehler: ersterFehler,
    beobachteFeld: beobachteFeld,
  };
});
