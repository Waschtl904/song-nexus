# FIX #3: Rate Limiter DoS Protection

## Problem

**CRITICAL SECURITY ISSUE**: Die `rateLimitStore` Map hat **KEINE OBERGRENZE**. Bei einem DoS-Angriff mit vielen verschiedenen IP-Adressen wächst die Map unbegrenzt und erschöpft den RAM des Servers.

```javascript
// ❌ CURRENT (VULNERABLE)
const rateLimitStore = new Map();

const rateLimit = (maxRequests = 30, windowMs = 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        
        // 🚨 Problem: Map wächst unbegrenzt!
        if (!rateLimitStore.has(ip)) {
            rateLimitStore.set(ip, { count: 1, lastReset: now });
            // Wenn Attacker 1 Mio. IPs sendet, speichert Map 1 Mio. Einträge!
            return next();
        }
        // ...
    };
};
```

## Solution

**Limit Map auf 10.000 IP-Adressen.** Bei Überschreitung → HTTP 503 (Service Unavailable).

```javascript
// ✅ FIXED (PROTECTED)
const rateLimitStore = new Map();
const MAX_RATE_LIMIT_ENTRIES = 10000; // Maximal 10.000 IPs tracked

const rateLimit = (maxRequests = 30, windowMs = 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        // 🛡️  PROTECTION: Check if store is at capacity
        if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
            console.warn(`⚠️ Rate limiter at capacity. Rejecting ${ip}`);
            return res.status(503).json({
                error: 'Service temporarily unavailable due to high traffic.',
                retryAfter: 60
            });
        }
        
        if (!rateLimitStore.has(ip)) {
            rateLimitStore.set(ip, { count: 1, lastReset: now });
            return next();
        }
        // ...
    };
};
```

## Backup vor der Änderung

### Option 1: Manueller Backup (Empfohlen)

```bash
# Terminal im backend/ Verzeichnis

# 1. Aktuellen Status speichern
git status

# 2. Backup-Branch erstellen
git checkout -b backup-rate-limiter-$(date +%Y%m%d-%H%M%S)

# 3. Zur main zurück
git checkout main

# 4. File editieren (siehe unten)
```

### Option 2: Git Stash

```bash
# Alle Änderungen temporär speichern
git stash

# Später wieder abholen
git stash pop
```

## Implementation

### Schritt 1: Backend-Datei öffnen

```bash
# Datei in VS Code öffnen
code backend/server.js
```

### Schritt 2: Zeile ~270 finden (Rate Limiting Section)

Suche nach:
```javascript
// ============================================================================
// 🛡️ RATE LIMITING
// ============================================================================
```

### Schritt 3: Ersetze die KOMPLETTE Rate Limiting Section

**VON (Zeilen 270-310):**
```javascript
const rateLimitStore = new Map();

setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.lastReset > 15 * 60 * 1000) {
            rateLimitStore.delete(key);
        }
    }
}, 15 * 60 * 1000);

const rateLimit = (maxRequests = 30, windowMs = 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!rateLimitStore.has(ip)) {
            rateLimitStore.set(ip, { count: 1, lastReset: now });
            return next();
        }

        const clientData = rateLimitStore.get(ip);
        if (now - clientData.lastReset > windowMs) {
            clientData.count = 1;
            clientData.lastReset = now;
            return next();
        }

        clientData.count++;
        if (clientData.count > maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Try again later.',
                retryAfter: Math.ceil((clientData.lastReset + windowMs - now) / 1000)
            });
        }

        next();
    };
};
```

**ZU (mit DoS-Schutz):**
```javascript
const rateLimitStore = new Map();
const MAX_RATE_LIMIT_ENTRIES = 10000; // Maximal 10.000 IPs tracked

// Cleanup old entries every 15 minutes
setInterval(() => {
    const now = Date.now();
    let deleted = 0;
    
    for (const [key, data] of rateLimitStore.entries()) {
        // Delete entries older than 15 minutes
        if (now - data.lastReset > 15 * 60 * 1000) {
            rateLimitStore.delete(key);
            deleted++;
        }
    }
    
    if (deleted > 0) {
        console.log(`📁 Rate limiter cleanup: Deleted ${deleted} old entries. Current size: ${rateLimitStore.size}`);
    }
}, 15 * 60 * 1000);

const rateLimit = (maxRequests = 30, windowMs = 60 * 1000) => {
    return (req, res, next) => {
        const ip = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        // 🛡️ PROTECTION: If store exceeds max size, reject request
        if (rateLimitStore.size >= MAX_RATE_LIMIT_ENTRIES) {
            console.warn(`⚠️ Rate limiter at capacity (${rateLimitStore.size}/${MAX_RATE_LIMIT_ENTRIES}). Rejecting ${ip}`);
            return res.status(503).json({
                error: 'Service temporarily unavailable due to high traffic.',
                message: 'Too many unique connections. Try again in a few moments.',
                retryAfter: 60
            });
        }

        if (!rateLimitStore.has(ip)) {
            rateLimitStore.set(ip, { count: 1, lastReset: now });
            return next();
        }

        const clientData = rateLimitStore.get(ip);
        if (now - clientData.lastReset > windowMs) {
            clientData.count = 1;
            clientData.lastReset = now;
            return next();
        }

        clientData.count++;
        if (clientData.count > maxRequests) {
            return res.status(429).json({
                error: 'Too many requests. Try again later.',
                retryAfter: Math.ceil((clientData.lastReset + windowMs - now) / 1000)
            });
        }

        next();
    };
};
```

### Schritt 4: Speichern und Testen

```bash
# Terminal im backend/ Verzeichnis

# 1. Server neu starten
pnpm run dev

# 2. In Browser öffnen
https://localhost:3000

# 3. Logs kontrollieren - sollte zeigen:
# ✅ Rate limiting enabled with DoS protection (max 10000 IPs)
```

### Schritt 5: Testen unter Last

```bash
# Neues Terminal, im Root-Verzeichnis

# Teste mit Artillery (load test)
npx artillery quick --count 5000 --num 1 https://localhost:3000

# Nach ~5000 unique IPs sollte Rate Limiter 503 zurückgeben
```

## Rollback (Falls nötig)

```bash
# Änderungen zurücksetzen
git checkout backend/server.js

# Oder vom Backup-Branch wiederherstellen
git checkout backup-rate-limiter-20250113-163000 -- backend/server.js
git commit -m "restore: revert rate limiter fix"
```

## Monitoring

Nach dem Fix solltest du in den Logs sehen:

```
✅ Rate limiting enabled with DoS protection (max 10000 IPs)
📁 Rate limiter cleanup: Deleted 523 old entries. Current size: 7821
⚠️ Rate limiter at capacity (10000/10000). Rejecting 192.168.1.100
```

## Zusammenfassung

| Aspekt | Vorher | Nachher |
|--------|--------|--------|
| **Max IPs** | Unbegrenzt ❌ | 10.000 ✅ |
| **DoS-Schutz** | Nein ❌ | Ja ✅ |
| **Response** | 429 (rate limit) | 429 oder 503 (capacity) ✅ |
| **RAM-Sicherheit** | Risiko ❌ | Geschützt ✅ |
| **Cleanup** | Alle 15 Min | Alle 15 Min ✅ |

---

**Status**: Bereit zur Implementation ✅
**Backup**: Empfohlen ✅
**Rollback**: Möglich ✅
