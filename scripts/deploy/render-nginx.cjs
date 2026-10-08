const fs = require('node:fs');
const path = require('node:path');
const { hstsHeader } = require('../../backend/utils/hsts');
function render(domain, env) {
    if (!/^(?=.{1,253}$)[a-z0-9]+(?:[a-z0-9.-]*[a-z0-9])?$/.test(domain)) throw new Error('Invalid domain');
    return fs.readFileSync(path.join(__dirname, 'nginx-song-nexus.conf.template'), 'utf8')
        .replaceAll('DEINE_DOMAIN', domain).replaceAll('HSTS_VALUE', hstsHeader(env));
}
if (require.main === module) {
    const env = require('../../backend/node_modules/dotenv').parse(fs.readFileSync(process.argv[3]));
    process.stdout.write(render(process.argv[2], env));
}
module.exports = { render };
