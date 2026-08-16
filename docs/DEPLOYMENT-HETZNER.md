# SONG-NEXUS — Deployment auf Hetzner VPS

> **Welches Dokument gilt?** Für dein Vorhaben — ein Hetzner-VPS mit lokaler
> PostgreSQL — ist **dieses hier** die operative Anleitung, samt der geprüften
> Skripte unter `scripts/deploy/`. `PRODUCTION-DEPLOYMENT.md` im Wurzelverzeichnis
> ist die allgemeinere, englischsprachige Fassung und beschreibt auch Varianten
> mit Managed-Datenbank. Die beiden überschneiden sich stark; das Zusammenführen
> ist als Issue erfasst.


**Ziel:** Song-Nexus produktionsreif auf einem Hetzner VPS betreiben — mit nginx als Reverse Proxy, Let's Encrypt (HTTPS), PM2 als Prozessmanager und PostgreSQL.

> **Voraussetzung:** ein Hetzner-Account. Die Domain registrierst du in
> Abschnitt 1, falls noch keine vorhanden ist.
>
> In dieser Anleitung steht `deine-domain.at` überall als Platzhalter. Ersetze
> ihn durch deine echte Domain — auch in der `.env`, sonst schlagen WebAuthn
> und die CORS-Prüfung fehl.

---

## Skripte statt Abschreiben

Die Befehle dieser Anleitung liegen als geprüfte Skripte im Repository:

