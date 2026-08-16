// ============================================================================
// 🎵 SONG-NEXUS BACKEND — Version steht in package.json
//
// Vorher stand hier fest "v6.7", waehrend package.json 6.2.0 nannte und
// routes/admin-tracks.js von v7.1 sprach. Drei Zahlen fuer denselben Stand
// machen die Frage "welche Fassung laeuft hier?" unbeantwortbar. Die
// Startmeldung liest die Version jetzt aus package.json — eine Quelle.
// ============================================================================
// ✅ CACHE MIDDLEWARE: GET /api/tracks (300s), /api/payments/config (3600s), etc.
// ✅ CACHE INVALIDATION: clearCacheKey() on POST/PUT/DELETE
// ✅ CACHE MONITORING: /api/cache/stats (admin only)
// ✅ NO STORAGE: All cache in-memory via NodeCache

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const https = require('https');
const rfs = require('rotating-file-stream');
const crypto = require('crypto');
const session = require('express-session');
const cookieParser = require('cookie-parser');

const app = express();

// ✅ CSRF MIDDLEWARE IMPORT
const { attachCSRFToken, validateCSRFToken } = require('./middleware/csrf-middleware');

// CSS-Aufbau fuer die Design-Tokens (Issue #67)
const { cssAusDatenbanksatz } = require('./utils/design-tokens-css');

// ============================================================================
// 🔒 HTTPS CERTIFICATE SETUP (mkcert for Development)
// ============================================================================

let httpsOptions = null;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_HTTPS = process.env.USE_HTTPS === 'true';
const certDir = path.join(__dirname, 'certs');
const mkcertKeyPath = path.join(certDir, 'localhost-key.pem');
const mkcertCertPath = path.join(certDir, 'localhost.pem');

console.log('🔐 Checking SSL certificates...');
console.log(`   NODE_ENV: ${NODE_ENV}`);
console.log(`   USE_HTTPS: ${USE_HTTPS}`);

if (fs.existsSync(mkcertKeyPath) && fs.existsSync(mkcertCertPath)) {
    httpsOptions = {
        key: fs.readFileSync(mkcertKeyPath),
        cert: fs.readFileSync(mkcertCertPath)
    };
    console.log('✅ Using mkcert certificates (localhost.pem)');
} else {
    if (NODE_ENV === 'production') {
        console.error('❌ HTTPS certificates missing in production!');
        process.exit(1);
    }
}

// ============================================================================
// 📦 DATABASE CONNECTION (Early - needed for app.db)
// ============================================================================

const { Pool } = require('pg');
const pool = new Pool({
    host: process.env.DB_HOST,
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'song_nexus_dev',
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
    console.error('❌ Database connection error:', err);
});

pool.on('connect', () => {
    console.log('✅ Database connected');
});

module.exports.pool = pool;
app.db = pool;

// ============================================================================
// ✅ DYNAMIC ORIGIN DETECTION (for ngrok + localhost)
// ============================================================================

function getOriginsList() {
    const origins = [
        'http://localhost:5500',
        'https://localhost:5500',
        'http://127.0.0.1:5500',
        'https://127.0.0.1:5500',
        'http://localhost:3000',
        'https://localhost:3000',
    ];

    if (process.env.ALLOWED_ORIGINS) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS
            .split(',')
            .map(o => o.trim())
            .filter(o => o.length > 0);
        origins.push(...allowedOrigins);
        console.log(`✅ Added ALLOWED_ORIGINS from .env:`, allowedOrigins);
    }

    return origins;
}

// In Produktion die konfigurierten Ursprünge verwenden, nicht einen
// Platzhalter. Vorher stand hier fest ['https://yourdomain.com'], wodurch
// ALLOWED_ORIGINS im Produktionsbetrieb wirkungslos war — dokumentiert, aber
// ohne Wirkung. Aufgefallen ist das erst, als der Server beim Start eine
// andere Liste meldete als in der .env stand.
function getProductionOrigins() {
    const roh = [process.env.ALLOWED_ORIGINS, process.env.FRONTEND_URL]
        .filter(Boolean)
        .join(',');

    const origins = [...new Set(
        roh.split(',').map(o => o.trim()).filter(o => o.length > 0)
    )];

    if (origins.length === 0) {
        console.warn('⚠️  Weder ALLOWED_ORIGINS noch FRONTEND_URL gesetzt.');
        console.warn('   Gleichursprüngliche Aufrufe funktionieren weiterhin — das');
        console.warn('   Frontend nutzt relative Pfade. Andere Ursprünge blockiert');
        console.warn('   der Browser. Für den Regelbetrieb beide Werte setzen.');
    }

    return origins;
}

