/**
 * CSRF Protection Middleware
 * Generates and validates CSRF tokens for state-changing operations
 */

const crypto = require('crypto');

// Store tokens in memory (in production, use Redis)
const tokens = new Map();

// Cleanup old tokens every 10 minutes
setInterval(() => {
    const now = Date.now();
    for (const [token, data] of tokens.entries()) {
        if (now - data.createdAt > 10 * 60 * 1000) {
            tokens.delete(token);
        }
    }
}, 10 * 60 * 1000);

/**
 * Generate CSRF token for a session
 */
function generateCSRFToken(sessionId) {
    const token = crypto.randomBytes(32).toString('hex');
    tokens.set(token, {
        sessionId,
        createdAt: Date.now(),
        used: false
    });
    return token;
}

/**
 * Verify CSRF token
 */
function verifyCSRFToken(token, sessionId) {
    const tokenData = tokens.get(token);
    
    if (!tokenData) {
        console.warn('❌ CSRF: Token not found');
        return false;
    }
    
    if (tokenData.sessionId !== sessionId) {
        console.warn('❌ CSRF: Token session mismatch');
        return false;
    }
    
    // Token is single-use
    if (tokenData.used) {
        console.warn('❌ CSRF: Token already used');
        return false;
    }
    
    // Mark as used
    tokenData.used = true;
    
    console.log('✅ CSRF: Token verified');
    return true;
}

/**
 * Middleware: Attach CSRF token to response
 */
function attachCSRFToken(req, res, next) {
    const sessionId = req.sessionID || req.session?.id || 'unknown';
    const token = generateCSRFToken(sessionId);
    
    // Attach to res.locals for template rendering
    res.locals.csrfToken = token;
    
    // Also send in response header for AJAX
    res.setHeader('X-CSRF-Token', token);
    
    next();
}

/**
 * Middleware: Verify CSRF token for state-changing operations
 */
function validateCSRFToken(req, res, next) {
    // Only check state-changing operations
    if (!['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        return next();
    }
    
    // GET CSRF token from multiple sources
    const token = 
        req.body._csrf ||                              // Form body
        req.headers['x-csrf-token'] ||                // Header
        req.headers['x-csrf-token'.toLowerCase()] ||  // Lowercase header
        req.query._csrf;                              // Query param (fallback)
    
    if (!token) {
        console.warn('❌ CSRF: No token provided');
        return res.status(403).json({
            error: 'CSRF token missing',
            message: 'Please include X-CSRF-Token header or _csrf in body'
        });
    }
    
    const sessionId = req.sessionID || req.session?.id || 'unknown';
    
    if (!verifyCSRFToken(token, sessionId)) {
        return res.status(403).json({
            error: 'Invalid CSRF token',
            message: 'CSRF token validation failed'
        });
    }
    
    next();
}

module.exports = {
    generateCSRFToken,
    verifyCSRFToken,
    attachCSRFToken,
    validateCSRFToken
};
