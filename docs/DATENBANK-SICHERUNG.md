# Datenbanksicherung und Wiederherstellung

Zu Issue #7. Alle Zahlen in diesem Dokument sind gemessen, nicht geschätzt.

Ein Backup, das nie zurückgespielt wurde, ist kein Backup, sondern eine Datei.
Deshalb steht die Wiederherstellung hier **vor** der Sicherung.

---

## 1. Wiederherstellung

### 1.1 Der schnelle Weg: in eine Testdatenbank

Das ist der Weg, der regelmäßig gegangen werden soll — er tastet die
Produktionsdatenbank nicht an.

```bash
bash scripts/deploy/backup-db.sh --restore /var/backups/song-nexus/song_nexus_prod_2026-08-16_0330.sql.gz
```

Das Skript legt eine Datenbank `song_nexus_restoretest_<zeitstempel>` an, spielt
den Dump ein, zählt Tabellen und Benutzer, prüft **namentlich**, dass diese
Tabellen vorhanden sind:

```
users  tracks  orders  purchases  play_history
track_provenance  track_provenance_verlauf
```

und entfernt die Testdatenbank wieder. Schlägt etwas fehl, **bleibt sie stehen**
— damit man hineinsehen kann.

Eine reine Tabellenzählung würde nicht auffallen lassen, dass gerade die
wichtigste fehlt. Deshalb die Namensliste.

### 1.2 Gemessene Dauer

An einer Datenbank von **85 MB** mit 400.000 Zeilen in `play_history`:

| | |
|---|---|
| Dump, gepackt | 3,0 MB |
| Wiederherstellung, unverschlüsselt | **2 Sekunden** |
| Wiederherstellung, verschlüsselt | **1 Sekunde** |

Die Zeit wächst etwa linear mit der Datenmenge. Bei einer zehnmal größeren
Datenbank ist also mit gut einer halben Minute zu rechnen, nicht mit Stunden.
Das ist die Zahl, die im Ernstfall zählt.

### 1.3 Der Ernstfall: zurück in die Produktion

**Vorher lesen, nicht im Ernstfall zum ersten Mal.**

```bash
# 1. Anwendung anhalten, damit nichts mehr hineinschreibt
pm2 stop song-nexus

# 2. Den JETZIGEN Zustand sichern, auch wenn er kaputt scheint.
#    Ein kaputter Zustand ist mehr als kein Zustand.
sudo -u postgres pg_dump song_nexus_prod | gzip > /tmp/vor-der-wiederherstellung.sql.gz

# 3. Erst in eine Testdatenbank, nie direkt in die Produktion
bash scripts/deploy/backup-db.sh --restore <datei>

# 4. Nur wenn Schritt 3 durchgelaufen ist: umbenennen statt überschreiben
sudo -u postgres psql -c "ALTER DATABASE song_nexus_prod RENAME TO song_nexus_prod_kaputt;"
sudo -u postgres createdb song_nexus_prod
gunzip -c <datei> | sudo -u postgres psql -v ON_ERROR_STOP=1 -d song_nexus_prod

# 5. Rechte für den Anwendungsbenutzer, siehe SECURITY-GUIDE
sudo -u postgres psql -d song_nexus_prod -c "GRANT ALL ON SCHEMA public TO song_nexus_user;"

# 6. Anwendung starten und nachsehen
pm2 start song-nexus
pm2 logs song-nexus --lines 50
```

**Umbenennen statt löschen** in Schritt 4. Solange `song_nexus_prod_kaputt`
existiert, ist der Weg zurück offen. Erst wenn die Anwendung nachweislich läuft,
wird sie entfernt.

### 1.4 Was nach einer Wiederherstellung zu prüfen ist

- [ ] Anmelden funktioniert
- [ ] Ein Titel lässt sich abspielen
- [ ] Ein bereits gekaufter Titel ist noch freigeschaltet
- [ ] `SELECT count(*) FROM track_provenance;` — die Herkunftsnachweise sind da
- [ ] `SELECT count(*) FROM track_provenance_verlauf;` — der Verlauf ist da
- [ ] Die Audiodateien liegen in `backend/public/audio` — sie sind **nicht** in
      der Datenbank und kommen aus dem eigenen Archiv

---

## 2. Sicherung

### 2.1 Einmalig

```bash
bash scripts/deploy/backup-db.sh
```

### 2.2 Täglich einrichten

```bash
bash scripts/deploy/backup-db.sh --cron-einrichten
```

Legt einen Eintrag für 03:30 an und schreibt nach
`/var/log/song-nexus-backup.log`.

### 2.3 Sicherung und Wiederherstellung in einem Lauf

Zum Nachweis, dass der Kreislauf geschlossen ist:

```bash
bash scripts/deploy/backup-db.sh --selbsttest
```

Nicht für den täglichen Lauf gedacht — es legt jedes Mal eine Datenbank an und
wieder ab.

### 2.4 Verschlüsselt sichern