const corsOrigins = NODE_ENV === 'production'
    ? getProductionOrigins()
    : getOriginsList();

console.log('🌐 CORS Origins:', corsOrigins);

// ============================================================================
// ✅ CORS CONFIGURATION (BEFORE everything!)
// ============================================================================

const corsOptions = {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Type', 'X-Total-Count', 'X-CSRF-Token', 'X-Cache'],
    optionsSuccessStatus: 200,
    maxAge: 86400
};

// ============================================================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================================================

app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('hex');
    next();
});

const getCSPDirectives = (nonce) => {
    const connectSrc = [
        "'self'",
        "https://localhost:*",
        "http://localhost:*",
        "https://127.0.0.1:*",
        "http://127.0.0.1:*",
        "wss://localhost:*",
        "ws://localhost:*",
        "https://api.paypal.com",
        "https://api.sandbox.paypal.com",
        "https://www.paypal.com",
        "https://www.sandbox.paypal.com",
    ];

    if (process.env.ALLOWED_ORIGINS?.includes('ngrok')) {
        const ngrokOrigin = process.env.ALLOWED_ORIGINS.split(',')[0].trim();
        connectSrc.push(ngrokOrigin);
        console.log(`✅ Added ngrok to CSP connectSrc: ${ngrokOrigin}`);
    }

    // In Produktion: echte Domain aus Umgebungsvariable
    if (process.env.NODE_ENV === 'production' && process.env.FRONTEND_URL) {
        connectSrc.push(process.env.FRONTEND_URL);
    }

    return {
        // defaultSrc bewusst eng: nur 'self', kein wildes https:/http:
        defaultSrc: ["'self'"],
        // Scripts: Nonce für inline <script>-Blöcke + 'self' für gebündelte Dateien
        // 'unsafe-inline' wird von Browsern ignoriert wenn nonce present → sicher
        scriptSrc: ["'self'", `'nonce-${nonce}'`, "'unsafe-inline'"],
        // scriptSrcAttr (onclick= etc.) komplett verbieten — kein inline Event-Handler nötig
        scriptSrcAttr: ["'none'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com", "data:"],
        mediaSrc: ["'self'", "https://localhost:*", "http://localhost:*", "blob:"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: connectSrc,
        // Framing komplett verbieten — verhindert Clickjacking
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        // Upgrade insecure requests in Produktion
        ...(process.env.NODE_ENV === 'production' ? { upgradeInsecureRequests: [] } : {}),
    };
};

app.use((req, res, next) => {
    // Nonce pro Request generieren (bereits oben als res.locals.nonce gesetzt)
    helmet({
        contentSecurityPolicy: {
            directives: getCSPDirectives(res.locals.nonce),
            reportOnly: false,
        },
        // Clickjacking-Schutz: verhindert Einbettung in fremde iframes
        frameguard: { action: 'deny' },
        hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
        noSniff: true,
        // xssFilter ist deprecated in modernen Browsern, CSP reicht
        xssFilter: false,
        referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
        hidePoweredBy: true,
        // Verhindert MIME-Type-Sniffing bei Audio/Downloads
        crossOriginResourcePolicy: { policy: 'same-site' },
        crossOriginOpenerPolicy: { policy: 'same-origin' },
        // Permissions Policy: Kamera/Mikro/Geolocation sperren
        permittedCrossDomainPolicies: false,
    })(req, res, next);
});

// Permissions-Policy Header manuell setzen (Helmet deckt das nicht vollständig ab)
app.use((req, res, next) => {
    res.setHeader(
        'Permissions-Policy',
        'camera=(), microphone=(), geolocation=(), payment=(self), usb=(), bluetooth=()'
    );
    next();
});

// Cookie-Parser MUSS vor Session und Routes kommen
app.use(cookieParser());

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ============================================================================
// 🔐 SESSION MIDDLEWARE - CRITICAL: MUST BE BEFORE ROUTES!
// ============================================================================

// ---------------------------------------------------------------------------
// Fail-fast: keine Dev-Defaults in Produktion (verwandt mit Issue #1)
//
// Der Session-Secret hatte den Fallback 'dev-secret-change-in-prod'. Fehlt die
// Variable in Produktion, lief der Server also mit einem im Repo bekannten
// Secret weiter – still und ohne Warnung. Dieselbe Klasse von Problem wie ein
// vergessenes NODE_ENV: die Anwendung startet, ist aber ungeschuetzt.
// Deshalb: in Produktion lieber gar nicht starten als unsicher starten.
// ---------------------------------------------------------------------------
if (NODE_ENV === 'production') {
    const pflichtSecrets = ['SESSION_SECRET', 'JWT_SECRET', 'JWT_REFRESH_SECRET'];
    const fehlend = pflichtSecrets.filter((name) => {
        const wert = process.env[name];
        return !wert || wert.length < 32;
    });

    if (fehlend.length > 0) {
        console.error('❌ START ABGEBROCHEN: Pflicht-Secrets fehlen oder sind zu kurz (< 32 Zeichen):');
        fehlend.forEach((name) => console.error(`   - ${name}`));
        console.error('   Generieren mit: openssl rand -base64 32');
        console.error('   Wichtig: für jedes Secret einen EIGENEN Wert verwenden.');
        process.exit(1);
    }

    if (process.env.SESSION_SECRET === process.env.JWT_SECRET) {
        console.error('❌ START ABGEBROCHEN: SESSION_SECRET und JWT_SECRET sind identisch.');
        console.error('   Getrennte Secrets verhindern, dass eine Kompromittierung beide Systeme trifft.');
        process.exit(1);
    }
}

app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 15
    },
    name: 'connect.sid'
}));

