/**
 * 🎵 SONG-NEXUS Cache Invalidation Utility
 * Ensures cache consistency when data changes
 */

const { clearCacheKey } = require('../middleware/cache-middleware');

/**
 * 🗑️ Invalidate tracks cache
 * Called after POST/PUT/DELETE track operations
 */
const invalidateTracksCache = () => {
    console.log('🗑️  Invalidating tracks cache...');
    clearCacheKey('/api/tracks');
    console.log('✅ Tracks cache cleared');
};

/**
 * 🗑️ Invalidate specific track by ID
 * Called after updating a single track
 */
const invalidateTrackById = (trackId) => {
    console.log(`🗑️  Invalidating cache for track ${trackId}...`);
    clearCacheKey(`/api/tracks/${trackId}`);
    // Also clear the list cache since it may include this track
    clearCacheKey('/api/tracks');
    console.log(`✅ Track ${trackId} cache cleared`);
};

/**
 * 🗑️ Invalidate design system cache
 * Called after design system updates
 */
const invalidateDesignSystemCache = () => {
    console.log('🗑️  Invalidating design-system cache...');
    clearCacheKey('/api/design-system');
    console.log('✅ Design-system cache cleared');
};

/**
 * 🗑️ Invalidate user-specific cache
 * Called after user profile/preferences change
 */
const invalidateUserCache = (userId) => {
    console.log(`🗑️  Invalidating cache for user ${userId}...`);
    clearCacheKey(`/api/users/${userId}`);
    clearCacheKey(`/api/users/profile`);
    console.log(`✅ User ${userId} cache cleared`);
};

/**
 * 🗑️ Invalidate payment-related cache
 * Called after new purchases
 */
const invalidatePaymentCache = (userId) => {
    console.log(`🗑️  Invalidating payment cache for user ${userId}...`);
    clearCacheKey(`/api/payments/user-purchases`);
    clearCacheKey(`/api/payments/history`);
    clearCacheKey(`/api/payments/stats`);
    console.log(`✅ Payment cache cleared for user ${userId}`);
};

/**
 * 🗑️ Invalidate all user-specific caches
 * Nuclear option - use sparingly
 */
const invalidateAllUserCaches = () => {
    console.log('🗑️🗑️🗑️ CLEARING ALL USER CACHES!');
    clearCacheKey('/api/users');
    clearCacheKey('/api/payments');
    clearCacheKey('/api/play-history');
    console.log('✅ All user caches cleared');
};

/**
 * 🗑️ Invalidate blog cache
 * Called after blog post updates
 */
const invalidateBlogCache = () => {
    console.log('🗑️  Invalidating blog cache...');
    clearCacheKey('/api/blog/posts');
    console.log('✅ Blog cache cleared');
};

module.exports = {
    invalidateTracksCache,
    invalidateTrackById,
    invalidateDesignSystemCache,
    invalidateUserCache,
    invalidatePaymentCache,
    invalidateAllUserCaches,
    invalidateBlogCache
};
