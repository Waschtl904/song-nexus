/**
 * Frontend HTTPS Server v2.0 - WITH API PROXY
 * Port: 5500
 * Feature: Proxies /api/* requests to backend (port 3000)
 */

require('dotenv').config();
const express = require('express');
const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');
const { createProxyMiddleware } = require('http-proxy-middleware');

const app = express();

// ===== HTTPS CERTIFICATE SETUP =====
let httpsOptions = null;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_HTTPS = process.env.USE_HTTPS === 'true' || true;
const PORT = process.env.PORT || 5500;
const HOST = process.env.HOST || 'localhost';
const BACKEND_URL = process.env.BACKEND_URL || 'https://localhost:3000';

// Try mkcert certificates FIRST (preferred)
const mkcertKeyPath = path.join(__dirname, 'certs/localhost-key.pem');
const mkcertCertPath = path.join(__dirname, 'certs/localhost.pem');

// Fallback to self-signed from backend
const selfSignedKeyPath = path.join(__dirname, '../backend/certs/localhost-key.pem');
const selfSignedCertPath = path.join(__dirname, '../backend/certs/localhost.pem');

console.log('🔐 Checking SSL certificates...');
console.log(`   NODE_ENV: ${NODE_ENV}`);
console.log(`   USE_HTTPS: ${USE_HTTPS}`);
console.log(`   BACKEND_URL: ${BACKEND_URL}`);

// Try mkcert first
if (fs.existsSync(mkcertKeyPath) && fs.existsSync(mkcertCertPath)) {
    try {
        httpsOptions = {
            key: fs.readFileSync(mkcertKeyPath),
            cert: fs.readFileSync(mkcertCertPath)
        };
        console.log('✅ Using mkcert certificates (frontend/certs/)');
    } catch (err) {
        console.error('❌ Error reading mkcert certs:', err.message);
    }
}

// Fallback to self-signed from backend
if (!httpsOptions && fs.existsSync(selfSignedKeyPath) && fs.existsSync(selfSignedCertPath)) {
    try {
        httpsOptions = {
            key: fs.readFileSync(selfSignedKeyPath),
            cert: fs.readFileSync(selfSignedCertPath)
        };
        console.log('✅ Using self-signed certificates from backend');
    } catch (err) {
        console.error('❌ Error reading backend certs:', err.message);
    }
}

// No certificates found - CRITICAL ERROR
if (!httpsOptions) {
    console.error('\n❌ CRITICAL ERROR: HTTPS Certificates not found!');
    console.error('\n📍 Checked paths:');
    console.error(`   1. ${mkcertCertPath}`);
    console.error(`   2. ${selfSignedCertPath}`);
    process.exit(1);
}

// ===== CORS CONFIGURATION =====
function getOriginsList() {
    const origins = [
        'http://localhost:5500',
        'https://localhost:5500',
        'http://127.0.0.1:5500',
        'https://127.0.0.1:5500',
        'http://localhost:3000',
        'https://localhost:3000',
        'https://localhost:*',
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

// ===== SECURITY HEADERS =====
app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('hex');
    next();
});

const getCSPDirectives = () => {
    const connectSrc = [
        "'self'",
        "https://localhost:3000",
        "https://localhost:5500",
        "http://localhost:3000",
        "http://localhost:5500",
        "https://127.0.0.1:3000",
        "https://127.0.0.1:5500",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:5500",
        "wss://localhost:3000",
        "wss://localhost:5500",
        "ws://localhost:3000",
        "ws://localhost:5500",
    ];

    if (process.env.ALLOWED_ORIGINS?.includes('ngrok')) {
        const ngrokOrigin = process.env.ALLOWED_ORIGINS.split(',')[0].trim();
        connectSrc.push(ngrokOrigin);
    }

    return {
        defaultSrc: ["'self'", "https:", "http:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        fontSrc: ["'self'", "https://fonts.gstatic.com"],
        mediaSrc: [
            "'self'",
            "https://localhost:3000",
            "https://localhost:5500",
            "http://localhost:3000",
            "http://localhost:5500",
            "https://127.0.0.1:3000",
            "https://127.0.0.1:5500",
        ],
        imgSrc: ["'self'", "data:", "https:", "http:"],
        connectSrc: connectSrc,
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
    };
};

const corsOptions = {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin', 'X-CSRF-Token'],
    exposedHeaders: ['Content-Type', 'X-Total-Count', 'X-CSRF-Token'],
    optionsSuccessStatus: 200,
    maxAge: 86400
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

// ===== MIDDLEWARE =====
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        if (req.path && (req.path.endsWith('.css') || req.path.includes('design-tokens'))) {
            console.log(`⏭️  Skipping compression for CSS: ${req.path}`);
            return false;
        }
        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));

