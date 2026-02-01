const express = require('express');
const { cache } = require('../middleware/cache-middleware');
const { verifyToken, requireAdmin } = require('../middleware/auth-middleware');
const router = express.Router();

/**
 * 📊 GET /api/cache/stats - Cache Statistics (Admin Only)
 * Shows cache hit/miss stats and current cached keys
 */
router.get('/stats', verifyToken, requireAdmin, (req, res) => {
    try {
        const keys = cache.keys();
        const stats = cache.getStats();

        const cacheData = keys.map(key => {
            const value = cache.get(key);
            return {
                key,
                type: typeof value,
                size: JSON.stringify(value).length,
                ttl: cache.getTtl(key)
            };
        });

        res.json({
            success: true,
            stats: {
                keys: stats.keys,
                hits: stats.hits,
                misses: stats.misses,
                ksize: stats.ksize,
                vsize: stats.vsize
            },
            cached_items: cacheData,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Cache stats error:', err);
        res.status(500).json({ error: 'Failed to fetch cache stats' });
    }
});

/**
 * 🗑️ DELETE /api/cache/clear - Clear All Cache (Admin Only)
 */
router.delete('/clear', verifyToken, requireAdmin, (req, res) => {
    try {
        const keysCleared = cache.keys().length;
        cache.flushAll();
        console.log(`🗑️  Admin cleared ${keysCleared} cache entries`);

        res.json({
            success: true,
            message: `Cache cleared (${keysCleared} entries removed)`,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Cache clear error:', err);
        res.status(500).json({ error: 'Failed to clear cache' });
    }
});

/**
 * 🗑️ DELETE /api/cache/clear-key - Clear Specific Cache Key (Admin Only)
 */
router.delete('/clear-key', verifyToken, requireAdmin, (req, res) => {
    try {
        const { pattern } = req.body;

        if (!pattern || typeof pattern !== 'string') {
            return res.status(400).json({ error: 'Pattern required (string)' });
        }

        const keys = cache.keys();
        let cleared = 0;

        keys.forEach(key => {
            if (key.includes(pattern)) {
                cache.del(key);
                cleared++;
                console.log(`🗑️  Deleted: ${key}`);
            }
        });

        res.json({
            success: true,
            pattern,
            entries_cleared: cleared,
            timestamp: new Date().toISOString()
        });
    } catch (err) {
        console.error('❌ Cache clear-key error:', err);
        res.status(500).json({ error: 'Failed to clear cache key' });
    }
});

module.exports = router;
