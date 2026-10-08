# Backend-Tests

Stand: 8. Oktober 2026. Betrieb und Tests verwenden seit #47 dieselbe
`createApp()` aus `backend/app.js`. Die Testzahl steht im jeweiligen CI-Lauf.

## Ausführen

```bash
cd backend
npm ci
npm test
npm run test:handles
```

`npm ci` installiert die Fassungen aus `package-lock.json`. Die Tests benötigen
keine laufende PostgreSQL-Datenbank, SMTP-Verbindung oder PayPal-Zugangsdaten.

## Gemeinsamer Anwendungspfad

- `createApp(options)` registriert sämtliche Middleware und Routen.
- `createServer(options)` aus `server.js` verbindet genau diese App mit einem
  HTTP- oder HTTPS-Server; es startet noch keinen Listener.
- `startServer()` lädt die Umgebung, öffnet das rotierende Zugriffsprotokoll,
  führt DB-Warmup und Mailer-Prüfung aus und startet den Listener.
- `node server.js` ruft `startServer()` hinter einem `require.main`-Schutz auf.
  Ein Import führt weder Warmup noch Zertifikatszugriff noch Listenerstart aus.

Die Fabrikoptionen sind `frontendPath`, `accessLogStream` und
`consoleLogging`. Umgebungsvariablen wie `NODE_ENV`, `ALLOWED_ORIGINS` und
die Secrets werden wie im Betrieb ausgewertet. Es gibt keinen Schalter, der
in Tests die Sicherheitsmiddleware abschaltet. Ratenzähler gehören zur App;
`app.locals.dispose()` beendet deren Cleanup-Timer. Der Server ruft dies beim
Schließen auf. Ein injizierter Logstream gehört dem Aufrufer; der Startpfad
öffnet und schließt seinen eigenen Stream.

`USE_HTTPS=true` erfordert lesbare und gültige lokale Zertifikate.
Bei `USE_HTTPS=false` startet Node ohne mkcert-Dateien, etwa hinter dem
TLS-Endpunkt nginx. Sichere Session-Cookies bleiben eingeschaltet. Die
effektive Proxy-Vertrauenseinstellung und der nginx-Ende-zu-Ende-Pfad werden
weiterhin unter #38/#97 bearbeitet.

## Was tatsächlich geprüft wird

| Suite | Schwerpunkt |
| --- | --- |
| `auth.test.js` | Anmeldung, Registrierung, Token, Profil, entfernter dev-login |
| `auth-admin.test.js` | aktuelle DB-Rolle und Aktivstatus statt alter JWT-Rolle |
| `tracks.test.js` | Katalog, Details und Audio-Kaufschutz |
| `payments.test.js` | Bestellungen, Freischaltung, Featureflag und Preisautorität |
| `server-integration.test.js` | Produktions-App, echter HTTP(S)-Server, Startup, CORS, Herkunftsprüfung, Rate-Limits, CSP/HSTS, Cookies, statische Dateien |
| `request-source-middleware.test.js` | Herkunftsprüfung mit kontrollierten Headern |
| übrige Suiten | Passwortregel, Audiokopf, CSS-Erzeugung und weitere reine Funktionen |

Die alte `server-paritaet.test.js` fror 28 Quelltextprüfungen und bekannte
Abweichungen ein. Sie ist durch HTTP-Integrationstests ersetzt. Insbesondere
legt die Regression für `/public/audio/...` eine echte synthetische Audiodatei
im Backend ab: Ein 404 ist damit kein Test gegen ein ohnehin leeres Verzeichnis.

Der HTTPS-Test erzeugt sein Zertifikat im Speicher und vertraut nur diesem
Zertifikat. Es werden keine Produktionsschlüssel geladen und keine globalen
TLS-Prüfungen abgeschaltet. Die Tests binden ausschließlich lokale temporäre
Ports. Der echte Startpfad wird mit gemocktem Pool, Mailer und Logstream geprüft.

## Grenzen und Testpflege

Routentests mocken DB- und Zahlungsantworten; sie beweisen keine realen
SQL-Grants oder PayPal-Abläufe. Die Herkunftsprüfung bekommt in
`jest.setup.js` eine lokale Standard-Origin, sofern ein Test keinen eigenen
Header setzt. Produktionstests setzen ihre Header ausdrücklich; auch der Fall
ohne Herkunft wird geprüft.

`jest.clearAllMocks()` leert keine `mockResolvedValueOnce`-Warteschlange.
Daher vor jedem Test zusätzlich `pool.query.mockReset()` verwenden.
Dateisystem-Mocks sollten nur die benötigten Audiooperationen ersetzen; ein
unvollständiger globaler fs-Mock verfälscht nun auch die echte statische
Auslieferung.

Offen bleiben unter anderem echte nginx-/Cache-Integration (#93/#96/#97),
durchgängiger Widerruf (#83), Cookie-Migration (#42), DB-TLS (#94),
Datenbankrechte (#43) und die vollständige Kauf-/Downloadkette (#16).
