const fs = require('node:fs');
const path = require('node:path');
const { createHash } = require('node:crypto');
function staticScriptHashes(root) {
    const hashes = new Set();
    function visit(dir) {
        if (!fs.existsSync(dir)) return;
        for (const item of fs.readdirSync(dir, { withFileTypes: true })) {
            const file = path.join(dir, item.name);
            if (item.isDirectory() && !['node_modules','dist','certs','config','tests'].includes(item.name)) visit(file);
            if (!item.isFile() || !item.name.endsWith('.html')) continue;
            const html = fs.readFileSync(file, 'utf8');
            for (const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)) {
                if (/\bsrc\s*=|type=["']application\//i.test(match[1]) || !match[2].trim()) continue;
                // HTML normalizes CRLF/CR to LF before CSP hashing.
                hashes.add("'sha256-" + createHash('sha256').update(match[2].replace(/\r\n?/g, '\n')).digest('base64') + "'");
            }
        }
    }
    visit(root);
    return [...hashes].sort();
}
function staticCSP(root) {
    return ["default-src 'self'", `script-src 'self' ${staticScriptHashes(root).join(' ')}`.trim(),
        "script-src-attr 'none'", "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
        "font-src 'self' https://fonts.gstatic.com data:", "img-src 'self' data: https:",
        "media-src 'self' blob:", "connect-src 'self' https://api.paypal.com https://api.sandbox.paypal.com https://www.paypal.com https://www.sandbox.paypal.com",
        "object-src 'none'", "frame-src 'none'", "frame-ancestors 'none'", "base-uri 'self'", "form-action 'self'", "upgrade-insecure-requests"].join('; ');
}
module.exports = { staticScriptHashes, staticCSP };
