/**
 * 🎵 SONG-NEXUS Cache Middleware
 * Cacht API-Responses für bessere Performance
 */

const NodeCache = require('node-cache');

// Cache mit 5 Minuten Standard-TTL
const cache = new NodeCache({ stdTTL: 300, checkperiod: 600 });

/**
 * Cache Middleware - nur GET Requests
 * @param {number} cacheDuration - Sekunden (default: 300)
 */
const cacheMiddleware = (cacheDuration = 300) => {
    return (req, res, next) => {
        // ✅ Nur GET Requests cachen
        if (req.method !== 'GET') {
            return next();
        }

        // ✅ Cache-Key aus URL + Query-Parametern
        const cacheKey = req.originalUrl;
        const cachedData = cache.get(cacheKey);

        // ✅ Cache HIT
        if (cachedData) {
            console.log(`🟢 Cache HIT: ${cacheKey}`);
            res.set('X-Cache', 'HIT');
            res.set('Cache-Control', `public, max-age=${cacheDuration}`);
            return res.json(cachedData);
        }

        // ✅ Cache MISS
        console.log(`🔴 Cache MISS: ${cacheKey}`);
        res.set('X-Cache', 'MISS');

        // Response abfangen & speichern
        const originalJson = res.json.bind(res);
        res.json = function (data) {
            // Nur successful responses cachen
            if (data.success || data.data) {
                cache.set(cacheKey, data, cacheDuration);
            }
            return originalJson(data);
        };

        next();
    };
};

/**
 * Cache leeren (z.B. nach neuem Track)
 */
const clearCache = () => {
    cache.flushAll();
    console.log('🧹 Cache gelöscht');
};

/**
 * Cache Key leeren (einzelner Endpoint)
 */
const clearCacheKey = (pattern) => {
    const keys = cache.keys();
    keys.forEach(key => {
        if (key.includes(pattern)) {
            cache.del(key);
            console.log(`🧹 Deleted cache: ${key}`);
        }
    });
};

module.exports = { cacheMiddleware, clearCache, clearCacheKey, cache };
