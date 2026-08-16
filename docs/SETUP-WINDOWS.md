# Windows 11 Pro Development Setup Guide

**Version:** 1.0  
**Created:** January 13, 2026  

## Your Project Root Directory

```
C:\Users\sebas\Desktop\SongSeite
```

This is your main working directory for Song-Nexus development.

## Quick Start (PowerShell)

### 1. Navigate to Project

```powershell
cd C:\Users\sebas\Desktop\SongSeite
```

### 2. Check Prerequisites

```powershell
node --version     # MUSS v22.x oder hoeher sein (nicht optional)
npm --version      # Should show 9.x or higher
psql --version     # Should show PostgreSQL 12+
git --version      # Should show git 2.x+
```

### 3. Install Dependencies

`npm ci` statt `npm install`: `npm ci` installiert genau die Fassungen aus
`package-lock.json` und laesst die `package.json` in Ruhe. `npm install`
schreibt sie um — das hat schon einen Konflikt beim naechsten `git pull`
verursacht.

In der PowerShell jeweils eine Zeile nach der anderen. Mehrzeilige Bloecke
werden beim Einfuegen zerrissen.

```powershell
npm ci
```

```powershell
cd backend ; npm ci ; cd ..
```

```powershell
cd frontend ; npm ci ; cd ..
```

Nach dem Einspielen des Schemas gehoeren die Migrationen angewandt:

```powershell
psql -U postgres -d song_nexus_dev -f migrations\2026-08-15-orders-track-id.sql
```

Erwartet: `HINWEIS:  OK: orders.track_id vorhanden`. Ohne diese Spalte
schlaegt jeder Kauf mit 409 fehl.

Zum Pruefen:

```powershell
cd backend ; npm test
```

Erwartet: 150 Tests in 5 Suiten, alle gruen.

### 4. Setup Environment

```powershell
cp backend\.env.example backend\.env
cp frontend\.env.example frontend\.env
# Edit both .env files with your settings
```

### 5. Setup Database

```powershell
# Create database
psql -U postgres
```

In PostgreSQL prompt:
```sql
CREATE DATABASE song_nexus_dev;
\q
```

Apply schema:
```powershell
psql -U postgres -d song_nexus_dev -f schema.sql
```

### 6. Generate SSL Certificates

```powershell
cd backend
npm run generate-cert
cd ..
```

### 7. Start Development

```powershell
npm start
```

Access at:
- Frontend: `https://localhost:5500`
- Backend: `https://localhost:3000`
- Admin: `https://localhost:3000/admin/`

## Useful PowerShell Commands

```powershell
# Git operations
git status
git add .
git commit -m "feat: description"
git push origin main

# Port management
netstat -ano | findstr :3000    # Check port usage
Stop-Process -Id 12345          # Kill process

# PostgreSQL
psql -U postgres -d song_nexus_dev

# Backup database
pg_dump -U postgres song_nexus_dev > backup.sql

# File operations
ls                # List files
cd backend        # Change directory
pwd               # Current directory
cls               # Clear screen
```

## Sync Repository

```powershell
.\sync-repo.ps1
```

Syncs local repo with latest from GitHub.

## Troubleshooting

**Port 3000 already in use:**
```powershell
netstat -ano | findstr :3000
Stop-Process -Id <PID>
```

**PostgreSQL not found:**
```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

**SSL certificate error:**
```powershell
cd backend && npm run generate-cert && cd ..
```

## Related Documentation

- [README.md](../README.md)
- [MASTER-PROMPT-2026-AKTUELL.md](../MASTER-PROMPT-2026-AKTUELL.md)
- [PROJECT-STRUCTURE.md](./PROJECT-STRUCTURE.md)
- [ADMIN-GUIDE.md](./ADMIN-GUIDE.md)

---

**Last Updated:** January 13, 2026


---

## Ergänzungen vom 15. August 2026

### Node 22 ist Pflicht, nicht Empfehlung
`nodemailer 9` zieht `@peculiar/x509` mit (`node >= 22`), `webpack-dev-server 6`
verlangt `>= 22.15.0`. Beide `package.json` haben ein `engines`-Feld. Unter
Node 20 warnt npm mit `EBADENGINE`.

### PowerShell-Besonderheiten
Die Skripte `start:local`, `start:prod` und `dev:local` nutzten die Unix-Syntax
`NODE_ENV=x node server.js` und schlugen unter PowerShell fehl. Sie laufen jetzt
über `cross-env`.

Beim Anhängen an Dateien **immer die Kodierung angeben**:

```powershell
Add-Content -Path .gitignore -Value ".env.xyz" -Encoding utf8
```

Ein einfaches `>>` schreibt in PowerShell UTF-16LE. Genau so wurde die
`.gitignore` unlesbar für Git — die Regel für `.env.production` war vorhanden
und wirkungslos.

### Lokalen Admin anlegen
Der frühere „Dev Login"-Button im Admin-Hub ist entfernt (Issue #1). Stattdessen:

```powershell
cd backend
npm run seed:dev-admin
```

Das ausgegebene Passwort sofort notieren, es wird nicht gespeichert.

### Nach Änderungen in frontend/js/
```powershell
cd frontend
npm run build
```
Ohne Build siehst du im Browser den alten Code, weil `frontend/dist/` nicht
versioniert ist.

### Vor jedem git pull
```powershell
git status
```
Unversionierte oder geänderte Dateien lassen den Pull abbrechen.