console.log('✅ Compression middleware enabled (GZIP - CSS excluded)');

app.use(cors(corsOptions));
app.options('*', cors(corsOptions));

// ===== 🔥 API PROXY TO BACKEND (HTTPS, for design-system + all /api routes) =====
console.log('\n🔗 Setting up API Proxy to Backend...');

// Create HTTPS agent that ignores self-signed certificates
const https_agent = require('https').Agent({ rejectUnauthorized: false });

app.use('/api', createProxyMiddleware({
    target: BACKEND_URL,
    changeOrigin: true,
    agent: https_agent,
    logLevel: 'debug',
    onProxyReq: (proxyReq, req, res) => {
        console.log(`📨 [PROXY] ${req.method} ${req.path} → ${BACKEND_URL}${req.path}`);
        // Forward credentials in proxy
        proxyReq.setHeader('Origin', `https://${HOST}:${PORT}`);
    },
    onProxyRes: (proxyRes, req, res) => {
        console.log(`📬 [PROXY] Response ${proxyRes.statusCode} from ${BACKEND_URL}${req.path}`);
        // Ensure CORS headers are set on proxied responses
        proxyRes.headers['Access-Control-Allow-Origin'] = `https://${HOST}:${PORT}`;
        proxyRes.headers['Access-Control-Allow-Credentials'] = 'true';
    },
    onError: (err, req, res) => {
        console.error(`❌ [PROXY ERROR] ${req.method} ${req.path}:`, err.message);
        res.status(502).json({
            error: 'Backend API unreachable',
            message: err.message,
            attempted: `${BACKEND_URL}${req.path}`
        });
    }
}));

console.log(`✅ API Proxy configured: /api → ${BACKEND_URL}`);

// ===== 🔥 EXPLICIT CSS ROUTES - BEFORE static files! =====

// _design-tokens.css (generiert vom Webpack Loader)
app.get('/_design-tokens.css', (req, res) => {
    const cssPath = path.join(__dirname, 'dist', '_design-tokens.css');

    console.log(`📥 Request: /_design-tokens.css`);
    console.log(`   File: ${cssPath}`);
    console.log(`   Exists? ${fs.existsSync(cssPath) ? '✅' : '❌'}`);

    if (!fs.existsSync(cssPath)) {
        console.error(`❌ File not found: ${cssPath}`);
        res.setHeader('Content-Type', 'text/css');
        res.status(404).send('/* Error: _design-tokens.css not found */');
        return;
    }

    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');

    try {
        const css = fs.readFileSync(cssPath, 'utf-8');
        console.log(`✅ Served _design-tokens.css (${css.length} bytes)`);
        res.send(css);
    } catch (err) {
        console.error(`❌ Error reading file: ${err.message}`);
        res.status(500).send(`/* Error: ${err.message} */`);
    }
});

