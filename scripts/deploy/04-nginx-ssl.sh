#!/usr/bin/env bash
# ============================================================================
# 04 - nginx, HTTPS und Anwendungsstart
# ============================================================================
# Voraussetzung: backend/.env ist angelegt und gefuellt.
#
#   bash 04-nginx-ssl.sh deine-domain.at deine@mailadresse.at
# ============================================================================
set -euo pipefail

DOMAIN="${1:-}"
EMAIL="${2:-}"
APP_DIR="${APP_DIR:-/var/www/song-nexus}"

blau()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
gruen() { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
rot()   { printf '\033[0;31m✗ %s\033[0m\n' "$*"; }
warn()  { printf '\033[0;33m! %s\033[0m\n' "$*"; }

if [[ -z "$DOMAIN" || -z "$EMAIL" ]]; then
  rot "Aufruf: bash 04-nginx-ssl.sh <domain> <email>"
  exit 1
fi

# ---------------------------------------------------------------------------
blau "Voraussetzungen pruefen"
ENV_FILE="$APP_DIR/backend/.env"
if [[ ! -f "$ENV_FILE" ]]; then
  rot "$ENV_FILE fehlt. Erst die .env anlegen (siehe Anleitung Abschnitt 6)."
  exit 1
fi
gruen ".env vorhanden"

# Die Anwendung beendet sich beim Start, wenn Secrets fehlen oder gleich
# sind. Das hier vorab zu pruefen erspart Ratespiele in den PM2-Logs.
pflicht() {
  if ! grep -qE "^$1=.+" "$ENV_FILE"; then rot "$1 fehlt in der .env"; return 1; fi
}
FEHLT=0
for V in NODE_ENV DB_HOST DB_NAME DB_USER DB_PASSWORD JWT_SECRET \
         JWT_REFRESH_SECRET SESSION_SECRET COOKIE_SECRET FRONTEND_URL \
         WEBAUTHN_RP_ID WEBAUTHN_ORIGIN; do
  pflicht "$V" || FEHLT=1
done
[[ $FEHLT -eq 0 ]] || { rot "Bitte .env vervollstaendigen."; exit 1; }
gruen "Alle Pflichtvariablen gesetzt"

hole() { grep -E "^$1=" "$ENV_FILE" | head -1 | cut -d= -f2-; }
if [[ "$(hole JWT_SECRET)" == "$(hole SESSION_SECRET)" ]]; then
  rot "JWT_SECRET und SESSION_SECRET sind identisch. Der Server startet so nicht."
  exit 1
fi
gruen "Secrets sind verschieden"

# WEBAUTHN_RP_ID muss exakt der Domain entsprechen, sonst schlaegt die
# Anmeldung mit Sicherheitsschluessel fehl - und zwar ohne klare Meldung.
if [[ "$(hole WEBAUTHN_RP_ID)" != "$DOMAIN" ]]; then
  warn "WEBAUTHN_RP_ID ist '$(hole WEBAUTHN_RP_ID)', erwartet '$DOMAIN'."
  warn "WebAuthn wird damit nicht funktionieren."
  read -rp "Trotzdem weiter? (j/N) " A; [[ "$A" == "j" ]] || exit 1
fi
if grep -qE "^USE_HTTPS=true" "$ENV_FILE"; then
  rot "USE_HTTPS=true. Hinter nginx muss das false sein, sonst sucht Node"
  rot "nach Zertifikatsdateien und beendet sich."
  exit 1
fi
gruen "USE_HTTPS korrekt"
if grep -qE "^PAYMENTS_ENABLED=true" "$ENV_FILE"; then
  warn "PAYMENTS_ENABLED=true - fuer den Soft-Launch sollte das aus bleiben."
  read -rp "Trotzdem weiter? (j/N) " A; [[ "$A" == "j" ]] || exit 1
fi

blau "DNS pruefen"
SERVER_IP=$(curl -fsS ifconfig.me || echo "")
DNS_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || echo "")
echo "  Server-IP: ${SERVER_IP:-unbekannt}"
echo "  DNS-Eintrag fuer $DOMAIN: ${DNS_IP:-keiner}"
if [[ -z "$DNS_IP" ]]; then
  rot "Kein DNS-Eintrag. Let's Encrypt wird fehlschlagen."
  rot "Erst A-Record auf $SERVER_IP setzen und einige Minuten warten."
  exit 1
elif [[ "$DNS_IP" != "$SERVER_IP" ]]; then
  warn "DNS zeigt auf $DNS_IP, dieser Server ist $SERVER_IP."
  read -rp "Trotzdem weiter? (j/N) " A; [[ "$A" == "j" ]] || exit 1
else
  gruen "DNS zeigt korrekt auf diesen Server"
fi

# ---------------------------------------------------------------------------
blau "Anwendung mit PM2 starten"
cd "$APP_DIR"
PM2_KONFIG="$APP_DIR/scripts/deploy/ecosystem.config.js"
[[ -f "$PM2_KONFIG" ]] || { rot "$PM2_KONFIG fehlt."; exit 1; }
pm2 delete song-nexus-api &>/dev/null || true
pm2 start "$PM2_KONFIG" --env production
sleep 5
if pm2 describe song-nexus-api 2>/dev/null | grep -q "online"; then
  gruen "Anwendung laeuft"
else
  rot "Start fehlgeschlagen. Logs:"
  pm2 logs song-nexus-api --lines 30 --nostream
  exit 1
fi

