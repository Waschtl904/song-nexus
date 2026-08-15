# Deployment-Skripte

Diese Skripte gehoeren zur Anleitung in `docs/DEPLOYMENT-HETZNER.md`.
Die Anleitung erklaert das Warum, die Skripte machen das Wie.

## Reihenfolge

| Datei | Wo | Als wer |
|---|---|---|
| `01-harden-server.sh` | VPS | root |
| `02-install-stack.sh` | VPS | eigener Benutzer |
| `03-deploy-app.sh` | VPS | eigener Benutzer |
| *(dazwischen: `.env` von Hand anlegen)* | | |
| `04-nginx-ssl.sh` | VPS | eigener Benutzer |
| `backup-db.sh` | VPS | per Cron |

## Grundsaetze

**Kein Skript laeuft stillschweigend durch.** Jedes endet mit einem
Pruefabschnitt und einem Exit-Code ungleich null, wenn etwas fehlt. Bei einem
Abbruch weisst du, an welcher Stelle es war.

**Kein Skript ueberschreibt Daten.** `03-deploy-app.sh` spielt das Schema
nicht erneut ein, wenn schon Tabellen existieren. `backup-db.sh` legt die
Testwiederherstellung in eine eigene Datenbank.

**Secrets kommen nicht aus einem Skript.** Die `.env` schreibst du von Hand.
Ein Skript, das Secrets erzeugt und gleich einsetzt, verleitet dazu, sie nie
anzusehen.

**Vor dem Ausrollen pruefen, was in der `.env` steht.** `04-nginx-ssl.sh`
bricht ab, wenn Pflichtvariablen fehlen, `JWT_SECRET` und `SESSION_SECRET`
gleich sind oder `USE_HTTPS=true` hinter nginx steht. Diese drei Faelle
erzeugen sonst Fehlermeldungen, die nicht auf die Ursache zeigen.

## Nicht enthalten

- **Domain und DNS** — das passiert beim Registrar, siehe Anleitung Abschnitt 1
- **`.env` erzeugen** — lokal mit `scripts/generate-secrets.ps1`
- **Admin-Konto** — siehe Anleitung Abschnitt 12; `seed:dev-admin` verweigert
  in Produktion absichtlich den Dienst
