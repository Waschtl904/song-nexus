// ============================================================================
// 🎵 SONG-NEXUS BACKEND v6.3 - FIXED SERVER.JS WITH DESIGN-SYSTEM
// ============================================================================
// CRITICAL FIX: Session Middleware MUST be before routes!
// ✅ Proper middleware ordering
// ✅ WebAuthn session handling fixed
// ✅ Design-System API endpoints added
// ✅ CSP FIXED - allows localhost:5500
// ✅ scriptSrcAttr ADDED - allows inline event handlers



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



const app = express();



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



// ✅ CRITICAL FIX: ATTACH DATABASE TO EXPRESS APP (FOR WEBAUTHN!)
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



const corsOrigins = NODE_ENV === 'production'
    ? ['https://yourdomain.com']
    : getOriginsList();



console.log('🌐 CORS Origins:', corsOrigins);



// ============================================================================
// ✅ CORS CONFIGURATION (BEFORE everything!)
// ============================================================================



const corsOptions = {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'X-Total-Count'],
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



// ✅ FIXED CSP DIRECTIVES - allows localhost:5500 + scriptSrcAttr for inline handlers
const getCSPDirectives = () => {
    const connectSrc = [
        "'self'",
        "https://localhost:*",        // ✅ Alle HTTPS localhost
        "http://localhost:*",         // ✅ HTTP localhost (development)
        "https://127.0.0.1:*",        // ✅ IP-Adresse HTTPS
        "http://127.0.0.1:*",         // ✅ IP-Adresse HTTP
        "wss://localhost:*",          // ✅ WebSocket Secure
        "ws://localhost:*",           // ✅ WebSocket
        "https://api.paypal.com",
        "https://api.sandbox.paypal.com"
    ];



    if (process.env.ALLOWED_ORIGINS?.includes('ngrok')) {
        const ngrokOrigin = process.env.ALLOWED_ORIGINS.split(',')[0].trim();
        connectSrc.push(ngrokOrigin);
        console.log(`✅ Added ngrok to CSP connectSrc: ${ngrokOrigin}`);
    }



    return {
        defaultSrc: ["'self'", "https:", "http:"],  // ✅ Erlaubt http/https
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],  // ✅ NEUE ZEILE - allows inline event handlers
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "https://localhost:*", "http://localhost:*"],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: connectSrc,  // ✅ WICHTIG: Erlaubt 5500!
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
    };
};



app.use(helmet({
    contentSecurityPolicy: {
        directives: getCSPDirectives(),
        reportUri: ['/api/csp-report'],
    },
    hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
    hidePoweredBy: true,
}));



// ✅ JSON PARSER
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));



// ✅ GZIP COMPRESSION
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));



// ✅ CORS (BEFORE routes!)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));



// ============================================================================
// 🔐 SESSION MIDDLEWARE - CRITICAL: MUST BE BEFORE ROUTES!
// ============================================================================



