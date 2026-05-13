# Song-Nexus: Datenbankdokumentation

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
| `orders` | PayPal-Transaktionen | - |
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

## Migration (bestehende DB v1.0 → v1.1)

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
