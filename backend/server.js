require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();

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

// Helmet: HTTP security headers (VEREINFACHT für Audio)
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

// CORS: Allow only trusted origins
const allowedOrigins = process.env.ALLOWED_ORIGINS.split(',').map(origin => origin.trim());
// CORS: Allow frontend
app.use(cors({
  origin: [
    'http://localhost:5500',
    'http://127.0.0.1:5500',
    'http://localhost:3000'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));


// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Compression
app.use(compression());

// ============================================================================
// 📊 LOGGING SETUP
// ============================================================================

// Stelle sicher, dass logs/ Verzeichnis existiert
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const logStream = fs.createWriteStream(
  path.join(logsDir, 'app.log'),
  { flags: 'a' }
);

app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms', { stream: logStream }));

if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

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
// 🔌 ROUTES
// ============================================================================

app.use('/api/auth', require('./routes/auth'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/tracks', require('./routes/tracks'));
app.use('/api/users', require('./routes/users'));

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

app.listen(PORT, HOST, () => {
  console.log('');
  console.log('╔════════════════════════════════════════╗');
  console.log('║   🎵 SONG-NEXUS v6.0 Backend Start   ║');
  console.log('╚════════════════════════════════════════╝');
  console.log(`✅ Server running on http://${HOST}:${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
  console.log(`📍 CORS Origins: ${process.env.ALLOWED_ORIGINS}`);
  console.log(`📁 Audio Path: ${path.join(__dirname, 'public/audio')}`);
  console.log(`📊 Database: ${process.env.DB_HOST}:${process.env.DB_PORT || 5432}/${process.env.DB_NAME || 'song_nexus_dev'}`);
  console.log('');
});

module.exports = app;
module.exports.pool = pool;