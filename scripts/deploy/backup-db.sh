#!/usr/bin/env bash
# ============================================================================
# Datenbank-Backup mit Pruefung der Wiederherstellbarkeit
# ============================================================================
#   bash backup-db.sh                    einmaliges Backup
#   bash backup-db.sh --cron-einrichten  taeglich um 03:30 einrichten
#   bash backup-db.sh --restore <datei>  Wiederherstellung testen
#
# Ein Backup, das nie zurueckgespielt wurde, ist kein Backup, sondern eine
# Datei. Dieses Skript prueft nach jedem Lauf, ob das Ergebnis lesbar ist.
# ============================================================================
set -euo pipefail

DB_NAME="${DB_NAME:-song_nexus_prod}"
ZIEL="${BACKUP_DIR:-/var/backups/song-nexus}"
BEHALTEN_TAGE="${BEHALTEN_TAGE:-14}"
APP_DIR="${APP_DIR:-/var/www/song-nexus}"

gruen() { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
rot()   { printf '\033[0;31m✗ %s\033[0m\n' "$*"; }
warn()  { printf '\033[0;33m! %s\033[0m\n' "$*"; }

# --- Cron einrichten --------------------------------------------------------
if [[ "${1:-}" == "--cron-einrichten" ]]; then
  SKRIPT="$(readlink -f "$0")"
  ZEILE="30 3 * * * bash $SKRIPT >> /var/log/song-nexus-backup.log 2>&1"
  if sudo crontab -l 2>/dev/null | grep -qF "$SKRIPT"; then
    gruen "Cron-Eintrag existiert bereits"
  else
    (sudo crontab -l 2>/dev/null || true; echo "$ZEILE") | sudo crontab -
    gruen "Taegliches Backup um 03:30 eingerichtet"
  fi
  sudo crontab -l | grep -F "$SKRIPT"
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
  sudo -u postgres createdb "$TESTDB"
  if gunzip -c "$DATEI" | sudo -u postgres psql -q -v ON_ERROR_STOP=1 -d "$TESTDB" >/dev/null 2>&1; then
    T=$(sudo -u postgres psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" -d "$TESTDB")
    U=$(sudo -u postgres psql -tAc "SELECT count(*) FROM users" -d "$TESTDB" 2>/dev/null || echo "?")
    gruen "Wiederherstellung erfolgreich: $T Tabellen, $U Benutzer"
    sudo -u postgres dropdb "$TESTDB"
    gruen "Testdatenbank entfernt"
  else
    rot "Wiederherstellung fehlgeschlagen. Testdatenbank $TESTDB bleibt zur Analyse."
    exit 1
  fi
  exit 0
fi

# --- Backup ----------------------------------------------------------------
sudo mkdir -p "$ZIEL"
sudo chmod 700 "$ZIEL"
STEMPEL=$(date +%Y-%m-%d_%H%M)
DATEI="$ZIEL/${DB_NAME}_${STEMPEL}.sql.gz"

sudo -u postgres pg_dump --clean --if-exists "$DB_NAME" | gzip > /tmp/backup_tmp.gz
sudo mv /tmp/backup_tmp.gz "$DATEI"
sudo chmod 600 "$DATEI"

# Pruefen, dass die Datei nicht leer und wirklich lesbar ist. Ein
# abgebrochener Dump erzeugt sonst stillschweigend eine unbrauchbare Datei.
GROESSE=$(stat -c%s "$DATEI")
if [[ "$GROESSE" -lt 1024 ]]; then
  rot "Backup nur $GROESSE Byte gross - das kann nicht stimmen."
  exit 1
fi
if ! sudo gunzip -t "$DATEI" 2>/dev/null; then
  rot "Backup ist beschaedigt (gzip-Pruefung fehlgeschlagen)."
  exit 1
fi
if ! sudo gunzip -c "$DATEI" | head -100 | grep -q "CREATE TABLE\|COPY\|INSERT"; then
  rot "Backup enthaelt keine erkennbaren Daten."
  exit 1
fi
gruen "Backup: $DATEI ($(numfmt --to=iec "$GROESSE"))"

# Audiodateien mitsichern - die liegen nicht in der Datenbank und waeren
# bei einem Serververlust sonst weg.
AUDIO="$APP_DIR/backend/public/audio"
if [[ -d "$AUDIO" ]] && [[ -n "$(ls -A "$AUDIO" 2>/dev/null)" ]]; then
  AUDIO_DATEI="$ZIEL/audio_${STEMPEL}.tar.gz"
  sudo tar czf "$AUDIO_DATEI" -C "$APP_DIR/backend/public" audio
  sudo chmod 600 "$AUDIO_DATEI"
  gruen "Audiodateien: $AUDIO_DATEI ($(numfmt --to=iec "$(stat -c%s "$AUDIO_DATEI")"))"
fi

ENTFERNT=$(sudo find "$ZIEL" -name "*.gz" -mtime +"$BEHALTEN_TAGE" -print -delete | wc -l)
[[ "$ENTFERNT" -gt 0 ]] && gruen "$ENTFERNT alte Backups entfernt (aelter als $BEHALTEN_TAGE Tage)"

echo
echo "Vorhandene Backups:"
sudo ls -lh "$ZIEL" | tail -n +2 | awk '{print "  " $9 "  " $5}'
echo
warn "WICHTIG: Diese Backups liegen auf demselben Server wie die Datenbank."
warn "Bei Serververlust sind beide weg. Regelmaessig herunterladen:"
echo "    scp $USER@$(hostname -I | awk '{print $1}'):$ZIEL/*.gz ."
