# Sicherheitsänderungen: Einführung und Abnahme

Diese Änderungen bauen auf der gemeinsamen App-Fabrik aus PR #98 auf. Sie sind
Quellcodeänderungen, keine Bestätigung einer bereits umgestellten Produktion.
Die Anwendung ist weiterhin ein gemeinsamer Dienst mit Zugriff auf ihre
benötigten Tabellen; die spätere Trennung in mehrere Sicherheitsdomänen wird
hierdurch nicht vorweggenommen.

## Anmeldung und bestehende Konten

Zugriffstokens gelten 15 Minuten, enthalten Sitzungskennung und `token_version`
und werden bei jedem geschützten Zugriff gegen PostgreSQL geprüft. Die Rolle
kommt aus der aktuellen Benutzerzeile. Es gibt bewusst keinen lokalen Cache:
prozessübergreifender Widerruf geht hier vor einer ungeprüften Optimierung.
Datenbankausfall führt zur Verweigerung; die üblichen geschützten APIs liefern
503. Der öffentliche Audiozugang kann weiterhin die öffentliche Vorschau liefern.

Ein HttpOnly-Refresh-Cookie gilt höchstens sieben Tage. Sein zufälliger Wert wird
nur als SHA-256 gespeichert und beim Erneuern atomar ersetzt. Ein alter Wert ist
nicht erneut verwendbar. Dies ist noch keine vollständige Erkennung gestohlener
Refresh-Token-Familien: Ein erfolgreich gestohlener aktueller Wert kann bis zum
Widerruf verwendet werden. Die Sitzung wird bei jeder Benutzung zusätzlich auf
Aktivität, Ablauf und Kontoversion geprüft.

Passwort-, Rollen- und Aktivitätsänderungen erhöhen die Version durch einen
Datenbanktrigger. `/api/auth/logout-all` erhöht sie ausdrücklich. Normales Logout
löscht die aktuelle Sitzung. Alte, unversionierte JWTs gelten nach dem Wechsel
nicht mehr. Alle Personen müssen sich neu anmelden. JSON-Antworten enthalten
keine Anmeldungstokens; die Webseiten entfernen alte Browserkopien.

WebAuthn verwendet die Bibliotheksprüfung für Signatur, Challenge, Ursprung,
RP-ID, Benutzerverifikation und Zähler. Challenges laufen nach fünf Minuten ab
und werden vor der Prüfung genau einmal aus der Datenbank entnommen. Die frühere
pauschale Ausgabe aller Gerätekennungen entfällt. Neue Passkeys müssen auffindbar
sein (`residentKey: required`); ältere nicht auffindbare Passkeys benötigen eine
Anmeldung über Passwort/E-Mail. Das Ergänzen weiterer Passkeys in einem
bestehenden Konto hat noch keinen eigenen Bedienablauf. Alte Base64url-Schlüssel
in der BYTEA-Spalte werden weiterhin gelesen; neue Schlüssel sind echte COSE-Bytes.

E-Mail-Anmeldungen und Passwortzurücksetzungen nutzen neue, gehashte,
zweckgebundene Einmaltokens mit 15 Minuten Laufzeit. Alte Links werden ungültig.
Ohne eingerichtetes SMTP wird kein Ersatz-Token im Browser oder Log ausgegeben.
E-Mail-Anmeldung erfolgt nach ausdrücklichem Klick auf der Zielseite, nicht durch
GET oder einen Linkscanner. Die bestehende allgemeine Registrierung bestätigt
weiterhin nicht den Besitz einer E-Mail-Adresse; eine E-Mail-Verifikation ist
separat zu entwickeln, bevor diese Adresse als bestätigte Identität dient.

## Reihenfolge im Betrieb

1. Datenbanksicherung und Wiederherstellung in einer getrennten Testumgebung
   prüfen. Einen Wartungszeitraum vorsehen: alte und neue Backend-Versionen
   dürfen während dieser Migration nicht gemischt laufen.
2. `database-bootstrap.sql` mit `psql -v database=... -v app_role=... -v
   migration_role=...` als Administrator anwenden. Neue Rollen erhalten ihre
   Passwörter über `psql` und `\password`, nicht über Kommandozeilenargumente.
3. `database-grants.sql` auf der ausschließlich dieser Anwendung gewidmeten
   Datenbank mit denselben Rollen anwenden. Es überträgt Eigentum an die
   Migrationsrolle, entfernt öffentliche Rechte und verweigert eine App-Rolle,
   die Mitglied anderer Rollen ist. Eigentumswechsel vorher anhand der echten
   Rollen und Objekte prüfen. Keine gemeinsam mit Fremdanwendungen benutzte DB!
4. `schema_clean.sql` als Migrationsrolle einlesen. Wiederholungen ändern keine
   Nutzdaten; vorhandene Constraints werden nicht erneut angelegt. Die bereits
   vorhandenen Herkunftsnachweis-Migrationen im Wurzelverzeichnis behalten ihre
   eigene bisherige Einführungsreihenfolge.
5. Im Backend `npm run migrate` mit separatem `MIGRATION_DB_USER` und
   `MIGRATION_DB_PASSWORD` aus dem Secret-Manager ausführen. Zugangsdaten nicht in
   Shell-Historie schreiben. Der Läufer nutzt ein Advisory Lock, Transaktionen
   und gespeicherte Prüfsummen. Die Runtime bekommt diese Zugangsdaten nicht.
6. `database-grants.sql` erneut anwenden, damit neue Zustandstabellen ihre
   ausdrücklichen DML-Rechte bekommen. App darf weder CREATE, ALTER, DROP,
   TRUNCATE, Rechteweitergabe noch Zugriff auf `schema_migrations` haben.
