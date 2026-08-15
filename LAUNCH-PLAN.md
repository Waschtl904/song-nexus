# 🚀 SONG-NEXUS LAUNCH-PLAN

**Erstellt:** 15. August 2026
**Basis:** Code-Audit auf Branch `dev/v1.0` (nicht auf Doku-Basis — die Doku war veraltet)
**Reifegrad:** ~80 % production-ready

---

## 📌 Ausgangslage (verifiziert am Code, nicht an der Doku)

Die Doku im Repo unterschätzt den echten Fortschritt. Verifizierte Fakten:

| Behauptung in der Doku | Realität im Code |
|---|---|
| `main` ist der aktuelle Stand | `main` ist **17 Commits hinter** `dev/v1.0` (letzter Stand dort: 22. Juni 2026) |
| 39 Jest-Tests | **53 Tests, 3 Suites, alle grün** (lokal ausgeführt am 15.08.2026) |
| Keine Rechtsseiten | `impressum.html` + `datenschutz.html` existieren auf `dev/v1.0` mit echten Daten |
| JWT im localStorage | Migriert auf **HttpOnly-Cookie** |
| Kein Deployment-Guide | `docs/DEPLOYMENT-HETZNER.md` (634 Zeilen) + `docs/SECURITY-GUIDE.md` (1121 Zeilen) |
| Kein E-Mail-Versand | `backend/utils/mailer.js` — Passwort-Reset + Magic-Link über GMX-SMTP |
| Kein Download nach Kauf | MP3-Download mit Einmal-Token implementiert |
| Fehlende Seiten | `purchases.html`, `password-reset.html` neu dazu |

**Fazit:** Das Fundament steht. Was fehlt, sind ein kritisches Sicherheitsloch, Dependency-Hygiene,
zwei Rechtstexte, der Zahlungs-Webhook und das eigentliche Deployment.

---

## 🎯 Strategie: „Online gehen" von „Geld verdienen" trennen

Der teure Teil (Recht, Zahlungen, Steuer) blockiert nicht den Live-Gang. Reihenfolge:

```
M1 Sicherheit  →  M2 Soft-Launch (gratis)  →  M3 Monetarisierung  →  M4 Betrieb
   ~1 Woche         ~1–2 Wochen                 ~2–3 Wochen            laufend
```

---

## 🔴 M1 — Sicherheit & Hygiene (Blocker, ~1 Woche)

Nichts davon ist optional. Ohne M1 kein öffentliches Deployment.