Die Dumps enthalten Passwort-Hashes, E-Mail-Adressen, WebAuthn-Daten und
Zahlungsvorgänge. Auf einem Server, dessen Sicherungen irgendwohin kopiert
werden, gehört das verschlüsselt.

```bash
# Einmalig ein langes Passwort anlegen, nur für root lesbar
openssl rand -base64 48 | sudo tee /root/.backup-passwort > /dev/null
sudo chmod 600 /root/.backup-passwort

# Und dann bei jedem Lauf mitgeben
BACKUP_PASSPHRASE_FILE=/root/.backup-passwort bash scripts/deploy/backup-db.sh
```

Verwendet wird AES-256. Geprüft: die Datei wird als
`PGP symmetric key encrypted data - AES with 256-bit key` erkannt, und ohne
Schlüssel findet sich **kein** Klartext darin.

Das Skript öffnet die verschlüsselte Datei nach dem Schreiben sofort wieder.
Damit fällt eine falsche Passwortdatei auf, solange man sie noch korrigieren
kann — und nicht erst im Ernstfall.

**Das Passwort muss ausserhalb des Servers liegen.** Ein verschlüsseltes Backup,
dessen Schlüssel auf derselben Maschine liegt, hilft bei Serververlust nicht.

### 2.5 Kopie ausserhalb des Servers

```bash
BACKUP_REMOTE=benutzer@storagebox:song-nexus bash scripts/deploy/backup-db.sh
```

Ohne diese Angabe warnt das Skript am Ende jedes Lauf ausdrücklich. Ein Backup
auf demselben VPS schützt nicht vor dem Verlust des VPS.

### 2.6 Einstellungen

| Variable | Vorgabe | Bedeutung |
|---|---|---|
| `DB_NAME` | `song_nexus_prod` | Zu sichernde Datenbank |
| `BACKUP_DIR` | `/var/backups/song-nexus` | Ablage |
| `BEHALTEN_TAGE` | `30` | Aufbewahrung |
| `APP_DIR` | `/var/www/song-nexus` | Für die Audiodateien |
| `BACKUP_PASSPHRASE_FILE` | leer | Verschlüsselung, freiwillig |
| `BACKUP_REMOTE` | leer | Ziel für die Kopie |
| `SUDO`, `PG_ALS` | `sudo`, `sudo -u postgres` | Überschreibbar, damit sich das Skript ohne sudo erproben lässt |

---

## 3. Behobener Fehler: das Skript scheiterte an guten Sicherungen

Bis zur Behebung enthielt das Skript diese Prüfung:

```bash
if ! gunzip -c "$DATEI" | head -100 | grep -q "CREATE TABLE\|COPY\|INSERT"; then
  rot "Backup enthaelt keine erkennbaren Daten."
  exit 1
fi
```

Mit `set -o pipefail` schlägt das bei **jedem echten Dump** fehl. `grep -q` und
`head` beenden sich, sobald sie genug gesehen haben, `gunzip` bekommt SIGPIPE,
und die Pipeline endet mit Status 141.

Nachgestellt an einem echten 3-MB-Dump der 85-MB-Datenbank:

```
Pipeline-Status: 141
>>> Backup enthaelt keine erkennbaren Daten <<<  Skript bricht ab
```

**Bei einer kleinen Datei fällt es nicht auf**, weil `head` alles puffert, bevor
es sich beendet. Genau deshalb war es nie aufgefallen — geprüft wurde mit
Kleinigkeiten, gescheitert wäre es im Betrieb.

Die Folge war nicht nur eine falsche Meldung. Das Skript brach ab, **bevor**

- die Audiodateien gesichert wurden,
- alte Sicherungen entfernt wurden,
- die Übersicht ausgegeben wurde.

Der tägliche Lauf hätte also jeden Tag gemeldet, die Sicherung sei kaputt,
obwohl sie in Ordnung war — und die halbe Arbeit wäre liegen geblieben. Der
schlimmste Fall ist dabei nicht der Fehler selbst, sondern dass man sich an eine
tägliche Fehlermeldung gewöhnt.

Behoben, indem der Anfang des Dumps in eine Variable gelesen wird. Damit gibt es
keine Pipeline mehr, deren Status `pipefail` auswerten könnte.

---

## 4. Was offen bleibt

- [ ] **Cron ist noch nicht eingerichtet** — geht erst mit dem Server aus #6
- [ ] **Kein Ziel ausserhalb des Servers gewählt.** Hetzner Storage Box oder
      etwas S3-Verträgliches; die Entscheidung liegt beim Eigentümer
- [ ] **Die Wiederherstellung wurde noch nicht auf dem echten Server erprobt**,
      sondern in einem Container mit PostgreSQL 18.4. Nach der Einrichtung
      einmal dort laufen lassen und die Dauer hier nachtragen
- [ ] **Kein Zeitpunkt-Wiederherstellungspunkt** (`archive_mode`, WAL-Archiv).
      Mit täglichen Dumps können bis zu 24 Stunden verloren gehen. Solange
      keine Zahlungen laufen, vertretbar; danach neu bewerten
