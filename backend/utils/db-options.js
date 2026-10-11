const fs = require('node:fs');
function databaseOptions(env = process.env) {
    const host = env.DB_HOST || 'localhost';
    const local = ['localhost', '127.0.0.1', '::1'].includes(host) || host.startsWith('/');
    const mode = env.DB_SSL || (local ? 'off' : 'verify-full');
    if (!['off', 'verify-full'].includes(mode)) throw new Error('DB_SSL must be off or verify-full; unverified TLS is not supported');
    if (mode === 'off' && !local) throw new Error('Remote PostgreSQL requires DB_SSL=verify-full');
    if (env.DB_SSL_CA && env.DB_SSL_CA_FILE) throw new Error('Use only one of DB_SSL_CA or DB_SSL_CA_FILE');
    const ca = env.DB_SSL_CA || (env.DB_SSL_CA_FILE ? fs.readFileSync(env.DB_SSL_CA_FILE, 'utf8') : undefined);
    return { host, port: Number(env.DB_PORT || 5432), database: env.DB_NAME || 'song_nexus_dev',
        user: env.DB_USER, password: env.DB_PASSWORD,
        ssl: mode === 'off' ? false : { rejectUnauthorized: true, ...(ca ? { ca } : {}) },
        connectionTimeoutMillis: 5000, max: 10 };
}
module.exports = { databaseOptions };