7. Frontend und Backend gemeinsam veröffentlichen. `DB_SSL=off` ist nur für
   Socket/Loopback erlaubt. Für entfernte PostgreSQL-Server `verify-full` und
   gegebenenfalls `DB_SSL_CA` (PEM) oder `DB_SSL_CA_FILE` setzen. `true`, `false`
   und ungeprüftes `require` sind keine gültigen Modi mehr.
8. nginx aus der Vorlage über `render-nginx.cjs <domain> <env-file>` erzeugen,
   `nginx -t` ausführen und erst dann neu laden. Node bleibt auf Loopback und
   verwendet hinter nginx `USE_HTTPS=false`. Der Loopback-Proxy ist die einzige
   vertraute Quelle für weitergeleitete Protokoll-/Clientdaten.
9. Anmeldung, Erneuerung, Logout, Kontoabschaltung, Passwortzurücksetzung,
   Passkey-Anmeldung, Kaufzugriff und Vorschau mit getrennten Testkonten prüfen.
   Nach Prozessneustart müssen begonnene Challenges und Downloadfreigaben
   innerhalb ihrer Ablaufzeit noch bestehen. Downloadlinks verlangen jetzt
   zusätzlich die Anmeldung des ursprünglichen Käufers.

Session-, Challenge-, Account-Link- und Downloadzustand liegt in PostgreSQL.
Ablaufprüfungen erfolgen bei jedem Zugriff; regelmäßige Löschläufe dienen nur der
Speicherbereinigung. Die Ratenbegrenzung ist weiterhin pro Prozess. Daher bleibt
PM2 vorerst bei einer Instanz: dauerhafte Sitzungen allein machen die gesamte
Anwendung noch nicht clusterfähig.

## Medien, Cache, TLS und lokale Zertifikate

Nur die öffentliche Trackliste und die bisherigen ausdrücklich öffentlichen
Inhaltsrouten nutzen den Anwendungscache. Cookies oder Authorization umgehen
Lesen und Schreiben; Fehler und Antworten mit Set-Cookie werden nicht gespeichert.
Statuscodes bleiben erhalten. Audio, einschließlich kostenloser Vollfassungen,
wird konservativ nicht gemeinsam zwischengespeichert. Das kostet Bandbreite,
verhindert aber eine spätere Freigabe personalisierter Bytes durch Proxy/CDN.
nginx-API-Präfixe verwenden `^~`; MP3 ist keine statische Asset-Ausnahme mehr.

HSTS wird für App und nginx aus derselben Hilfsfunktion konfiguriert. Standard:
300 Sekunden, keine Subdomains, kein Preload. Das Headerwort `preload` trägt eine
Domain nicht automatisch in Browserlisten ein. Die tatsächliche Aufnahme und
eine spätere Entfernung sind eigene, zeitverzögerte Vorgänge. Erst nach Prüfung
aller Subdomains und dauerhaft korrektem HTTPS erweitern.

Versionierte localhost-Zertifikate werden entfernt. Ihre früheren privaten
Schlüssel gelten als veröffentlicht und werden nicht erneut verwendet. Die
zugehörige CA muss ein Angreifer nicht besitzen, um den bereits veröffentlichten
privaten Blatt-Schlüssel zusammen mit dessen gültigem Zertifikat zu benutzen;
entscheidend ist, ob ein Client dieser CA vertraut. In der Entwicklung neue
Zertifikate erzeugen, betroffene alte Vertrauensstellungen prüfen. Historie wird
hier nicht umgeschrieben. `docs/SETUP-WINDOWS.md` enthält die neuen Befehle.

## Prüfungen und Rückweg

- `npm run test:ci` im Backend: Routentests, Cache, echte HTTP-/HTTPS-App und
  echte TLS-Handshakes des PostgreSQL-Treibers.
- `npm run test:integration`: nur mit wegwerfbarer lokaler `*_test`-Datenbank.
  Testet reale SQL-Constraints, Trigger, Einmalverbrauch, Kontowiderruf,
  Passwortreset und tatsächlich signierte WebAuthn-Antworten. Die CI verwendet
  PostgreSQL 16. Ein optionaler lokaler PGlite-Lauf ersetzt nicht die CI-Prüfung
  von Netzverbindung, Advisory Locks und Rollenrechten.
- `backend/integration/database-roles.sh`: echte PostgreSQL-Rollen mit erlaubten
  und ausdrücklich verbotenen Operationen; Sonderzeichen in Rollennamen.
- `npm run test:nginx`: geladene nginx-Vorlage, echte HTTP-/TLS-Verbindungen,
  funktionierender positiver Cache-Kontrollfall und Käufer/Gast an denselben
  Medien-URLs mit GET, HEAD und Range.
- `npm test` und `npm run build` im Frontend: Cookie-Erneuerung, keine lokalen
  Zugangstokens, gleichzeitige Aufrufe und Syntax der klassischen Seitenskripte.

Ein Rückweg darf den früheren ungesicherten Anmeldepfad nicht wieder freischalten.
Bei Fehlern im Wartungsmodus bleiben, Datenbankzustand sichern und vorwärts
korrigieren. Neue Tabellen können bestehen bleiben; keine automatische
Datenlöschung beim Rollback. Prüfungen mit Testdaten sind keine Bestätigung der
wirklichen Produktionskonfiguration.

## Noch betriebsabhängig

#70/#2 bleiben für den Abgleich historisch veröffentlichter Geheimnisse und die
Rotation offen. Dazu gehört das abweichende frühere Datenbankpasswort aus der
PDF und die Klärung des alten Produktionsschlüssels. Weder GitHub-Verbergen noch
Wayback-Sperren ersetzen eine Rotation. Ohne Zugang zum tatsächlichen Secret-
Manager, Host und Provider kann dieser PR deren Durchführung nicht bestätigen.
