// ============================================================================
// 🎵 SONG-NEXUS FRONTEND SERVER - ALIGNED WITH BACKEND
// Express HTTPS Server für Frontend (port 5500)
// ============================================================================
// CRITICAL: Mirrored Backend Cert Handling + HTTPS Setup
// ✅ Same mkcert logic as backend
// ✅ Same CORS handling as backend
// ✅ Same middleware ordering as backend
// ✅ scriptSrcAttr ADDED - allows inline event handlers


require('dotenv').config();
const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');
const compression = require('compression');
const helmet = require('helmet');
const cors = require('cors');
const crypto = require('crypto');


const app = express();


// ============================================================================
// 🔒 HTTPS CERTIFICATE SETUP - EXACTLY LIKE BACKEND!
// ============================================================================


let httpsOptions = null;
const NODE_ENV = process.env.NODE_ENV || 'development';
const USE_HTTPS = process.env.USE_HTTPS === 'true' || true;
const PORT = process.env.PORT || 5500;
const HOST = process.env.HOST || 'localhost';


// Try mkcert certificates FIRST (preferred)
const mkcertKeyPath = path.join(__dirname, 'certs/localhost-key.pem');
const mkcertCertPath = path.join(__dirname, 'certs/localhost.pem');


// Fallback to self-signed from backend
const selfSignedKeyPath = path.join(__dirname, '../backend/certs/localhost-key.pem');
const selfSignedCertPath = path.join(__dirname, '../backend/certs/localhost.pem');


console.log('🔐 Checking SSL certificates...');
console.log(`   NODE_ENV: ${NODE_ENV}`);
console.log(`   USE_HTTPS: ${USE_HTTPS}`);


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
    console.error('\n📝 SOLUTION - Generate mkcert certificates:');
    console.error('   1. mkdir -p frontend/certs');
    console.error('   2. cd frontend/certs');
    console.error('   3. mkcert localhost');
    console.error('   4. You will get: localhost-key.pem + localhost.pem');
    console.error('   5. Go back to project root: cd ../.');
    console.error('   6. npm start');
    console.error('\n   Or if you want to use backend certs:');
    console.error('   1. Copy backend/certs/*.pem to frontend/certs/');
    console.error('   2. npm start');
    console.error('');
    process.exit(1);
}


// ============================================================================
// ✅ DYNAMIC ORIGIN DETECTION - SAME AS BACKEND
// ============================================================================


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


// ============================================================================
// ✅ SECURITY HEADERS - FIXED CSP with scriptSrcAttr
// ============================================================================


app.use((req, res, next) => {
    res.locals.nonce = crypto.randomBytes(16).toString('hex');
    next();
});


// ✅ FIXED CSP DIRECTIVES - allows localhost:3000 + self-origin resources + scriptSrcAttr
const getCSPDirectives = () => {
    const connectSrc = [
        "'self'", // ✅ Same-origin (localhost:5500)
        "https://localhost:3000", // ✅ Backend API
        "https://localhost:5500", // ✅ Self explicit
        "http://localhost:3000", // ✅ Fallback HTTP Backend
        "http://localhost:5500", // ✅ Fallback HTTP Self
        "https://127.0.0.1:3000", // ✅ IP Backend
        "https://127.0.0.1:5500", // ✅ IP Self
        "http://127.0.0.1:3000", // ✅ IP HTTP Backend
        "http://127.0.0.1:5500", // ✅ IP HTTP Self
        "wss://localhost:3000", // ✅ WebSocket Secure Backend
        "wss://localhost:5500", // ✅ WebSocket Secure Self
        "ws://localhost:3000", // ✅ WebSocket Backend
        "ws://localhost:5500", // ✅ WebSocket Self
    ];


    if (process.env.ALLOWED_ORIGINS?.includes('ngrok')) {
        const ngrokOrigin = process.env.ALLOWED_ORIGINS.split(',')[0].trim();
        connectSrc.push(ngrokOrigin);
    }


    return {
        defaultSrc: ["'self'", "https:", "http:"],
        scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
        scriptSrcAttr: ["'self'", "'unsafe-inline'"],  // ✅ NEUE ZEILE - allows inline event handlers!
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
        connectSrc: connectSrc, // ✅ Erlaubt Backend + Self + fetch() zu Config
        frameSrc: ["'none'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
    };
};


const corsOptions = {
    origin: corsOrigins,
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept', 'Origin'],
    exposedHeaders: ['Content-Type', 'X-Total-Count'],
    optionsSuccessStatus: 200,
    maxAge: 86400
};


// ✅ FIXED: Helmet mit korrekter CSP + alle anderen Headers
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


// ============================================================================
// 📦 MIDDLEWARE - SAME ORDER AS BACKEND
// ============================================================================


// JSON Parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));


// GZIP Compression - CSS EXCLUDED (fixes corruption!)
app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
        // ❌ WICHTIG: CSS NICHT komprimieren - verursacht Corruption!
        if (req.path && (req.path.endsWith('.css') || req.path.includes('design-tokens'))) {
            console.log(`⏭️  Skipping compression for CSS: ${req.path}`);
            return false;
        }

        if (req.headers['x-no-compression']) return false;
        return compression.filter(req, res);
    }
}));


