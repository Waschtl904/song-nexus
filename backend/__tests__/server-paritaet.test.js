/**
 * ===========================================================================
 * Paritaet zwischen app.js und server.js (Issue #47)
 * ===========================================================================
 *
 * app.js wird von den Tests geladen, server.js laeuft im Betrieb. Beide Dateien
 * mounten Routen, aber nur app.js wird geprueft. In genau dieser Luecke lag die
 * offene statische Auslieferung von /public/audio (PR #46): sechs Tests mit
 * "SECURITY" im Namen waren gruen und prueften eine Route, die der Player nie
 * aufrief.
 *
 * Diese Suite schliesst die Luecke NICHT - dafuer muesste server.js auf app.js
 * aufbauen, und das ist der Umbau, den #47 ausdruecklich hinter das
 * VPS-Deployment stellt. Sie macht die Luecke aber sichtbar und friert sie ein:
 * jede NEUE Route, die nur in server.js auftaucht, laesst diese Suite
 * fehlschlagen und erzwingt eine Entscheidung.
 *
 * WARUM STATISCHE QUELLTEXTPRUEFUNG UND KEIN require('../server')
 *
 * server.js hat keinen require.main-Schutz. Beim Import ruft es
 * warmupDatabase().then(...) auf, prueft die SMTP-Verbindung und startet einen
 * Listener auf PORT. Ein require in einem Test wuerde also eine echte
 * Datenbankverbindung aufbauen und einen Port belegen. Die Pruefung liest
 * deshalb den Quelltext, so wie es die dev-login-Pruefung in auth.test.js
 * bereits tut.
 *
 * GRENZEN, DIE MAN KENNEN MUSS
 *
 * Eine Textpruefung sieht nur Mounts mit einem Pfad als Zeichenkettenliteral.
 * Sie findet NICHT:
 *   - Mounts mit berechnetem Pfad, z. B. app.use(basis + '/x', ...)
 *   - Routen, die ein eingebundener Router intern definiert
 *   - Mounts ohne Pfad, z. B. app.use(express.static(frontendPath))
 * Sie ist damit eine Untergrenze, keine Vollstaendigkeitsgarantie.
 * ===========================================================================
 */

const fsReal = jest.requireActual('fs');
const pathReal = jest.requireActual('path');

const BACKEND = pathReal.join(__dirname, '..');

function lese(datei) {
  return fsReal.readFileSync(pathReal.join(BACKEND, datei), 'utf8');
}

/**
 * Blockkommentare und Zeilenkommentare entfernen.
 * Notwendig, weil server.js den ausgebauten express.static-Mount als
 * auskommentierte Zeile samt Begruendung behaelt - die soll nicht anschlagen.
 */
function ohneKommentare(quelle) {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((zeile) => !zeile.trim().startsWith('//'))
    .join('\n');
}

/**
 * Alle app.<methode>('<pfad>' aus einer Datei ziehen.
 * Rueckgabe als Menge von Eintraegen der Form "USE /api/tracks".
 */
