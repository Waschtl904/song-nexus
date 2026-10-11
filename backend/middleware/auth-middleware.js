// ============================================================================
// 🔐 CENTRALIZED AUTH MIDDLEWARE - auth-middleware.js
// ============================================================================
// NEW FILE: backend/middleware/auth-middleware.js
// Purpose: Single source of truth for all authentication middleware
// Created: Dec 12, 2025 (Repair)
// ============================================================================

const { pool } = require('../db');

// ============================================================================
// 🔐 VERIFY TOKEN MIDDLEWARE (for routes)
// ============================================================================
// Usage: router.get('/protected', verifyToken, (req, res) => { ... })
// Sets: req.user with decoded JWT payload

const { verifyAccessToken, generateJWT, clearAuthCookie } = require('../utils/auth-session');
const verifyToken = async (req, res, next) => {
    const token = req.cookies?.auth_token || /^Bearer (\S+)$/.exec(req.headers.authorization || '')?.[1];
    if (!token) return res.status(401).json({ error: 'Authentication required', code: 'AUTH_REQUIRED' });
    try {
        req.user = await verifyAccessToken(token);
        res.set('Cache-Control', 'private, no-store');
        next();
    } catch (error) {
        if (error.status) return res.status(error.status).json({ error: 'Authentication required', code: error.code });
        return res.status(503).json({ error: 'Authentication unavailable', code: 'AUTHORIZATION_UNAVAILABLE' });
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

module.exports = { verifyToken, verifyAccessToken, requireAdmin, istAdmin,
    ladeBenutzerFuerAutorisierung, generateJWT, clearAuthCookie };
