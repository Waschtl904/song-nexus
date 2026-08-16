# Song-Nexus: Datenbankdokumentation

> **Führende Schema-Datei: `schema_clean.sql` (Root).**
> `schema.sql` im Root ist veraltet und enthält Redundanzen — nicht verwenden.
> `backend/db/schema.sql` existiert nicht.
> Migrationstooling fehlt noch (Issue #19); Änderungen liegen als SQL in `migrations/`.
>
> Geprüft am 15.08.2026.



**Letzte Verifikation:** 13. Mai 2026 (Live-DB-Audit via pgAdmin4)  
**Schema-Version:** v1.1  
**PostgreSQL:** 18.1  

---

## ⚠️ Welche Datei ist führend?

| Datei | Zweck | Status |
|---|---|---|
| `schema_clean.sql` | **Führendes Schema** – bereinigt, v1.1 | ✅ Aktuell |
| `schema.sql` | Historisches Schema v1.0, mit Redundanzen | ⚠️ Veraltet |
| `migration_cleanup.sql` | Migration von v1.0 → v1.1 | 🔧 Noch nicht auf Live-DB angewendet |

**Für ein frisches Setup immer `schema_clean.sql` verwenden.**

---

## Tabellen (9 aktive)

| Tabelle | Beschreibung | Zeilen (Stand Audit) |
|---|---|---|
| `users` | Benutzerkonten | - |
| `tracks` | Musik-Metadaten | 15 (4 aktiv, 11 soft-deleted) |
| `orders` | PayPal-Transaktionen (**seit 16.08. mit `track_id`**) | - |
| `purchases` | Käufe + Lizenztypen | - |
| `play_history` | Play-Events | - |
| `play_stats` | Erweiterte Analytics | - |
| `magic_link_tokens` | Magic-Link-Auth | 1 |
| `webauthn_credentials` | Biometrische Credentials | - |
| `design_system` | Design-Tokens (Admin) | - |

---

## Wichtige Designentscheidungen

### tracks: Preisspalte
- **`price_eur`** ist die einzige gültige Preisspalte
- `price` wurde in v1.1 entfernt (war Duplikat mit nur 1 custom-Wert)
- Alle Indexes und Backend-Queries referenzieren `price_eur`

### tracks: Dauerspalte  
- **`duration_seconds`** ist die einzige gültige Dauerspalte
- `duration` wurde in v1.1 entfernt (Duplikat)

### tracks: Soft Delete
- Gelöschte Tracks haben `is_deleted = true`, bleiben aber in der DB
- Aktive Tracks: `WHERE is_published = true AND is_deleted = false`
- Aktuell: **4 aktive Tracks**

### orders: track_id (seit 16.08.2026)

Die Tabelle hatte urspruenglich **keine** Verbindung zum gekauften Track. Beim
Freischalten kam die `track_id` aus dem Anfragekoerper des Browsers; geprueft
wurde nur, ob die PayPal-Bestellung zum angemeldeten Benutzer gehoert.

Damit waren bezahltes und freigeschaltetes Produkt nicht miteinander
verbunden: guenstigen Track bestellen, bezahlen, beim Freischalten die ID
eines teureren Tracks senden.

Seit `migrations/2026-08-15-orders-track-id.sql`:

```sql
ALTER TABLE orders ADD COLUMN track_id integer;
ALTER TABLE orders ADD CONSTRAINT orders_track_id_fkey
  FOREIGN KEY (track_id) REFERENCES tracks(id) ON DELETE SET NULL;
CREATE INDEX idx_orders_track_id ON orders(track_id);
```

- `create-order` schreibt die Zuordnung fest
- `capture-order` liest sie **aus der Bestellung** und ignoriert den
  Anfragekoerper
- Bestellungen ohne `track_id` (Altbestand) werden mit 409 abgelehnt statt
  geraten

Die Spalte ist bewusst `NULL`-faehig, damit die Migration auf bestehende
Datenbanken passt. Neue Bestellungen setzen sie immer.

### tracks: price_eur ist bindend

Der Preis wird ausschliesslich aus dieser Spalte genommen. Schickt der Client
in `create-order` einen abweichenden Preis mit, folgt 400 mit
`PRICE_MISMATCH` — eine stille Korrektur wuerde eine Manipulation
verschleiern.

Daraus folgt: **ein Track mit `is_free = false` und `price_eur = 0` ist nicht
verkaeuflich.** Der Upload verhindert diese Kombination seit dem 16.08.
(400 mit `PRICE_REQUIRED`), aeltere Eintraege koennen sie noch haben.

Pruefen:

```sql
SELECT id, name FROM tracks WHERE is_free = false AND COALESCE(price_eur, 0) <= 0;
```

### tracks: duration_seconds war unzuverlaessig

Der Wert kam bis zum 16.08. aus dem Browser: das Upload-Formular las
`audio.duration` aus und schickte das Ergebnis mit. In der
Entwicklungsdatenbank stand dadurch bei einem vier Minuten langen Song 3000
(also 50 Minuten).

Das war nicht nur Anzeige. Aus dem Wert wurde die Datenrate fuer den
Vorschauausschnitt gerechnet — 3000 fuehrten zu drei Sekunden Ton statt
vierzig.

Zwei Aenderungen:

1. Die Auslieferung liest die Datenrate jetzt aus dem **Dateikopf**
   (`backend/utils/audio-rate.js`). Die Vorschau stimmt damit unabhaengig von
   dieser Spalte.
2. Der Upload misst die Dauer selbst, statt dem Browser zu glauben.

Altbestand pruefen und in Ordnung bringen:

```bash
cd backend
npm run dauer:pruefen        # nur berichten, veraendert nichts
npm run dauer:korrigieren    # abweichende Werte setzen
```

### Magic Links
- **`magic_link_tokens`** ist die einzige aktive Tabelle
- `magic_links` wurde in v1.1 entfernt (war veraltet, 0 Einträge)

### WebAuthn
- Credentials ausschließlich in `webauthn_credentials`-Tabelle
- `users.webauthn_credential` (jsonb) wurde entfernt (nie befüllt)

### design_system
- Immer nur **eine aktive Zeile** erlaubt (`UNIQUE INDEX WHERE is_active = true`)
- Abfrage immer mit: `SELECT * FROM design_system WHERE is_active = true LIMIT 1`

---

## Setup (Frische Installation)

```bash
# Datenbank erstellen
psql -U postgres -c "CREATE DATABASE song_nexus_dev;"

# Schema einspielen (schema_clean.sql = führende Datei)
psql -U postgres -d song_nexus_dev -f schema_clean.sql
```

## Migrationen

Im Verzeichnis `migrations/`, nach Datum benannt. Sie lassen sich wiederholt
einspielen — ein zweiter Lauf richtet keinen Schaden an.

```bash
psql -U postgres -d song_nexus_dev -f migrations/2026-08-15-orders-track-id.sql
```

Erwartete Ausgabe am Ende: `HINWEIS:  OK: orders.track_id vorhanden`. Ein
Hinweis, dass ein Constraint nicht existiert und uebersprungen wird, ist
Absicht — die Migration raeumt vorsichtshalber auf, bevor sie anlegt.

`schema_clean.sql` enthaelt den Endstand und ist fuer **frische**
Installationen gedacht. Bei einer bestehenden Datenbank gehoeren die
Migrationen angewandt, nicht das Schema neu eingespielt.

Ein richtiges Migrations-Werkzeug statt handgepflegter Dateien ist
Issue #19.

## Alt: Migration (bestehende DB v1.0 → v1.1)

```bash
# 1. Erst testen (ROLLBACK am Ende der Datei)
psql -U postgres -d song_nexus_dev -f migration_cleanup.sql

# 2. In migration_cleanup.sql: ROLLBACK durch COMMIT ersetzen
# 3. Erneut ausführen
psql -U postgres -d song_nexus_dev -f migration_cleanup.sql
```

---

## Bekannte Einschränkungen

- `play_history` gehört Owner `postgres` (statt `song_nexus_user`) – historischer Fehler, Permissions sind aber korrekt gesetzt
- `design_system` hat kein Audit-Log – `updated_by` und `updated_at` sind die einzigen Nachverfolgungsfelder
