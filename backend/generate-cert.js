const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes } = require('node:crypto');
const { developmentCertificate } = require('./utils/development-certificate');

async function generateCertificate(directory, { renew = false } = {}) {
    if (process.env.NODE_ENV === 'production') throw new Error('Local certificate generation is for development only');
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const lockFile = path.join(directory, '.generate.lock');
    const lock = await fs.open(lockFile, 'wx', 0o600);
    const suffix = '.new-' + randomBytes(8).toString('hex');
    const files = [path.join(directory, 'localhost-key.pem'), path.join(directory, 'localhost.pem')];
    const staged = files.map(file => file + suffix);
    const old = [];
    let changed = 0;
    try {
        for (const file of files) {
            let stat;
            try { stat = await fs.lstat(file); }
            catch (error) { if (error.code !== 'ENOENT') throw error; }
            if (stat && !stat.isFile()) throw new Error('Certificate targets must be regular files');
            if (stat && !renew) throw new Error('Certificate already exists. Stop the local server and run npm run generate-cert -- --renew');
            old.push(stat ? await fs.readFile(file) : null);
        }
        const { key, cert } = await developmentCertificate();
        const contents = [key, cert];
        for (let i=0; i<files.length; i++)
            await fs.writeFile(staged[i], contents[i], { flag: 'wx', mode: i === 0 ? 0o600 : 0o644 });
        // The local server must be stopped: two paths are not a crash-atomic pair.
        for (let i=0; i<files.length; i++) {
            await fs.rename(staged[i], files[i]); changed++;
        }
        return { keyFile: files[0], certFile: files[1] };
    } catch (error) {
        for (let i=0; i<changed; i++) {
            if (old[i] === null) await fs.unlink(files[i]);
            else {
                await fs.writeFile(staged[i], old[i], { flag: 'wx', mode: i === 0 ? 0o600 : 0o644 });
                await fs.rename(staged[i], files[i]);
            }
        }
        throw error;
    } finally {
        for (const file of staged) await fs.rm(file, { force: true });
        await lock.close(); await fs.unlink(lockFile);
    }
}
async function main() {
    const args = process.argv.slice(2);
    if (args.some(arg => arg !== '--renew')) throw new Error('Usage: npm run generate-cert -- [--renew]');
    await generateCertificate(path.join(__dirname, 'certs'), { renew: args.includes('--renew') });
    console.log('Local self-signed certificate created (valid for 7 days). Restart the local server.');
    console.log('For browser trust use mkcert; do not disable TLS validation.');
}
if (require.main === module) main().catch(error => {
    console.error('Certificate creation failed:', error.message); process.exitCode = 1;
});
module.exports = { generateCertificate };
