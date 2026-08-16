// ============================================================================
// 🔐 CENTRALIZED AUTH MIDDLEWARE - auth-middleware.js
// ============================================================================
// NEW FILE: backend/middleware/auth-middleware.js
// Purpose: Single source of truth for all authentication middleware
// Created: Dec 12, 2025 (Repair)
// ============================================================================

const jwt = require('jsonwebtoken');
const { pool } = require('../db');

// ============================================================================
// 🔐 VERIFY TOKEN MIDDLEWARE (for routes)
// ============================================================================
// Usage: router.get('/protected', verifyToken, (req, res) => { ... })
// Sets: req.user with decoded JWT payload

const verifyToken = (req, res, next) => {
    // 1️⃣ HttpOnly Cookie (bevorzugt — sicher gegen XSS)
    // 2️⃣ Authorization-Header als Fallback (Rückwärtskompatibilität)
    const token =
        req.cookies?.auth_token ||
        req.headers.authorization?.split(' ')[1];

    if (!token) {
        console.log('❌ No token provided (cookie nor header)');
        return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log(`✅ Token verified for user ${decoded.id}`);
        next();
    } catch (err) {
        console.log('❌ Token verification failed:', err.message);
        // Cookie ungültig — sofort löschen damit Browser keinen abgelaufenen Token behält
        res.clearCookie('auth_token', { path: '/' });
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// ============================================================================
// 🔓 VERIFY TOKEN SYNCHRONOUSLY (for non-middleware usage like audio streaming)
// ============================================================================
// Usage: const decoded = verifyTokenSync(token)
// Throws: Error if token invalid
// Returns: Decoded JWT payload

const verifyTokenSync = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`✅ Token verified (sync) for user ${decoded.id}`);
        return decoded;
    } catch (err) {
        console.error('❌ Token verification failed (sync):', err.message);
        throw err;
    }
};

// ============================================================================
// 👮 ADMINRECHTE — gegen die Datenbank, nicht gegen das Token (Issue #24)
// ============================================================================
//
// VORHER entschied requireAdmin allein anhand des JWT-Inhalts:
//
//     if (req.user.role !== 'admin') return res.status(403)...
//
// Am laufenden Code nachgestellt: ein gueltig signiertes Token mit
// role='admin' fuer einen Benutzer, der in der Datenbank role='user' UND
// is_active=false hatte, bekam HTTP 200 auf einer Adminroute. Die Middleware
// hat dabei sogar "Admin 5 verified" protokolliert.
//
// Die Rolle im Token ist eine Behauptung aus der Vergangenheit. Sie sagt, was
// beim Login galt, nicht was jetzt gilt. Bei JWT_EXPIRE=7d ist das eine Woche
// lang falsch, und es gab keinen Weg, ein einzelnes Token zu entwerten --
// ausser JWT_SECRET zu rotieren, was alle Benutzer gleichzeitig auswirft.
//
// SECURITY-GUIDE Abschnitt 9 fragt: wer kann diesen Wert setzen? Bei der Rolle
// im Token lautet die Antwort: der Server, aber vor bis zu sieben Tagen. Das
// genuegt nicht. Deshalb wird sie jetzt bei jedem Adminzugriff frisch gelesen.
//
// BEWUSST OHNE ZWISCHENSPEICHER. Adminzugriffe sind selten -- acht Routen im
// ganzen Projekt. Eine Abfrage dort faellt nicht auf, ein Zwischenspeicher
// wuerde aber genau das Problem zurueckbringen, das hier behoben wird: eine
// Entscheidung anhand veralteter Daten.

/**
 * Liest Rolle und Aktivzustand eines Benutzers frisch aus der Datenbank.
 *
 * @param {number} benutzerId
 * @returns {Promise<{gefunden: boolean, aktiv: boolean, rolle: string|null}>}
 * @throws bei Datenbankfehlern -- der Aufrufer muss dann verweigern
 */
const ladeBenutzerFuerAutorisierung = async (benutzerId) => {
    const ergebnis = await pool.query(
        'SELECT role, is_active FROM users WHERE id = $1',
        [benutzerId]
    );

    if (ergebnis.rowCount === 0) {
        return { gefunden: false, aktiv: false, rolle: null };
    }

    const zeile = ergebnis.rows[0];
    return {
        gefunden: true,
        // Ein NULL in is_active gilt als nicht aktiv. Im Zweifel verweigern.
        aktiv: zeile.is_active === true,
        rolle: zeile.role,
    };
};

/**
 * Ist dieser Benutzer laut Datenbank ein aktiver Administrator?
 *
 * Fuer Stellen, die keine Middleware verwenden koennen, weil sie "eigene Daten
 * ODER Admin" pruefen -- etwa routes/play-history.js.
 *
 * Wirft NICHT. Bei einem Datenbankfehler ist die Antwort `false`, also
 * verweigern. Ein Rechtekennzeichen, das bei einer Stoerung `true` liefert,
 * waere schlimmer als kein Rechtekennzeichen.
 *
 * @param {number} benutzerId
 * @returns {Promise<boolean>}
 */
const istAdmin = async (benutzerId) => {
    if (!Number.isInteger(benutzerId) || benutzerId < 1) return false;
    try {
        const b = await ladeBenutzerFuerAutorisierung(benutzerId);
        return b.gefunden && b.aktiv && b.rolle === 'admin';
    } catch (err) {
        console.error(`❌ Adminpruefung fuer Benutzer ${benutzerId} fehlgeschlagen: ${err.message}`);
        return false;
    }
};

// Usage: router.post('/admin', verifyToken, requireAdmin, (req, res) => { ... })
// Requires: verifyToken middleware must be called first

