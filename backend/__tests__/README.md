# Backend-Tests

Stand: 16.08.2026 — **150 Tests in 5 Suiten**, alle grün.

## Ausführen

```bash
cd backend
npm ci                # exakt die Fassungen aus package-lock.json
npm test              # alle Tests einmalig
npm run test:watch    # interaktiv
npm run test:coverage # mit Abdeckungsbericht
```

`npm install` statt `npm ci` schreibt die `package.json` um und hat schon
einmal einen Konflikt beim nächsten `git pull` verursacht.

## Die sieben Suiten

| Datei | Prüft |
|---|---|
| `auth.test.js` | Anmeldung, Registrierung, Token, `GET /api/auth/me` |
| `tracks.test.js` | Trackliste, Detailseite, Genres, **Zugriffsschutz auf Audiodateien** |
| `payments.test.js` | PayPal-Bestellung, Freischaltung, `PAYMENTS_ENABLED`, **Preisautorität** |
| `password-policy.test.js` | die Passwortregel als eigenes Modul |
| `audio-rate.test.js` | Datenrate aus dem Dateikopf — **ohne fs-Mock, mit echten Dateien** |
| `server-paritaet.test.js` | **Abweichung zwischen `app.js` und `server.js`** — statische Quelltextprüfung, kein HTTP |
| `design-tokens-css.test.js` | CSS-Aufbau aus einem Datenbanksatz — reine Funktion, keine Datenbank (Issue #67) |

## Strategie

Drei der sieben Suiten **mocken `db.js`** (`pool.query`), damit keine echte
PostgreSQL-Verbindung nötig ist — `auth`, `tracks` und `payments`:

- Tests laufen ohne laufende Datenbank, auch in GitHub Actions
- jeder Test bestimmt genau, was die Datenbank „zurückgibt"
- keine Testdaten müssen angelegt und aufgeräumt werden

`audio-rate.test.js` bricht damit bewusst. Dort geht es darum, ob sich aus
echten Bytes die richtige Datenrate lesen lässt. Ein Mock könnte nur
bestätigen, was der Test ohnehin annimmt. Die Suite legt deshalb echte
Dateien in einem temporären Verzeichnis an und liest sie zurück.

`password-policy.test.js` und `design-tokens-css.test.js` brauchen keine
Datenbank, weil sie reine Module prüfen. `server-paritaet.test.js` lädt weder
`app.js` noch `server.js`, sondern liest beide als Text — Begründung im Kopf
der Datei.

Das ist kein Zufall, sondern die Lehre aus #67: der Escaping-Fehler im
CSS-Aufbau hat monatelang überlebt, weil die Funktion mitten in `server.js`
stand und dort nicht prüfbar war. Als eigenes Modul war sie in einer
Viertelstunde abgedeckt. **Was geprüft werden soll, muss sich einzeln laden
lassen.**

## Zwei Fallen, in die wir schon getappt sind

### `jest.clearAllMocks()` leert die Once-Warteschlange nicht

`mockResolvedValueOnce` reiht Antworten auf. `clearAllMocks()` setzt
Aufrufzähler zurück, **nicht** diese Warteschlange. Bricht ein Test vorzeitig
ab, verschiebt sich alles Folgende um eine Antwort — und man sucht den Fehler
in acht Tests, die nichts miteinander zu tun haben.

Deshalb steht in jedem `beforeEach`:

```js
beforeEach(() => { jest.clearAllMocks(); pool.query.mockReset(); });
```

### Getestet wird `app.js`, ausgeliefert wird `server.js`

Drei der sechs Suiten laden `../app` (103 Zeilen). Der Server startet
`server.js` (939 Zeilen). Was nur in `server.js` steht, sieht kein Test.

Das war kein theoretisches Problem: die ungeschützte Auslieferung unter
`/public/audio` stand in `server.js` und war für die Testsuite unsichtbar.
Sechs grüne Tests mit „SECURITY" im Namen prüften eine Route, die der Player
gar nicht aufrief.

Seit `server-paritaet.test.js` ist die Abweichung wenigstens **eingefroren**:
zehn Mounts stehen dort als bekannte Abweichung, und jeder neue Mount, der nur
in `server.js` auftaucht, lässt die Suite fehlschlagen. Behoben ist damit
nichts — nur sichtbar gemacht.

Siehe **Issue #47**. Solange die beiden Dateien auseinanderlaufen, sagt eine
grüne Suite weniger, als sie zu sagen scheint.

## Weitere Hinweise

- `jest --runInBand`: seriell, damit nicht mehrere Express-Instanzen
  gleichzeitig starten
- **`server.js` lässt sich nicht in einem Test laden.** Frühere Fassungen dieser
  Datei behaupteten, `NODE_ENV=test` verhindere den Listener. Das trifft nicht
  zu: `server.js` enthält keinen `require.main`-Schutz und keine
  `NODE_ENV === 'test'`-Abfrage vor `listen()`. Beim Import läuft
  `warmupDatabase().then(...)` sofort los, danach `verifyMailer()` und
  `listen(PORT)`. Nachgestellt mit
  `NODE_ENV=test node -e "require('./server.js')"`: der Aufruf kommt nicht
  zurück, weil er auf die Datenbank wartet. Deshalb prüft
  `server-paritaet.test.js` den **Quelltext** statt das Modul zu laden.
- Die Anmeldung ist auf 5 Versuche pro Minute begrenzt. Tests gegen einen
  **echten** Server brauchen deshalb Pausen; die gemockten Suiten nicht.

## Was noch fehlt

1. Tests, die gegen `server.js` **laufen** statt seinen Quelltext zu lesen
   (Issue #47). Voraussetzung dafür ist, dass `server.js` auf `app.js` aufbaut
   und `listen()` hinter einem `require.main`-Schutz liegt
2. Ende-zu-Ende-Test der Kaufkette von der Bestellung bis zum Download
   (Issue #16)
3. Tests für den Admin-Upload — die Preispflicht und die serverseitige
   Dauermessung sind bisher nur von Hand geprüft

## Eine dritte Falle: der leere Durchlauf

`design-tokens-css.test.js` enthält einen Test namens „es gibt überhaupt
Deklarationszeilen", `server-paritaet.test.js` einen namens „die Extraktion
funktioniert". Beide prüfen nichts Fachliches, sondern nur, dass die
nachfolgenden Prüfungen überhaupt etwas zu tun bekommen.

Der Grund ist beim Nachstellen von #67 sichtbar geworden: mit dem alten,
fehlerhaften Aufbau bestand die Ausgabe aus einer einzigen Zeile. Die
Zeilenliste war damit leer, und alle Schleifen `for (const zeile of inhalt)`
liefen grün durch, weil es nichts zu prüfen gab. Erst der Mindestzahl-Test
hat den Fehler gemeldet.

**Wo eine Prüfung über eine Liste läuft, gehört ein Test dazu, der die Liste
nicht leer sein lässt.**