function mounts(datei) {
  const quelle = ohneKommentare(lese(datei));
  const re = /\bapp\.(use|get|post|put|patch|delete|options|all)\(\s*(['"`])([^'"`]+)\2/g;
  const gefunden = new Set();
  let treffer;
  while ((treffer = re.exec(quelle)) !== null) {
    gefunden.add(`${treffer[1].toUpperCase()} ${treffer[3]}`);
  }
  return gefunden;
}

/**
 * Bekannte Abweichung, Stand 17.08.2026 (Issue #86).
 *
 * Diese Eintraege stehen absichtlich nur in server.js. Die Liste ist eine
 * Bestandsaufnahme, kein Freibrief: sie soll schrumpfen, nicht wachsen.
 * Wer hier etwas ergaenzt, sollte in der PR-Beschreibung sagen, warum die
 * Route im Test nicht erreichbar sein muss.
 *
 * 'USE /api/' ist NICHT mehr Teil dieser Liste: seit #86 mounten beide
 * Dateien requireTrustedSource auf genau diesem Pfad, der Mount ist also
 * keine Abweichung mehr (auch wenn die Ratenbegrenzung weiterhin nur in
 * server.js unter demselben Pfad haengt - die Textpruefung sieht nur den
 * Pfad, nicht die Anzahl oder den Zweck der Mounts dort).
 */
const BEKANNTE_ABWEICHUNG = [
  // Ratenbegrenzung - in app.js nicht vorhanden, daher ungetestet (#47)
  'USE /api/auth/',
  'USE /api/auth/login',
  'USE /api/auth/webauthn/',
  'USE /public/audio/',
  // Routen, die es in app.js nie gab
  'GET /api/blog/posts.json',
  'GET /api/design-system',
  'PUT /api/design-system/:id',
  'POST /api/csp-report',
  'USE /api/cache',
].sort();

describe('SECURITY: /public/audio wird nicht statisch ausgeliefert (Regression zu #46)', () => {
  // Bewusst KEIN supertest-Test gegen app.js: app.js mountet /public/audio
  // ueberhaupt nicht, ein 404 waere dort also immer erfuellt und wuerde nichts
  // beweisen. Genau solche Tests sind der Anlass fuer #47.
  const quelle = ohneKommentare(lese('server.js'));

  test('server.js mountet express.static nicht auf /public/audio', () => {
    const zeilen = quelle
      .split('\n')
      .filter((z) => z.includes('/public/audio') && z.includes('express.static'));

    expect(zeilen).toEqual([]);
  });

  test('server.js mountet express.static auf keinem Pfad unterhalb von public/', () => {
    const treffer = quelle.match(/express\.static\([^)]*public[^)]*\)/g) || [];

    expect(treffer).toEqual([]);
  });

  test('die geschuetzte Ersatzroute existiert weiterhin in routes/tracks.js', () => {
    // Ohne sie wuerde der obige Test auch bei einem kaputten Player gruen sein.
    const tracks = ohneKommentare(lese(pathReal.join('routes', 'tracks.js')));

    expect(tracks).toMatch(/router\.get\(\s*['"]\/audio\/:filename['"]/);
  });
});

describe('Paritaet der Routentabellen von app.js und server.js (#47)', () => {
  const inApp = mounts('app.js');
  const inServer = mounts('server.js');

  test('app.js findet ueberhaupt Mounts - die Extraktion funktioniert', () => {
    // Schutz gegen den peinlichsten Fehlerfall: ein kaputter regulaerer
    // Ausdruck liefert leere Mengen, alle Vergleiche werden trivial gruen.
    expect(inApp.size).toBeGreaterThan(5);
    expect(inServer.size).toBeGreaterThan(10);
  });

  test('keine Route existiert nur in app.js', () => {
    // Ein Treffer hier hiesse: die Tests pruefen etwas, das nicht ausgeliefert
    // wird. Das ist die gefaehrlichere Richtung der Abweichung.
    const nurApp = [...inApp].filter((m) => !inServer.has(m)).sort();

    expect(nurApp).toEqual([]);
  });

  test('nur in server.js: genau die bekannte Abweichung, nichts Neues', () => {
    const nurServer = [...inServer].filter((m) => !inApp.has(m)).sort();

    expect(nurServer).toEqual(BEKANNTE_ABWEICHUNG);
  });

  test('die Abweichungsliste enthaelt keine Eintraege mehr, die es nicht gibt', () => {
    // Wird eine Route in app.js nachgezogen, soll der Eintrag hier verschwinden
    // muessen - sonst verrottet die Liste und behauptet eine Luecke, die zu ist.
    const nurServer = new Set([...inServer].filter((m) => !inApp.has(m)));
    const verwaist = BEKANNTE_ABWEICHUNG.filter((m) => !nurServer.has(m));

    expect(verwaist).toEqual([]);
  });

  test('/api/ ist in beiden Dateien gemountet (Issue #86, requireTrustedSource)', () => {
    // Vor #86 stand 'USE /api/' in BEKANNTE_ABWEICHUNG - dort lag nur die
    // Ratenbegrenzung, die es in app.js nicht gibt. Seit #86 mounten beide
    // Dateien zusaetzlich requireTrustedSource auf demselben Pfad, daher ist
    // der Mount selbst keine Abweichung mehr.
    expect(inApp.has('USE /api/')).toBe(true);
    expect(inServer.has('USE /api/')).toBe(true);
  });
});

describe('DEBUG-Ausgabe laeuft nicht in Produktion (Regression zu #47)', () => {
  // Der Aufruf von debugDatabaseContent() stand ohne Bedingung in der
  // Startkette und lief damit auch auf dem Server mit. Aufgefallen ist es
  // erst beim Lesen einer echten Startausgabe.
  const quelle = ohneKommentare(lese('server.js'));

  test('debugDatabaseContent wird nur einmal aufgerufen', () => {
    const aufrufe = quelle.match(/await debugDatabaseContent\(\)/g) || [];

    expect(aufrufe).toHaveLength(1);
  });

  test('der Aufruf steht hinter einer NODE_ENV-Abfrage', () => {
    // Die drei Zeilen vor dem Aufruf muessen die Bedingung enthalten.
    const zeilen = quelle.split('\n');
    const i = zeilen.findIndex((z) => z.includes('await debugDatabaseContent()'));

    expect(i).toBeGreaterThan(-1);

    const davor = zeilen.slice(Math.max(0, i - 3), i).join('\n');

    expect(davor).toMatch(/NODE_ENV\s*!==\s*'production'/);
  });
});

describe('Produktionskonfiguration steht nur in server.js (Bestandsaufnahme zu #47)', () => {
  const server = ohneKommentare(lese('server.js'));
  const app = ohneKommentare(lese('app.js'));

  // Diese Tests behaupten NICHT, dass die Lage gut ist. Sie halten fest, was
  // heute ungetestet ist, damit die Behauptung "die Tests sind gruen" im
  // richtigen Umfang gelesen wird. Sie schlagen fehl, sobald etwas davon nach
  // app.js wandert - dann ist der Eintrag hier zu entfernen und ein echter
  // Test dafuer zu schreiben.
  const nurInServer = [
    ['Ratenbegrenzung', /const rateLimit = /],
    ['CORS-Herkunft fuer Produktion', /function getProductionOrigins/],
    ['CSP-Direktiven', /contentSecurityPolicy:\s*\{/],
    ['HSTS', /hsts:\s*\{/],
    ['statische Auslieferung des Frontends', /express\.static\(frontendPath\)/],
    ['USE_HTTPS-Verzweigung', /httpsOptions && USE_HTTPS/],
  ];

  test.each(nurInServer)('%s steht in server.js', (_name, muster) => {
    expect(server).toMatch(muster);
  });

  test.each(nurInServer)('%s fehlt in app.js und ist damit ungetestet', (_name, muster) => {
    expect(app).not.toMatch(muster);
  });
});

describe('Issue #86: validateCSRFToken ist keine echte CSRF-Pruefung mehr, requireTrustedSource ersetzt sie in beiden Dateien', () => {
  // Vorher stand hier die gegenteilige Behauptung: 'echte CSRF-Pruefung' war
  // in nurInServer gelistet, mit dem Muster /validateCSRFToken/, und ein
  // Test bestaetigte ausdruecklich, dass server.js dieses Muster enthaelt.
  // Das war die Stelle, die die kaputte Pruefung als funktionierend auswies.
  //
  // Diese Suite dreht die Behauptung um: validateCSRFToken/attachCSRFToken
  // duerfen in KEINER der beiden Dateien mehr vorkommen, und die neue
  // Middleware muss in BEIDEN stehen.
  const server = ohneKommentare(lese('server.js'));
  const app = ohneKommentare(lese('app.js'));

  test('server.js referenziert validateCSRFToken nicht mehr', () => {
    expect(server).not.toMatch(/validateCSRFToken/);
  });

  test('server.js referenziert attachCSRFToken nicht mehr', () => {
    expect(server).not.toMatch(/attachCSRFToken/);
  });

  test('app.js referenziert validateCSRFToken nicht mehr', () => {
    expect(app).not.toMatch(/validateCSRFToken/);
  });

  test('app.js referenziert attachCSRFToken nicht mehr', () => {
    expect(app).not.toMatch(/attachCSRFToken/);
  });

  test('server.js verwendet requireTrustedSource', () => {
    expect(server).toMatch(/requireTrustedSource/);
  });

  test('app.js verwendet requireTrustedSource', () => {
    expect(app).toMatch(/requireTrustedSource/);
  });
});
