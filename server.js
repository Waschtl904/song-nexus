require('dotenv').config();
const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const fs = require('fs');

const app = express();

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
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", "api.paypal.com", "api.sandbox.paypal.com"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  noSniff: true,
  xssFilter: true,
  referrerPolicy: { policy: "strict-origin-when-cross-origin" },
}));

// CORS: Allow only trusted origins
const allowedOrigins = (process.env.ALLOWED_ORIGINS || '').split(',');
app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Body parser
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Compression
app.use(compression());

// Logging
const logStream = fs.createWriteStream(process.env.LOG_FILE || 'logs/app.log', { flags: 'a' });
app.use(morgan(':remote-addr - :remote-user [:date[clf]] ":method :url HTTP/:http-version" :status :res[content-length] - :response-time ms', { stream: logStream }));
if (process.env.NODE_ENV !== 'production') {
  app.use(morgan('dev'));
}

// ============================================================================
// 📊 DATABASE CONNECTION
// ============================================================================

const { Pool } = require('pg');
const pool = new Pool({
  host: process.env.DB_HOST,
  port: process.env.DB_PORT,
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

pool.on('error', (err) => {
  console.error('Unexpected error on idle client', err);
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
// 🐛 ERROR HANDLING
// ============================================================================

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    error: err.message,
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

// ============================================================================
// 🚀 START SERVER
// ============================================================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, process.env.HOST || 'localhost', () => {
  console.log(`✅ SONG-NEXUS v6.0 Backend running on http://localhost:${PORT}`);
  console.log(`🔒 Environment: ${process.env.NODE_ENV}`);
});

module.exports = app;