const requireAdmin = async (req, res, next) => {
    if (!req.user) {
        console.log('❌ No user in request');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    const benutzerId = req.user.id;
    if (!Number.isInteger(benutzerId) || benutzerId < 1) {
        console.log(`❌ Token ohne brauchbare Benutzerkennung: ${JSON.stringify(benutzerId)}`);
        return res.status(401).json({ error: 'Unauthorized', code: 'NO_USER_ID' });
    }

    let benutzer;
    try {
        benutzer = await ladeBenutzerFuerAutorisierung(benutzerId);
    } catch (err) {
        // FAIL CLOSED. Eine Rechtepruefung, die bei einer Datenbankstoerung
        // durchlaesst, ist keine Rechtepruefung. 503 statt 403, weil das Problem
        // beim Server liegt und nicht beim Aufrufer.
        console.error(`❌ Adminpruefung nicht moeglich (Benutzer ${benutzerId}): ${err.message}`);
        return res.status(503).json({
            error: 'Berechtigung kann derzeit nicht geprueft werden',
            code: 'AUTHORIZATION_UNAVAILABLE',
        });
    }

    if (!benutzer.gefunden) {
        console.log(`❌ Token fuer Benutzer ${benutzerId}, der nicht mehr existiert`);
        return res.status(403).json({ error: 'Admin access required', code: 'ACCOUNT_UNKNOWN' });
    }

    if (!benutzer.aktiv) {
        console.log(`❌ Benutzer ${benutzerId} ist deaktiviert, Token aber noch gueltig`);
        return res.status(403).json({ error: 'Konto ist deaktiviert', code: 'ACCOUNT_DISABLED' });
    }

    if (benutzer.rolle !== 'admin') {
        console.log(
            `❌ Benutzer ${benutzerId} ist laut Datenbank "${benutzer.rolle}", ` +
            `laut Token "${req.user.role}" — abgewiesen`
        );
        return res.status(403).json({ error: 'Admin access required', code: 'ADMIN_REQUIRED' });
    }

    // Die Datenbank ist die Wahrheit. Nachgelagerter Code, der req.user.role
    // liest, soll den aktuellen Wert sehen und nicht den aus dem Token.
    req.user.role = benutzer.rolle;

    console.log(`✅ Admin ${benutzerId} gegen die Datenbank bestaetigt`);
    next();
};

// ============================================================================
// 📤 GENERATE JWT TOKEN
// ============================================================================
// Usage: const token = generateJWT(user)
// User object should have: id, role, username (optional), email (optional)

const generateJWT = (user) => {
    const payload = {
        id: user.id,
        role: user.role || 'user',
        username: user.username,
        email: user.email
    };

    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log(`✅ JWT generated for user ${user.id} (${user.role})`);
    return token;
};

// ============================================================================
// 🍪 SET AUTH COOKIE (HttpOnly, Secure, SameSite=Lax)
// ============================================================================
// Setzt den JWT als HttpOnly Cookie + gibt ihn zurück für Legacy-Clients.
// maxAge: Sekunden (nicht Millisekunden wie bei express-session)

const setAuthCookie = (res, token) => {
    const isProd = process.env.NODE_ENV === 'production';
    const maxAgeSeconds = 7 * 24 * 60 * 60; // 7 Tage

    res.cookie('auth_token', token, {
        httpOnly: true,          // Kein JavaScript-Zugriff möglich
        secure: isProd,          // Nur HTTPS in Produktion; lokal auch HTTP erlaubt
        sameSite: 'lax',         // CSRF-Schutz: Cookie wird bei Cross-Site-Navigation nicht mitgeschickt
        maxAge: maxAgeSeconds * 1000, // express erwartet Millisekunden
        path: '/',
    });

    console.log(`🍪 auth_token Cookie gesetzt (httpOnly, secure=${isProd}, sameSite=lax, 7d)`);
};

// ============================================================================
// 🚪 CLEAR AUTH COOKIE (bei Logout)
// ============================================================================

const clearAuthCookie = (res) => {
    res.clearCookie('auth_token', { path: '/', httpOnly: true, sameSite: 'lax' });
    console.log('🚪 auth_token Cookie gelöscht');
};

// ============================================================================
// ✅ EXPORTS
// ============================================================================

module.exports = {
    verifyToken,           // Middleware version (async-style)
    verifyTokenSync,       // Synchronous version (for audio streaming)
    requireAdmin,          // Adminpruefung gegen die Datenbank (#24)
    istAdmin,              // Adminpruefung als Wahrheitswert, fuer Inline-Faelle (#24)
    ladeBenutzerFuerAutorisierung, // Rolle und Aktivzustand frisch lesen
    generateJWT,           // Generate JWT token
    setAuthCookie,         // JWT als HttpOnly Cookie setzen
    clearAuthCookie,       // Cookie bei Logout löschen
};

// ============================================================================
// 📖 USAGE EXAMPLES
// ============================================================================
/*

// In a route file:
const { verifyToken, requireAdmin, generateJWT } = require('../middleware/auth-middleware');

// Protected route (user must be logged in)
router.get('/profile', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin-only route
router.post('/admin/settings', verifyToken, requireAdmin, (req, res) => {
  res.json({ success: true });
});

// Generate token after login
const user = { id: 123, role: 'user', username: 'john', email: 'john@example.com' };
const token = generateJWT(user);
res.json({ token, user });

// For audio streaming (synchronous verification)
const { verifyTokenSync } = require('../middleware/auth-middleware');
try {
  const token = authHeader.slice(7);
  const decoded = verifyTokenSync(token);
  const userId = decoded.id;
  // ... proceed with userId
} catch (err) {
  // Token invalid, serve preview instead
}
*/