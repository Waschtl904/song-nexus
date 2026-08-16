#!/usr/bin/env bash
# ============================================================================
# Datenbank-Backup mit Pruefung der Wiederherstellbarkeit (Issue #7)
# ============================================================================
#   bash backup-db.sh                     einmaliges Backup
#   bash backup-db.sh --cron-einrichten   taeglich um 03:30 einrichten
#   bash backup-db.sh --restore <datei>   Wiederherstellung testen
#   bash backup-db.sh --selbsttest        Dump und Wiederherstellung in einem Lauf
#
# Ein Backup, das nie zurueckgespielt wurde, ist kein Backup, sondern eine
# Datei. Deshalb prueft dieses Skript nach jedem Lauf, ob das Ergebnis lesbar
# ist, und --selbsttest spielt einen vollstaendigen Kreislauf durch.
#
# ---------------------------------------------------------------------------
# BEHOBENER FEHLER (Issue #7)
#
# Die Pruefung "enthaelt der Dump erkennbare Daten" lautete:
#
#     if ! gunzip -c "$DATEI" | head -100 | grep -q "CREATE TABLE\|COPY\|INSERT"
#
# Mit `set -o pipefail` schlaegt das bei jedem ECHTEN Dump fehl. `grep -q` und
# `head` beenden sich, sobald sie genug gesehen haben, `gunzip` bekommt SIGPIPE
# und die Pipeline endet mit 141. Nachgestellt mit einem 20-MB-Dump:
#
#     Pipeline-Status: 141
#     >>> Backup enthaelt keine erkennbaren Daten <<<  (exit 1)
#
# Bei einer kleinen Datei faellt es nicht auf, weil `head` alles puffert, bevor
# es sich beendet. Genau deshalb war es nie aufgefallen.
#
# Folge war nicht nur eine falsche Meldung: das Skript brach ab, BEVOR die
# Audiodateien gesichert und alte Backups entfernt wurden. Der taegliche
# Cron-Lauf hat also gemeldet, dass die Sicherung kaputt ist, obwohl sie in
# Ordnung war -- und die halbe Arbeit blieb liegen.
#
# Behoben, indem der Anfang des Dumps in eine Variable gelesen wird. Damit gibt
# es keine Pipeline mehr, deren Status pipefail auswerten koennte.
# ---------------------------------------------------------------------------
set -euo pipefail

DB_NAME="${DB_NAME:-song_nexus_prod}"
ZIEL="${BACKUP_DIR:-/var/backups/song-nexus}"
# 30 Tage, wie in #7 gefordert. Vorher standen hier 14.
BEHALTEN_TAGE="${BEHALTEN_TAGE:-30}"
APP_DIR="${APP_DIR:-/var/www/song-nexus}"

# Ueberschreibbar, damit das Skript ohne sudo und ohne den Systembenutzer
# `postgres` pruefbar ist -- etwa in einem Container. Ohne diese beiden
# Variablen liesse sich #7 nicht erfuellen, weil sich die Wiederherstellung
# nirgends erproben liesse.
SUDO="${SUDO-sudo}"
PG_ALS="${PG_ALS-sudo -u postgres}"

# Verschluesselung. Dumps enthalten Passwort-Hashes, E-Mail-Adressen,
# WebAuthn-Daten und Zahlungsvorgaenge. Absichtlich freiwillig und nicht
# erzwungen: ein Backup, das wegen eines fehlenden Schluessels gar nicht
# entsteht, ist schlechter als ein unverschluesseltes. Aber es wird laut
# gewarnt, wenn es fehlt.
PASSWORTDATEI="${BACKUP_PASSPHRASE_FILE:-}"

# Kopie ausserhalb des Servers. Ein Backup auf demselben VPS schuetzt nicht
# vor dem Verlust des VPS.
FERNZIEL="${BACKUP_REMOTE:-}"

