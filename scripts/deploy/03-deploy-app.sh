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
MIGRATION_DB_USER="${MIGRATION_DB_USER:-song_nexus_migrator}"
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

blau "Datenbank und getrennte Rollen vorbereiten"
[[ "$DB_USER" != "$MIGRATION_DB_USER" ]] || { rot "Getrennte Rollen erforderlich"; exit 1; }
sudo -u postgres psql -v ON_ERROR_STOP=1 -v database="$DB_NAME" -v app_role="$DB_USER" \
  -v migration_role="$MIGRATION_DB_USER" -f "$APP_DIR/scripts/deploy/database-bootstrap.sql"

# Reihenfolge ist Pflicht (Pruefvermerk apdg-lab docs/10, Befund 2):
#   1. Schema als Migrationsrolle
#   2. Migrationen als Migrationsrolle (node scripts/migrate.js)
#   3. ERST DANACH Rechte fuer die Laufzeitrolle (database-grants.sql)
#   4. Pruefung: keine Tabelle ohne Freigabe, keine DDL fuer die Laufzeitrolle
# Die Default-Privilegien sind absichtlich "revoke": eine Tabelle, die nach den
# Grants entsteht, ist fuer die App unsichtbar (503 statt Daten). Darum laufen
# die Grants hier zuletzt und die Pruefung bricht ab, wenn etwas fehlt.
blau "Schema (Schritt 1/4)"
{ printf 'SET ROLE :"owner";\n'; cat "$APP_DIR/schema_clean.sql"; } | \
  sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -v owner="$MIGRATION_DB_USER"
gruen "schema_clean.sql eingespielt (idempotent)"

blau "Migrationen (Schritt 2/4)"
if [[ -z "${MIGRATION_DB_PASSWORD:-}" ]]; then
  read -rsp "Passwort fuer $MIGRATION_DB_USER (wird gesetzt und fuer die Migration verwendet, nicht gespeichert): " MIGRATION_DB_PASSWORD; echo
fi
[[ -n "$MIGRATION_DB_PASSWORD" ]] || { rot "Leeres Migrationspasswort"; exit 1; }
# Passwort geht per Umgebungsvariable und \getenv (psql >= 15) in eine psql-Variable:
# nicht in argv (ps/proc), keine Shell-Interpolation ins SQL.
export MIGRATION_DB_PASSWORD
sudo --preserve-env=MIGRATION_DB_PASSWORD -u postgres psql -v ON_ERROR_STOP=1 -q -v role="$MIGRATION_DB_USER" \
  -c '\getenv pw MIGRATION_DB_PASSWORD' -c 'ALTER ROLE :"role" PASSWORD :'"'"'pw'"'"';'
( cd "$APP_DIR/backend" && DB_HOST=localhost DB_PORT=5432 DB_NAME="$DB_NAME" DB_USER="$DB_USER" \
    MIGRATION_DB_USER="$MIGRATION_DB_USER" MIGRATION_DB_PASSWORD="$MIGRATION_DB_PASSWORD" node scripts/migrate.js )
unset MIGRATION_DB_PASSWORD   # auch aus der exportierten Umgebung
gruen "Migrationen angewendet"

blau "Rechte der Laufzeitrolle (Schritt 3/4)"
sudo -u postgres psql -v ON_ERROR_STOP=1 -d "$DB_NAME" -v app_role="$DB_USER" \
  -v migration_role="$MIGRATION_DB_USER" -f "$APP_DIR/scripts/deploy/database-grants.sql"
gruen "database-grants.sql angewendet"

blau "Rechtepruefung (Schritt 4/4)"
# Jede Basistabelle ausser schema_migrations muss fuer die App lesbar sein; sonst fehlt
# sie in database-grants.sql. schema_migrations darf die App NICHT lesen. Keine DDL.
OHNE_FREIGABE=$(sudo -u postgres psql -tA -d "$DB_NAME" -v app_role="$DB_USER" -c \
  "SELECT string_agg(table_name, ', ' ORDER BY table_name) FROM information_schema.tables
   WHERE table_schema='public' AND table_type='BASE TABLE' AND table_name<>'schema_migrations'
   AND NOT has_table_privilege(:'app_role', format('public.%I', table_name), 'SELECT')")
DDL=$(sudo -u postgres psql -tA -d "$DB_NAME" -v app_role="$DB_USER" -c \
  "SELECT has_schema_privilege(:'app_role','public','CREATE')")
MIGTAB=$(sudo -u postgres psql -tA -d "$DB_NAME" -v app_role="$DB_USER" -c \
  "SELECT has_table_privilege(:'app_role','public.schema_migrations','SELECT')")
TRUNC=$(sudo -u postgres psql -tA -d "$DB_NAME" -v app_role="$DB_USER" -c \
  "SELECT count(*) FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'
   AND has_table_privilege(:'app_role', format('public.%I', table_name), 'TRUNCATE')")
RECHTE_FEHLER=0
[[ -z "$OHNE_FREIGABE" ]] && gruen "Alle Tabellen fuer $DB_USER freigegeben" || { rot "Tabellen ohne Freigabe fuer $DB_USER: $OHNE_FREIGABE  -> in database-grants.sql aufnehmen"; RECHTE_FEHLER=1; }
[[ "$DDL" == "f" ]]    && gruen "Keine CREATE-Rechte im Schema"            || { rot "$DB_USER darf im Schema public CREATE ausfuehren"; RECHTE_FEHLER=1; }
[[ "$MIGTAB" == "f" ]] && gruen "schema_migrations fuer App gesperrt"      || { rot "$DB_USER kann schema_migrations lesen"; RECHTE_FEHLER=1; }
[[ "$TRUNC" == "0" ]]  && gruen "Kein TRUNCATE-Recht"                      || { rot "$DB_USER hat TRUNCATE auf $TRUNC Tabelle(n)"; RECHTE_FEHLER=1; }
[[ $RECHTE_FEHLER -eq 0 ]] || { rot "Rechtepruefung fehlgeschlagen - Abbruch vor dem Start."; exit 1; }
warn "Laufzeitrolle $DB_USER braucht ein eigenes Passwort: in psql mit \\password $DB_USER setzen (nicht das Migrationspasswort)."
warn "Die Runtime-Rolle darf niemals Eigentuemer sein. Siehe docs/SECURITY-ROLLOUT.md."

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