1. [#1](https://github.com/Waschtl904/song-nexus/issues/1) **`/api/auth/dev-login` absichern oder entfernen** — legt einen User mit `role='admin'` an,
   hat **keinen `NODE_ENV`-Guard** und ist über `app.use('/api/auth', ...)` öffentlich erreichbar.
   In Produktion = vollständiger Admin-Takeover per einzelnem POST.
2. [#2](https://github.com/Waschtl904/song-nexus/issues/2) **Secrets rotieren** — `.env.production.example` enthält echte Werte im Repo:
   PayPal-Client-Secret, `JWT_SECRET`, `SESSION_SECRET`, `DB_PASSWORD`.
3. [#3](https://github.com/Waschtl904/song-nexus/issues/3) **11 npm-Vulnerabilities beheben** (6 × high): nodemailer, axios, form-data, ip-address,
   brace-expansion, body-parser, qs/express. Dazu `multer@1.x` (EOL) → 2.x,
   `@paypal/checkout-server-sdk` (deprecated) → `@paypal/paypal-server-sdk`, `xss-clean` ersetzen.
4. [#4](https://github.com/Waschtl904/song-nexus/issues/4) **`auth-simple.js` klären** — zweiter Auth-Pfad mit eigenem `/login` + `/register`.
   Wenn ungenutzt: löschen. Schatten-Auth-Pfade sind Angriffsfläche.
5. [#5](https://github.com/Waschtl904/song-nexus/issues/5) **`dev/v1.0` → `main` mergen** — der veröffentlichte Stand ist veraltet.

## 🟢 M2 — Soft-Launch: gratis online (~1–2 Wochen)

Ziel: Die Seite ist erreichbar, mit Gratis-Tracks. Kein Zahlungsverkehr.

6. [#6](https://github.com/Waschtl904/song-nexus/issues/6) Hetzner-VPS nach `docs/DEPLOYMENT-HETZNER.md` aufsetzen (nginx, PM2, Let's Encrypt, PostgreSQL)
7. [#7](https://github.com/Waschtl904/song-nexus/issues/7) DB-Backup-Cron **inklusive getestetem Restore** (ein Backup ohne Restore-Test ist kein Backup)
8. [#8](https://github.com/Waschtl904/song-nexus/issues/8) Soft-Launch-Schalter: Kauf-UI ausblenden, nur Gratis-Tracks ausliefern
9. [#9](https://github.com/Waschtl904/song-nexus/issues/9) Doku auf Wahrheit bringen (README, MASTER-PROMPT: 53 Tests, `dev/v1.0`-Stand)
10. [#10](https://github.com/Waschtl904/song-nexus/issues/10) Totlinks in `index.html` beheben (`/docs/`, `/privacy-policy/`, mehrere `href="#"`)

## 💳 M3 — Monetarisierung scharf schalten (~2–3 Wochen)

11. [#11](https://github.com/Waschtl904/song-nexus/issues/11) PayPal-Live-Credentials + Business-Verifizierung (externe Wartezeit einplanen)
12. [#12](https://github.com/Waschtl904/song-nexus/issues/12) **PayPal-Webhook-Endpoint** — aktuell wird `capture-order` nur clientseitig aus
    `payment-success.html` getriggert. Schließt der Kunde den Tab, bleibt die Order auf `CREATED`
    und der bezahlte Track ungeschaltet.
13. [#13](https://github.com/Waschtl904/song-nexus/issues/13) **Download-Token persistieren** — `downloadTokens` ist eine In-Memory-`Map`:
    verloren bei jedem Restart, funktioniert nicht im PM2-Cluster.
14. [#14](https://github.com/Waschtl904/song-nexus/issues/14) **AGB + Widerrufsbelehrung** für digitale Inhalte — fehlen komplett (Impressum/Datenschutz sind da)
15. [#15](https://github.com/Waschtl904/song-nexus/issues/15) Gewerbe-, USt- und OSS-Frage klären, Rechnungsstellung
16. [#16](https://github.com/Waschtl904/song-nexus/issues/16) E2E-Test der Kaufkette: Order → Capture → Freischaltung → Vollstream → Download

## 🔧 M4 — Betrieb & Politur (laufend)

17. [#17](https://github.com/Waschtl904/song-nexus/issues/17) CI via GitHub Actions (Jest läuft bisher nur lokal)
18. [#18](https://github.com/Waschtl904/song-nexus/issues/18) Monitoring: Sentry, Uptime-Check, zentraler Express-Error-Handler
19. [#19](https://github.com/Waschtl904/song-nexus/issues/19) Migrations-Tooling statt Handbetrieb über `schema_clean.sql`
20. [#20](https://github.com/Waschtl904/song-nexus/issues/20) WebAuthn Cross-Browser (Safari „limited") + Mobile-Tests
21. [#21](https://github.com/Waschtl904/song-nexus/issues/21) Design-Finalisierung mit dem befreundeten Designer

---

## ⏱️ Zeitschätzung

| Szenario | Bis Soft-Launch | Bis voller Launch |
|---|---|---|
| Teilzeit (~10–15 h/Woche) | 2–3 Wochen | **6–9 Wochen** |
| Vollzeit-Fokus | ~1 Woche | 3–4 Wochen |

Zusätzlich: 2–3 Tage Wiedereinstieg nach der Pause seit 22. Juni 2026.

---

## 🔗 Übersicht

- [Alle Issues](https://github.com/Waschtl904/song-nexus/issues)
- [Milestones](https://github.com/Waschtl904/song-nexus/milestones)

*Erstellt aus einem Code-Level-Audit am 15. August 2026. Fortschritt siehe Issues und Milestones.*
