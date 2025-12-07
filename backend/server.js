require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');
const rfs = require('rotating-file-stream');
const session = require('express-session');

const app = express();


app.use(cors({
    origin: ['http://localhost:5500', 'http://localhost:3000', 'http://127.0.0.1:5500'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// ============================================================================
// 🎯 VALIDATE ENVIRONMENT VARIABLES
// ============================================================================

const requiredEnvVars = [
    'NODE_ENV',
    'PORT',
    'ALLOWED_ORIGINS',
    'JWT_SECRET',
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
];

const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length > 0) {
    console.error('❌ FEHLER: Folgende Environment Variables fehlen:');
    missingEnvVars.forEach(envVar => console.error(`   - ${envVar}`));
    console.error('\n📝 Bitte .env Datei überprüfen!');
    process.exit(1);
}

console.log('✅ Alle Environment Variables vorhanden!');

// ============================================================================
// 🛡️ SECURITY MIDDLEWARE
// ============================================================================

// Helmet: HTTP security headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'", "'unsafe-inline'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            mediaSrc: ["'self'", "http://localhost:*"],
            imgSrc: ["'self'", "data:", "https:"],
            connectSrc: ["'self'", "http://localhost:*", "api.paypal.com", "api.sandbox.paypal.com"],
        },
    },
    hsts: false,
    noSniff: true,
    xssFilter: true,
}));

// CORS Configuration
app.use(cors({
    origin: [
        'http://localhost:5500',
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
// 🔐 SESSION MIDDLEWARE (für WebAuthn)
// ============================================================================

app.use(session({
    secret: process.env.JWT_SECRET || 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: process.env.NODE_ENV === 'production', // HTTPS only in production
        httpOnly: true, // ✅ Verhindert XSS Zugriff
        sameSite: 'strict', // ✅ CSRF protection
        maxAge: 1000 * 60 * 15 // 15 Minuten
    }
}));

console.log('✅ Session middleware enabled');

// ============================================================================
// 🛡️ CUSTOM SECURITY LAYER 1: RATE LIMITING (In-Memory)
// ============================================================================

// Simple Rate Limiting Store (In-Memory)
const rateLimitStore = new Map();

// Clean old entries every 15 minutes
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of rateLimitStore.entries()) {
        if (now - data.lastReset > 15 * 60 * 1000) {
            rateLimitStore.delete(key);
        }
    }
}, 15 * 60 * 1000);

// Rate Limiting Middleware
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
                error: 'Zu viele Anfragen. Bitte später versuchen.',
                retryAfter: Math.ceil((clientData.lastReset + windowMs - now) / 1000)
            });
        }

        next();
    };
};

// Apply Rate Limiting
app.use('/api/', rateLimit(30, 60 * 1000));           // 30 req/min für API
app.use('/api/auth/', rateLimit(5, 15 * 60 * 1000));  // 5 req/15min für Auth

console.log('✅ Rate limiting enabled (Custom In-Memory)');

// ============================================================================
// 🛡️ CUSTOM SECURITY LAYER 2: INPUT VALIDATION
// ============================================================================

// Simple Input Validation Middleware
const validateInput = (req, res, next) => {
    // Check für böse SQL/NoSQL Patterns
    const suspiciousPatterns = [
        /(\$where|\$ne|\$gt|\$lt|\$regex)/i,  // NoSQL Injection
        /(-|;|\/\*|\*\/|xp_|sp_)/,             // SQL Injection
        /(<script|javascript:|onerror|onclick)/i // XSS
    ];

    const checkValue = (val) => {
        if (typeof val === 'string') {
            return suspiciousPatterns.some(pattern => pattern.test(val));
        }
        if (typeof val === 'object' && val !== null) {
            return Object.values(val).some(v => checkValue(v));
        }
        return false;
    };

    // Check Body
    if (req.body && checkValue(req.body)) {
        console.warn('⚠️ Suspicious input detected:', req.ip);
        return res.status(400).json({ error: 'Invalid input detected' });
    }

    // Check Query Parameters
    if (req.query && checkValue(req.query)) {
        console.warn('⚠️ Suspicious query detected:', req.ip);
        return res.status(400).json({ error: 'Invalid query detected' });
    }

    next();
};

app.use(validateInput);
console.log('✅ Input validation enabled (Custom)');

// ============================================================================
// 📊 LOGGING SETUP WITH ROTATION
// ============================================================================

const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

// Log Rotation Stream
const rotatingLogStream = rfs.createStream('app.log', {
    interval: '1d',
    path: logsDir,
    maxSize: '10M',
    maxFiles: 5,
    compress: 'gzip'
});

// Morgan mit rotierenden Logs
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms', { stream: rotatingLogStream }));

// Dev-Logging in Console
if (process.env.NODE_ENV !== 'production') {
    app.use(morgan('dev'));
}

console.log('✅ Log rotation enabled: max 10MB per file, 5 files retained');

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
// 🔌 STANDARD API ROUTES
// ============================================================================

console.log('🔧 Registering API routes...');
app.use('/api/auth', require('./routes/auth'));
app.use('/api/auth', require('./routes/webauthn'));  // 🆕 WEBAUTHN!
app.use('/api/auth', require('./routes/auth-simple'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/users', require('./routes/users'));
app.use('/api/play-history', require('./routes/play-history'));
app.use('/api/admin/tracks', require('./routes/admin-tracks'));
console.log('✅ API routes registered');

// ============================================================================
// 🎵 DIRECT AUDIO STREAMING (Static Files mit CORS)
// ============================================================================

app.use('/public/audio', (req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Range, Content-Type');
    res.setHeader('Accept-Ranges', 'bytes');
    res.setHeader('Cache-Control', 'public, max-age=86400');
    next();
});

app.use('/public/audio', express.static(path.join(__dirname, 'public/audio')));

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
// 🚀 START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';

const server = app.listen(PORT, HOST, () => {
    console.log('');
    console.log('╔════════════════════════════════════════════╗');
    console.log('║   🎵 SONG-NEXUS v6.0 Backend Start       ║');
    console.log('║      with WebAuthn & Magic Link 🔐        ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`✅ Server running on http://${HOST}:${PORT}`);
    console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
    console.log(`🛡️ Security: Helmet + Custom Middleware`);
    console.log(`   - Rate Limiting (In-Memory)`);
    console.log(`   - Input Validation`);
    console.log(`   - Session Management (WebAuthn)`);
    console.log(`📍 CORS Origins: ${process.env.ALLOWED_ORIGINS}`);
    console.log(`🔐 WebAuthn RP ID: ${process.env.WEBAUTHN_RP_ID || 'localhost'}`);
    console.log(`📁 Audio Path: ${path.join(__dirname, 'public/audio')}`);
    console.log(`📊 Database: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'song_nexus_dev'}`);
    console.log(`📝 Logs: ${logsDir} (rotation: 10MB max, 5 files, daily)`);
    console.log('');
    console.log('🔐 Available Auth Routes:');
    console.log('   POST /api/auth/webauthn-register-options');
    console.log('   POST /api/auth/webauthn-register-verify');
    console.log('   POST /api/auth/webauthn-authenticate-options');
    console.log('   POST /api/auth/webauthn-authenticate-verify');
    console.log('   POST /api/auth/magic-link');
    console.log('   POST /api/auth/magic-link-verify');
    console.log('   POST /api/auth/dev-login (only in development!)');
    console.log('');
});

// Graceful Shutdown
process.on('SIGTERM', () => {
    console.log('📋 SIGTERM received, shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        pool.end();
        process.exit(0);
    });
});

module.exports = app;
module.exports.pool = pool;