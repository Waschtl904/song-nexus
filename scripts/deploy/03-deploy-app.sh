#!/usr/bin/env bash
# ============================================================================
# 03 - Anwendung ausrollen: Repo, Abhaengigkeiten, Build, Datenbank
# ============================================================================
# Ausfuehren als dein Benutzer:
#   bash 03-deploy-app.sh
#
# Das Skript fragt nach dem DB-Passwort und legt KEINE .env an - die
# schreibst du danach von Hand, weil dort deine Secrets hineingehoeren.
# ============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/song-nexus}"
BRANCH="${BRANCH:-dev/v1.0}"
DB_NAME="${DB_NAME:-song_nexus_prod}"
DB_USER="${DB_USER:-song_nexus_user}"
REPO="https://github.com/Waschtl904/song-nexus.git"

blau()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
gruen() { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
rot()   { printf '\033[0;31m✗ %s\033[0m\n' "$*"; }
warn()  { printf '\033[0;33m! %s\033[0m\n' "$*"; }

if [[ $EUID -eq 0 ]]; then rot "Nicht als root ausfuehren."; exit 1; fi
if [[ ! "$(node -v)" == v22.* ]]; then rot "Node 22 fehlt. Erst 02-install-stack.sh."; exit 1; fi

blau "Verzeichnis vorbereiten"
sudo mkdir -p "$APP_DIR"
sudo chown "$USER:$USER" "$APP_DIR"
gruen "$APP_DIR gehoert $USER"

blau "Repository holen (Branch: $BRANCH)"
if [[ -d "$APP_DIR/.git" ]]; then
  cd "$APP_DIR"
  git fetch origin "$BRANCH"
  git checkout "$BRANCH"
  git reset --hard "origin/$BRANCH"
  gruen "Repository aktualisiert auf $(git rev-parse --short HEAD)"
else
  git clone -b "$BRANCH" "$REPO" "$APP_DIR"
  cd "$APP_DIR"
  gruen "Repository geklont, Stand $(git rev-parse --short HEAD)"
fi

blau "Backend-Abhaengigkeiten"
cd "$APP_DIR/backend"
# npm ci statt npm install: reproduzierbar, nutzt die Lockfile exakt.
# --omit=dev laesst Jest und Nodemon weg, die im Betrieb nichts zu tun haben.
npm ci --omit=dev
gruen "Backend-Pakete installiert"

blau "Frontend-Abhaengigkeiten und Build"
cd "$APP_DIR/frontend"
# Hier OHNE --omit=dev: webpack und die Loader sind devDependencies,
# ohne sie gibt es keinen Build.
npm ci
npm run build
if [[ -f "$APP_DIR/frontend/dist/app.bundle.js" ]]; then
  gruen "Build erzeugt: dist/app.bundle.js ($(du -h dist/app.bundle.js | cut -f1))"
else
  rot "dist/app.bundle.js fehlt - der Build ist fehlgeschlagen."
  exit 1
fi

blau "Datenbank anlegen"
if sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "$DB_NAME"; then
  warn "Datenbank '$DB_NAME' existiert bereits - wird nicht angetastet."
else
  echo "Passwort fuer den Datenbank-Benutzer '$DB_USER' eingeben"
  echo "(aus deiner Secrets-Datei, wird nicht angezeigt):"
  read -rsp "  DB-Passwort: " DB_PASS; echo
  if [[ ${#DB_PASS} -lt 16 ]]; then
    rot "Passwort zu kurz (mindestens 16 Zeichen)."
    exit 1
  fi
  sudo -u postgres psql -v ON_ERROR_STOP=1 <<SQL
CREATE DATABASE $DB_NAME;
CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';
GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;
SQL
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" <<SQL
GRANT ALL ON SCHEMA public TO $DB_USER;
ALTER DATABASE $DB_NAME OWNER TO $DB_USER;
SQL
  unset DB_PASS
  gruen "Datenbank und Benutzer angelegt"
fi

blau "Schema einspielen"
# schema_clean.sql ist die fuehrende Datei, NICHT schema.sql.
# schema.sql enthaelt Altlasten und Redundanzen.
SCHEMA="$APP_DIR/schema_clean.sql"
if [[ ! -f "$SCHEMA" ]]; then rot "$SCHEMA nicht gefunden."; exit 1; fi
TABELLEN=$(sudo -u postgres psql -tAc \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" -d "$DB_NAME")
if [[ "$TABELLEN" -gt 0 ]]; then
  warn "Es gibt schon $TABELLEN Tabellen - Schema wird NICHT erneut eingespielt."
  warn "Das verhindert, dass bestehende Daten ueberschrieben werden."
else
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -f "$SCHEMA"
  gruen "Schema eingespielt"
fi

blau "Verzeichnisse fuer Uploads und Logs"
mkdir -p "$APP_DIR/backend/public/audio" "$APP_DIR/backend/logs"
chmod 750 "$APP_DIR/backend/logs"
gruen "Verzeichnisse angelegt"

# ============================================================================
blau "PRUEFUNG"
FEHLER=0
[[ -d "$APP_DIR/.git" ]]                        && gruen "Repository vorhanden"     || { rot "Repository fehlt"; FEHLER=1; }
[[ -d "$APP_DIR/backend/node_modules" ]]        && gruen "Backend-Pakete da"        || { rot "Backend-Pakete fehlen"; FEHLER=1; }
[[ -f "$APP_DIR/frontend/dist/app.bundle.js" ]] && gruen "Frontend-Build da"        || { rot "Build fehlt"; FEHLER=1; }
sudo -u postgres psql -lqt | cut -d\| -f1 | grep -qw "$DB_NAME" && gruen "Datenbank da" || { rot "Datenbank fehlt"; FEHLER=1; }
T=$(sudo -u postgres psql -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public'" -d "$DB_NAME")
[[ "$T" -ge 5 ]] && gruen "Schema: $T Tabellen" || { rot "Nur $T Tabellen - Schema unvollstaendig"; FEHLER=1; }

echo
if [[ $FEHLER -eq 0 ]]; then
  gruen "Schritt 3 abgeschlossen."
  echo
  warn "JETZT VON HAND: die .env anlegen, bevor du 04 startest."
  echo "    nano $APP_DIR/backend/.env"
  echo "    chmod 600 $APP_DIR/backend/.env"
  echo
  echo "Vorlage und Erklaerung: docs/DEPLOYMENT-HETZNER.md, Abschnitt 6."
  echo "Wichtig dabei:"
  echo "  - PAYMENTS_ENABLED gar nicht setzen (bleibt aus)"
  echo "  - USE_HTTPS=false (nginx macht das TLS)"
  echo "  - TRUST_PROXY=true"
  echo "  - JWT_SECRET und SESSION_SECRET muessen verschieden sein"
else
  rot "Nicht weitermachen."
  exit 1
fi