| Skript | Was |
|---|---|
| `scripts/deploy/01-harden-server.sh` | Abschnitte 2 (Benutzer, SSH, Firewall, fail2ban) |
| `scripts/deploy/02-install-stack.sh` | Abschnitt 3 (Node 22, PM2, nginx, PostgreSQL, certbot) |
| `scripts/deploy/03-deploy-app.sh` | Abschnitte 4 und 5 (Datenbank, Repo, Build) |
| `scripts/deploy/04-nginx-ssl.sh` | Abschnitte 7 bis 9 (nginx, Let's Encrypt, PM2-Start) |
| `scripts/deploy/backup-db.sh` | Abschnitt 12 (Backup samt Restore-Test) |

Jedes Skript prüft am Ende, ob es funktioniert hat, und bricht mit einer
klaren Meldung ab, wenn nicht. Die Anleitung hier erklärt das Warum — lies
den jeweiligen Abschnitt, bevor du das Skript startest.

**Die `.env` schreibst du von Hand** (Abschnitt 6). Kein Skript erzeugt
Secrets und setzt sie gleich ein.

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
2. **+ New Server**
3. Einstellungen:
   - **Location:** Nürnberg, Falkenstein oder Helsinki. Hetzner hat **keinen
     Standort Wien** — das stand hier vorher falsch. Alle drei liegen in der
     EU und sind damit datenschutzrechtlich unbedenklich; Nürnberg ist von
     Österreich aus die kürzeste Strecke.
   - **Image:** Ubuntu 24.04 LTS
   - **SSH Key:** deinen öffentlichen Schlüssel hinterlegen. **Kein Passwort-
     Login** — `01-harden-server.sh` schaltet die Passwortanmeldung ab und
     sperrt dich ohne hinterlegten Schlüssel aus.
   - **Firewall:** neue Firewall anlegen (Regeln unten)

**Welche Größe?** Was die Anwendung braucht:

| | Mindestens | Warum |
|---|---|---|
| vCPU | 2 | der Webpack-Build ist der schwerste Vorgang |
| RAM | 4 GB | Node und PostgreSQL parallel, plus Build |
| Disk | 40 GB | System, `node_modules`, Audiodateien, Backups |

Nimm den günstigsten Plan, der das erfüllt. Ein konkreter Plan-Name steht hier
absichtlich nicht mehr: Hetzner hat die Cloud-Preise im Juni 2026 angehoben
und die Baureihen dabei umbenannt, teils um mehr als das Doppelte
([Übersicht der Änderungen](https://privatedevops.com/news/hetzner-june-2026-cloud-price-increase-what-to-do)).
Was hier als Zahl stünde, wäre bei der nächsten Anpassung wieder falsch —
schau auf der [Preisseite](https://www.hetzner.com/cloud/) nach dem aktuellen
Stand.

Die ARM-Reihe (CAX) ist deutlich günstiger als die x86-Pläne und für dieses
Projekt geeignet: SONG-NEXUS hat keine nativen Abhängigkeiten, die
kompiliert werden müssten — `bcryptjs` ist reines JavaScript, `pg` ebenfalls.
Wenn du sparen willst, ist das der Hebel. Falls dabei etwas klemmt, lässt sich
ein Cloud-Server bei Hetzner nachträglich auf x86 umziehen, allerdings nicht
per Knopfdruck.

**Speicherplatz später erweitern:** Audiodateien wachsen. Ein Volume lässt
sich jederzeit anhängen, ohne den Server neu aufzusetzen — plane die Disk
also nicht großzügig „für später".

### Firewall-Regeln

| Protokoll | Port | Zweck |
|-----------|------|-------|
| TCP | 22 | SSH |
| TCP | 80 | HTTP (für Let's Encrypt) |
| TCP | 443 | HTTPS |

> Port 3000 (Node.js) **nicht** öffentlich freischalten — nginx leitet intern weiter.

### Domain registrieren

Noch keine Domain? Dann zuerst das, denn ohne DNS-Eintrag stellt Let's
Encrypt kein Zertifikat aus.

**`.at` oder `.com`?** Im README stand bisher `song-nexus.com`, die alte
Anleitung nannte `song-nexus.at`. Für ein österreichisches Musikprojekt mit
Impressum in Bad Ischl ist `.at` naheliegend und günstiger. Ob der Name frei
ist, prüfst du bei [nic.at](https://www.nic.at/de/registrieren-sie-ihre-domain).

Registrieren kannst du nicht direkt bei nic.at, sondern über einen
Registrar. Übliche österreichische Anbieter sind World4You, easyname und
Hosttech; international geht auch Cloudflare Registrar oder INWX. Worauf es
ankommt:

- **DNS-Verwaltung im Selbstbedienungsbereich** — du musst A-Records selbst
  setzen können, ohne Ticket
- **Kein Zwangs-Webhosting-Paket** — du brauchst nur die Domain
- **WHOIS-Schutz** — bei `.at` ist die Adresse eines Privatinhabers nicht
  öffentlich, bei `.com` schon; Registrar-Datenschutz kostet dort teils extra

Rechne bei `.at` mit einem niedrigen zweistelligen Eurobetrag pro Jahr.
Preise ändern sich, deshalb steht hier absichtlich keine Zahl.

### DNS-Einträge setzen

Beim Registrar zwei **A-Records** anlegen:

```
@      A   <IP-Adresse des Servers>      (also deine-domain.at)
www    A   <IP-Adresse des Servers>
```

Den `www`-Eintrag nicht vergessen — `04-nginx-ssl.sh` fordert das Zertifikat
für beide Namen an, und Certbot scheitert vollständig, wenn einer der beiden
nicht auflöst.

Warte 5 bis 30 Minuten. Prüfen:

```bash
# Auf dem Server:
getent hosts deine-domain.at
curl -s ifconfig.me                # muss dieselbe IP zeigen
```

`04-nginx-ssl.sh` prüft das selbst und bricht ab, wenn es nicht passt.

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

# Schema importieren — schema_clean.sql ist die führende Datei.
# schema.sql enthält Altlasten und Redundanzen, nicht verwenden.
sudo -u postgres psql -d song_nexus_prod -f /var/www/song-nexus/schema_clean.sql
```

> **Wichtig:** Ersetze `SICHERES_PASSWORT_HIER` mit einem starken Passwort (z.B. mit `openssl rand -base64 32` generieren).

---

## 5. Projekt deployen

```bash
# Verzeichnis anlegen
sudo mkdir -p /var/www/song-nexus
sudo chown sebastian:sebastian /var/www/song-nexus

# Repository klonen — Branch dev/v1.0, NICHT main
# main ist 17 Commits im Rückstand (Issue #5). dev/redesign existiert nicht mehr.
cd /var/www/song-nexus
git clone -b dev/v1.0 https://github.com/Waschtl904/song-nexus.git .

# Backend: npm ci statt npm install — nutzt die Lockfile exakt und ist
# reproduzierbar. --omit=dev lässt Jest und Nodemon weg.
cd /var/www/song-nexus/backend
npm ci --omit=dev

# Frontend: hier OHNE --omit=dev, denn webpack und die Loader sind
# devDependencies. Ohne sie gibt es keinen Build.
cd /var/www/song-nexus/frontend
npm ci
npm run build   # erzeugt dist/app.bundle.js
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
FRONTEND_URL=https://deine-domain.at
ALLOWED_ORIGINS=https://deine-domain.at,https://www.deine-domain.at
API_BASE=https://deine-domain.at/api

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
WEBAUTHN_RP_ID=deine-domain.at
WEBAUTHN_RP_NAME=SONG-NEXUS
WEBAUTHN_ORIGIN=https://deine-domain.at
WEBAUTHN_TIMEOUT=60000

# === HTTPS (nginx übernimmt SSL, Node läuft auf HTTP intern) ===
USE_HTTPS=false

# === CSRF & SESSION ===
COOKIE_SECRET=NEUES_GEHEIMES_COOKIE_SECRET_HIER
CSRF_TOKEN_LENGTH=32
SESSION_SECRET=NEUES_GEHEIMES_SESSION_SECRET_HIER
SESSION_MAX_AGE=900000

# === ZAHLUNGEN ===
# PAYMENTS_ENABLED bewusst NICHT setzen. Fehlt die Variable, sind Zahlungen
# aus (fail-closed, Issue #8). Für den Soft-Launch ist das richtig: es gibt
# im Frontend ohnehin keinen Kauf-Button, und PayPal ist noch Sandbox.
# Erst einschalten, wenn #11 bis #16 erledigt sind.
# PAYMENTS_ENABLED=true

# === PAYPAL (bis zur Live-Umstellung Sandbox, Issue #11) ===
PAYPAL_CLIENT_ID=DEIN_SANDBOX_CLIENT_ID
PAYPAL_CLIENT_SECRET=DEIN_SANDBOX_CLIENT_SECRET
PAYPAL_MODE=sandbox

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

Die Konfiguration liegt als Vorlage im Repository:
`scripts/deploy/nginx-song-nexus.conf.template`

`04-nginx-ssl.sh` ersetzt darin den Platzhalter `DEINE_DOMAIN` und aktiviert
sie. Von Hand:

```bash
sed 's/DEINE_DOMAIN/deine-domain.at/g' \
  /var/www/song-nexus/scripts/deploy/nginx-song-nexus.conf.template \
  | sudo tee /etc/nginx/sites-available/song-nexus

sudo ln -sf /etc/nginx/sites-available/song-nexus /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t && sudo systemctl reload nginx
```

> **Reihenfolge beachten:** Die Vorlage verweist auf Zertifikatsdateien, die
> vor Abschnitt 8 noch nicht existieren. `nginx -t` scheitert dann. Deshalb
> startet `04-nginx-ssl.sh` zuerst mit einer reinen HTTP-Konfiguration, holt
> das Zertifikat und schaltet danach auf die volle Konfiguration um. Machst du
> es von Hand, halte dieselbe Reihenfolge ein.

### Drei Dinge, die in der früheren Konfiguration fehlten

Die Version, die bis August 2026 hier stand, hätte im Betrieb Probleme
gemacht. Was geändert wurde und warum:

**1. `client_max_body_size 105M`**

Fehlte ganz. nginx bricht standardmäßig bei 1 MB ab und antwortet mit 413.
Die Anwendung erlaubt 100 MB (`MAX_FILE_SIZE=104857600`). Jeder Audio-Upload
über 1 MB wäre gescheitert — also jeder echte Song.

**2. Kein Fallback mehr auf `index.html`**

Vorher stand dort `try_files $uri $uri/ /index.html;`. Das liefert für jeden
falschen Pfad Status 200 mit der Startseite. Genau dieser Mechanismus im
Backend war der Grund, warum die toten Links monatelang unentdeckt blieben
(Issue #10) — auch `/datenschutzz.html` mit Tippfehler sah für jeden
Linkprüfer gesund aus. SONG-NEXUS ist keine Single-Page-Anwendung, sondern
hat elf einzelne HTML-Seiten. Jetzt:

```nginx
try_files $uri $uri/ $uri.html =404;
error_page 404 /404.html;
```

**3. Quelldateien gesperrt**

`root` zeigt auf `/var/www/song-nexus/frontend`. In diesem Verzeichnis liegen
auch `node_modules`, `package.json`, `webpack.config.js`, `server.js` und
`certs/`. Ohne Sperre war das alles öffentlich abrufbar.

Wichtig dabei: **`/js/` darf nicht gesperrt werden.** Die Seiten laden
`js/init.js` und `js/admin.js` zur Laufzeit direkt, nicht über das Bundle.
Eine Sperre auf `/js/` nimmt die Admin-Seite außer Betrieb. Meine erste
Fassung der Vorlage hatte genau diesen Fehler.

> **Nebenbefund:** `frontend/certs/localhost-key.pem` liegt im öffentlichen
> Repository. Es ist ein reiner localhost-Schlüssel von mkcert und damit kein
> ernsthaftes Risiko — verwendbar ist er nur, wenn man auch die mkcert-CA
> besitzt. Trotzdem gehört ein privater Schlüssel nicht in ein öffentliches
> Repository, und mkcert erzeugt ihn in zwei Sekunden neu. Ich habe dafür ein
> eigenes Issue angelegt, statt es hier mit hineinzumischen.

---

## 8. HTTPS mit Let's Encrypt

```bash
# Zertifikat anfordern (nginx läuft bereits)
sudo certbot --nginx -d deine-domain.at -d www.deine-domain.at \
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

PM2 startet den Node-Server nach Absturz und Serverneustart wieder. Die
Einstellungen liegen in `scripts/deploy/ecosystem.config.js`, damit sie
versioniert sind und nicht in einer Befehlszeile verschwinden.

```bash
cd /var/www/song-nexus
pm2 start scripts/deploy/ecosystem.config.js --env production

# Autostart nach Serverneustart
pm2 startup systemd        # gibt einen sudo-Befehl aus — den ausführen
pm2 save                   # merkt sich die laufenden Prozesse

# Kontrolle
pm2 status
pm2 logs song-nexus-api --lines 50
```

Der Prozess heißt **`song-nexus-api`**. Nur das Backend läuft unter PM2 —
`frontend/server.js` wird in Produktion nicht gebraucht, weil nginx die
statischen Dateien direkt ausliefert.

### Warum ein Prozess und nicht mehrere

In der Konfiguration steht `instances: 1` und `exec_mode: 'fork'`. Der
Cluster-Modus wäre naheliegend, ist aber derzeit schädlich: Die
Download-Tokens liegen in einer `Map` im Arbeitsspeicher (Issue #13). Bei
mehreren Prozessen führt jeder seine eigene Map, und ein Download schlägt
sporadisch fehl, je nachdem welcher Prozess die Anfrage bekommt. Erst wenn
#13 erledigt ist, lohnt der Cluster-Modus.

`max_memory_restart: '500M'` startet den Prozess bei einem Speicherleck neu,
statt den Server lahmzulegen.

### Nützliche Befehle

```bash
pm2 reload song-nexus-api    # Neustart ohne Ausfall — nach Code-Updates
pm2 restart song-nexus-api   # harter Neustart — nach .env-Änderungen
pm2 stop song-nexus-api
pm2 logs song-nexus-api
pm2 monit                    # CPU und Speicher live
```

> **`.env`-Änderungen brauchen `restart`, nicht `reload`.** Bei `reload`
> übernimmt PM2 die alte Umgebung. Wenn du also ein Secret änderst und nichts
> passiert: das ist der Grund.

---

## 10. Frontend bauen & ausliefern

```bash
cd /var/www/song-nexus/frontend
npm ci
npm run build
```

`npm run build` ist **Pflicht, nicht optional**: `frontend/dist/` steht in der
`.gitignore` und kommt nicht mit dem Repository. Ohne Build lädt jede Seite ein
Bundle, das es nicht gibt — die Seite erscheint, aber nichts funktioniert.

Nach jeder Änderung in `frontend/js/`, `frontend/css/` oder
`frontend/config/design.config.json` muss der Build erneut laufen.

Prüfen:

```bash
ls -lh /var/www/song-nexus/frontend/dist/app.bundle.js
```

nginx liefert die Dateien danach direkt aus, ohne Node.

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
pm2 restart song-nexus-api
```

---

## 12. Wartung & Updates

### Code-Update deployen

```bash
cd /var/www/song-nexus
git status                       # erst schauen, ob lokal etwas geändert wurde
git pull origin dev/v1.0
cd backend  && npm ci --omit=dev
cd ../frontend && npm ci && npm run build
cd ..
pm2 reload song-nexus-api        # Neustart ohne Ausfall

# Prüfen, dass es noch läuft:
pm2 describe song-nexus-api | grep status
curl -s -o /dev/null -w '%{http_code}\n' https://deine-domain.at/
```

### Admin-Konto anlegen

`npm run seed:dev-admin` verweigert in Produktion absichtlich den Dienst — das
Skript prüft `NODE_ENV` und die Datenbankadresse. Sonst wäre es der Nachfolger
genau jener Lücke, die es ersetzt hat (Issue #1).

In Produktion gibt es zwei saubere Wege.

**Weg 1 — normal registrieren, dann hochstufen (empfohlen)**

```bash
# 1. Auf https://deine-domain.at/auth.html normal registrieren.
#    Passwortregeln und Validierung greifen dabei.

# 2. Danach auf dem Server die Rolle setzen:
sudo -u postgres psql -d song_nexus_prod

-- erst nachsehen, wen es gibt:
SELECT id, email, username, role, is_active FROM users ORDER BY id;

-- dann gezielt hochstufen:
UPDATE users SET role = 'admin' WHERE email = 'deine@mailadresse.at';

-- Kontrolle:
SELECT id, email, role FROM users WHERE role = 'admin';
\q
```

Der Vorteil: Der Passwort-Hash entsteht durch den regulären Registrierungsweg,
du hantierst nicht selbst mit bcrypt.

**Weg 2 — Hash direkt erzeugen**

Falls die Registrierung noch nicht erreichbar ist:

```bash
cd /var/www/song-nexus/backend
node -e "
const bcrypt = require('bcryptjs');
const pw = process.argv[1];
if (!pw || pw.length < 12) { console.error('Passwort zu kurz'); process.exit(1); }
console.log(bcrypt.hashSync(pw, 12));
" 'DEIN-LANGES-PASSWORT'
```

Den ausgegebenen Hash einsetzen:

```sql
INSERT INTO users (email, username, password_hash, role, is_active)
VALUES ('deine@mailadresse.at', 'admin', '<HASH-HIER>', 'admin', true);
```

Die Rollenspalte akzeptiert per Constraint nur `user` oder `admin` — ein
Tippfehler wird von der Datenbank abgewiesen, nicht stillschweigend geschluckt.

> **Solange Issue #24 offen ist:** Ein einmal ausgestelltes Admin-Token bleibt
> sieben Tage gültig, auch wenn du das Konto danach deaktivierst. `requireAdmin`
> liest die Rolle aus dem Token, ohne in der Datenbank nachzusehen. Musst du
> einen Admin-Zugang wirklich sofort entziehen, ist derzeit das Rotieren von
> `JWT_SECRET` samt `pm2 reload` der einzige verlässliche Weg — das wirft alle
> Sitzungen aller Benutzer ab.

---

### Datenbank-Backup

Mit dem Skript, das auch die Wiederherstellbarkeit prüft:

```bash
# Einmalig
bash /var/www/song-nexus/scripts/deploy/backup-db.sh

# Täglich um 03:30 einrichten
bash /var/www/song-nexus/scripts/deploy/backup-db.sh --cron-einrichten

# Wiederherstellung testen (legt eine Testdatenbank an, Produktion bleibt unberührt)
bash /var/www/song-nexus/scripts/deploy/backup-db.sh --restore /var/backups/song-nexus/song_nexus_prod_2026-08-16_0330.sql.gz
```

Das Skript sichert auch `backend/public/audio` — die Audiodateien liegen nicht
in der Datenbank und wären bei einem Serververlust sonst weg.

> **Ein Backup auf demselben Server ist kein Backup.** Bei Serverausfall sind
> Datenbank und Sicherung gemeinsam verloren. Lade die Dateien regelmäßig
> herunter oder richte Hetzner Storage Box ein. Und teste einmal eine echte
> Wiederherstellung, bevor du sie brauchst — genau dafür ist `--restore` da.
> Issue #7 ist erst dann erledigt.

<details>
<summary>Befehle von Hand, ohne Skript</summary>

```bash
# Manuelles Backup
pg_dump -U song_nexus_user -d song_nexus_prod > /home/sebastian/backup_$(date +%Y%m%d).sql

# Automatisches tägliches Backup via Cron
crontab -e
# Folgende Zeile hinzufügen:
0 3 * * * pg_dump -U song_nexus_user -d song_nexus_prod > /home/sebastian/backups/backup_$(date +\%Y\%m\%d).sql
```

</details>

### Logs anzeigen

```bash
pm2 logs song-nexus-api --lines 100    # App-Logs
sudo tail -f /var/log/nginx/error.log   # nginx-Fehler
sudo tail -f /var/log/nginx/access.log  # nginx-Zugriffe
```

### Server-Updates

```bash
sudo apt update && sudo apt upgrade -y
pm2 reload song-nexus-api
```

---

## 13. Checkliste vor Go-Live

Zwei getrennte Listen. Der Soft-Launch ist **gratis** — Zahlungen bleiben aus,
es gibt im Frontend ohnehin keinen Kauf-Button. Die frühere Fassung dieser
Checkliste verlangte „PayPal auf Live umstellen" und einen Kauf-Test; das gilt
erst für Milestone M3.

### Soft-Launch (jetzt)

**Sicherheit**
- [ ] Alle Secrets neu erzeugt, keine Werte aus dem Repository
- [ ] `JWT_SECRET` und `SESSION_SECRET` sind verschieden
- [ ] `chmod 600` auf `backend/.env`
- [ ] Root-Login per SSH aus (`sudo sshd -T | grep permitrootlogin`)
- [ ] Passwortanmeldung per SSH aus
- [ ] fail2ban läuft
- [ ] Firewall lässt nur 22, 80, 443 durch
- [ ] Port 3000 von außen **nicht** erreichbar (`curl http://IP:3000` läuft ins Leere)
- [ ] `PAYMENTS_ENABLED` ist nicht gesetzt
- [ ] Quelldateien gesperrt: `/package.json`, `/node_modules/`, `/server.js`, `/certs/` liefern 404

**HTTPS und Domain**
- [ ] A-Record für Domain **und** `www` gesetzt
- [ ] Zertifikat ausgestellt, `certbot renew --dry-run` erfolgreich
- [ ] HTTP leitet mit 301 auf HTTPS um
- [ ] HSTS-Header vorhanden
- [ ] `WEBAUTHN_RP_ID` und `WEBAUTHN_ORIGIN` entsprechen exakt der Domain

**Anwendung**
- [ ] `pm2 status` zeigt `online`, `pm2 logs` ohne Fehler
- [ ] `frontend/dist/app.bundle.js` existiert
- [ ] Startseite lädt, Audio spielt
- [ ] Registrierung und Login funktionieren
- [ ] Cookie ist `HttpOnly` und `Secure` (Entwicklerwerkzeuge, Reiter Anwendung)
- [ ] WebAuthn funktioniert auf mindestens einem echten Gerät
- [ ] Passwort-Reset sendet eine E-Mail, die auch ankommt (Spam-Ordner prüfen)
- [ ] Admin-Upload einer Datei über 1 MB funktioniert
- [ ] Ein falscher Pfad liefert **404**, nicht die Startseite
- [ ] Alle elf Seiten laden, keine 404 in der Netzwerkanalyse

**Recht (Österreich)**
- [ ] Impressum unter `/impressum.html`, Angaben stimmen
- [ ] Datenschutzerklärung unter `/datenschutz.html`
- [ ] Beide Links im Fußbereich **jeder** Seite
- [ ] Datenschutzerklärung nennt Hetzner als Auftragsverarbeiter
- [ ] Auftragsverarbeitungsvertrag mit Hetzner abgeschlossen (im Kundenbereich)

**Betrieb**
- [ ] Backup läuft per Cron
- [ ] Eine Wiederherstellung wurde **tatsächlich getestet** (`backup-db.sh --restore`)
- [ ] Backups liegen auch außerhalb des Servers
- [ ] `unattended-upgrades` aktiv

### Erst für Monetarisierung (M3)

- [ ] PayPal-Geschäftskonto verifiziert, Live-Zugangsdaten hinterlegt (#11)
- [ ] Webhook eingerichtet — ohne ihn bleiben bezahlte Bestellungen hängen (#12)
- [ ] Download-Tokens in der Datenbank statt im Arbeitsspeicher (#13)
- [ ] AGB und Widerrufsbelehrung für digitale Inhalte (#14)
- [ ] Gewerbe, Umsatzsteuer und OSS geklärt (#15)
- [ ] Kaufkette von der Bestellung bis zum Download getestet (#16)
- [ ] Kauf-Button im Frontend überhaupt vorhanden — den gibt es bisher nicht
- [ ] `PAYMENTS_ENABLED=true` gesetzt, danach `pm2 restart`

---

## Hilfreiche Befehle — Schnellreferenz

```bash
# Server-Status
pm2 status
sudo systemctl status nginx
sudo systemctl status postgresql

# Neustarten
pm2 restart song-nexus-api
sudo systemctl restart nginx

# Logs
pm2 logs song-nexus-api
sudo journalctl -u nginx -n 50

# SSL erneuern
sudo certbot renew

# Disk-Nutzung
df -h
du -sh /var/www/song-nexus/backend/logs/
```

---

*Erstellt: Juni 2026 · SONG-NEXUS v8.0 · Hetzner CX22 · Ubuntu 24.04 LTS*
