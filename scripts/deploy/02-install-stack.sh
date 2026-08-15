#!/usr/bin/env bash
# ============================================================================
# 02 - Software installieren: Node 22, PM2, nginx, PostgreSQL, certbot
# ============================================================================
# Ausfuehren als dein Benutzer (nicht root):
#   bash 02-install-stack.sh
# ============================================================================
set -euo pipefail

blau()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
gruen() { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
rot()   { printf '\033[0;31m✗ %s\033[0m\n' "$*"; }

if [[ $EUID -eq 0 ]]; then
  rot "Nicht als root ausfuehren. Als dein normaler Benutzer starten."
  exit 1
fi

blau "Basiswerkzeuge"
sudo apt-get update -qq
sudo apt-get install -y -qq curl git ca-certificates gnupg build-essential
gruen "Basiswerkzeuge installiert"

blau "Node.js 22 LTS"
# Node 22 ist Pflicht, nicht Empfehlung: backend/package.json verlangt
# >=22.0.0, frontend >=22.15.0. nodemailer 9 und webpack-dev-server 6
# laufen auf 20 nicht.
if command -v node &>/dev/null && [[ "$(node -v)" == v22.* ]]; then
  gruen "Node $(node -v) bereits installiert"
else
  curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
  sudo apt-get install -y -qq nodejs
  gruen "Node $(node -v) installiert"
fi

blau "PM2"
if command -v pm2 &>/dev/null; then
  gruen "PM2 bereits installiert"
else
  sudo npm install -g pm2 --silent
  gruen "PM2 $(pm2 -v) installiert"
fi

blau "nginx"
sudo apt-get install -y -qq nginx
sudo systemctl enable --now nginx
gruen "nginx laeuft"

blau "PostgreSQL"
sudo apt-get install -y -qq postgresql postgresql-contrib
sudo systemctl enable --now postgresql
gruen "PostgreSQL $(psql --version | awk '{print $3}') laeuft"

blau "Certbot"
sudo apt-get install -y -qq certbot python3-certbot-nginx
gruen "Certbot installiert"

# ============================================================================
blau "PRUEFUNG"
FEHLER=0
pruefe() {
  if eval "$2" &>/dev/null; then gruen "$1"; else rot "$1 FEHLT"; FEHLER=1; fi
}
pruefe "Node 22"      '[[ "$(node -v)" == v22.* ]]'
pruefe "npm"          'npm -v'
pruefe "PM2"          'pm2 -v'
pruefe "nginx aktiv"  'systemctl is-active --quiet nginx'
pruefe "PostgreSQL aktiv" 'systemctl is-active --quiet postgresql'
pruefe "Certbot"      'certbot --version'

echo
echo "Versionen:"
echo "  Node:       $(node -v)"
echo "  npm:        $(npm -v)"
echo "  PM2:        $(pm2 -v)"
echo "  nginx:      $(nginx -v 2>&1 | cut -d/ -f2)"
echo "  PostgreSQL: $(psql --version | awk '{print $3}')"

echo
if [[ $FEHLER -eq 0 ]]; then
  gruen "Schritt 2 abgeschlossen. Weiter mit 03-deploy-app.sh"
else
  rot "Etwas fehlt - nicht weitermachen."
  exit 1
fi