# Es gibt (noch) keinen /api/health-Endpunkt, siehe Issue #18. Geprueft wird
# daher nur, ob ueberhaupt eine HTTP-Antwort kommt - jeder Status-Code ausser
# 000 bedeutet, dass Node lauscht und antwortet.
ANTWORT=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:3000/ || echo "000")
if [[ "$ANTWORT" != "000" ]]; then
  gruen "Node antwortet auf Port 3000 (Status $ANTWORT)"
else
  rot "Keine Antwort auf Port 3000."
  pm2 logs song-nexus-api --lines 30 --nostream
  exit 1
fi

pm2 save
STARTUP=$(pm2 startup | grep "sudo env" || true)
if [[ -n "$STARTUP" ]]; then
  warn "Fuer den Autostart nach Neustart noch ausfuehren:"
  echo "    $STARTUP"
fi

# ---------------------------------------------------------------------------
blau "nginx konfigurieren"
VORLAGE="$APP_DIR/scripts/deploy/nginx-song-nexus.conf.template"
[[ -f "$VORLAGE" ]] || { rot "$VORLAGE fehlt."; exit 1; }
sed "s/DEINE_DOMAIN/$DOMAIN/g" "$VORLAGE" | sudo tee /etc/nginx/sites-available/song-nexus >/dev/null
sudo ln -sf /etc/nginx/sites-available/song-nexus /etc/nginx/sites-enabled/song-nexus
sudo rm -f /etc/nginx/sites-enabled/default

# Zertifikate gibt es noch nicht - die ssl_-Zeilen wuerden nginx jetzt
# scheitern lassen. Also erst mit reiner HTTP-Konfiguration starten,
# Zertifikat holen, dann die volle Konfiguration aktivieren.
sudo tee /etc/nginx/sites-available/song-nexus-temp >/dev/null <<TEMP
server {
    listen 80;
    server_name $DOMAIN www.$DOMAIN;
    root /var/www/html;
    location /.well-known/acme-challenge/ { root /var/www/html; }
    location / { return 200 'Setup laeuft'; add_header Content-Type text/plain; }
}
TEMP
sudo rm -f /etc/nginx/sites-enabled/song-nexus
sudo ln -sf /etc/nginx/sites-available/song-nexus-temp /etc/nginx/sites-enabled/song-nexus-temp
sudo nginx -t && sudo systemctl reload nginx
gruen "nginx laeuft mit Uebergangskonfiguration"

blau "Zertifikat von Let's Encrypt"
sudo mkdir -p /var/www/html/.well-known/acme-challenge
if sudo certbot certonly --webroot -w /var/www/html \
     -d "$DOMAIN" -d "www.$DOMAIN" \
     --email "$EMAIL" --agree-tos --no-eff-email --non-interactive; then
  gruen "Zertifikat ausgestellt"
else
  rot "Certbot fehlgeschlagen. Haeufigste Ursachen:"
  rot "  - DNS zeigt nicht auf diesen Server (auch der www-Eintrag fehlt oft)"
  rot "  - Port 80 von aussen nicht erreichbar"
  exit 1
fi

blau "Volle Konfiguration aktivieren"
sudo rm -f /etc/nginx/sites-enabled/song-nexus-temp
sudo ln -sf /etc/nginx/sites-available/song-nexus /etc/nginx/sites-enabled/song-nexus
sudo nginx -t && sudo systemctl reload nginx
gruen "HTTPS aktiv"

blau "Automatische Erneuerung pruefen"
sudo certbot renew --dry-run >/dev/null 2>&1 \
  && gruen "Erneuerung funktioniert" \
  || warn "Probelauf der Erneuerung fehlgeschlagen - vor Ablauf pruefen"

# ---------------------------------------------------------------------------
blau "PRUEFUNG von aussen"
FEHLER=0
pruefe_status() {
  local pfad="$1" erwartet="$2"
  local code; code=$(curl -fsS -o /dev/null -w '%{http_code}' "https://$DOMAIN$pfad" 2>/dev/null || echo "000")
  if [[ "$code" == "$erwartet" ]]; then gruen "$pfad -> $code"
  else rot "$pfad -> $code (erwartet $erwartet)"; FEHLER=1; fi
}
pruefe_status "/"                    "200"
pruefe_status "/impressum.html"      "200"
pruefe_status "/datenschutz.html"    "200"
pruefe_status "/gibtsnicht"          "404"
pruefe_status "/node_modules/"       "404"
pruefe_status "/package.json"        "404"

code=$(curl -fsS -o /dev/null -w '%{http_code}' -I "http://$DOMAIN/" 2>/dev/null || echo "000")
[[ "$code" == "301" ]] && gruen "HTTP leitet auf HTTPS um" || { rot "HTTP-Umleitung fehlt ($code)"; FEHLER=1; }
curl -fsSI "https://$DOMAIN/" 2>/dev/null | grep -qi "strict-transport-security" \
  && gruen "HSTS-Header gesetzt" || { rot "HSTS fehlt"; FEHLER=1; }

echo
if [[ $FEHLER -eq 0 ]]; then
  gruen "Fertig. https://$DOMAIN ist erreichbar."
  echo
  echo "Noch offen:"
  echo "  1. Admin-Konto anlegen (siehe Anleitung Abschnitt 12)"
  echo "  2. Backup einrichten: bash scripts/deploy/backup-db.sh --cron-einrichten"
  echo "  3. Checkliste vor Go-Live in docs/DEPLOYMENT-HETZNER.md durchgehen"
else
  rot "Mindestens eine Pruefung fehlgeschlagen."
  echo "Logs:  pm2 logs song-nexus-api --lines 50"
  echo "       sudo tail -50 /var/log/nginx/error.log"
  exit 1
fi
