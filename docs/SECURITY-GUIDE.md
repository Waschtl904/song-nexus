# SECURITY-GUIDE.md — Song-Nexus Sicherheitsanalyse

**Erstellt:** Juni 2026  
**Plattform:** Node.js + Express + PostgreSQL + WebAuthn + JWT + PayPal  
**Zielgruppe:** Sebastian (Entwickler), Betrieb auf Hetzner VPS  
**Status:** Vor Go-Live zwingend umzusetzen

---

> **Zusammenfassung:** Es gibt aktuell fünf kritische Schwachstellen, die vor dem produktiven Betrieb behoben werden müssen: JWT in localStorage, bcrypt cost factor zu niedrig (10 statt ≥ 12), WebAuthn RP_ID zeigt auf `localhost`, In-Memory Rate Limiting (kein Schutz bei Multi-Server/Restart) und der bcrypt salt-Wert in `webauthn.js` ist fix auf 10 gesetzt statt via Umgebungsvariable.

---

## Inhaltsverzeichnis

1. [Bedrohungsmodell](#1-bedrohungsmodell)
2. [WebAuthn-spezifische Sicherheit](#2-webauthn-spezifische-sicherheit)
3. [Datenbankschutz](#3-datenbankschutz)
4. [JWT-Sicherheit](#4-jwt-sicherheit)
5. [Schutz sensibler Nutzerdaten (DSGVO)](#5-schutz-sensibler-nutzerdaten)
6. [Infrastruktur & Hetzner VPS](#6-infrastruktur--hetzner-vps)
7. [Sofort-Maßnahmen vor Go-Live](#7-sofort-maßnahmen-vor-go-live)
8. [Incident Response](#8-incident-response)
9. [Kaufvorgang und Auslieferung von Audiodateien](#9-kaufvorgang-und-auslieferung-von-audiodateien)

---

## 1. Bedrohungsmodell

### Angriffsszenarien im Überblick

| Angriff | Risiko | Aktueller Status |
|---------|--------|-----------------|
| SQL Injection | 🔴 Hoch | Parameterisierte Queries vorhanden — gut |
| XSS (Cross-Site Scripting) | 🔴 Hoch | JWT in localStorage — kritisch |
| CSRF | 🟡 Mittel | CSRF-Middleware vorhanden — prüfen |
| JWT-Diebstahl | 🔴 Hoch | localStorage-Speicherung — kritisch |
| Credential Stuffing | 🟡 Mittel | Rate Limiting vorhanden, aber In-Memory |
| Brute Force | 🟡 Mittel | Rate Limiting aktiv, aber nicht persistent |
| Session Hijacking | 🟡 Mittel | Kein Token-Revocation-Mechanismus |
| Man-in-the-Middle | 🟢 Niedrig | HTTPS geplant — umsetzen |
| Datenbankdump-Leak | 🔴 Hoch | Backups fehlen, DB-Passwörter ggf. schwach |

---

### 1.1 SQL Injection

**Was passiert:** Ein Angreifer schleust SQL-Befehle in Eingabefelder ein, um Datenbankdaten zu lesen, zu ändern oder zu löschen — z. B. alle Nutzerdaten mit einem einzigen Request herausziehen.

**Risiko:** Hoch

**Aktueller Status:** `auth.js` verwendet parameterisierte Queries (`$1`, `$2`), das ist korrekt. Trotzdem: Alle neuen Routen und Datenbankabfragen müssen dieses Muster konsequent einhalten.

```javascript
// ✅ RICHTIG — parameterisierte Query
const result = await pool.query(
  'SELECT id FROM users WHERE email = $1',
  [email]
);

// ❌ FALSCH — niemals String-Konkatenation
const result = await pool.query(
  `SELECT id FROM users WHERE email = '${email}'`
);
```

**Maßnahme:** Code-Review aller Datenbankabfragen. Bei Verwendung von `pg` ausschließlich parametrisierte Queries.

---

### 1.2 XSS (Cross-Site Scripting)

**Was passiert:** Ein Angreifer injiziert JavaScript-Code in die Seite (z. B. über einen Track-Titel oder Kommentar), der im Browser anderer Nutzer ausgeführt wird. Da der JWT aktuell in `localStorage` liegt, kann ein XSS-Angriff den Token mit `localStorage.getItem('auth_token')` stehlen und den Account übernehmen.

**Risiko:** Hoch — direktes Zusammenspiel mit JWT-Diebstahl (siehe Kapitel 4)

**Aktueller Befund:** `frontend/js/auth.js`, `frontend/js/webauthn.js` und `frontend/js/config.js` speichern den JWT in `localStorage`. Das ist der wichtigste zu behebende Punkt.

**Maßnahme:**
- JWT in HttpOnly-Cookie migrieren (kein JavaScript-Zugriff möglich)
- Content Security Policy (CSP) Header setzen
- Alle Nutzereingaben serverseitig validieren (`express-validator` bereits vorhanden — konsequent einsetzen)

```javascript
// CSP Header in server.js (Helmet bereits als Dependency vorhanden)
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"], // nur wenn nötig
      imgSrc: ["'self'", "data:"],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
}));
```

---

### 1.3 CSRF (Cross-Site Request Forgery)

**Was passiert:** Eine fremde Webseite löst im Namen des eingeloggten Nutzers Requests aus (z. B. Kauf eines Tracks, Passwortänderung). Funktioniert besonders gut wenn Cookies verwendet werden — relevant nach der JWT-Migration.

**Risiko:** Mittel (wird relevant nach HttpOnly-Cookie-Migration)

**Maßnahme:** `csrf-middleware.js` ist vorhanden. Nach Cookie-Migration sicherstellen, dass CSRF-Tokens für alle zustandsändernden Requests (`POST`, `PUT`, `DELETE`) validiert werden. `SameSite=Strict` oder `SameSite=Lax` auf den Cookies setzen.

```javascript
// Cookie-Einstellungen nach JWT-Migration
res.cookie('auth_token', token, {
  httpOnly: true,       // Kein JavaScript-Zugriff
  secure: true,         // Nur HTTPS
  sameSite: 'strict',   // CSRF-Schutz
  maxAge: 15 * 60 * 1000 // 15 Minuten
});
```

---

### 1.4 JWT-Diebstahl

**Was passiert:** Der Token wird gestohlen (via XSS, MITM, Logs) und der Angreifer nutzt ihn für beliebig viele Requests bis zum Ablauf. Aktuell läuft der Token 7 Tage (`JWT_EXPIRE=7d`) — ein gestohlener Token gibt 7 Tage lang vollen Zugriff.

**Risiko:** Hoch

**Maßnahme:** Siehe Kapitel 4 — kurze Laufzeit, HttpOnly Cookie, Refresh-Token-Mechanismus.

---

### 1.5 Credential Stuffing

**Was passiert:** Angreifer testen automatisiert Millionen gestohlener E-Mail/Passwort-Kombinationen aus anderen Leaks gegen die Login-Route. Nutzer die dasselbe Passwort mehrfach verwenden werden kompromittiert.

**Risiko:** Mittel

**Aktueller Status:** Rate Limiting auf `/api/auth/login` (5 Requests/Minute) vorhanden, aber als In-Memory Map — bei Serverneustart oder mehreren Prozessen wirkungslos.

**Maßnahme:** Redis-basiertes Rate Limiting (Kapitel 6), zusätzlich CAPTCHA nach mehreren Fehlversuchen erwägen.

---

### 1.6 Brute Force

**Was passiert:** Systematisches Durchprobieren von Passwörtern gegen ein bestimmtes Konto, bis das richtige gefunden wird.

**Risiko:** Mittel (durch bcrypt verlangsamt, aber noch nicht ausreichend geschützt)

**Maßnahme:** 
- bcrypt cost factor auf ≥ 12 erhöhen (aktuell 10)
- Account-Lockout nach N Fehlversuchen (z. B. 10 Fehlversuche → 30 Minuten gesperrt)
- WebAuthn bietet keinen Passwort-Brute-Force-Angriffspunkt — guten Adoptionsanreiz für Nutzer schaffen

---

### 1.7 Session Hijacking

**Was passiert:** Ein laufendes Session-Token wird abgefangen oder durch einen Fehler zugänglich gemacht. Der Angreifer übernimmt die aktive Sitzung ohne Passwort zu kennen.

**Risiko:** Mittel

**Maßnahme:** Kein Logout-Blacklisting vorhanden — nach einem Logout ist das Token technisch noch gültig bis zum Ablauf. Token Revocation implementieren (Kapitel 4).

---

### 1.8 Man-in-the-Middle (MITM)

**Was passiert:** Netzwerkverkehr zwischen Nutzer und Server wird abgehört. Tokens, Passwörter, PayPal-Daten werden im Klartext mitgelesen.

**Risiko:** Niedrig wenn HTTPS korrekt eingerichtet, Hoch ohne HTTPS

**Maßnahme:** HTTPS ist geplant — muss vor Go-Live aktiv sein. HSTS-Header setzen damit Browser dauerhaft nur HTTPS verwenden.

---

### 1.9 Datenbankdump-Leak

**Was passiert:** Angreifer erlangt direkten Zugriff auf PostgreSQL-Daten — durch kompromittierten DB-User, Fehlkonfiguration (offener Port 5432), oder durch Backup-Diebstahl. Alle Nutzerpasswörter, PayPal-Daten, WebAuthn-Credentials werden geleakt.

**Risiko:** Hoch — direkte DSGVO-Relevanz

**Maßnahme:** 
- Port 5432 niemals öffentlich exponieren (nur localhost)
- DB-Backups verschlüsselt, außerhalb des primären Servers
- Sensitive Felder zusätzlich verschlüsselt (Kapitel 3)
- DB-User mit minimalen Rechten (kein Superuser)

---

## 2. WebAuthn-spezifische Sicherheit

### 2.1 Was WebAuthn per Design schützt

WebAuthn ist das stärkste verfügbare Authentifizierungsverfahren für Webanwendungen:

- **Phishing-Resistenz:** Der Credential ist an eine exakte `rpId` (Domain) gebunden. Ein gefälschtes Login auf `song-nexus-fake.com` kann den Credential von `song-nexus.at` nie verwenden — das kryptografische Protokoll verhindert es auf Protokollebene.
- **Keine Passwörter gespeichert:** Auf dem Server liegen nur öffentliche Schlüssel und Credential-Metadaten. Selbst ein vollständiger Datenbankdump gibt einem Angreifer keine Login-Möglichkeit über WebAuthn.
- **Replay-Schutz:** Jede Challenge ist einmalig. Abgefangene Authentifizierungsantworten sind nicht wiederverwendbar.
- **Gerätebindung:** Der private Schlüssel verlässt das Gerät des Nutzers nie (außer bei Cloud-Sync, z. B. iCloud Keychain — dann ist er ans Apple-Konto gebunden).

### 2.2 Kritische Konfigurationspunkte

#### RP_ID — das wichtigste zu fixende Problem

**Aktueller Stand in `webauthn.js`:**
```javascript
rpID: process.env.WEBAUTHN_RP_ID || 'localhost',
```

Das `|| 'localhost'` ist ein Produktionsfehler. Sobald die echte Domain verwendet wird und `WEBAUTHN_RP_ID` nicht gesetzt ist, fällt es auf `localhost` zurück — und kein einziger Credential funktioniert.

Die `rpId` muss exakt der registrierenden Domain entsprechen oder deren übergeordneter Domain:

```bash
# .env für Produktion — MUSS gesetzt sein, kein Fallback akzeptabel
WEBAUTHN_RP_ID=song-nexus.at
WEBAUTHN_RP_NAME=Song-Nexus
WEBAUTHN_ORIGIN=https://song-nexus.at
```

```javascript
// webauthn.js — defensive Konfiguration
const RP_ID = process.env.WEBAUTHN_RP_ID;
const RP_NAME = process.env.WEBAUTHN_RP_NAME;
const ORIGIN = process.env.WEBAUTHN_ORIGIN;

if (!RP_ID || !RP_NAME || !ORIGIN) {
  throw new Error(
    'FATAL: WEBAUTHN_RP_ID, WEBAUTHN_RP_NAME und WEBAUTHN_ORIGIN ' +
    'müssen in der Umgebungsvariable gesetzt sein. Kein Fallback auf localhost!'
  );
}
```

Beim Server-Start sofort abbrechen wenn WebAuthn-Konfiguration fehlt — nicht stillschweigend auf unsichere Defaults zurückfallen.

#### User Verification

```javascript
// Empfehlung: 'preferred' statt 'discouraged'
const options = await generateRegistrationOptions({
  rpName: RP_NAME,
  rpID: RP_ID,
  userID: user.id,
  userName: user.username,
  userDisplayName: user.username,
  authenticatorSelection: {
    userVerification: 'preferred', // PIN/Biometrie bevorzugen
    residentKey: 'preferred',      // Passkey-Support
  },
  timeout: 60000,
});
```

#### allowCredentials bei Authentifizierung

Beim Login die bekannten Credentials des Nutzers mitgeben — verhindert, dass fremde Authenticators verwendet werden:

```javascript
const credentials = await pool.query(
  'SELECT credential_id FROM webauthn_credentials WHERE user_id = $1',
  [userId]
);

const options = await generateAuthenticationOptions({
  rpID: RP_ID,
  userVerification: 'preferred',
  allowCredentials: credentials.rows.map(c => ({
    id: c.credential_id,
    type: 'public-key',
  })),
  timeout: 60000,
});
```

### 2.3 Challenge-Speicherung

Challenges dürfen nicht dauerhaft gespeichert werden. Aktuell prüfen ob sie nach Verwendung sofort gelöscht werden:

```javascript
// Nach erfolgreicher Verifikation sofort löschen
await pool.query(
  'UPDATE users SET webauthn_challenge = NULL WHERE id = $1',
  [userId]
);

// Challenge-Ablauf: maximal 5 Minuten
const challengeExpiry = new Date(Date.now() - 5 * 60 * 1000);
// Regelmäßig abgelaufene Challenges aufräumen
await pool.query(
  'UPDATE users SET webauthn_challenge = NULL WHERE challenge_created_at < $1',
  [challengeExpiry]
);
```

### 2.4 Recovery-Flow — wenn ein Nutzer seinen Authenticator verliert

Das ist das größte praktische Problem bei WebAuthn. Ohne Backup-Authentifizierung ist der Account nicht wiederherstellbar.

**Empfohlener Recovery-Flow:**

1. **Magic Link** (bereits implementiert): Nutzer bekommt per E-Mail einen einmaligen Link, der eine neue WebAuthn-Registrierung erlaubt — Identität via E-Mail-Besitz bestätigt.
2. **Backup-Codes**: Bei der WebAuthn-Registrierung 5–10 einmalige Backup-Codes generieren und dem Nutzer anzeigen. Codes gehasht in der Datenbank speichern.
3. **Mehrere Authenticators**: Nutzer ermutigen, mehrere Geräte zu registrieren (z. B. Smartphone + Laptop).

```javascript
// Backup-Codes generieren bei WebAuthn-Registrierung
const backupCodes = Array.from({ length: 8 }, () =>
  crypto.randomBytes(5).toString('hex') // z.B. "a3f2b1c4d5"
);
const hashedCodes = await Promise.all(
  backupCodes.map(code => bcrypt.hash(code, 12))
);
await pool.query(
  'INSERT INTO backup_codes (user_id, codes) VALUES ($1, $2)',
  [userId, JSON.stringify(hashedCodes)]
);
// backupCodes dem Nutzer EINMALIG anzeigen — niemals erneut abrufbar
```

---

## 3. Datenbankschutz

### 3.1 bcrypt — Cost Factor prüfen und erhöhen

**Aktueller Stand:** `auth.js` liest `BCRYPT_ROUNDS` aus der Umgebungsvariable (Default: 10). In `webauthn.js` ist der Wert hardcoded auf 10:

```javascript
// webauthn.js — aktuell hardcoded
const salt = await bcrypt.genSalt(10); // ← Problem
```

**Mindestwert für Produktion ist 12.** Mit einer modernen CPU dauert das Knacken eines Passworts mit cost factor 12 ~250ms — mit factor 10 nur ~60ms. Bei einem Datenbankdump mit 10.000 Nutzern macht das einen erheblichen Unterschied.

```bash
# .env
BCRYPT_ROUNDS=12
```

```javascript
// Überall konsistent aus Umgebungsvariable lesen
const BCRYPT_ROUNDS = parseInt(process.env.BCRYPT_ROUNDS || '12', 10);
if (BCRYPT_ROUNDS < 12) {
  console.warn('⚠️  BCRYPT_ROUNDS < 12 — in Produktion auf mindestens 12 erhöhen!');
}
const hashedPassword = await bcrypt.hash(password, BCRYPT_ROUNDS);
```

### 3.2 Sensitive Felder verschlüsseln

Folgende Felder sollten in der Datenbank verschlüsselt (at-rest) gespeichert werden:

| Tabelle | Spalte | Begründung |
|---------|--------|------------|
| `orders` | `payer_email` (PayPal) | Persönliche Daten, Datenbankdump-Risiko |
| `users` | E-Mail (optional) | Hohes DSGVO-Schutzinteresse |
| `magic_links` | Token | Sollte gehasht gespeichert werden (SHA-256) |

**Verschlüsselung mit `pg` und Node.js `crypto`:**

```javascript
const crypto = require('crypto');

const ENCRYPTION_KEY = Buffer.from(process.env.FIELD_ENCRYPTION_KEY, 'hex'); // 32 bytes
const ALGORITHM = 'aes-256-gcm';

function encrypt(text) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  const encrypted = Buffer.concat([cipher.update(text, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

function decrypt(ciphertext) {
  const [ivHex, authTagHex, encryptedHex] = ciphertext.split(':');
  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');
  const encrypted = Buffer.from(encryptedHex, 'hex');
  const decipher = crypto.createDecipheriv(ALGORITHM, ENCRYPTION_KEY, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

// Schlüssel generieren:
// node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

Magic-Link-Tokens als SHA-256-Hash speichern, nicht im Klartext:

```javascript
const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
await pool.query('INSERT INTO magic_link_tokens (token_hash, user_id, expires_at) VALUES ($1, $2, $3)',
  [tokenHash, userId, expiresAt]);
```

### 3.3 Backups

**Strategie:**
- Tägliche verschlüsselte Backups mit `pg_dump` + GPG-Verschlüsselung
- Backups auf separatem Speicher (z. B. Hetzner Storage Box oder Backblaze B2) — niemals nur auf demselben VPS
- Backup-Retention: 7 Tage täglich, 4 Wochen monatlich

```bash
#!/bin/bash
# /etc/cron.daily/song-nexus-backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="/tmp/song-nexus-${TIMESTAMP}.sql.gz"

pg_dump -U song_nexus_app song_nexus_prod | gzip > "$BACKUP_FILE"

# GPG-Verschlüsselung mit Public Key
gpg --recipient backup@song-nexus.at --encrypt "$BACKUP_FILE"

# Upload auf Hetzner Storage Box
rsync -az "${BACKUP_FILE}.gpg" backup@u123456.your-storagebox.de:/backups/

# Lokale Temp-Datei löschen
rm -f "$BACKUP_FILE" "${BACKUP_FILE}.gpg"

echo "Backup completed: ${TIMESTAMP}"
```

### 3.4 Least Privilege — DB-User

Der App-Datenbankuser sollte kein Superuser sein und nur die minimal notwendigen Rechte haben:

```sql
-- Neuen eingeschränkten DB-User anlegen
CREATE USER song_nexus_app WITH PASSWORD 'starkes-zufallspasswort-hier';

-- Nur Zugriff auf die App-Datenbank
GRANT CONNECT ON DATABASE song_nexus_prod TO song_nexus_app;
GRANT USAGE ON SCHEMA public TO song_nexus_app;

-- Nur notwendige Rechte auf die benötigten Tabellen
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO song_nexus_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO song_nexus_app;

-- Explizit KEIN DROP, TRUNCATE, CREATE TABLE, superuser-Rechte
-- Migrationen werden mit einem separaten migrations-User ausgeführt
```

```bash
# .env — App-User statt postgres-Superuser
DB_USER=song_nexus_app
DB_PASSWORD=starkes-zufallspasswort-hier
```

### 3.5 Datenbank-Logging

```sql
-- Verdächtige Aktivitäten loggen (großes SELECT auf users-Tabelle)
-- PostgreSQL pg_audit Extension installieren:
CREATE EXTENSION IF NOT EXISTS pgaudit;

-- postgresql.conf
pgaudit.log = 'READ, WRITE, DDL'
pgaudit.log_relation = on
```

Alternativ: Application-seitiges Logging bei ungewöhnlichen Zugriffsmustern (z. B. mehr als 100 User-Rows in einer Query).

---

## 4. JWT-Sicherheit

### 4.1 Aktueller kritischer Befund: localStorage

In `frontend/js/auth.js`, `frontend/js/webauthn.js` und `frontend/js/config.js` wird der JWT in `localStorage` gespeichert:

```javascript
// ❌ AKTUELL — unsicher
localStorage.setItem('auth_token', token);
```

**Problem:** Jedes JavaScript auf der Seite (auch eingespritzte XSS-Payloads, Browser-Extensions, Drittanbieter-Skripte) kann `localStorage.getItem('auth_token')` lesen. Der Token ist dann gestohlen.

### 4.2 Migration: HttpOnly Cookie

**Backend — Token als Cookie senden statt im JSON-Body:**

```javascript
// auth.js — nach erfolgreicher Authentifizierung
function setAuthCookie(res, token) {
  res.cookie('auth_token', token, {
    httpOnly: true,       // ← JavaScript kann dieses Cookie NICHT lesen
    secure: true,         // ← Nur über HTTPS übertragen
    sameSite: 'strict',   // ← Kein Cross-Site-Senden (CSRF-Schutz)
    maxAge: 15 * 60 * 1000, // ← 15 Minuten
    path: '/api',         // ← Nur für API-Requests
  });
}

// Login-Route
router.post('/login', async (req, res) => {
  // ... Verifikation ...
  const token = generateJWT(user);
  setAuthCookie(res, token);
  
  // Token NICHT mehr im Body zurückgeben
  res.json({ 
    success: true, 
    user: { id: user.id, username: user.username, role: user.role }
  });
});
```

**Backend — Token aus Cookie lesen statt aus Authorization-Header:**

```javascript
// auth-middleware.js
const verifyToken = (req, res, next) => {
  // Aus Cookie lesen (nach Migration)
  const token = req.cookies?.auth_token 
    || req.headers.authorization?.split(' ')[1]; // Fallback für mobile Apps

  if (!token) {
    return res.status(401).json({ error: 'Nicht authentifiziert' });
  }
  // ... rest bleibt gleich
};
```

**Frontend — localStorage entfernen:**

```javascript
// auth.js — nach Migration
// KEINE localStorage-Calls mehr für Token
// Cookie wird automatisch vom Browser gesendet

async function login(username, password) {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    credentials: 'include', // ← Cookie mitsenden
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });
  // Kein Token aus Response lesen und speichern
}
```

### 4.3 Access + Refresh Token Pattern

**Kurzlebige Access Tokens + langlebige Refresh Tokens:**

```javascript
// Token-Lebensdauer
const ACCESS_TOKEN_EXPIRY = '15m';   // 15 Minuten
const REFRESH_TOKEN_EXPIRY = '7d';   // 7 Tage

function generateAccessToken(user) {
  return jwt.sign(
    { id: user.id, username: user.username, role: user.role, type: 'access' },
    process.env.JWT_SECRET,
    { expiresIn: ACCESS_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

function generateRefreshToken(user) {
  return jwt.sign(
    { id: user.id, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET, // Separates Secret für Refresh Tokens
    { expiresIn: REFRESH_TOKEN_EXPIRY, algorithm: 'HS256' }
  );
}

// Refresh Token als separates Cookie, noch restriktiver
res.cookie('refresh_token', refreshToken, {
  httpOnly: true,
  secure: true,
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000,
  path: '/api/auth/refresh', // Nur für den Refresh-Endpoint
});
```

### 4.4 Token Revocation bei Logout

Ohne Blacklist ist ein JWT nach dem Logout bis zum Ablauf noch gültig:

```sql
-- Tabelle für ungültige Token (bis zum natürlichen Ablauf aufbewahren)
CREATE TABLE token_blacklist (
  jti UUID PRIMARY KEY,               -- JWT ID
  user_id INTEGER REFERENCES users(id),
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ DEFAULT NOW()
);

-- Aufräumen abgelaufener Einträge (Cron-Job oder bei jedem Request)
DELETE FROM token_blacklist WHERE expires_at < NOW();
```

```javascript
// JWT mit jti (JWT ID) signieren
const jti = crypto.randomUUID();
const token = jwt.sign(
  { id: user.id, username: user.username, jti },
  process.env.JWT_SECRET,
  { expiresIn: '15m' }
);

// Logout-Route
router.post('/logout', verifyToken, async (req, res) => {
  const { jti, exp } = req.user;
  await pool.query(
    'INSERT INTO token_blacklist (jti, user_id, expires_at) VALUES ($1, $2, to_timestamp($3))',
    [jti, req.user.id, exp]
  );
  res.clearCookie('auth_token');
  res.clearCookie('refresh_token');
  res.json({ success: true });
});

// In verifyToken prüfen ob Token in Blacklist
const blacklisted = await pool.query(
  'SELECT 1 FROM token_blacklist WHERE jti = $1',
  [decoded.jti]
);
if (blacklisted.rows.length > 0) {
  return res.status(401).json({ error: 'Token wurde invalidiert' });
}
```

### 4.5 JWT Secret Stärke

Das JWT Secret muss kryptografisch stark sein — mindestens 256 Bit (32 Bytes):

```bash
# Secret generieren
openssl rand -base64 48
# Die Ausgabe ist ein 64 Zeichen langer Zufallswert.

# .env – hier bewusst KEIN Beispielwert.
# Ein vollständig aussehendes Secret in der Dokumentation wird kopiert,
# und der Secret-Scan meldet es bei jedem Durchlauf als Fund.
JWT_SECRET=<Ausgabe von openssl rand -base64 48 einsetzen>
JWT_REFRESH_SECRET=<separates Secret, ebenfalls openssl rand -base64 48>
```

**Niemals verwenden:** Strings wie `"your-super-secret"`, `"mysecret"`, oder Passwörter unter 32 Zeichen.

---

## 5. Schutz sensibler Nutzerdaten

### 5.1 DSGVO Art. 9 — Besondere Kategorien personenbezogener Daten

Gesundheitsdaten und Daten über Behinderungen fallen unter **Art. 9 DSGVO** (besondere Kategorien). Das bedeutet:

- **Erhöhtes Schutzniveau** — nicht nur "normale" DSGVO-Pflichten
- **Verarbeitungsverbot** als Grundregel, mit engen Ausnahmen
- Ausnahme möglich nur mit **ausdrücklicher Einwilligung** (Art. 9 Abs. 2 lit. a) oder bei Notwendigkeit für Barrierefreiheit/Inklusion
- **Datenschutz-Folgenabschätzung (DSFA)** nach Art. 35 DSGVO kann verpflichtend werden

### 5.2 Empfehlung: Keine Behinderungsdaten erfassen

Die wichtigste Schutzmaßnahme ist, **keine Behinderungsdaten zu erheben** — außer es ist für den Dienst unbedingt notwendig.

Song-Nexus ist eine Musik-Verkaufsplattform. Barrierefreiheit (WCAG 2.1) ist eine technische Anforderung an die Oberfläche — sie erfordert keine Speicherung personenbezogener Gesundheitsdaten.

**Konkreter Unterschied:**
- ✅ `user_preferences.high_contrast = true` — technische UI-Einstellung, kein Gesundheitsdatum
- ✅ `user_preferences.screen_reader_mode = true` — technische UI-Einstellung
- ❌ `user.disability_type = "visual_impairment"` — Art. 9 DSGVO, besondere Kategorie
- ❌ `user.accessibility_need = "wheelchair"` — Art. 9 DSGVO, besondere Kategorie

**Regel:** UI-Präferenzen (wie "großer Text", "hoher Kontrast", "reduzierte Bewegung") sind KEINE Gesundheitsdaten und können normal gespeichert werden. Nur wenn explizit eine Behinderung oder Erkrankung abgefragt wird, entsteht ein Art. 9-Problem.

### 5.3 Wenn Behinderungsdaten doch erfasst werden müssen

Falls eine Funktion Behinderungsdaten erfordert:

1. **Explizite Einwilligung** einholen (separater Einwilligungs-Checkbox, klar formuliert, jederzeit widerrufbar)
2. **Verschlüsselung at-rest** für diese Felder (AES-256-GCM wie in Kapitel 3.2)
3. **Zugriffsprotokoll**: Wer hat wann auf diese Daten zugegriffen?
4. **Datensparsamkeit**: Nur das absolut Notwendige speichern
5. **Löschkonzept**: Daten löschen sobald Zweck erfüllt

```sql
-- Zugriffsprotokoll für sensitive Felder
CREATE TABLE sensitive_data_access_log (
  id BIGSERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  accessed_by INTEGER REFERENCES users(id), -- Admin-User
  field_name TEXT NOT NULL,
  access_reason TEXT,
  accessed_at TIMESTAMPTZ DEFAULT NOW(),
  ip_address INET
);
```

### 5.4 Accessibility ist kein Sicherheitsrisiko

Ein häufiges Missverständnis: Barrierefreiheits-Features (ARIA-Labels, Keyboard-Navigation, Screenreader-Support) erhöhen die Angriffsfläche nicht. Sie ändern nur die HTML-Struktur und CSS — nicht die Backend-Logik oder Sicherheitsarchitektur.

Barrierefreiheit und Sicherheit sind orthogonal — man kann beides gleichzeitig umsetzen.

### 5.5 Im Falle eines Datenlecks: DSGVO-Meldepflichten

#### Art. 33 DSGVO — Meldung an die Datenschutzbehörde (72-Stunden-Frist)

Bei einem Datenschutzvorfall mit Risiko für betroffene Personen **muss** innerhalb von **72 Stunden** gemeldet werden:

**Österreichische Datenschutzbehörde:**  
Website: https://www.dsb.gv.at  
E-Mail: dsb@dsb.gv.at  
Telefon: +43 1 52 152-0

Meldung muss enthalten:
- Art der Verletzung (was ist passiert?)
- Betroffene Kategorien und Anzahl der Personen
- Wahrscheinliche Folgen
- Ergriffene und geplante Maßnahmen

#### Art. 34 DSGVO — Benachrichtigung der Betroffenen

Bei **hohem Risiko** für betroffene Personen (insbesondere bei Art. 9-Daten) müssen die Betroffenen **direkt** informiert werden — in klarer, verständlicher Sprache:
- Was ist passiert
- Welche Daten betroffen sind
- Welche Maßnahmen ergriffen werden
- Kontakt für Rückfragen

### 5.6 Datenschutzbeauftragter (DSB)

Unternehmen mit unter 250 Mitarbeitern brauchen in der Regel keinen DSB. **Ausnahme:** Bei umfangreicher Verarbeitung von Art. 9-Daten (Gesundheitsdaten, Behinderungsdaten) wird ein DSB nach Art. 37 DSGVO verpflichtend.

Empfehlung: Bei Unsicherheit externen Datenschutzberater für eine einmalige Bewertung hinzuziehen (Kosten: ca. 500–1.500 EUR einmalig). Günstiger als ein DSGVO-Bußgeld.

---

## 6. Infrastruktur & Hetzner VPS

### 6.1 HTTPS erzwingen

nginx-Konfiguration — HTTP auf HTTPS umleiten:

```nginx
# /etc/nginx/sites-available/song-nexus
server {
    listen 80;
    server_name song-nexus.at www.song-nexus.at;
    
    # Alle HTTP-Requests auf HTTPS umleiten
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name song-nexus.at www.song-nexus.at;

    ssl_certificate /etc/letsencrypt/live/song-nexus.at/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/song-nexus.at/privkey.pem;
    
    # Moderne TLS-Konfiguration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;
    
    # HSTS — Browser merkt sich: immer HTTPS (1 Jahr)
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    
    # Sicherheits-Header
    add_header X-Content-Type-Options nosniff always;
    add_header X-Frame-Options DENY always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

### 6.2 SSH absichern

```bash
# /etc/ssh/sshd_config — Änderungen
Port 2222                          # Standard-Port 22 ändern
PasswordAuthentication no          # Nur Key-basiert
PubkeyAuthentication yes
PermitRootLogin no                 # Root-Login verbieten
MaxAuthTries 3
LoginGraceTime 30
AllowUsers sebastian               # Nur bestimmte User erlauben

# SSH-Service neu starten
sudo systemctl restart sshd

# Eigenen Public Key hinzufügen (VORHER — nicht nachher!)
cat ~/.ssh/id_ed25519.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
```

### 6.3 fail2ban installieren

```bash
sudo apt install fail2ban

# /etc/fail2ban/jail.local
[DEFAULT]
bantime = 3600      # 1 Stunde sperren
findtime = 600      # Zeitfenster 10 Minuten
maxretry = 5        # 5 Fehlversuche

[sshd]
enabled = true
port = 2222
logpath = /var/log/auth.log

[nginx-http-auth]
enabled = true
logpath = /var/log/nginx/error.log

sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 6.4 Firewall (ufw)

```bash
sudo ufw default deny incoming
sudo ufw default allow outgoing

sudo ufw allow 2222/tcp      # SSH (angepasster Port)
sudo ufw allow 80/tcp        # HTTP (für Let's Encrypt + Redirect)
sudo ufw allow 443/tcp       # HTTPS

# PostgreSQL NICHT von außen zugänglich (nur localhost)
# sudo ufw deny 5432/tcp    # Bereits durch default deny blockiert

sudo ufw enable
sudo ufw status verbose
```

### 6.5 Automatische Sicherheitsupdates

```bash
sudo apt install unattended-upgrades

# /etc/apt/apt.conf.d/50unattended-upgrades
Unattended-Upgrade::Allowed-Origins {
    "${distro_id}:${distro_codename}-security";
};
Unattended-Upgrade::Automatic-Reboot "false";   // Server nicht automatisch neu starten
Unattended-Upgrade::Mail "sebastian@song-nexus.at"; // E-Mail bei Updates

sudo dpkg-reconfigure -plow unattended-upgrades
```

### 6.6 Secrets — .env niemals in Git

**Aktuell ist `.env.production.example` mit echten oder leicht erratbaren Werten in der Codebase.** Alle darin enthaltenen Secrets müssen sofort rotiert werden (siehe Kapitel 7, Punkt 1).

```bash
# .gitignore — sicherstellen dass diese Dateien NIEMALS committed werden
.env
.env.production
.env.local
.env.*.local
*.pem
*.key
```

```bash
# Überprüfen ob je ein .env in Git war
git log --all --full-history -- "**/.env*"
git log --all --full-history -- "*.pem"
# Wenn Treffer: git-filter-repo oder BFG Repo-Cleaner verwenden
```

### 6.7 Redis-basiertes Rate Limiting

**Aktueller Stand:** `server.js` verwendet eine In-Memory `Map` für Rate Limiting. Das ist kein Schutz bei:
- Mehreren Node.js-Prozessen/Clustern
- Serverneustarts (Map wird geleert)
- Horizontal Scaling

**Migration auf express-rate-limit + Redis:**

```bash
npm install express-rate-limit @express-rate-limit/redis ioredis
```

```javascript
// server.js
const rateLimit = require('express-rate-limit');
const { RedisStore } = require('@express-rate-limit/redis');
const Redis = require('ioredis');

const redisClient = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 Minuten
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  store: new RedisStore({
    sendCommand: (...args) => redisClient.call(...args),
  }),
  message: { error: 'Zu viele Anmeldeversuche. Bitte in 15 Minuten erneut versuchen.' },
  skipSuccessfulRequests: true, // Nur Fehlversuche zählen
});

app.use('/api/auth/login', loginLimiter);
app.use('/api/auth/webauthn/', rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  store: new RedisStore({ sendCommand: (...args) => redisClient.call(...args) }),
}));
```

```bash
# Redis auf dem VPS installieren
sudo apt install redis-server
# /etc/redis/redis.conf
bind 127.0.0.1      # Nur localhost, nicht von außen erreichbar
requirepass starkes-redis-passwort
```

---

## 7. Sofort-Maßnahmen vor Go-Live

Sortiert nach Dringlichkeit. Punkte 1–4 sind **blockers** — kein Go-Live ohne diese.

### 1. 🔴 Alle Secrets rotieren (SOFORT)

Das `.env.example` war mit Struktur und teilweise echten/erratbaren Werten öffentlich zugänglich. **Alle Secrets müssen als kompromittiert betrachtet werden:**

```bash
# JWT Secrets neu generieren
openssl rand -base64 48  # → JWT_SECRET
openssl rand -base64 48  # → JWT_REFRESH_SECRET
openssl rand -base64 48  # → SESSION_SECRET
openssl rand -base64 48  # → COOKIE_SECRET

# Datenbank-Passwort ändern
ALTER USER postgres WITH PASSWORD 'neues-starkes-passwort';
# Oder besser: App-User anlegen (siehe Kapitel 3.4)

# Field Encryption Key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# → FIELD_ENCRYPTION_KEY
```

- PayPal: Im [PayPal Developer Dashboard](https://developer.paypal.com) neue Credentials generieren
- SMTP-App-Passwort: In Google-Konto erneuern

### 2. 🔴 WebAuthn RP_ID auf echte Domain setzen

```bash
# .env.production
WEBAUTHN_RP_ID=song-nexus.at
WEBAUTHN_RP_NAME=Song-Nexus
WEBAUTHN_ORIGIN=https://song-nexus.at
```

Und im Code den unsicheren Fallback auf `localhost` entfernen (Code-Beispiel in Kapitel 2.2).

### 3. 🔴 JWT in HttpOnly Cookie migrieren

Vollständige Migration wie in Kapitel 4.2 beschrieben. Frontend `localStorage`-Calls für den Token entfernen, Backend-Middleware anpassen.

### 4. 🔴 bcrypt cost factor auf ≥ 12 erhöhen

```bash
# .env
BCRYPT_ROUNDS=12
```

Alle hardcodierten `genSalt(10)` in `webauthn.js` auf `parseInt(process.env.BCRYPT_ROUNDS || '12')` ändern.

### 5. 🟡 DB-User Least Privilege

Neuen App-Datenbankuser anlegen (kein Superuser), wie in Kapitel 3.4 beschrieben. Verbindungsstring in `.env` aktualisieren.

### 6. 🟡 Redis Rate Limiting

In-Memory Map in `server.js` durch `express-rate-limit` + Redis ersetzen. Redis auf dem VPS installieren und konfigurieren.

### 7. 🟡 fail2ban + ufw auf VPS

SSH absichern, Firewall konfigurieren, fail2ban installieren (Kapitel 6.2–6.4). SSH-Port 22 ändern **bevor** Password-Auth deaktiviert wird.

### 8. 🟡 Backup-Strategie implementieren

Cron-Job für tägliche verschlüsselte Backups auf separatem Speicher einrichten (Kapitel 3.3).

### 9. 🟢 Datenschutzbeauftragten prüfen

Wenn keine Art. 9-Daten (Behinderungsdaten, Gesundheitsdaten) verarbeitet werden: kein DSB notwendig. Wenn doch: externen Datenschutzberater beauftragen.

---

## 8. Incident Response

### 8.1 Anzeichen eines Angriffs erkennen

- Ungewöhnliche Login-Fehlschläge in den Logs
- Requests von bekannten Angriffs-IPs (fail2ban-Log prüfen)
- Unerwartete Datenbankabfragen in pg_audit
- Erhöhte CPU/Memory auf dem VPS
- Nutzer melden unbekannte Kontobewegungen

### 8.2 Sofortmaßnahmen

**Innerhalb der ersten Stunde:**

```bash
# 1. Angriffs-IP sofort sperren
sudo ufw deny from 1.2.3.4 to any

# 2. Falls System kompromittiert — Server vom Netz trennen
# Im Hetzner-Dashboard: Server stoppen

# 3. Logs sichern BEVOR sie überschrieben werden
sudo cp /var/log/nginx/access.log /root/incident-$(date +%Y%m%d)/nginx-access.log
sudo cp /var/log/auth.log /root/incident-$(date +%Y%m%d)/auth.log
sudo pg_dumpall -U postgres > /root/incident-$(date +%Y%m%d)/db-snapshot.sql

# 4. Alle aktiven JWT-Sessions invalidieren (Token-Blacklist)
# ODER: JWT_SECRET rotieren → alle laufenden Tokens werden ungültig
# (Alle eingeloggten Nutzer werden ausgeloggt — bewusste Entscheidung)
```

**Analyse:**
- Welche Accounts wurden betroffen?
- Welche Daten wurden möglicherweise abgerufen?
- Wie ist der Angreifer eingedrungen?

### 8.3 DSGVO-Meldung (72-Stunden-Frist)

Sobald ein Datenschutzvorfall festgestellt wird, beginnt die **72-Stunden-Frist** für die Meldung an die Aufsichtsbehörde — auch wenn noch nicht alle Details bekannt sind. Besser eine unvollständige frühe Meldung als eine vollständige zu späte.

**Österreichische Datenschutzbehörde:**  
https://www.dsb.gv.at/meldung-von-datenschutzverletzungen  
E-Mail: dsb@dsb.gv.at  
Tel: +43 1 52 152-0

**Meldung enthält:**
- Datum und Uhrzeit der Entdeckung
- Art der Verletzung (unbefugter Zugriff, Datenverlust, etc.)
- Betroffene Datenkategorien (E-Mail-Adressen, Zahlungsdaten, etc.)
- Geschätzte Anzahl betroffener Personen
- Wahrscheinliche Folgen
- Ergriffene Maßnahmen

**Vorlage für Erstmeldung:**

```
Betreff: Meldung einer Datenschutzverletzung gem. Art. 33 DSGVO

Verantwortlicher: [Name, Adresse]
Datum der Entdeckung: [Datum]
Art der Verletzung: Unbefugter Zugriff auf [...]
Betroffene Personen: ca. [Anzahl]
Betroffene Datenkategorien: [E-Mail, Passwort-Hashes, ...]
Mögliche Folgen: [...]
Sofortmaßnahmen: Server isoliert, Logs gesichert, Passwörter invalidiert
Geplante Maßnahmen: [...]

Wir melden vorbehaltlich weiterer Erkenntnisse und werden eine ergänzende
Meldung nachreichen sobald die vollständige Analyse abgeschlossen ist.
```

### 8.4 Nutzer informieren (Art. 34 DSGVO)

Bei hohem Risiko für betroffene Personen (Passwörter, Zahlungsdaten, Art. 9-Daten):

```
Betreff: Wichtige Sicherheitsmitteilung — Dein Song-Nexus-Konto

Hallo [Username],

wir müssen dich über einen Sicherheitsvorfall informieren, der dein Konto 
betreffen könnte.

Was ist passiert:
[Klare, nicht-technische Beschreibung]

Welche Daten betroffen sind:
[Konkret — z.B. "E-Mail-Adresse und verschlüsselte Passwort-Daten"]

Was wir getan haben:
[Sofortmaßnahmen]

Was du tun solltest:
- Dein Passwort bei Song-Nexus ändern
- Falls du dasselbe Passwort woanders verwendest: dort ebenfalls ändern
- Verdächtige Kontobewegungen melden

Bei Fragen: sicherheit@song-nexus.at

Song-Nexus Team
```

### 8.5 Post-Mortem

Nach dem Vorfall (innerhalb von 1–2 Wochen):

1. **Timeline** rekonstruieren: Wann begann der Angriff, wann wurde er entdeckt?
2. **Root Cause** identifizieren: Welche konkrete Schwachstelle wurde ausgenutzt?
3. **Was hat funktioniert?** (Monitoring, fail2ban, etc.)
4. **Was hat gefehlt?** (Blacklisting, Monitoring-Alerts, etc.)
5. **Maßnahmen** definieren und umsetzen mit konkreten Deadlines
6. Dokumentation intern aufbewahren (DSGVO verlangt Nachweispflicht)

---

*Dieses Dokument sollte vor jedem größeren Release aktualisiert werden.*  
*Letzte Überprüfung: Juni 2026*

---

## 9. Kaufvorgang und Auslieferung von Audiodateien

Nachgetragen am 16.08.2026. Alle Punkte hier waren tatsaechliche Luecken im
Code, nicht theoretische Ueberlegungen — jede wurde am laufenden Server
nachgestellt, bevor sie behoben wurde.

Das gemeinsame Muster: **der Code hat einem Wert vertraut, ohne ihn zu
pruefen.** Mal kam der Wert aus dem Browser, mal aus einer Nebenspalte der
Datenbank. Wer eine neue Route schreibt, sollte sich bei jedem Eingabewert
fragen, wer ihn setzen kann.

### 9.1 Der Preis gehoert dem Server

**War:** `create-order` lud den Track mit `SELECT id, name, artist` — ohne
`price_eur` — und uebernahm den Preis aus `req.body`. Der Validator prueft
nur die Spanne 0,01 bis 100, nicht die Uebereinstimmung mit dem Track. Ein
Aufruf mit `price: 0.01` fuer einen Track zu 4,99 wurde angenommen und ging so
an PayPal.

**Ist:** Der Preis kommt ausschliesslich aus `tracks.price_eur`. Schickt der
Client einen abweichenden Wert mit, folgt 400 mit `PRICE_MISMATCH`.

Bewusst keine stille Korrektur: ein Manipulationsversuch soll sichtbar
werden, nicht weggebuegelt.

### 9.2 Welcher Track freigeschaltet wird, steht in der Bestellung

**War:** `orders` hatte keine `track_id`. Beim Freischalten kam sie aus
`req.body`; geprueft wurde nur, ob die PayPal-Bestellung zum angemeldeten
Benutzer gehoert. Guenstigen Track bestellen, bezahlen, beim Freischalten die
ID eines teureren senden.

**Ist:** `orders.track_id` wird beim Anlegen festgeschrieben und beim
Freischalten von dort gelesen. Der Anfragekoerper wird ignoriert; weicht er
ab, wird das protokolliert. Bestellungen ohne Zuordnung (Altbestand) werden
mit 409 abgelehnt statt geraten. Eine bereits abgeschlossene Bestellung laesst
sich nicht erneut freischalten.

### 9.3 Audiodateien nur ueber eine Route

**War:** `server.js` hatte zusaetzlich `app.use('/public/audio',
express.static(...))` — ohne jede Pruefung. Gemessen: dieselbe Datei einmal
mit 40-Sekunden-Vorschau ueber die geschuetzte Route, einmal vollstaendig und
MD5-gleich ueber die offene. `GET /api/tracks` gibt `audio_filename`
oeffentlich aus, der Dateiname war also bekannt.

**Ist:** Die statische Einbindung ist entfernt, `/public/audio/...` liefert
404. Auslieferung ausschliesslich ueber `/api/tracks/audio/:filename`.

> **Fuer nginx wichtig:** Dieser Pfad darf **nicht** direkt von der Platte
> bedient werden. Die gepflegte Vorlage steht in
> `scripts/deploy/nginx-song-nexus.conf.template` und leitet
> `/api/tracks/audio/` an das Backend weiter (`proxy_buffering off`).

### 9.4 Fail closed statt Vorschau

**War:** Fand die Audio-Route keinen Datenbankeintrag zum Dateinamen, lieferte
sie trotzdem eine 40-Sekunden-Vorschau (`treating as 40s preview`). Damit war
ein nicht veroeffentlichter Track anhoerbar, sobald man den Dateinamen kannte
— und jede Datei im Verzeichnis ohne Eintrag ebenfalls, etwa ein
abgebrochener Upload. Im Entwicklungsverzeichnis lagen drei solche Dateien.

Die Abfrage pruefte ausserdem `is_deleted`, aber nicht `is_published`.

**Ist:** Kein veroeffentlichter Eintrag, kein Ton. Ein Standardwert, der im
Zweifel Daten herausgibt, zeigt in die falsche Richtung.

### 9.5 Die Vorschaulaenge haengt nicht mehr an der Datenbank

**War:** Die Datenrate fuer den Ausschnitt kam aus
`filesize / duration_seconds`. Dieser Wert wurde vom Browser gemessen und
ungeprueft uebernommen. Bei einer zu **kleinen** Dauer haette die Rechnung
mehr Bytes ergeben als die Datei hat — der komplette Song waere ausgeliefert
worden. Nachgestellt mit `duration_seconds = 5` bei echten 60 Sekunden:
7.687.440 Bytes gegenueber 960.931 vorhandenen.

Der Kaufschutz eines Tracks hing damit an einer Zahl, die ein Upload-Formular
befuellt.

**Ist:** Die Datenrate wird aus dem Dateikopf gelesen
(`backend/utils/audio-rate.js`) — bei WAV exakt, bei MP3 aus dem ersten
Rahmenkopf. `duration_seconds` ist nur noch Rueckfall.

### 9.6 Passwortregel an einer Stelle

**War:** Dieselbe Regel stand an **sieben** Stellen, drei im Backend und vier
im Frontend, mit unterschiedlichem Inhalt. `password123` kam durch.

**Ist:** `backend/utils/password-policy.js` mit gespiegelter Fassung unter
`frontend/js/password-policy.js`. Mindestens 12 Zeichen, keine bekannten
Wortstaemme, nicht rein numerisch, keine langen Folgen, nicht der
Benutzername oder Teile der E-Mail-Adresse.

### 9.7 Was hier noch offen ist

| Punkt | Issue |
|---|---|
| `requireAdmin` vertraut der Rolle im Token ohne Datenbankabgleich, kein Widerruf | #24 |
| JWT liegt zusaetzlich im `localStorage` | #42 |
| Sitzungen im Arbeitsspeicher | #44 |
| Secrets nie rotiert | #2 |
| mkcert-Schluessel im Repository | #38 |
| Tests laufen gegen `app.js`, ausgeliefert wird `server.js` | #47 |

Der letzte Punkt begrenzt die Aussagekraft aller anderen Pruefungen: eine
gruene Testsuite sagt nichts ueber Code, den sie nicht laedt.
