const fs = require('node:fs');
const path = require('node:path');
const { staticCSP } = require('../../backend/utils/static-csp');
const { hstsHeader } = require('../../backend/utils/hsts');
function render(domain, env) {
    if (!/^(?=.{1,253}$)[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(domain)) throw new Error('Invalid domain');
    const headers = [
        `add_header Strict-Transport-Security "${hstsHeader(env)}" always;`,
        `add_header Content-Security-Policy "${staticCSP(path.join(__dirname, '../../frontend'))}" always;`,
        'add_header X-Content-Type-Options "nosniff" always;',
        'add_header X-Frame-Options "DENY" always;',
        'add_header Referrer-Policy "strict-origin-when-cross-origin" always;',
        'add_header Permissions-Policy "geolocation=(), microphone=(), camera=()" always;',
    ].join('\n    ');
    return fs.readFileSync(path.join(__dirname, 'nginx-song-nexus.conf.template'), 'utf8')
        .replaceAll('DEINE_DOMAIN', domain).replaceAll('SECURITY_HEADERS', headers);
}
if (require.main === module) {
    const env = require('../../backend/node_modules/dotenv').parse(fs.readFileSync(process.argv[3]));
    process.stdout.write(render(process.argv[2], env));
}
module.exports = { render };
