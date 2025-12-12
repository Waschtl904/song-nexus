// ============================================================================
// 🔐 CENTRALIZED AUTH MIDDLEWARE - auth-middleware.js
// ============================================================================
// NEW FILE: backend/middleware/auth-middleware.js
// Purpose: Single source of truth for all authentication middleware
// Created: Dec 12, 2025 (Repair)
// ============================================================================

const jwt = require('jsonwebtoken');

// ============================================================================
// 🔐 VERIFY TOKEN MIDDLEWARE (for routes)
// ============================================================================
// Usage: router.get('/protected', verifyToken, (req, res) => { ... })
// Sets: req.user with decoded JWT payload

const verifyToken = (req, res, next) => {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
        console.log('❌ No token provided');
        return res.status(401).json({ error: 'Unauthorized - No token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        console.log(`✅ Token verified for user ${decoded.id}`);
        next();
    } catch (err) {
        console.log('❌ Token verification failed:', err.message);
        res.status(403).json({ error: 'Invalid or expired token' });
    }
};

// ============================================================================
// 🔓 VERIFY TOKEN SYNCHRONOUSLY (for non-middleware usage like audio streaming)
// ============================================================================
// Usage: const decoded = verifyTokenSync(token)
// Throws: Error if token invalid
// Returns: Decoded JWT payload

const verifyTokenSync = (token) => {
    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log(`✅ Token verified (sync) for user ${decoded.id}`);
        return decoded;
    } catch (err) {
        console.error('❌ Token verification failed (sync):', err.message);
        throw err;
    }
};

// ============================================================================
// 👮 REQUIRE ADMIN ROLE (middleware to check admin status)
// ============================================================================
// Usage: router.post('/admin', verifyToken, requireAdmin, (req, res) => { ... })
// Requires: verifyToken middleware must be called first

const requireAdmin = (req, res, next) => {
    if (!req.user) {
        console.log('❌ No user in request');
        return res.status(401).json({ error: 'Unauthorized' });
    }

    if (req.user.role !== 'admin') {
        console.log(`❌ User ${req.user.id} tried to access admin endpoint without permission`);
        return res.status(403).json({ error: 'Admin access required' });
    }

    console.log(`✅ Admin ${req.user.id} verified`);
    next();
};

// ============================================================================
// 📤 GENERATE JWT TOKEN
// ============================================================================
// Usage: const token = generateJWT(user)
// User object should have: id, role, username (optional), email (optional)

const generateJWT = (user) => {
    const payload = {
        id: user.id,
        role: user.role || 'user',
        username: user.username,
        email: user.email
    };

    const token = jwt.sign(
        payload,
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRE || '7d' }
    );

    console.log(`✅ JWT generated for user ${user.id} (${user.role})`);
    return token;
};

// ============================================================================
// ✅ EXPORTS
// ============================================================================

module.exports = {
    verifyToken,           // Middleware version (async-style)
    verifyTokenSync,       // Synchronous version (for audio streaming)
    requireAdmin,          // Admin role check middleware
    generateJWT            // Generate JWT token
};

// ============================================================================
// 📖 USAGE EXAMPLES
// ============================================================================
/*

// In a route file:
const { verifyToken, requireAdmin, generateJWT } = require('../middleware/auth-middleware');

// Protected route (user must be logged in)
router.get('/profile', verifyToken, (req, res) => {
  res.json({ user: req.user });
});

// Admin-only route
router.post('/admin/settings', verifyToken, requireAdmin, (req, res) => {
  res.json({ success: true });
});

// Generate token after login
const user = { id: 123, role: 'user', username: 'john', email: 'john@example.com' };
const token = generateJWT(user);
res.json({ token, user });

// For audio streaming (synchronous verification)
const { verifyTokenSync } = require('../middleware/auth-middleware');
try {
  const token = authHeader.slice(7);
  const decoded = verifyTokenSync(token);
  const userId = decoded.id;
  // ... proceed with userId
} catch (err) {
  // Token invalid, serve preview instead
}
*/