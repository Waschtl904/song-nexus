// Explicit CLI only. Runtime credentials must not have migration privileges.
const { Client } = require('pg');
const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
const { databaseOptions } = require('../utils/db-options');
async function migrate(client) {
    await client.query("SELECT pg_advisory_lock(hashtext('song-nexus-migrations'))");
    try {
        await client.query(`CREATE TABLE IF NOT EXISTS public.schema_migrations
            (name text PRIMARY KEY, sha256 text NOT NULL, applied_at timestamptz NOT NULL DEFAULT now())`);
        for (const name of fs.readdirSync(path.join(__dirname, '../migrations')).filter(n => n.endsWith('.sql')).sort()) {
            const sql = fs.readFileSync(path.join(__dirname, '../migrations', name), 'utf8');
            const hash = createHash('sha256').update(sql).digest('hex');
            const old = await client.query('SELECT sha256 FROM public.schema_migrations WHERE name=$1', [name]);
            if (old.rows.length) {
                if (old.rows[0].sha256 !== hash) throw new Error(`Applied migration changed: ${name}`);
                continue;
            }
            await client.query('BEGIN');
            try {
                await client.query(sql);
                await client.query('INSERT INTO public.schema_migrations(name,sha256) VALUES($1,$2)', [name, hash]);
                await client.query('COMMIT');
            } catch (error) { await client.query('ROLLBACK'); throw error; }
        }
    } finally { await client.query("SELECT pg_advisory_unlock(hashtext('song-nexus-migrations'))"); }
}
if (require.main === module) {
    require('dotenv').config();
    if (!process.env.MIGRATION_DB_USER || process.env.MIGRATION_DB_USER === process.env.DB_USER)
        throw new Error('Set a separate MIGRATION_DB_USER (and MIGRATION_DB_PASSWORD)');
    const client = new Client(databaseOptions({ ...process.env,
        DB_USER: process.env.MIGRATION_DB_USER, DB_PASSWORD: process.env.MIGRATION_DB_PASSWORD }));
    (async () => { try { await client.connect(); await migrate(client); }
        finally { await client.end(); } })().catch(error => { console.error(error.message); process.exitCode = 1; });
}
module.exports = { migrate };