console.log('✅ Compression middleware enabled (GZIP - CSS excluded)');


// CORS (BEFORE routes!)
app.use(cors(corsOptions));
app.options('*', cors(corsOptions));


// ============================================================================
// 📦 SERVE STATIC FILES - MUST BE BEFORE FALLBACK
// ============================================================================


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
// ✅ NEW: DESIGN SYSTEM API ROUTE (VOR dem Fallback!)
// ============================================================================


app.get('/api/design-system', (req, res) => {
    const configPath = path.join(__dirname, 'config', 'design.config.json');


    if (!fs.existsSync(configPath)) {
        console.warn(`⚠️ Design config not found: ${configPath}`);
        return res.status(404).json({
            error: 'Design config not found',
            searched: configPath
        });
    }


    try {
        const configData = fs.readFileSync(configPath, 'utf-8');
        const config = JSON.parse(configData); // ← Parse & validate JSON!


        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.json(config);


        console.log('✅ Served /api/design-system');
    } catch (err) {
        console.error(`❌ Error reading design config:`, err.message);
        res.status(500).json({
            error: 'Failed to read design config',
            details: err.message
        });
    }
});


// ============================================================================
// ✅ EXPLICIT CONFIG ROUTE (Direct serving of design.config.json)
// ============================================================================


app.get('/config/design.config.json', (req, res) => {
    const configPath = path.join(__dirname, 'config', 'design.config.json');
    if (!fs.existsSync(configPath)) {
        console.warn(`⚠️ Config file not found: ${configPath}`);
        return res.status(404).json({ error: 'Config not found', requested: configPath });
    }


    try {
        const configData = fs.readFileSync(configPath, 'utf-8');
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        res.setHeader('Cache-Control', 'no-cache');
        res.send(configData);
        console.log('✅ Served /config/design.config.json');
    } catch (err) {
        console.error(`❌ Error reading config: ${err.message}`);
        res.status(500).json({ error: 'Failed to read config', details: err.message });
    }
});


// ============================================================================
// ✅ EXPLICIT ASSET ROUTES (Fallback if static fails)
// ============================================================================


app.get('/assets/*', (req, res) => {
    const filePath = path.join(__dirname, req.path);
    if (fs.existsSync(filePath)) {
        if (req.path.endsWith('.webp')) {
            res.setHeader('Content-Type', 'image/webp');
        } else if (req.path.endsWith('.jpeg') || req.path.endsWith('.jpg')) {
            res.setHeader('Content-Type', 'image/jpeg');
        } else if (req.path.endsWith('.css')) {
            res.setHeader('Content-Type', 'text/css');
        }


        res.sendFile(filePath);
    } else {
        console.warn(`⚠️ Asset not found: ${req.path}`);
        res.status(404).json({ error: 'Asset not found', requested: req.path });
    }
});


// ============================================================================
// 🎯 FALLBACK TO index.html (SPA SUPPORT) - MUST BE LAST!
// ============================================================================


app.get('*', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    if (!fs.existsSync(indexPath)) {
        console.error(`❌ index.html not found at: ${indexPath}`);
        return res.status(404).json({
            error: 'index.html not found',
            path: indexPath,
            cwd: __dirname,
            files: fs.readdirSync(__dirname).slice(0, 20)
        });
    }


    res.sendFile(indexPath);
});


// ============================================================================
// 🐛 ERROR HANDLING
// ============================================================================


app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    const errorResponse = { error: err.message };
    if (NODE_ENV === 'development') {
        errorResponse.stack = err.stack;
    }


    res.status(err.status || 500).json(errorResponse);
});


// ============================================================================
// 🚀 START HTTPS SERVER
// ============================================================================


try {
    const server = https.createServer(httpsOptions, app);
    server.listen(PORT, HOST, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════════════╗');
        console.log('║ 🎵 SONG-NEXUS FRONTEND - HTTPS SERVER              ║');
        console.log('╠════════════════════════════════════════════════════╣');
        console.log(`║ 🔐 URL: https://${HOST}:${PORT}${' '.repeat(18 - String(PORT).length)}║`);
        console.log('║ ✅ HTTPS Enabled (mkcert)                          ║');
        console.log(`║ 📁 Static: ${path.basename(__dirname)}${' '.repeat(36 - path.basename(__dirname).length)}║`);
        console.log('║ 🔄 CORS: Enabled for Backend (port 3000)          ║');
        console.log(`║ 🌍 Environment: ${NODE_ENV}${' '.repeat(29 - NODE_ENV.length)}║`);
        console.log('║ 🛡️  CSP: scriptSrcAttr enabled for handlers       ║');
        console.log('╚════════════════════════════════════════════════════╝');
        console.log('');
    });


    // ============================================================================
    // 🛑 GRACEFUL SHUTDOWN
    // ============================================================================


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
