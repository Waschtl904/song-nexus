/**
 * app.js – reiner Express-App-Export fuer Tests (kein Server-Start, keine HTTPS-Certs)
 *
 * server.js bleibt unveraendert fuer den echten Betrieb.
 * Tests importieren dieses File damit supertest ein app-Objekt bekommt.
 *
 * WICHTIG: Dieses File darf KEINEN .listen() Aufruf enthalten!
 */

require('dotenv').config();

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const path = require('path');
const crypto = require('crypto');
const session = require('express-session');

const app = express();

// Nonce fuer CSP
app.use((req, res, next) => {
  res.locals.nonce = crypto.randomBytes(16).toString('hex');
  next();
});

// Helmet (vereinfacht, kein HSTS noetig fuer Tests)
app.use(helmet({
  contentSecurityPolicy: false,
  hsts: false,
}));

app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(compression());

// CORS (offen im Test-Modus)
app.use(cors({
  origin: true,
  credentials: true,
}));
app.options('*', cors());

// Session
app.use(session({
  secret: process.env.JWT_SECRET || 'test-secret-minimum-32-characters-ok',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: false, // kein HTTPS in Tests
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 1000 * 60 * 15,
  },
}));

// CSRF Middleware (Passthrough im Test – kein echter CSRF-Check noetig)
const { attachCSRFToken } = require('./middleware/csrf-middleware');

// Auth Middleware laden
const { verifyToken, requireAdmin } = require('./middleware/auth-middleware');

// Logging nur in nicht-test Umgebungen
if (process.env.NODE_ENV !== 'test') {
  const morgan = require('morgan');
  app.use(morgan('dev'));
}

// Cache Middleware (funktioniert auch ohne DB)
const { cacheMiddleware } = require('./middleware/cache-middleware');

// Routes registrieren
app.use('/api/tracks', cacheMiddleware(300), require('./routes/tracks'));
app.use('/api/auth/webauthn', require('./routes/webauthn'));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/play-history', require('./routes/play-history'));
app.use('/api/admin/tracks', require('./routes/admin-tracks'));

// Error Handler
app.use((err, req, res, next) => {
  console.error('❌ Error:', err.message);
  res.status(err.status || 500).json({ error: err.message });
});

module.exports = app;
