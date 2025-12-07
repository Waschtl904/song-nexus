// src/backend/middleware/security.js
const helmet = require('helmet');
const express = require('express');

const app = express();

// Security Headers
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            scriptSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'"],
            imgSrc: ["'self'", 'data:'],
            fontSrc: ["'self'"],
            connectSrc: ["'self'"],
            frameSrc: ["'none'"],
        },
    },
    hsts: { maxAge: 31536000, includeSubDomains: true },
    noSniff: true,
    xssFilter: true,
}));

// No Cookies Tracking
app.use((req, res, next) => {
    res.setHeader('Permissions-Policy',
        'geolocation=(), microphone=(), camera=(), payment=()');
    next();
});