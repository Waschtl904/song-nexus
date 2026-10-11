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
const cacheMiddleware = (cacheDuration = 300) => (req, res, next) => {
    res.vary('Cookie'); res.vary('Authorization');
    if (req.method !== 'GET') return next();
    if (req.headers.authorization || req.headers.cookie) {
        res.set('Cache-Control', 'private, no-store');
        return next();
    }
    const key = req.originalUrl;
    const hit = cache.get(key);
    if (hit) {
        res.set('X-Cache', 'HIT');
        res.set('Cache-Control', `public, max-age=${cacheDuration}`);
        return res.status(hit.status).json(hit.body);
    }
    res.set('X-Cache', 'MISS');
    const json = res.json.bind(res);
    res.json = data => {
        const control = String(res.getHeader('Cache-Control') || '');
        if (res.statusCode >= 200 && res.statusCode < 300 && !res.getHeader('Set-Cookie')
            && !/private|no-store|no-cache/i.test(control)) {
            cache.set(key, { status: res.statusCode, body: data }, cacheDuration);
            res.set('Cache-Control', `public, max-age=${cacheDuration}`);
        } else res.set('Cache-Control', 'private, no-store');
        return json(data);
    };
    next();
};

/**
 * Cache leeren (z.B. nach neuem Track)
 */
const clearCache = () => {
    cache.flushAll();
    console.log('🗙️ Cache gelöscht');
};

/**
 * Cache Key leeren (einzelner Endpoint)
 */
const clearCacheKey = (pattern) => {
    const keys = cache.keys();
    keys.forEach(key => {
        if (key.includes(pattern)) {
            cache.del(key);
            console.log(`🗙️ Deleted cache: ${key}`);
        }
    });
};

module.exports = { cacheMiddleware, clearCache, clearCacheKey, cache };
