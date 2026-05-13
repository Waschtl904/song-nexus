# Backend Tests

## Setup

```bash
cd backend
npm install          # installiert jest + supertest
npm test             # alle Tests einmalig ausfuehren
npm run test:watch   # interaktiver Watch-Modus
npm run test:coverage # mit Coverage-Report
```

## Struktur

```
backend/__tests__/
  auth.test.js          # POST /api/auth/login, GET /api/auth/me
  # tracks.test.js      # naechster Schritt
  # payments.test.js    # naechster Schritt
  README.md             # diese Datei
```

## Strategie

Die Tests **mocken `db.js`** (pool.query), damit keine echte
PostgreSQL-Verbindung benoetigt wird. Das hat folgende Vorteile:

- Tests laufen ohne laufende DB (z.B. in GitHub Actions)
- Jeder Test kontrolliert exakt, was die DB "zurueckgibt"
- Keine Testdaten muessen angelegt/aufgeraeumt werden

## Wichtige Hinweise

- `jest --runInBand`: Tests laufen seriell (kein paralleles
  Starten mehrerer Express-Instanzen)
- `jest --forceExit`: Schliesst offene Handles (DB-Pool,
  HTTPS-Server) nach den Tests
- `NODE_ENV=test` verhindert, dass `server.js` einen
  HTTPS-Listener auf Port 3000 startet

## Naechste Schritte

1. `tracks.test.js` – GET /api/tracks (public), GET /api/tracks/:id
2. `payments.test.js` – POST /api/payments/create-order (Auth required)
3. ESLint + Stylelint konfigurieren
4. GitHub Actions CI Workflow
