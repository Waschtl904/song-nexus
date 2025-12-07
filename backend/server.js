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
const session = require('express-session');

const app = express();

// ============================================================================
// 🔒 HTTPS CERTIFICATE SETUP (Self-Signed for Development)
// ============================================================================

let httpsOptions = null;

// Check if certs exist, if not create them
const certDir = path.join(__dirname, 'certs');
const keyPath = path.join(certDir, 'key.pem');
const certPath = path.join(certDir, 'cert.pem');

if (!fs.existsSync(keyPath) || !fs.existsSync(certPath)) {
    if (process.env.NODE_ENV === 'production') {
        console.error('❌ HTTPS certificates missing in production!');
        console.error('   Use Let\'s Encrypt or valid SSL certificates.');
        process.exit(1);
    } else {
        console.warn('⚠️  HTTPS certificates not found. Using insecure mode for development.');
        console.log('   To generate certificates, run:');
        console.log('   mkdir -p certs');
        console.log('   openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes');
    }
} else {
    httpsOptions = {
        key: fs.readFileSync(keyPath),
        cert: fs.readFileSync(certPath)
    };
    console.log('✅ HTTPS certificates loaded');
}

// ============================================================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================================================

// Helmet: HTTP security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
            fontSrc: ["'self'", "https://fonts.gstatic.com"],
            mediaSrc: ["'self'", "https://localhost:*", "https://*"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "https://localhost:*", "https://api.paypal.com", "https://api.sandbox.paypal.com"],
            frameSrc: ["'none'"],
        },
    },
    hsts: {
        maxAge: 31536000,
        includeSubDomains: true,
        preload: true
    },
    noSniff: true,
    xssFilter: true,
    referrerPolicy: { policy: 'strict-origin-when-cross-origin' }
}));

// CORS Configuration
app.use(cors({
    origin: [
        'https://localhost:5500',
        'https://127.0.0.1:5500',
        'https://localhost:3000',
        'http://localhost:5500', // Allow HTTP for development
        'http://127.0.0.1:5500',
        'http://localhost:3000'
    ],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin'
    ],
    exposedHeaders: ['Content-Type', 'X-Total-Count'],
    optionsSuccessStatus: 200,
    maxAge: 86400
}));

// Body parser
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Compression
app.use(compression());

// ============================================================================
// 🔐 SESSION MIDDLEWARE
// ============================================================================

app.use(session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production',
        httpOnly: true,
        sameSite: 'strict',
        maxAge: 1000 * 60 * 15 // 15 minutes
    }
}));

console.log('✅ Session middleware enabled');

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
app.use('/api/auth/', rateLimit(5, 15 * 60 * 1000));

console.log('✅ Rate limiting enabled');

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

if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

console.log('✅ Logging enabled');

// ============================================================================
// 📦 DATABASE CONNECTION
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

// ============================================================================
// 🔌 API ROUTES
// ============================================================================

console.log('🔧 Registering API routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/webauthn'));
app.use('/api/auth', require('./routes/auth-simple'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/users', require('./routes/users'));
app.use('/api/play-history', require('./routes/play-history'));
app.use('/api/admin/tracks', require('./routes/admin-tracks'));
console.log('✅ API routes registered');

// ============================================================================
// 🎵 STATIC AUDIO DIRECTORY (Public Access)
// ============================================================================

app.use('/public/audio', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type, Authorization');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
});

app.use('/public/audio', express.static(path.join(__dirname, 'public/audio')));

console.log('✅ Static audio directory enabled');

// ============================================================================
// 📄 SERVE STATIC FRONTEND FILES & SPA FALLBACK
// ============================================================================

// Deine statische HTML/CSS/JS vom Frontend servieren
const frontendPath = path.join(__dirname, '../frontend');
app.use(express.static(frontendPath));

// SPA Fallback - alle unbekannten Routes zu index.html
app.get('*', (req, res) => {
    res.sendFile(path.join(frontendPath, 'index.html'));
});

console.log('✅ Static frontend enabled');

// ============================================================================
// 🐛 ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
    console.error('❌ Error:', err.message);
    res.status(err.status || 500).json({
        error: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    });
});

// ============================================================================
// 🚀 START SERVER (HTTP or HTTPS)
// ============================================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

let server;

if (httpsOptions) {
    // ✅ HTTPS - immer verwenden wenn Certs vorhanden sind
    server = https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════╗');
        console.log('║   🎵 SONG-NEXUS v6.0 Backend (HTTPS)      ║');
        console.log('║      Secure • Ad-Free • Cookie-Free        ║');
        console.log('╚════════════════════════════════════════════╝');
        console.log(`✅ HTTPS Server running on https://${HOST}:${PORT}`);
        console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
        console.log(`🛡️ Security: Helmet + Custom Middleware`);
        console.log(`📁 Audio Path: ${path.join(__dirname, 'public/audio')}`);
        console.log(`📊 Database: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'song_nexus_dev'}`);
        console.log('');
    });
} else {
    // Fallback: HTTP ohne Certs
    server = app.listen(PORT, HOST, () => {
        console.log('');
        console.log('╔════════════════════════════════════════════╗');
        console.log('║   🎵 SONG-NEXUS v6.0 Backend (HTTP)       ║');
        console.log('║      ⚠️  Development Mode (No Certs)       ║');
        console.log('╚════════════════════════════════════════════╝');
        console.log(`✅ Server running on http://${HOST}:${PORT}`);
        console.log(`⚠️  Certs not found. Generate with:`);
        console.log(`   mkdir -p certs`);
        console.log(`   openssl req -x509 -newkey rsa:4096 -keyout certs/key.pem -out certs/cert.pem -days 365 -nodes`);
        console.log('');
    });
}