console.log('✅ Session middleware configured');

// ============================================================================
// 📊 LOGGING
// ============================================================================

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const rotatingLogStream = rfs.createStream('app.log', {
    interval: '1d',
    path: logsDir,
    maxSize: '10M',
    maxFiles: 5,
    compress: 'gzip'
});

app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms', { stream: rotatingLogStream }));

if (NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

console.log('✅ Logging enabled');

// ============================================================================
// 🛡️ RATE LIMITING
// ============================================================================

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

app.use('/api/', rateLimit(30, 60 * 1000));
app.use('/api/auth/login', rateLimit(5, 60 * 1000));
app.use('/api/auth/webauthn/', rateLimit(20, 15 * 60 * 1000));
app.use('/api/auth/', rateLimit(30, 15 * 60 * 1000));
app.use('/public/audio/', rateLimit(20, 60 * 1000));

console.log('✅ Rate limiting enabled (login: 5/min, other auth: 30/min)');

// ============================================================================
// 🔐 AUTH MIDDLEWARE
// ============================================================================

const { verifyToken, requireAdmin } = require('./middleware/auth-middleware');

app.use('/api/', (req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});

console.log('✅ Auth middleware loaded');

const { cacheMiddleware, clearCacheKey } = require('./middleware/cache-middleware');

// ============================================================================
// ✅ INPUT VALIDATION UTILITIES
// ============================================================================

function isValidHexColor(hex) {
    return /^#[0-9A-Fa-f]{6}([0-9A-Fa-f]{2})?$/.test(hex);
}

function validateDesignInput(data) {
    const errors = [];
    
    if (data.colors?.primary && !isValidHexColor(data.colors.primary)) {
        errors.push('Invalid primary color format. Must be hex: #RRGGBB');
    }
    if (data.colors?.secondary && !isValidHexColor(data.colors.secondary)) {
        errors.push('Invalid secondary color format');
    }
    if (data.colors?.text_primary && !isValidHexColor(data.colors.text_primary)) {
        errors.push('Invalid text color format');
    }
    if (data.colors?.background && !isValidHexColor(data.colors.background)) {
        errors.push('Invalid background color format');
    }
    
    if (data.typography?.font_sizes?.base) {
        const size = parseInt(data.typography.font_sizes.base);
        if (isNaN(size) || size < 10 || size > 72) {
            errors.push('Font size must be between 10 and 72');
        }
    }
    
    if (data.spacing?.['8']) {
        const spacing = parseInt(data.spacing['8']);
        if (isNaN(spacing) || spacing < 1 || spacing > 100) {
            errors.push('Spacing must be between 1 and 100');
        }
    }
    
    return errors;
}

// ============================================================================
// 🎨 DESIGN-SYSTEM API ENDPOINTS - REGISTERED EARLY (BEFORE OTHER ROUTES)
// ============================================================================

console.log('🔧 Registering DESIGN-SYSTEM API (with cache)...');

// GET design system settings from database - CACHED 86400s (24h)
app.get('/api/design-system', cacheMiddleware(86400), attachCSRFToken, async (req, res) => {
    try {
        console.log('📨 GET /api/design-system');

        const query = `
            SELECT 
                id, color_primary, color_secondary, color_accent_teal, 
                color_accent_green, color_accent_red, color_text_primary, 
                color_background, background_image_url, logo_url, 
                hero_image_url, font_family_base, font_size_base, 
                font_weight_normal, font_weight_bold, spacing_unit, 
                border_radius, button_background_color, button_text_color, 
                button_border_radius, button_padding, player_background_image_url, 
                player_button_color, player_button_size, is_active, updated_at, updated_by
            FROM public.design_system 
            WHERE is_active = true 
            LIMIT 1
        `;

        const result = await pool.query(query);

        if (result.rows.length === 0) {
            console.warn('⚠️ No active design system found, returning defaults');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(200).json({
                version: "1.0",
                meta: { name: "Default", author: "System", lastUpdated: new Date().toISOString() },
                colors: {
                    primary: "#00CC77",
                    secondary: "#5E5240",
                    accent_teal: "#32B8C6",
                    text_primary: "#00ffff",
                    background: "#FCF8F9"
                }
            });
            return;
        }

        const row = result.rows[0];
        console.log('✅ Design system found, ID:', row.id);

        const config = {
            version: "1.0",
            meta: {
                name: "SONG-NEXUS Cyberpunk Theme",
                author: row.updated_by || "System",
                lastUpdated: row.updated_at ? new Date(row.updated_at).toISOString() : new Date().toISOString(),
                description: "Design configuration from database"
            },
            colors: {
                primary: row.color_primary || "#00CC77",
                secondary: row.color_secondary || "#5E5240",
                accent_teal: row.color_accent_teal || "#32B8C6",
                accent_green: row.color_accent_green || "#22C55E",
                accent_red: row.color_accent_red || "#FF5459",
                text_primary: row.color_text_primary || "#00ffff",
                background: row.color_background || "#FCF8F9"
            },
            typography: {
                font_family_base: row.font_family_base || "Rajdhani, sans-serif",
                font_sizes: {
                    base: (row.font_size_base || 14) + "px"
                },
                font_weights: {
                    normal: row.font_weight_normal || 400,
                    bold: row.font_weight_bold || 600
                }
            },
            spacing: {
                "8": (row.spacing_unit || 8) + "px"
            },
            radius: {
                base: (row.border_radius || 8) + "px"
            },
            components: {
                buttons: {
                    primary: {
                        background: row.button_background_color || "#00CC77",
                        text_color: row.button_text_color || "#FFFFFF",
                        border_radius: (row.button_border_radius || 8) + "px",
                        padding: row.button_padding || "8px 16px"
                    }
                },
                player: {
                    background_image_url: row.player_background_image_url || null,
                    button_color: row.player_button_color || "#00CC77",
                    button_size: (row.player_button_size || 70) + "px"
                }
            },
            images: {
                background: row.background_image_url || null,
                logo: row.logo_url || null,
                hero: row.hero_image_url || null
            },
            metadata: {
                is_active: row.is_active,
                updated_at: row.updated_at ? new Date(row.updated_at).toISOString() : null,
                updated_by: row.updated_by || null
            }
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json(config);
        return;
    } catch (err) {
        console.error('❌ Error loading design system:', err.message);
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(500).json({
            error: 'Internal server error',
            message: err.message
        });
        return;
    }
});

// PUT update design system (with CSRF + Permission check + ADMIN ROLE) - INVALIDATES CACHE
app.put('/api/design-system/:id', validateCSRFToken, verifyToken, requireAdmin, async (req, res) => {
    try {
        console.log('📝 PUT /api/design-system/:id received');
        console.log('   ID:', req.params.id);
        console.log('   User:', req.user.username, 'Role:', req.user.role);

        const { id } = req.params;
        const body = req.body;

        const validationErrors = validateDesignInput(body);
        if (validationErrors.length > 0) {
            console.warn('⚠️ Validation errors:', validationErrors);
            return res.status(400).json({
                error: 'Validation failed',
                errors: validationErrors
            });
        }

        const colors = body.colors || {};
        const images = body.images || {};
        const typography = body.typography || {};
        const spacing = body.spacing || {};
        const radius = body.radius || {};
        const components = body.components || {};

        const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');

        const updates = {
            color_primary: pick(colors.primary, colors.color_primary, body.color_primary),
            color_secondary: pick(colors.secondary, colors.color_secondary, body.color_secondary),
            color_accent_teal: body.colors?.accent_teal,
            color_accent_green: body.colors?.accent_green,
            color_accent_red: body.colors?.accent_red,
            color_text_primary: body.colors?.text_primary,
            color_background: body.colors?.background,
            background_image_url: body.images?.background,
            logo_url: body.images?.logo,
            hero_image_url: body.images?.hero,
            font_family_base: body.typography?.font_family_base,
            font_size_base: body.typography?.font_sizes?.base ? parseInt(body.typography.font_sizes.base) : null,
            font_weight_normal: body.typography?.font_weights?.normal,
            font_weight_bold: body.typography?.font_weights?.bold,
            spacing_unit: body.spacing?.['8'] ? parseInt(body.spacing['8']) : null,
            border_radius: body.radius?.base ? parseInt(body.radius.base) : null,
            button_background_color: body.components?.buttons?.primary?.background,
            button_text_color: body.components?.buttons?.primary?.text_color,
            button_border_radius: body.components?.buttons?.primary?.border_radius ? parseInt(body.components.buttons.primary.border_radius) : null,
            button_padding: body.components?.buttons?.primary?.padding,
            player_background_image_url: body.components?.player?.background_image_url,
            player_button_color: body.components?.player?.button_color,
            player_button_size: body.components?.player?.button_size ? parseInt(body.components.player.button_size) : null,
            updated_at: new Date(),
            updated_by: req.user.username || 'Designer'
        };

        const setClause = [];
        const values = [];
        let paramCount = 1;

        for (const [key, value] of Object.entries(updates)) {
            if (value !== null && value !== undefined && value !== '') {
                setClause.push(`${key} = $${paramCount}`);
                values.push(value);
                paramCount++;
            }
        }

        if (setClause.length === 0) {
            console.warn('⚠️ No valid fields to update');
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(400).json({ error: 'No valid fields to update' });
            return;
        }

        values.push(id);

        const query = `
            UPDATE public.design_system 
            SET ${setClause.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;

        console.log('🔧 SQL Update:', query.substring(0, 100) + '...');

        const result = await pool.query(query, values);

        if (result.rows.length === 0) {
            console.warn('⚠️ Design system ID not found:', id);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(404).json({ error: 'Design system not found' });
            return;
        }

        const updatedRow = result.rows[0];
        console.log('✅ Design system updated successfully, ID:', updatedRow.id);
        console.log('   Updated by:', updatedRow.updated_by);

        // 🎯 CLEAR CACHE
        clearCacheKey('design-system');
        console.log('🗑️  Cache cleared for design-system');

        regenerateDesignTokens(updatedRow);

        const response = {
            success: true,
            message: 'Design config updated successfully',
            metadata: {
                id: updatedRow.id,
                updated_at: updatedRow.updated_at,
                updated_by: updatedRow.updated_by,
                is_active: updatedRow.is_active
            }
        };

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(200).json(response);
        return;
    } catch (err) {
        console.error('❌ Error in PUT /api/design-system/:id');
        console.error('   Message:', err.message);

        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(500).json({
            error: 'Server error',
            message: err.message
        });
        return;
    }
});

console.log('✅ Design-System API endpoints registered with CACHE (86400s)');

// ============================================================================
// 🎨 REGENERATE DESIGN TOKENS CSS FROM DATABASE ROW
// ============================================================================

function regenerateDesignTokens(dbRow) {
    try {
        console.log('🎨 Regenerating _design-tokens.css from database...');

        // Der CSS-Aufbau liegt seit Issue #67 in backend/utils/design-tokens-css.js.
        //
        // Vorher stand er hier und verwendete '\\n' statt '\n' - in JavaScript
        // ein Backslash gefolgt von n, kein Zeilenumbruch. Die Datei bestand
        // damit aus einer einzigen Zeile, und weil \n in CSS die Escape-Sequenz
        // fuer den Buchstaben n ist, wurde JEDE Deklaration verworfen.
        //
        // Der Fehler ueberlebte, weil er hier nicht pruefbar war: server.js
        // laesst sich in einem Test nicht laden (#47). Als eigenes Modul ist
        // der Aufbau eine reine Funktion und hat jetzt eine Testsuite.
        const css = cssAusDatenbanksatz(dbRow);

        const tokenPath = path.join(__dirname, '../frontend/dist/_design-tokens.css');
        const tokenDir = path.dirname(tokenPath);

        if (!fs.existsSync(tokenDir)) {
            fs.mkdirSync(tokenDir, { recursive: true });
        }

        fs.writeFileSync(tokenPath, css, 'utf-8');
        console.log(`✅ Design tokens CSS regenerated: ${tokenPath}`);
    } catch (error) {
        console.error('❌ Error regenerating design tokens:', error.message);
    }
}

// ============================================================================
// 🌐 CACHED GET ROUTES
// ============================================================================

console.log('🔧 Registering cached API routes...');

// Tracks: 300s cache (5 minutes)
app.use('/api/tracks', cacheMiddleware(300), require('./routes/tracks'));

// Blog posts: 600s cache (10 minutes)
app.get('/api/blog/posts.json', cacheMiddleware(600), async (req, res) => {
    try {
        const filePath = path.join(__dirname, 'public', 'blog', 'posts.json');
        if (fs.existsSync(filePath)) {
            res.json(JSON.parse(fs.readFileSync(filePath, 'utf8')));
        } else {
            res.status(404).json({ error: 'Posts file not found' });
        }
    } catch (err) {
        console.error('❌ Error loading blog posts:', err);
        res.status(500).json({ error: 'Internal server error' });
    }
});

// ============================================================================
// 📊 CACHE MONITORING ENDPOINT (Admin only)
// ============================================================================

console.log('🔧 Registering CACHE MONITOR endpoint (admin only)...');
app.use('/api/cache', require('./routes/cache-monitor'));
console.log('✅ Cache monitor registered: GET /api/cache/stats, DELETE /api/cache/clear, DELETE /api/cache/clear-key');

// ============================================================================
// 🌐 OTHER ROUTES (NO CACHE - Auth, Payments, Users, WebAuthn)
// ============================================================================

app.use('/api/auth/webauthn', require('./routes/webauthn'));
console.log('✅ WebAuthn routes registered (NO CACHE)');

app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/play-history', require('./routes/play-history'));
app.use('/api/admin/tracks', require('./routes/admin-tracks'));

console.log('✅ Auth/Payments/Users routes registered (NO CACHE)');

app.post('/api/csp-report', (req, res) => {
    console.warn('⚠️ CSP Violation:', JSON.stringify(req.body, null, 2));
    res.status(204).send();
});

console.log('✅ All API routes registered');

// ============================================================================
// 🎵 AUDIODATEIEN — bewusst KEINE statische Auslieferung mehr
// ============================================================================
//
// Hier stand:
//     app.use('/public/audio', express.static(path.join(__dirname, 'public/audio')));
//
// Das war eine offene Tür. Am laufenden Server nachgemessen:
//
//     GET /api/tracks/audio/premium.mp3   ohne Anmeldung -> 206, 640.601 Byte (Vorschau)
//     GET /public/audio/premium.mp3       ohne Anmeldung -> 200, 960.931 Byte, vollständig
//
// Die zweite Antwort war MD5-identisch mit der Originaldatei. Da
// GET /api/tracks den Dateinamen öffentlich herausgibt, genügte die
// Trackliste, um jeden Kauf zu umgehen — ohne Konto, ohne Token.
//
// Erschwerend: Der Player benutzte genau diesen ungeschützten Weg. Die
// Tests für /api/tracks/audio/:filename waren grün und prüften eine Route,
// die im Betrieb niemand aufrief. Grüne Tests haben hier Sicherheit
// vorgetäuscht, die es nicht gab.
//
// Audiodateien laufen ab jetzt ausschließlich über
// GET /api/tracks/audio/:filename mit Prüfung von is_free, Token und Kauf.
// Ein Aufruf von /public/audio/... liefert 404.
//
// Falls jemals wieder eine statische Auslieferung gebraucht wird: nur für
// Dateien, die tatsächlich für alle frei sind, und in einem eigenen
// Verzeichnis — nicht in demselben, in dem die Premium-Dateien liegen.

// ============================================================================
// 📄 SERVE STATIC FRONTEND FILES
// ============================================================================

const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));
console.log('✅ Static frontend files enabled');

// ============================================================================
// 🐛 ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    const errorResponse = { error: err.message };
    if (NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }
    res.status(err.status || 500).json(errorResponse);
});

// ============================================================================
// ✅ WARM UP DATABASE
// ============================================================================

async function warmupDatabase() {
    try {
        console.log('🔥 Warming up database connection...');
        await pool.query('SELECT NOW()');
        console.log('✅ Database warm - ready for requests!');
    } catch (err) {
        console.error('❌ Database warmup failed:', err);
    }
}

/**
 * Gibt beim Start den Inhalt von design_system aus.
 * Nur fuer die Entwicklung gedacht - der Aufruf ist auf NODE_ENV !==
 * 'production' begrenzt, siehe Startkette weiter unten.
 */
async function debugDatabaseContent() {
    try {
        console.log("🕵️ DEBUG: Prüfe Datenbank-Inhalt...");
        const res = await pool.query('SELECT id, is_active, color_primary FROM public.design_system');
        console.log("📊 DB Rows gefunden:", res.rows.length);
        console.table(res.rows);
    } catch (e) {
        console.error("❌ DB Check failed:", e);
    }
}

// ============================================================================
// 🚀 START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const { verifyMailer } = require('./utils/mailer');
const { version: APP_VERSION } = require('./package.json');

warmupDatabase().then(async () => {
    // DEBUG-Ausgabe nur ausserhalb von Produktion.
    //
    // Der Aufruf stand bisher ohne Bedingung hier und lief damit auch auf dem
    // Server mit: eine zusaetzliche Abfrage bei jedem Start und eine
    // console.table im Produktionsprotokoll. Der Inhalt ist harmlos - id,
    // is_active und color_primary aus design_system, keine Nutzerdaten -
    // aber ein Protokoll soll nur enthalten, was jemand lesen will.
    //
    // Aufgefallen in der Startausgabe, festgehalten in Issue #47.
    if (NODE_ENV !== 'production') {
        await debugDatabaseContent();
    }

    await verifyMailer(); // SMTP-Verbindung testen (nur Warnung bei Fehler, kein Abbruch)
    if (httpsOptions && USE_HTTPS) {
        const server = https.createServer(httpsOptions, app);
        server.listen(PORT, HOST, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════╗');
            console.log(`║   🎵 SONG-NEXUS v${APP_VERSION} Backend            ║`);
            console.log('║   Secure • Cached • Ad-Free                ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log(`✅ 🔒 HTTPS Server running on https://${HOST}:${PORT} (mkcert)`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log('🛡️  Security: Helmet + CORS + CSP + Session + CSRF + Rate Limit');
            console.log('⚡ Caching: Design-System (24h) | Tracks (5m) | Blog (10m)');
            console.log('📊 Cache Monitor: GET /api/cache/stats | DELETE /api/cache/clear (ADMIN)');
            console.log(`📁 Audio: ${path.join(__dirname, 'public/audio')}`);
            console.log(`📁 Frontend: ${frontendPath}`);
            console.log(`🗄️  DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
            console.log('🔐 WebAuthn RP: localhost');
            console.log('🎨 Design-System API: GET (CACHED 24h) | PUT (ADMIN + CSRF)');
            console.log('🎯 Rate Limits: General (30/min) | Login (5/min) | WebAuthn (20/15min)');
            console.log('');
        });
    } else {
        const server = app.listen(PORT, HOST, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════╗');
            console.log(`║   🎵 SONG-NEXUS v${APP_VERSION} Backend            ║`);
            console.log('║   Secure • Cached • Ad-Free                ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log(`✅ HTTP Server running on http://${HOST}:${PORT}`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log('🛡️  Security: Helmet + CORS + CSP + Session + CSRF + Rate Limit');
            console.log('⚡ Caching: Design-System (24h) | Tracks (5m) | Blog (10m)');
            console.log('📊 Cache Monitor: GET /api/cache/stats | DELETE /api/cache/clear (ADMIN)');
            console.log(`📁 Audio: ${path.join(__dirname, 'public/audio')}`);
            console.log(`📁 Frontend: ${frontendPath}`);
            console.log(`🗄️  DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
            console.log('🔐 WebAuthn RP: localhost');
            console.log('🎨 Design-System API: GET (CACHED 24h) | PUT (ADMIN + CSRF)');
            console.log('🎯 Rate Limits: General (30/min) | Login (5/min) | WebAuthn (20/15min)');
            console.log('');
        });
    }
}).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});
