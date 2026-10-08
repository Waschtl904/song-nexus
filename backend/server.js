/** Prozessstart; saemtliche Middleware und Routen stehen in createApp (#47). */
const fs = require('fs');
const path = require('path');
const http = require('http');
const https = require('https');

/** Baut den echten HTTP(S)-Server, startet aber noch keinen Listener. */
function createServer(options = {}) {
    const { createApp } = require('./app');
    let tls;
    if (process.env.USE_HTTPS === 'true') {
        const certDir = path.join(__dirname, 'certs');
        // Bei angefordertem TLS nie still auf HTTP zurueckfallen.
        // Hinter nginx (USE_HTTPS=false) braucht Node keine mkcert-Dateien.
        tls = {
            key: fs.readFileSync(path.join(certDir, 'localhost-key.pem')),
            cert: fs.readFileSync(path.join(certDir, 'localhost.pem')),
        };
    }
    const app = createApp(options);
    const server = tls ? https.createServer(tls, app) : http.createServer(app);
    server.once('close', () => app.locals.dispose());
    return { app, server };
}

async function startServer() {
    require('dotenv').config();
    const { pool } = require('./db');
    const { verifyMailer } = require('./utils/mailer');
    const { version } = require('./package.json');
    const rfs = require('rotating-file-stream');
    const logsDir = path.join(__dirname, 'logs');
    fs.mkdirSync(logsDir, { recursive: true });
    const accessLogStream = rfs.createStream('app.log', {
        interval: '1d', path: logsDir, maxSize: '10M', maxFiles: 5, compress: 'gzip',
    });
    let application;
    try {
        application = createServer({ accessLogStream });
        const { server } = application;
        server.once('close', () => accessLogStream.end());
        // Bestehendes Verhalten: Warmup-/SMTP-Fehler warnen, Start bleibt moeglich.
        try {
            await pool.query('SELECT NOW()');
        } catch (err) {
            console.error('❌ Database warmup failed:', err.message);
        }
        if (process.env.NODE_ENV !== 'production') {
            try {
                const result = await pool.query('SELECT id, is_active, color_primary FROM public.design_system');
                console.table(result.rows);
            } catch (err) {
                console.error('❌ DB Check failed:', err.message);
            }
        }
        await verifyMailer();
        const port = process.env.PORT || 3000;
        const host = process.env.HOST || 'localhost';
        await new Promise((resolve, reject) => {
            server.once('error', reject);
            server.listen(port, host, () => {
                server.removeListener('error', reject);
                resolve();
            });
        });
        const protocol = process.env.USE_HTTPS === 'true' ? 'https' : 'http';
        console.log(`🎵 SONG-NEXUS v${version}: ${protocol}://${host}:${server.address().port} (${process.env.NODE_ENV || 'development'})`);
        return application;
    } catch (err) {
        application?.app.locals.dispose();
        accessLogStream.end();
        await pool.end();
        throw err;
    }
}

if (require.main === module) {
    startServer().catch((err) => {
        console.error('❌ Failed to start server:', err.message);
        process.exitCode = 1;
    });
}

module.exports = { createServer, startServer };
