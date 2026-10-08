const fs = require('node:fs/promises');
const path = require('node:path');
const { developmentCertificate } = require('./utils/development-certificate');
async function main() {
    const directory = path.join(__dirname, 'certs');
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const { key, cert } = await developmentCertificate();
    const keyFile = path.join(directory, 'localhost-key.pem');
    const certFile = path.join(directory, 'localhost.pem');
    await fs.writeFile(keyFile, key, { flag: 'wx', mode: 0o600 });
    try { await fs.writeFile(certFile, cert, { flag: 'wx', mode: 0o644 }); }
    catch (error) { await fs.unlink(keyFile); throw error; }
    console.log('Local self-signed certificate created (valid for 7 days).');
    console.log('For browser trust use mkcert; do not disable TLS validation.');
}
if (require.main === module) main().catch((error) => {
    console.error('Certificate creation failed:', error.message);
    process.exitCode = 1;
});
