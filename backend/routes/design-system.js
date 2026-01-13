// ============================================================================
// 📋 DEPRECATED: Design-System Route File
// ============================================================================
// ⚠️ STATUS: DEPRECATED - Do not use this file
// 
// The design-system API endpoints have been moved to backend/server.js
// to avoid route registration conflicts and ensure proper middleware ordering.
//
// ✅ Current Location: backend/server.js (lines ~400-550)
// ✅ Endpoints:
//   - GET /api/design-system (public access)
//   - PUT /api/design-system/:id (admin only + CSRF protection)
//
// This file is kept for historical reference only.
// DO NOT import or require this file in server.js
// ============================================================================

const express = require('express');
const router = express.Router();

console.warn('⚠️️ DEPRECATED: backend/routes/design-system.js should not be used!');
console.warn('⚠️   Design-System routes are in backend/server.js instead');

// Throw error if someone tries to use this
router.use((req, res, next) => {
    return res.status(404).json({
        error: 'Not Found',
        message: 'This route file is deprecated. Design-system endpoints are in server.js',
        correct_endpoint: '/api/design-system'
    });
});

module.exports = router;

// ============================================================================
// 📄 HISTORICAL REFERENCE - Original implementation below
// ============================================================================
// 
// This was the original design-system.js route file.
// It has been refactored into backend/server.js to prevent route
// registration conflicts and ensure proper middleware ordering.
//
// The refactored version includes:
// ✅ Admin-only authorization for PUT requests
// ✅ CSRF token validation
// ✅ Comprehensive input validation
// ✅ Proper error handling
// ✅ Automatic CSS token regeneration
//
// Removal reason: Centralized route management improves maintainability
// ============================================================================