// _design-tokens-DEFAULT.css (Fallback)
app.get('/_design-tokens-DEFAULT.css', (req, res) => {
    const cssPath = path.join(__dirname, '_design-tokens-DEFAULT.css');

    console.log(`📥 Request: /_design-tokens-DEFAULT.css`);

    if (!fs.existsSync(cssPath)) {
        res.status(404).send('/* Fallback not found */');
        return;
    }

    res.setHeader('Content-Type', 'text/css; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.sendFile(cssPath);
});

// ===== STATIC FILES =====
app.use(express.static(path.join(__dirname), {
    maxAge: '1d',
    etag: true,
    lastModified: true,
    setHeaders: function (res, filePath) {
        // CSS files - NO COMPRESSION, NO CACHING
        if (filePath.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            res.setHeader('Content-Encoding', 'identity');
            res.setHeader('Pragma', 'no-cache');
            res.setHeader('Expires', '0');
        }

        // JavaScript files
        if (filePath.endsWith('.js')) {
            res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
        }

        // WebP images
        if (filePath.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }

        // JPEG images
        if (filePath.endsWith('.jpeg') || filePath.endsWith('.jpg')) {
            res.setHeader('Content-Type', 'image/jpeg');
            res.setHeader('Cache-Control', 'public, max-age=31536000');
        }

        // Design Config JSON
        if (filePath.endsWith('design.config.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            res.setHeader('Cache-Control', 'no-cache');
        }

        // All JSON files
        if (filePath.endsWith('.json')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
        }
    }
}));

console.log('📁 Static files directory:', path.join(__dirname));

// ============================================================================
// FALLBACK - MUST BE LAST! (Issue #10)
// ============================================================================
//
// Vorher lieferte diese Route für JEDEN unbekannten Pfad index.html mit
// Status 200 aus. Das ist ein sogenannter Soft-404 und schlechter als ein
// echter Fehler:
//
//   - Ein toter Link fällt niemandem auf, weil scheinbar etwas funktioniert.
//     Genau so blieb der Footer-Link /docs/ monatelang unbemerkt.
//   - Suchmaschinen indexieren beliebig viele Adressen mit identischem
//     Inhalt als Duplicate Content.
//   - Ein Tippfehler in einem Rechtslink, etwa /datenschutzz.html, sieht wie
//     eine funktionierende Seite aus, obwohl die Pflichtangabe fehlt.
//
// SONG-NEXUS ist eine klassische Mehrseiten-Anwendung ohne Client-Router,
// ein SPA-Fallback war also von Anfang an nicht nötig.
//
// Neues Verhalten:
//   1. /purchases -> liefert purchases.html   (bequeme URLs ohne Endung)
//   2. alles übrige -> 404.html mit Status 404
// ============================================================================
app.get('*', (req, res) => {
    const angefragt = req.path;

    // 1) Bequeme URL ohne .html-Endung auflösen, z. B. /impressum
    if (/^\/[a-zA-Z0-9_-]+\/?$/.test(angefragt)) {
        const name = angefragt.replace(/\//g, '');
        const kandidat = path.join(__dirname, `${name}.html`);

        // path.join plus die Zeichenklasse oben schliessen Traversal aus;
        // zur Sicherheit trotzdem prüfen, dass wir im Verzeichnis bleiben.
        if (kandidat.startsWith(__dirname) && fs.existsSync(kandidat)) {
            console.log(`↗️  ${angefragt} -> ${name}.html`);
            return res.sendFile(kandidat);
        }
    }

    // 2) Echter 404
    console.warn(`❓ 404: ${req.method} ${angefragt}`);

    const notFoundPath = path.join(__dirname, '404.html');
    if (fs.existsSync(notFoundPath)) {
        return res.status(404).sendFile(notFoundPath);
    }

    // Letzter Ausweg, falls 404.html fehlt
    res.status(404).type('text/plain').send('404 - Seite nicht gefunden');
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    const errorResponse = { error: err.message };
    if (NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }

    res.status(err.status || 500).json(errorResponse);
});

// ===== START HTTPS SERVER =====
try {
    const server = https.createServer(httpsOptions, app);
    server.listen(PORT, HOST, () => {
        console.log('');
        console.log('╔═══════════════════════════════════════════════════════╗');
        console.log('║ 🎵 SONG-NEXUS FRONTEND - HTTPS SERVER v2.0            ║');
        console.log('╠═══════════════════════════════════════════════════════╣');
        console.log(`║ 🔐 URL: https://${HOST}:${PORT}${' '.repeat(18 - String(PORT).length)}║`);
        console.log('║ ✅ HTTPS Enabled (mkcert)                             ║');
        console.log(`║ 📁 Static: ${path.basename(__dirname)}${' '.repeat(42 - path.basename(__dirname).length)}║`);
        console.log(`║ 🔗 API Proxy: /api → ${BACKEND_URL}${' '.repeat(30 - BACKEND_URL.length)}║`);
        console.log(`║ 🌍 Environment: ${NODE_ENV}${' '.repeat(37 - NODE_ENV.length)}║`);
        console.log('║ 🛡️  CSP: scriptSrcAttr enabled for handlers          ║');
        console.log('║ ✅ CORS: Enabled with credentials support            ║');
        console.log('╚═══════════════════════════════════════════════════════╝');
        console.log('');
        console.log('🎯 Ready to serve frontend + proxy API requests!');
        console.log('');
    });

    process.on('SIGINT', () => {
        console.log('\n🛑 Frontend server shutting down gracefully...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
        setTimeout(() => {
            console.error('⚠️ Forced shutdown (timeout)');
            process.exit(1);
        }, 5000);
    });

    process.on('SIGTERM', () => {
        console.log('\n🛑 SIGTERM received. Shutting down...');
        server.close(() => {
            console.log('✅ Server closed');
            process.exit(0);
        });
    });

    module.exports = server;

} catch (err) {
    console.error('❌ Failed to start HTTPS server:', err.message);
    console.error('Stack:', err.stack);
    process.exit(1);
}
