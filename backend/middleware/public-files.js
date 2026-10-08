// Shared guard for both Express static servers. Local credentials stay outside
// the frontend root as well; this also rejects accidentally copied private files.
function publicFilesOnly(req, res, next) {
    let pathname;
    try { pathname = decodeURIComponent(req.path).replaceAll('\\', '/'); }
    catch { return res.sendStatus(404); }
    const segments = pathname.split('/');
    if (segments.some(p => p.startsWith('.') || /^(certs|node_modules|webpack)$/i.test(p))
        || /\.(pem|key|p12|pfx)(?:\/|$)/i.test(pathname)
        || /^\/(server\.js|webpack\.config\.js|package(-lock)?\.json)$/i.test(pathname))
        return res.sendStatus(404);
    next();
}
module.exports = { publicFilesOnly };
