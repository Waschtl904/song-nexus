// ========================================================================
// 🎵 SONG-NEXUS FRONTEND SERVER
// Express HTTPS Server für Frontend (port 5500)
// ========================================================================

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5500;
const HOST = 'localhost';

// ========================================================================
// 🔒 HTTPS CERTIFICATES (mkcert for Development)
// ========================================================================

let httpsOptions = null;

// Try mkcert certificates first (preferred)
const mkcertKeyPath = path.join(__dirname, 'certs/localhost-key.pem');
const mkcertCertPath = path.join(__dirname, 'certs/localhost.pem');

// Fallback to self-signed certificates
const selfSignedKeyPath = path.join(__dirname, '../backend/certs/key.pem');
const selfSignedCertPath = path.join(__dirname, '../backend/certs/cert.pem');

console.log('🔐 Checking SSL certificates...');

// Try mkcert first
if (fs.existsSync(mkcertKeyPath) && fs.existsSync(mkcertCertPath)) {
    httpsOptions = {
        key: fs.readFileSync(mkcertKeyPath),
        cert: fs.readFileSync(mkcertCertPath)
    };
    console.log('✅ Using mkcert certificates (frontend/certs/localhost.pem)');
}
// Fallback to self-signed from backend
else if (fs.existsSync(selfSignedKeyPath) && fs.existsSync(selfSignedCertPath)) {
    httpsOptions = {
        key: fs.readFileSync(selfSignedKeyPath),
        cert: fs.readFileSync(selfSignedCertPath)
    };
    console.log('✅ Using self-signed certificates from backend');
}
// No certificates found
else {
    console.error('❌ ERROR: HTTPS Certificates not found!');
    console.error(`   Expected mkcert: ${mkcertCertPath}`);
    console.error(`   Expected self-signed: ${selfSignedCertPath}`);
    console.error('');
    console.error('Generate mkcert certificates with:');
    console.error('   1. mkdir -p frontend/certs');
    console.error('   2. mkcert localhost');
    console.error('   3. mv localhost.pem frontend/certs/');
    console.error('   4. mv localhost-key.pem frontend/certs/');
    console.error('');
    process.exit(1);
}

// ========================================================================
// 🛡️ SECURITY HEADERS
// ========================================================================

app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
});

// ========================================================================
// 🔄 CORS HEADERS (Dynamic for ngrok)
// ========================================================================

const getAllowedOrigins = () => {
    const origins = [
        'https://localhost:3000',
        'https://localhost:5500',
        'http://localhost:3000',
        'http://localhost:5500',
    ];

    // Add ngrok origins if available
    if (process.env.ALLOWED_ORIGINS) {
        const allowedOrigins = process.env.ALLOWED_ORIGINS
            .split(',')
            .map(o => o.trim())
            .filter(o => o.length > 0);
        origins.push(...allowedOrigins);
        console.log(`✅ Added ngrok origins from env:`, allowedOrigins);
    }

    return origins;
};

const allowedOrigins = getAllowedOrigins();

app.use((req, res, next) => {
    const origin = req.get('origin');

    if (allowedOrigins.includes(origin)) {
        res.setHeader('Access-Control-Allow-Origin', origin);
    }

    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, X-Requested-With');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ========================================================================
// 📦 SERVE STATIC FILES
// ========================================================================

app.use(express.static(path.join(__dirname)));

// ========================================================================
// 🎯 FALLBACK TO index.html (SPA SUPPORT)
// ========================================================================

app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ========================================================================
// 🐛 ERROR HANDLING
// ========================================================================

app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err.message);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ========================================================================
// 🚀 START HTTPS SERVER
// ========================================================================

const server = https.createServer(httpsOptions, app).listen(PORT, HOST, () => {
    const certType = fs.existsSync(mkcertCertPath) ? '(mkcert)' : '(self-signed)';

    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  🎵 SONG-NEXUS FRONTEND - HTTPS SERVER             ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  🔐 URL: https://${HOST}:${PORT} ${certType.padEnd(20)}}║`);
    console.log('║  ✅ HTTPS Enabled                                  ║');
    console.log(`║  📁 Static files: ${path.join(__dirname).slice(-30).padEnd(31)}}║`);
    console.log('║  🔄 CORS: Enabled for Backend                      ║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
});

// ========================================================================
// 🛑 GRACEFUL SHUTDOWN
// ========================================================================

process.on('SIGINT', () => {
    console.log('\n🛑 Frontend server shutting down gracefully...');
    server.close(() => {
        console.log('✅ Server closed');
        process.exit(0);
    });

    setTimeout(() => {
        console.error('⚠️  Forced shutdown (timeout)');
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