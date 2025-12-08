// ========================================================================
// 🎵 SONG-NEXUS FRONTEND SERVER
// Express HTTPS Server für Frontend (port 5500)
// ========================================================================

const express = require('express');
const https = require('https');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 5500;

// ===== HTTPS CERTIFICATES =====
// Nutzen die gleichen Certs wie Backend
const certPath = path.join(__dirname, '../backend/certs/cert.pem');
const keyPath = path.join(__dirname, '../backend/certs/key.pem');

// Check if certs exist
if (!fs.existsSync(certPath) || !fs.existsSync(keyPath)) {
    console.error('❌ ERROR: HTTPS Certificates not found!');
    console.error(`Expected: ${certPath}`);
    console.error(`Expected: ${keyPath}`);
    console.error('Generate certs with:');
    console.error('mkdir -p backend/certs && openssl req -x509 -newkey rsa:4096 -keyout backend/certs/key.pem -out backend/certs/cert.pem -days 365 -nodes');
    process.exit(1);
}

// ===== SECURITY HEADERS =====
app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
});

// ===== CORS HEADERS =====
app.use((req, res, next) => {
    res.setHeader('Access-Control-Allow-Origin', 'https://localhost:3000');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    if (req.method === 'OPTIONS') {
        return res.sendStatus(200);
    }
    next();
});

// ===== SERVE STATIC FILES =====
app.use(express.static(path.join(__dirname)));

// ===== FALLBACK TO index.html (SPA SUPPORT) =====
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// ===== ERROR HANDLING =====
app.use((err, req, res, next) => {
    console.error('❌ Server Error:', err);
    res.status(500).json({ error: 'Internal Server Error' });
});

// ===== START HTTPS SERVER =====
const httpsOptions = {
    key: fs.readFileSync(keyPath),
    cert: fs.readFileSync(certPath)
};

https.createServer(httpsOptions, app).listen(PORT, 'localhost', () => {
    console.log('');
    console.log('╔════════════════════════════════════════════════════╗');
    console.log('║  🎵 SONG-NEXUS FRONTEND - HTTPS SERVER RUNNING     ║');
    console.log('╠════════════════════════════════════════════════════╣');
    console.log(`║  🔐 URL: https://localhost:${PORT}                   ║`);
    console.log('║  ✅ HTTPS Enabled                                  ║');
    console.log('║  📁 Serving static files from:', path.join(__dirname), '║');
    console.log('╚════════════════════════════════════════════════════╝');
    console.log('');
});

// ===== GRACEFUL SHUTDOWN =====
process.on('SIGINT', () => {
    console.log('\n🛑 Frontend server shutting down...');
    process.exit(0);
});
