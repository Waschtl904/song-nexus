// ============================================================================
// 🎵 SONG-NEXUS BACKEND v6.3 - FIXED SERVER.JS
// ============================================================================
// CRITICAL FIX: Session Middleware MUST be before routes!
// ✅ Proper middleware ordering
// ✅ WebAuthn session handling fixed

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

const getCSPDirectives = () => {
    const connectSrc = [
        "'self'",
        "https://localhost:*",
        "https://api.paypal.com",
        "https://api.sandbox.paypal.com"
    ];

    if (process.env.ALLOWED_ORIGINS?.includes('ngrok')) {
        const ngrokOrigin = process.env.ALLOWED_ORIGINS.split(',')[0].trim();
        connectSrc.push(ngrokOrigin);
        console.log(`✅ Added ngrok to CSP connectSrc: ${ngrokOrigin}`);
    }

    return {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: ["'self'", "https://localhost:*"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: connectSrc,
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
// 🌐 ROUTE REGISTRATION (AFTER all middleware!)
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

// ============================================================================
// 🚀 START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

warmupDatabase().then(() => {
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
            console.log('');
        });
    } else {
        app.listen(PORT, HOST, () => {
            console.log('');
            console.log('╔════════════════════════════════════════════╗');
            console.log('║   🎵 SONG-NEXUS v6.3 Backend              ║');
            console.log('║      Secure • Ad-Free • Cookie-Free        ║');
            console.log('╚════════════════════════════════════════════╝');
            console.log(`✅ HTTP Server running on http://${HOST}:${PORT}`);
            console.log(`🌍 Environment: ${NODE_ENV}`);
            console.log('⚠️  WARNING: HTTPS disabled');
            console.log('');
        });
    }
}).catch(err => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
});