gruen() { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
rot()   { printf '\033[0;31m✗ %s\033[0m\n' "$*"; }
warn()  { printf '\033[0;33m! %s\033[0m\n' "$*"; }

# ----------------------------------------------------------------------------
# Prueft, ob ein gepackter Dump erkennbare Daten enthaelt.
# Ohne Pipeline, siehe Fehlerbeschreibung im Kopf.
# ----------------------------------------------------------------------------
enthaelt_daten() {
  local datei="$1" kopf
  # 200 KB entpacken reichen weit ueber den Kopf jedes pg_dump hinaus.
  kopf=$($SUDO dd if="$datei" bs=1024 count=200 2>/dev/null | gunzip -c 2>/dev/null || true)
  [[ "$kopf" == *"CREATE TABLE"* || "$kopf" == *"COPY "* || "$kopf" == *"INSERT INTO"* ]]
}

# --- Cron einrichten --------------------------------------------------------
if [[ "${1:-}" == "--cron-einrichten" ]]; then
  SKRIPT="$(readlink -f "$0")"
  ZEILE="30 3 * * * bash $SKRIPT >> /var/log/song-nexus-backup.log 2>&1"
  if $SUDO crontab -l 2>/dev/null | grep -qF "$SKRIPT"; then
    gruen "Cron-Eintrag existiert bereits"
  else
    ($SUDO crontab -l 2>/dev/null || true; echo "$ZEILE") | $SUDO crontab -
    gruen "Taegliches Backup um 03:30 eingerichtet"
  fi
  $SUDO crontab -l | grep -F "$SKRIPT"
  echo
  warn "Bitte in vier Wochen eine Wiederherstellung testen:"
  echo "    bash $SKRIPT --restore <datei>"
  exit 0
fi

# --- Wiederherstellung testen ----------------------------------------------
if [[ "${1:-}" == "--restore" ]]; then
  DATEI="${2:-}"
  [[ -f "$DATEI" ]] || { rot "Datei nicht gefunden: $DATEI"; exit 1; }
  TESTDB="song_nexus_restoretest_$(date +%s)"
  echo "Spiele $DATEI in die Testdatenbank $TESTDB ein."
  echo "Die Produktionsdatenbank wird dabei nicht angetastet."

  BEGINN=$(date +%s)
  $PG_ALS createdb "$TESTDB"

  # Verschluesselte Dumps erkennen und entschluesseln.
  if [[ "$DATEI" == *.gpg ]]; then
    [[ -n "$PASSWORTDATEI" ]] || { rot "Verschluesselter Dump, aber BACKUP_PASSPHRASE_FILE fehlt."; exit 1; }
    ENTPACKEN="gpg --quiet --batch --passphrase-file $PASSWORTDATEI --decrypt $DATEI | gunzip -c"
  else
    ENTPACKEN="gunzip -c $DATEI"
  fi

  if eval "$ENTPACKEN" | $PG_ALS psql -q -v ON_ERROR_STOP=1 -d "$TESTDB" >/dev/null 2>&1; then
    DAUER=$(( $(date +%s) - BEGINN ))
    T=$($PG_ALS psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" -d "$TESTDB")
    U=$($PG_ALS psql -tAc "SELECT count(*) FROM users" -d "$TESTDB" 2>/dev/null || echo "?")
    gruen "Wiederherstellung erfolgreich in ${DAUER}s: $T Tabellen, $U Benutzer"

    # Die Tabellen, ohne die die Anwendung nicht laeuft. Eine Zaehlung allein
    # wuerde nicht auffallen lassen, dass gerade die wichtigste fehlt.
    FEHLEND=""
    for TAB in users tracks orders purchases play_history track_provenance track_provenance_verlauf; do
      DA=$($PG_ALS psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_name='$TAB'" -d "$TESTDB")
      [[ "$DA" == "1" ]] || FEHLEND="$FEHLEND $TAB"
    done
    if [[ -n "$FEHLEND" ]]; then
      rot "Diese Tabellen fehlen im Dump:$FEHLEND"
      rot "Testdatenbank $TESTDB bleibt zur Analyse."
      exit 1
    fi
    gruen "Alle erwarteten Tabellen vorhanden"

    $PG_ALS dropdb "$TESTDB"
    gruen "Testdatenbank entfernt"
  else
    rot "Wiederherstellung fehlgeschlagen. Testdatenbank $TESTDB bleibt zur Analyse."
    exit 1
  fi
  exit 0
fi

# --- Backup ----------------------------------------------------------------
$SUDO mkdir -p "$ZIEL"
$SUDO chmod 700 "$ZIEL"
STEMPEL=$(date +%Y-%m-%d_%H%M)
DATEI="$ZIEL/${DB_NAME}_${STEMPEL}.sql.gz"
[[ -n "$PASSWORTDATEI" ]] && DATEI="$DATEI.gpg"

# mktemp statt eines festen Namens in /tmp. Ein fester Name laesst sich von
# einem anderen Benutzer vorher als Verweis anlegen, und zwei gleichzeitige
# Laeufe wuerden sich gegenseitig ueberschreiben.
TMP=$(mktemp /tmp/song-nexus-backup.XXXXXX.gz)
trap 'rm -f "$TMP"' EXIT

if [[ -n "$PASSWORTDATEI" ]]; then
  [[ -f "$PASSWORTDATEI" ]] || { rot "BACKUP_PASSPHRASE_FILE zeigt auf keine Datei: $PASSWORTDATEI"; exit 1; }
  $PG_ALS pg_dump --clean --if-exists "$DB_NAME" \
    | gzip \
    | gpg --quiet --batch --yes --symmetric --cipher-algo AES256 \
          --passphrase-file "$PASSWORTDATEI" --output "$TMP" -
  # --yes ist noetig: mktemp hat die Zieldatei schon angelegt, und gpg
  # verweigert sonst mit "symmetric encryption of '[stdin]' failed: File exists".
  # Beim Erproben aufgefallen -- das Skript brach dabei laut ab, nicht still.
else
  $PG_ALS pg_dump --clean --if-exists "$DB_NAME" | gzip > "$TMP"
fi

$SUDO mv "$TMP" "$DATEI"
trap - EXIT
$SUDO chmod 600 "$DATEI"

GROESSE=$($SUDO stat -c%s "$DATEI")
if [[ "$GROESSE" -lt 1024 ]]; then
  rot "Backup nur $GROESSE Byte gross - das kann nicht stimmen."
  exit 1
fi

if [[ -n "$PASSWORTDATEI" ]]; then
  # Bei einem verschluesselten Dump laesst sich der Inhalt nicht ohne
  # Schluessel pruefen. Also mit: das prueft gleich mit, dass die Passwortdatei
  # wirklich die richtige ist -- sonst hat man verschluesselte Backups, die
  # niemand aufbekommt.
  if ! gpg --quiet --batch --passphrase-file "$PASSWORTDATEI" --decrypt "$DATEI" 2>/dev/null \
       | gunzip -t 2>/dev/null; then
    rot "Verschluesseltes Backup laesst sich nicht wieder oeffnen."
    exit 1
  fi
  gruen "Backup verschluesselt und wieder oeffenbar geprueft"
else
  if ! $SUDO gunzip -t "$DATEI" 2>/dev/null; then
    rot "Backup ist beschaedigt (gzip-Pruefung fehlgeschlagen)."
    exit 1
  fi
  if ! enthaelt_daten "$DATEI"; then
    rot "Backup enthaelt keine erkennbaren Daten."
    exit 1
  fi
fi

gruen "Backup: $DATEI ($(numfmt --to=iec "$GROESSE"))"

# Audiodateien mitsichern - die liegen nicht in der Datenbank und waeren
# bei einem Serververlust sonst weg.
AUDIO="$APP_DIR/backend/public/audio"
if [[ -d "$AUDIO" ]] && [[ -n "$(ls -A "$AUDIO" 2>/dev/null)" ]]; then
  AUDIO_DATEI="$ZIEL/audio_${STEMPEL}.tar.gz"
  $SUDO tar czf "$AUDIO_DATEI" -C "$APP_DIR/backend/public" audio
  $SUDO chmod 600 "$AUDIO_DATEI"
  gruen "Audiodateien: $AUDIO_DATEI ($(numfmt --to=iec "$($SUDO stat -c%s "$AUDIO_DATEI")"))"
else
  warn "Keine Audiodateien in $AUDIO gefunden - nichts mitgesichert."
fi

# Kopie ausserhalb des Servers.
if [[ -n "$FERNZIEL" ]]; then
  if $SUDO rsync -a --chmod=F600 "$ZIEL"/*.gz "$ZIEL"/*.gpg "$FERNZIEL"/ 2>/dev/null; then
    gruen "Kopie nach $FERNZIEL uebertragen"
  else
    rot "Uebertragung nach $FERNZIEL fehlgeschlagen - Backups liegen NUR auf diesem Server."
  fi
fi

# Die Klammern sind noetig: `-o` bindet lockerer als die uebrigen Bedingungen.
# Ohne sie liest find das als "(*.gz) ODER (*.gpg UND alt UND loeschen)" --
# die .gz-Dateien haetten dann keine Aktion und wuerden nie entfernt.
ENTFERNT=$($SUDO find "$ZIEL" \( -name "*.gz" -o -name "*.gpg" \) -mtime +"$BEHALTEN_TAGE" -print -delete 2>/dev/null | wc -l || true)
if [[ "$ENTFERNT" -gt 0 ]]; then
  gruen "$ENTFERNT alte Backups entfernt (aelter als $BEHALTEN_TAGE Tage)"
fi

echo
echo "Vorhandene Backups:"
$SUDO ls -lh "$ZIEL" | tail -n +2 | awk '{print "  " $9 "  " $5}'
echo

if [[ -z "$PASSWORTDATEI" ]]; then
  warn "Die Dumps sind NICHT verschluesselt. Sie enthalten Passwort-Hashes,"
  warn "E-Mail-Adressen und Zahlungsvorgaenge. Zum Verschluesseln:"
  echo "    BACKUP_PASSPHRASE_FILE=/root/.backup-passwort bash $0"
fi

if [[ -z "$FERNZIEL" ]]; then
  warn "WICHTIG: Diese Backups liegen auf demselben Server wie die Datenbank."
  warn "Bei Serververlust sind beide weg. Fuer eine Kopie ausserhalb:"
  echo "    BACKUP_REMOTE=benutzer@storagebox:song-nexus bash $0"
fi

# --- Selbsttest: Dump und Wiederherstellung in einem Lauf -------------------
# Nicht als Teil des Cron-Laufs. Zum Nachweis, dass der Kreislauf geschlossen
# ist, und zum Messen, wie lange eine Wiederherstellung wirklich dauert.
if [[ "${1:-}" == "--selbsttest" ]]; then
  echo
  echo "=== Selbsttest: Wiederherstellung des eben erzeugten Backups ==="
  bash "$0" --restore "$DATEI"
fi
