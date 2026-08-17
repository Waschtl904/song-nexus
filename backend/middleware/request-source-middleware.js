'use strict';

// Zentrale Anfragequellen-Pruefung fuer unsichere HTTP-Methoden.
//
// Ersetzt die bisherige validateCSRFToken/attachCSRFToken-Kette, die nur
// PUT /api/design-system/:id schuetzte und wegen Token-Cache/Session
// praktisch nicht funktionierte (Issue #86).
//
// Kein Token, keine Map, kein _csrf im Querystring. Die Pruefung ist
// zustandslos: Sec-Fetch-Site als primaeres Signal, Origin/Referer als
// Rueckfall fuer Browser ohne Fetch-Metadata. SameSite=Lax auf den Cookies
// bleibt zusaetzlich bestehen.

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

function originVonURL(rohwert) {
    try {
        return new URL(rohwert).origin;
    } catch {
        return null;
    }
}

/**
 * @param {string[]} erlaubteOrigins Dieselbe Liste wie corsOptions.origin.
 * @param {object} [optionen]
 * @param {string} [optionen.nichtBrowserHeader] Header-Name fuer Clients ohne
 *   Origin/Referer/Fetch-Metadata (z.B. eigene Skripte, Health-Checks).
 * @param {string} [optionen.nichtBrowserWert] Erwarteter Wert dieses Headers.
 */
function requireTrustedSource(erlaubteOrigins, optionen = {}) {
    const erlaubt = new Set(erlaubteOrigins);
    const headerName = optionen.nichtBrowserHeader || 'x-song-nexus-client';
    const headerWert = optionen.nichtBrowserWert || 'trusted-non-browser';

    return function requestSourceCheck(req, res, next) {
        if (!UNSAFE_METHODS.has(req.method)) {
            return next();
        }

        const fetchSite = req.headers['sec-fetch-site'];

        if (fetchSite === 'cross-site') {
            console.warn(`🚫 Anfragequelle: Sec-Fetch-Site=cross-site abgewiesen (${req.method} ${req.originalUrl})`);
            return res.status(403).json({ error: 'Cross-site-Anfrage abgewiesen', code: 'CSRF_CROSS_SITE' });
        }

        const originHeader = req.headers.origin;
        if (originHeader) {
            if (!erlaubt.has(originHeader)) {
                console.warn(`🚫 Anfragequelle: unbekannter Origin "${originHeader}" (${req.method} ${req.originalUrl})`);
                return res.status(403).json({ error: 'Unbekannter Origin', code: 'CSRF_BAD_ORIGIN' });
            }
            return next();
        }

        const refererHeader = req.headers.referer;
        if (refererHeader) {
            const refOrigin = originVonURL(refererHeader);
            if (!refOrigin || !erlaubt.has(refOrigin)) {
                console.warn(`🚫 Anfragequelle: unbekannter Referer-Origin "${refOrigin}" (${req.method} ${req.originalUrl})`);
                return res.status(403).json({ error: 'Unbekannter Referer', code: 'CSRF_BAD_REFERER' });
            }
            return next();
        }

        // Weder Fetch-Metadata noch Origin noch Referer vorhanden. Das ist
        // KEIN automatisches "ok" — dafuer braucht ein Nicht-Browser-Client
        // einen expliziten, gemeinsam vereinbarten Header.
        if (req.headers[headerName] === headerWert) {
            return next();
        }

        console.warn(`🚫 Anfragequelle: nicht feststellbar (${req.method} ${req.originalUrl})`);
        return res.status(403).json({ error: 'Anfragequelle nicht feststellbar', code: 'CSRF_NO_SOURCE' });
    };
}

module.exports = { requireTrustedSource };