app.use(session({
    secret: process.env.SESSION_SECRET || process.env.JWT_SECRET || 'dev-secret-change-in-prod',
    resave: false,
    saveUninitialized: false,
    cookie: {
        path: '/',
        secure: true,
        httpOnly: true,
        sameSite: 'lax',
        maxAge: 1000 * 60 * 15  // 15 minutes
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
app.use('/api/auth/webauthn/', rateLimit(20, 15 * 60 * 1000));
app.use('/api/auth/', rateLimit(30, 15 * 60 * 1000));
app.use('/public/audio/', rateLimit(20, 60 * 1000));



console.log('✅ Rate limiting enabled');



// ============================================================================
// 🔐 AUTH MIDDLEWARE
// ============================================================================



const { verifyToken, requireAdmin } = require('./middleware/auth-middleware');



app.use('/api/', (req, res, next) => {
    console.log(`📨 ${req.method} ${req.path}`);
    next();
});



console.log('✅ Auth middleware loaded');



// ✅ CACHE MIDDLEWARE
const { cacheMiddleware, clearCache } = require('./middleware/cache-middleware');



// ============================================================================
// 🎨 DESIGN-SYSTEM API ENDPOINTS - MAPPED TO REAL DATABASE SCHEMA!
// ============================================================================



// GET design system settings from database (ID 1 = default/primary)
app.get('/api/design-system', async (req, res) => {
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



        // ✅ TRANSFORM DATABASE ROW TO JSON CONFIG FORMAT
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



// PUT update design system (saves to database)
app.put('/api/design-system/:id', async (req, res) => {
    try {
        console.log('📝 PUT /api/design-system/:id received');
        console.log('   ID:', req.params.id);


        // DEBUGGING (direkt in server.js einfügen, vor updates = ...)
        console.log('DEBUG DUMP req.body:', JSON.stringify(req.body, null, 2));
        console.log('DEBUG ACCESS check:', req.body.colors ? 'Colors exists' : 'Colors missing');
        if (req.body.colors) console.log('DEBUG PRIMARY:', req.body.colors.primary);


        const { id } = req.params;
        const body = req.body;


        const colors = body.colors || {};
        const images = body.images || {};
        const typography = body.typography || {};
        const spacing = body.spacing || {};
        const radius = body.radius || {};
        const components = body.components || {};


        // helper: akzeptiert mehrere Varianten
        const pick = (...vals) => vals.find(v => v !== undefined && v !== null && v !== '');


        // ✅ MAP INCOMING FIELDS TO DATABASE COLUMNS
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
            updated_by: req.session?.userId || req.body.updated_by || 'Designer'
        };



        // ✅ FILTER OUT NULL/UNDEFINED VALUES
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



        // ✅ ADD ID TO WHERE CLAUSE
        values.push(id);



        const query = `
            UPDATE public.design_system 
            SET ${setClause.join(', ')}
            WHERE id = $${paramCount}
            RETURNING *
        `;



        console.log('🔧 SQL Update:', query.substring(0, 100) + '...');
        console.log('📊 Values count:', values.length);



        const result = await pool.query(query, values);



        if (result.rows.length === 0) {
            console.warn('⚠️ Design system ID not found:', id);
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.status(404).json({ error: 'Design system not found' });
            return;
        }



        const updatedRow = result.rows[0];
        console.log('✅ Design system updated successfully, ID:', updatedRow.id);



        // ✅ TRANSFORM BACK TO JSON FORMAT FOR RESPONSE
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
        console.error('   Stack:', err.stack);



        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.status(500).json({
            error: 'Server error',
            message: err.message
        });
        return;
    }
});



console.log('✅ Design-System API endpoints registered (DATABASE SCHEMA MAPPED)');




// ============================================================================
// 🌐 ROUTE REGISTRATION (AFTER Design-System!)
// ============================================================================



console.log('🔧 Registering API routes...');



// ✅ GET /api/tracks WITH CACHE
app.get('/api/tracks', cacheMiddleware(300), require('./routes/tracks'));



// ✅ GET /api/blog/posts.json WITH CACHE
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
// 🔐 WEBAUTHN ROUTES - CRITICAL: Session middleware is ACTIVE here!
// ============================================================================



app.use('/api/auth/webauthn', require('./routes/webauthn'));



console.log('✅ WebAuthn routes registered');



// ✅ ALL OTHER ROUTES
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/users', require('./routes/users'));
app.use('/api/play-history', require('./routes/play-history'));
app.use('/api/admin/tracks', require('./routes/admin-tracks'));



app.post('/api/csp-report', (req, res) => {
    console.warn('⚠️ CSP Violation:', JSON.stringify(req.body, null, 2));
    res.status(204).send();
});



console.log('✅ API routes registered');



// ============================================================================
// 🎵 STATIC AUDIO DIRECTORY
// ============================================================================



app.use('/public/audio', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    next();
});



app.use('/public/audio', express.static(path.join(__dirname, 'public/audio')));
console.log('✅ Static audio directory enabled');



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


// DEBUG: Check DB content on startup
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



warmupDatabase().then(async () => {
    await debugDatabaseContent(); // <--- DEBUG CHECK AKTIVIERT
    if (httpsOptions && USE_HTTPS) {
        const server = https.createServer(httpsOptions, app);
        server.listen(PORT, HOST, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════╗');
            console.log('║   🎵 SONG-NEXUS v6.3 Backend              ║');
            console.log('║      Secure • Ad-Free • Cookie-Free        ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log(`✅ 🔒 HTTPS Server running on https://${HOST}:${PORT} (mkcert)`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log('🛡️  Security: Helmet + CORS + CSP + Session + Auth Middleware');
            console.log(`📁 Audio: ${path.join(__dirname, 'public/audio')}`);
            console.log(`📁 Frontend: ${frontendPath}`);
            console.log(`🗄️  DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
            console.log('🔐 WebAuthn RP: localhost');
            console.log('🎨 Design-System API: /api/design-system (GET) & /api/design-system/:id (PUT)');
            console.log('');
        });
    } else {
        const server = https.createServer(httpsOptions, app);
        server.listen(PORT, HOST, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════╗');
            console.log('║   🎵 SONG-NEXUS v6.3 Backend              ║');
            console.log('║      Secure • Ad-Free • Cookie-Free        ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log(`✅ 🔒 HTTPS Server running on https://${HOST}:${PORT} (mkcert)`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log('🛡️  Security: Helmet + CORS + CSP + Session + Auth Middleware');
            console.log(`📁 Audio: ${path.join(__dirname, 'public/audio')}`);
            console.log(`📁 Frontend: ${frontendPath}`);
            console.log(`🗄️  DB: ${process.env.DB_HOST}:${process.env.DB_PORT}/${process.env.DB_NAME}`);
            console.log('🔐 WebAuthn RP: localhost');
            console.log('🎨 Design-System API: /api/design-system (GET) & /api/design-system/:id (PUT)');
            console.log('');
        });
    }
}).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});