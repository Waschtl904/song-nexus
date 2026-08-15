#!/usr/bin/env bash
# ============================================================================
# 01 - Server haerten
# ============================================================================
# Ausfuehren als root, direkt nach der Erstinstallation:
#   ssh root@<SERVER-IP>
#   bash 01-harden-server.sh
#
# Danach nur noch als der angelegte Benutzer einloggen.
# ============================================================================
set -euo pipefail

BENUTZER="${1:-sebastian}"

blau()  { printf '\n\033[1;34m== %s ==\033[0m\n' "$*"; }
gruen() { printf '\033[0;32m✓ %s\033[0m\n' "$*"; }
rot()   { printf '\033[0;31m✗ %s\033[0m\n' "$*"; }

if [[ $EUID -ne 0 ]]; then
  rot "Dieses Skript muss als root laufen."
  exit 1
fi

blau "System aktualisieren"
export DEBIAN_FRONTEND=noninteractive
apt-get update -qq
apt-get upgrade -y -qq
gruen "System aktuell"

blau "Benutzer '$BENUTZER' anlegen"
if id "$BENUTZER" &>/dev/null; then
  gruen "Benutzer existiert bereits"
else
  adduser --disabled-password --gecos "" "$BENUTZER"
  usermod -aG sudo "$BENUTZER"
  gruen "Benutzer angelegt und zur sudo-Gruppe hinzugefuegt"
fi

blau "SSH-Key uebernehmen"
# Der Key liegt bei Hetzner nach dem Anlegen in /root/.ssh/authorized_keys
if [[ -f /root/.ssh/authorized_keys ]]; then
  install -d -m 700 -o "$BENUTZER" -g "$BENUTZER" "/home/$BENUTZER/.ssh"
  cp /root/.ssh/authorized_keys "/home/$BENUTZER/.ssh/authorized_keys"
  chown "$BENUTZER:$BENUTZER" "/home/$BENUTZER/.ssh/authorized_keys"
  chmod 600 "/home/$BENUTZER/.ssh/authorized_keys"
  gruen "SSH-Key kopiert"
else
  rot "ACHTUNG: /root/.ssh/authorized_keys nicht gefunden."
  rot "Ohne Key sperrst du dich mit dem naechsten Schritt aus."
  rot "Erst Key hinterlegen, dann Skript erneut ausfuehren."
  exit 1
fi

blau "Passwort fuer sudo setzen"
# sudo braucht ein Passwort; ohne eines waere jeder Prozess des Benutzers
# faktisch root-fähig, falls jemals ein Zugang kompromittiert wird.
echo "Bitte ein sudo-Passwort fuer '$BENUTZER' setzen:"
passwd "$BENUTZER"

blau "SSH absichern"
SSHD=/etc/ssh/sshd_config
cp "$SSHD" "$SSHD.backup-$(date +%F)"
sed -i 's/^#\?PermitRootLogin.*/PermitRootLogin no/'            "$SSHD"
sed -i 's/^#\?PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD"
sed -i 's/^#\?PubkeyAuthentication.*/PubkeyAuthentication yes/'  "$SSHD"
sshd -t
systemctl restart ssh || systemctl restart sshd
gruen "Root-Login und Passwort-Anmeldung deaktiviert"

blau "Firewall (UFW)"
apt-get install -y -qq ufw
ufw --force reset >/dev/null
ufw default deny incoming
ufw default allow outgoing
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
gruen "Firewall aktiv: nur SSH, HTTP, HTTPS"

blau "fail2ban"
apt-get install -y -qq fail2ban
systemctl enable --now fail2ban
gruen "fail2ban laeuft"

blau "Automatische Sicherheitsupdates"
apt-get install -y -qq unattended-upgrades
dpkg-reconfigure -f noninteractive unattended-upgrades
gruen "unattended-upgrades aktiv"

# ============================================================================
blau "PRUEFUNG"
FEHLER=0
sshd -T 2>/dev/null | grep -q "permitrootlogin no"        && gruen "Root-Login aus"    || { rot "Root-Login noch erlaubt"; FEHLER=1; }
sshd -T 2>/dev/null | grep -q "passwordauthentication no" && gruen "Passwort-Auth aus" || { rot "Passwort-Auth noch erlaubt"; FEHLER=1; }
ufw status | grep -q "Status: active"                     && gruen "UFW aktiv"         || { rot "UFW inaktiv"; FEHLER=1; }
systemctl is-active --quiet fail2ban                      && gruen "fail2ban aktiv"    || { rot "fail2ban inaktiv"; FEHLER=1; }
id "$BENUTZER" &>/dev/null                                && gruen "Benutzer vorhanden" || { rot "Benutzer fehlt"; FEHLER=1; }

echo
if [[ $FEHLER -eq 0 ]]; then
  gruen "Schritt 1 abgeschlossen."
  echo
  echo "JETZT WICHTIG: In einem ZWEITEN Terminal testen, ob der Login klappt,"
  echo "BEVOR du diese Sitzung schliesst:"
  echo "    ssh $BENUTZER@\$(curl -s ifconfig.me)"
  echo
  echo "Klappt das, weiter mit 02-install-stack.sh (als $BENUTZER)."
else
  rot "Mindestens eine Pruefung fehlgeschlagen - diese Sitzung NICHT schliessen."
  exit 1
fi
