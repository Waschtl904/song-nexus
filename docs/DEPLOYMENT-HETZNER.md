# SONG-NEXUS — Deployment auf Hetzner VPS

**Ziel:** Song-Nexus produktionsreif auf einem Hetzner VPS betreiben — mit nginx als Reverse Proxy, Let's Encrypt (HTTPS), PM2 als Prozessmanager und PostgreSQL.

> **Voraussetzung:** Du hast einen Hetzner-Account und eine Domain (z.B. `song-nexus.at`).

---

## Inhaltsverzeichnis

1. [Hetzner VPS einrichten](#1-hetzner-vps-einrichten)
2. [Server absichern](#2-server-absichern)
3. [Software installieren](#3-software-installieren)
4. [PostgreSQL einrichten](#4-postgresql-einrichten)
5. [Projekt deployen](#5-projekt-deployen)
6. [Umgebungsvariablen konfigurieren](#6-umgebungsvariablen-konfigurieren)
7. [nginx einrichten](#7-nginx-einrichten)
8. [HTTPS mit Let's Encrypt](#8-https-mit-lets-encrypt)
9. [PM2 — Prozessmanager](#9-pm2--prozessmanager)
10. [Frontend bauen & ausliefern](#10-frontend-bauen--ausliefern)
11. [E-Mail (Nodemailer) konfigurieren](#11-e-mail-nodemailer-konfigurieren)
12. [Wartung & Updates](#12-wartung--updates)
13. [Checkliste vor Go-Live](#13-checkliste-vor-go-live)

---

## 1. Hetzner VPS einrichten

### Server erstellen

1. Login auf [console.hetzner.cloud](https://console.hetzner.cloud)
2. **+ New Server** klicken
3. Einstellungen:
   - **Location:** Nürnberg oder Wien (EU, DSGVO-konform)
   - **Image:** Ubuntu 24.04 LTS
   - **Type:** CX22 (2 vCPU, 4 GB RAM) — reicht für den Start
   - **SSH Key:** Deinen öffentlichen SSH-Key einfügen
   - **Firewall:** Neue Firewall erstellen (siehe unten)

### Firewall-Regeln

| Protokoll | Port | Zweck |
|-----------|------|-------|
| TCP | 22 | SSH |
| TCP | 80 | HTTP (für Let's Encrypt) |
| TCP | 443 | HTTPS |

> Port 3000 (Node.js) **nicht** öffentlich freischalten — nginx leitet intern weiter.

### Domain einrichten

Bei deinem Domain-Anbieter einen **A-Record** anlegen:

```
song-nexus.at  →  <IP-Adresse des Servers>
www.song-nexus.at  →  <IP-Adresse des Servers>
```

Warte 5–30 Minuten bis DNS propagiert ist. Prüfen mit:
```bash
nslookup song-nexus.at
```

---

## 2. Server absichern

```bash
# Als root einloggen
ssh root@<SERVER-IP>

# System aktualisieren
apt update && apt upgrade -y

# Neuen Benutzer anlegen (nicht als root arbeiten)
adduser sebastian
usermod -aG sudo sebastian

# SSH-Key für neuen Benutzer kopieren
mkdir -p /home/sebastian/.ssh
cp ~/.ssh/authorized_keys /home/sebastian/.ssh/
chown -R sebastian:sebastian /home/sebastian/.ssh
chmod 700 /home/sebastian/.ssh
chmod 600 /home/sebastian/.ssh/authorized_keys

# SSH absichern: Root-Login und Passwort-Auth deaktivieren
nano /etc/ssh/sshd_config
```

In `/etc/ssh/sshd_config` folgende Werte setzen:
```
PermitRootLogin no
PasswordAuthentication no
PubkeyAuthentication yes
```

```bash
systemctl restart ssh

# Ab jetzt als sebastian einloggen:
ssh sebastian@<SERVER-IP>

# Fail2ban installieren (Brute-Force-Schutz)
sudo apt install -y fail2ban
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

---

## 3. Software installieren

```bash
sudo apt install -y curl git build-essential

# Node.js 22 LTS installieren (via NodeSource)
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs

# Version prüfen
node --version   # v22.x.x
npm --version    # 10.x.x

# PM2 global installieren
sudo npm install -g pm2

# nginx installieren
sudo apt install -y nginx

# Certbot installieren (Let's Encrypt)
sudo apt install -y certbot python3-certbot-nginx
```

---

## 4. PostgreSQL einrichten

```bash
# PostgreSQL installieren
sudo apt install -y postgresql postgresql-contrib

# PostgreSQL starten
sudo systemctl enable postgresql
sudo systemctl start postgresql

# Als postgres-Benutzer einloggen
sudo -u postgres psql

# Datenbank und Benutzer anlegen
CREATE DATABASE song_nexus_prod;
CREATE USER song_nexus_user WITH PASSWORD 'SICHERES_PASSWORT_HIER';
GRANT ALL PRIVILEGES ON DATABASE song_nexus_prod TO song_nexus_user;
\c song_nexus_prod
GRANT ALL ON SCHEMA public TO song_nexus_user;
\q

# Schema importieren
sudo -u postgres psql -d song_nexus_prod < /var/www/song-nexus/schema.sql
```

> **Wichtig:** Ersetze `SICHERES_PASSWORT_HIER` mit einem starken Passwort (z.B. mit `openssl rand -base64 32` generieren).

---

## 5. Projekt deployen

```bash
# Verzeichnis anlegen
sudo mkdir -p /var/www/song-nexus
sudo chown sebastian:sebastian /var/www/song-nexus

# Repository klonen (dev/redesign Branch)
cd /var/www/song-nexus
git clone -b dev/redesign https://github.com/Waschtl904/song-nexus.git .

# Backend-Dependencies installieren
cd /var/www/song-nexus/backend
npm install --production

# Frontend-Dependencies und Webpack-Build
cd /var/www/song-nexus/frontend
npm install
npm run build   # Erstellt dist/app.bundle.js
```

> Falls `npm run build` fehlt, in `/var/www/song-nexus/frontend/package.json` prüfen. Alternativ: `npx webpack --config webpack.config.js`

---

## 6. Umgebungsvariablen konfigurieren

```bash
# .env für Produktion anlegen
nano /var/www/song-nexus/backend/.env
```

Inhalt der `.env` (alle `PLACEHOLDER` durch echte Werte ersetzen):

```env
# === ENVIRONMENT ===
NODE_ENV=production
HOST=127.0.0.1
PORT=3000

# === FRONTEND ===
FRONTEND_URL=https://song-nexus.at
ALLOWED_ORIGINS=https://song-nexus.at,https://www.song-nexus.at
API_BASE=https://song-nexus.at/api

# === DATENBANK ===
DB_HOST=localhost
DB_PORT=5432
DB_NAME=song_nexus_prod
DB_USER=song_nexus_user
DB_PASSWORD=SICHERES_PASSWORT_HIER
DB_SSL=false

# === AUTH ===
# Neue Secrets generieren mit: openssl rand -base64 48
JWT_SECRET=NEUES_GEHEIMES_JWT_SECRET_HIER
JWT_EXPIRE=7d
JWT_REFRESH_SECRET=NEUES_GEHEIMES_REFRESH_SECRET_HIER
BCRYPT_ROUNDS=12

# === WEBAUTHN ===
WEBAUTHN_RP_ID=song-nexus.at
WEBAUTHN_RP_NAME=SONG-NEXUS
WEBAUTHN_ORIGIN=https://song-nexus.at
WEBAUTHN_TIMEOUT=60000

# === HTTPS (nginx übernimmt SSL, Node läuft auf HTTP intern) ===
USE_HTTPS=false

# === CSRF & SESSION ===
COOKIE_SECRET=NEUES_GEHEIMES_COOKIE_SECRET_HIER
CSRF_TOKEN_LENGTH=32
SESSION_SECRET=NEUES_GEHEIMES_SESSION_SECRET_HIER
SESSION_MAX_AGE=900000

# === PAYPAL (Sandbox → Live wechseln wenn bereit) ===
PAYPAL_CLIENT_ID=DEIN_PAYPAL_CLIENT_ID
PAYPAL_CLIENT_SECRET=DEIN_PAYPAL_CLIENT_SECRET
PAYPAL_MODE=live

# === E-MAIL (Nodemailer) ===
SMTP_HOST=smtp.gmx.at
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=sebastian.schmalnauer@gmx.at
SMTP_PASS=DEIN_GMX_PASSWORT
EMAIL_FROM=SONG-NEXUS <sebastian.schmalnauer@gmx.at>

# === UPLOAD ===
UPLOAD_DIR=/var/www/song-nexus/backend/public/audio
MAX_FILE_SIZE=104857600

# === LOGGING ===
LOG_LEVEL=warn
LOG_FILE=/var/www/song-nexus/backend/logs/app.log

# === SICHERHEIT ===
RATE_LIMIT_AUTH_WINDOW_MS=900000
RATE_LIMIT_AUTH_MAX=5
RATE_LIMIT_API_WINDOW_MS=60000
RATE_LIMIT_API_MAX=30
HSTS_MAX_AGE=31536000
TRUST_PROXY=true

# === SONSTIGES ===
MAGIC_LINK_EXPIRY_MINUTES=15
MAGIC_LINK_TOKEN_LENGTH=32
SOFT_DELETE_ENABLED=true
```

```bash
# .env-Datei absichern (nur owner darf lesen)
chmod 600 /var/www/song-nexus/backend/.env
```

> **Secrets neu generieren** — die Werte aus dem Repository nie in Produktion verwenden:
> ```bash
> openssl rand -base64 48   # für JWT_SECRET, SESSION_SECRET, etc.
> ```

---

## 7. nginx einrichten

```bash
# Konfigurationsdatei anlegen
sudo nano /etc/nginx/sites-available/song-nexus
```

Inhalt:

```nginx
# HTTP → HTTPS Redirect
server {
    listen 80;
    listen [::]:80;
    server_name song-nexus.at www.song-nexus.at;

    # Nur Let's Encrypt Challenge erlauben
    location /.well-known/acme-challenge/ {
        root /var/www/certbot;
    }

    location / {
        return 301 https://$host$request_uri;
    }
}

# HTTPS Server
server {
    listen 443 ssl http2;
    listen [::]:443 ssl http2;
    server_name song-nexus.at www.song-nexus.at;

    # SSL (wird von Certbot automatisch ausgefüllt)
    ssl_certificate     /etc/letsencrypt/live/song-nexus.at/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/song-nexus.at/privkey.pem;
    include             /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam         /etc/letsencrypt/ssl-dhparams.pem;

    # Security Headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options    "nosniff" always;
    add_header X-Frame-Options           "SAMEORIGIN" always;
    add_header Referrer-Policy           "strict-origin-when-cross-origin" always;
    add_header Permissions-Policy        "geolocation=(), microphone=(), camera=()" always;

    # Gzip-Kompression
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml image/svg+xml;
    gzip_min_length 1024;

    # Statische Frontend-Dateien direkt ausliefern (schneller als Node)
    root /var/www/song-nexus/frontend;
    index index.html;

    # API → Node.js weiterleiten
    location /api/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Upgrade $http_upgrade;
        proxy_set_header   Connection 'upgrade';
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 60s;
    }

    # Audio-Streaming → Node.js (mit größerem Buffer)
    location /public/audio/ {
        proxy_pass         http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header   Host $host;
        proxy_set_header   X-Real-IP $remote_addr;
        proxy_set_header   X-Forwarded-Proto $scheme;
        proxy_read_timeout 300s;
        proxy_buffering    off;
    }

    # Statische Dateien cachen
    location ~* \.(js|css|png|jpg|jpeg|webp|svg|ico|woff2|woff)$ {
        expires 30d;
        add_header Cache-Control "public, immutable";
    }

    # SPA Fallback (alle anderen Pfade → index.html)
    location / {
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
# Konfiguration aktivieren
sudo ln -s /etc/nginx/sites-available/song-nexus /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default

# Konfiguration testen
sudo nginx -t

# nginx neustarten
sudo systemctl restart nginx
```

---

## 8. HTTPS mit Let's Encrypt

```bash
# Zertifikat anfordern (nginx läuft bereits)
sudo certbot --nginx -d song-nexus.at -d www.song-nexus.at \
  --email sebastian.schmalnauer@gmx.at \
  --agree-tos \
  --no-eff-email

# Automatische Erneuerung testen
sudo certbot renew --dry-run

# Cron für automatische Erneuerung prüfen (Certbot legt das selbst an)
sudo systemctl status certbot.timer
```

> Nach erfolgreichem Certbot-Lauf füllt er die SSL-Pfade in der nginx-Config automatisch aus.

---

## 9. PM2 — Prozessmanager

PM2 sorgt dafür, dass der Node.js-Server nach einem Absturz oder Neustart automatisch wieder läuft.

```bash
cd /var/www/song-nexus/backend

# Server mit PM2 starten
pm2 start server.js --name "song-nexus" --node-args="--no-deprecation"

# PM2 beim Systemstart automatisch starten
pm2 startup systemd
# (Den angezeigten sudo-Befehl ausführen)
pm2 save

# Status prüfen
pm2 status
pm2 logs song-nexus --lines 50
```

### Nützliche PM2-Befehle

```bash
pm2 restart song-nexus   # Server neustarten
pm2 stop song-nexus      # Server stoppen
pm2 logs song-nexus      # Live-Logs anzeigen
pm2 monit                # Dashboard mit CPU/RAM
pm2 reload song-nexus    # Zero-Downtime Reload
```

---

## 10. Frontend bauen & ausliefern

Das Frontend muss einmal gebaut werden (Webpack erstellt `dist/app.bundle.js`):

```bash
cd /var/www/song-nexus/frontend
npm install
npx webpack --config webpack.config.js --mode production
```

nginx liefert das Frontend direkt als statische Dateien aus — kein Node.js nötig dafür.

---

## 11. E-Mail (Nodemailer) konfigurieren

Nodemailer ist bereits in `package.json` vorhanden. Du musst nur eine Hilfsfunktion im Backend einbinden und beim Passwort-Reset aufrufen.

```bash
# Neue Datei anlegen
nano /var/www/song-nexus/backend/utils/mailer.js
```

Inhalt:

```javascript
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST || 'smtp.gmx.at',
  port:   parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

async function sendPasswordResetEmail(toEmail, token, baseUrl) {
  const resetUrl = `${baseUrl}/password-reset.html?token=${token}`;
  await transporter.sendMail({
    from:    process.env.EMAIL_FROM || 'SONG-NEXUS <noreply@song-nexus.at>',
    to:      toEmail,
    subject: 'SONG-NEXUS — Passwort zurücksetzen',
    html: `
      <div style="background:#05080d;color:#e0fff8;font-family:monospace;padding:32px;border-radius:8px;">
        <h2 style="color:#00ffcc;letter-spacing:.1em;">// PASSWORT RESET</h2>
        <p>Du hast ein Zurücksetzen deines Passworts angefordert.</p>
        <p>Klicke auf den folgenden Link (gültig für <strong>1 Stunde</strong>):</p>
        <a href="${resetUrl}"
           style="display:inline-block;margin:16px 0;padding:12px 24px;background:#00ffcc;color:#05080d;font-weight:700;text-decoration:none;border-radius:4px;">
          Passwort zurücksetzen
        </a>
        <p style="color:#3a7a6a;font-size:.85em;">
          Falls du das nicht angefordert hast, ignoriere diese E-Mail.<br>
          Der Link läuft in 1 Stunde ab.
        </p>
      </div>`,
    text: `Passwort-Reset Link: ${resetUrl}\n\nGültig für 1 Stunde.`,
  });
}

module.exports = { sendPasswordResetEmail };
```

Dann in `backend/routes/auth.js` beim Password-Reset-Request einbinden:

```javascript
// Am Anfang der Datei hinzufügen:
const { sendPasswordResetEmail } = require('../utils/mailer');

// Im /password-reset/request Handler, nach der Token-Generierung:
// TODO-Kommentar ersetzen durch:
await sendPasswordResetEmail(user.email, token, process.env.FRONTEND_URL);
```

```bash
# Danach PM2 neu starten
pm2 restart song-nexus
```

---

## 12. Wartung & Updates

### Code-Update deployen

```bash
cd /var/www/song-nexus
git pull origin dev/redesign
cd backend && npm install --production
cd ../frontend && npx webpack --config webpack.config.js --mode production
pm2 reload song-nexus   # Zero-Downtime Reload
```

### Datenbank-Backup

```bash
# Manuelles Backup
pg_dump -U song_nexus_user -d song_nexus_prod > /home/sebastian/backup_$(date +%Y%m%d).sql

# Automatisches tägliches Backup via Cron
crontab -e
# Folgende Zeile hinzufügen:
0 3 * * * pg_dump -U song_nexus_user -d song_nexus_prod > /home/sebastian/backups/backup_$(date +\%Y\%m\%d).sql
```

### Logs anzeigen

```bash
pm2 logs song-nexus --lines 100    # App-Logs
sudo tail -f /var/log/nginx/error.log   # nginx-Fehler
sudo tail -f /var/log/nginx/access.log  # nginx-Zugriffe
```

### Server-Updates

```bash
sudo apt update && sudo apt upgrade -y
pm2 reload song-nexus
```

---

## 13. Checkliste vor Go-Live

Gehe diese Liste durch, bevor du die Domain öffentlich machst:

### Sicherheit
- [ ] Alle Secrets in `.env` neu generiert (nie die Repo-Werte verwenden)
- [ ] `.env` hat Berechtigungen `chmod 600`
- [ ] Root-Login per SSH deaktiviert
- [ ] Fail2ban läuft (`sudo systemctl status fail2ban`)
- [ ] Firewall lässt nur Ports 22, 80, 443 durch
- [ ] PayPal von Sandbox auf **Live** umgestellt

### HTTPS & Domain
- [ ] A-Record gesetzt und propagiert (`nslookup song-nexus.at`)
- [ ] Let's Encrypt Zertifikat ausgestellt
- [ ] HTTPS-Redirect funktioniert (HTTP → HTTPS)
- [ ] `certbot renew --dry-run` erfolgreich

### Anwendung
- [ ] `pm2 status` zeigt `online`
- [ ] `pm2 logs` zeigt keine Fehler
- [ ] `/api/tracks` antwortet im Browser
- [ ] Login, Registrierung und WebAuthn funktionieren
- [ ] Passwort-Reset sendet E-Mail
- [ ] Track-Kauf mit PayPal funktioniert (Test-Transaktion)
- [ ] Admin-Upload funktioniert

### Rechtliches (Österreich)
- [ ] Impressum erreichbar unter `/impressum.html`
- [ ] Datenschutzerklärung erreichbar unter `/datenschutz.html`
- [ ] Footer-Links auf Impressum und Datenschutz vorhanden

### Performance
- [ ] Webpack-Bundle mit `--mode production` gebaut (minimiert)
- [ ] nginx Gzip-Kompression aktiv
- [ ] Statische Dateien werden gecacht (30 Tage)

---

## Hilfreiche Befehle — Schnellreferenz

```bash
# Server-Status
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Neustarten
pm2 restart song-nexus
sudo systemctl restart nginx

# Logs
pm2 logs song-nexus
sudo journalctl -u nginx -n 50

# SSL erneuern
sudo certbot renew

# Disk-Nutzung
df -h
du -sh /var/www/song-nexus/backend/logs/
```

---

*Erstellt: Juni 2026 · SONG-NEXUS v8.0 · Hetzner CX22 · Ubuntu 24.04 LTS*
