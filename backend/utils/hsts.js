function hstsOptions(env = process.env) {
    const maxAge = Number(env.HSTS_MAX_AGE ?? 300);
    if (!Number.isSafeInteger(maxAge) || maxAge < 0 || maxAge > 63072000)
        throw new Error('HSTS_MAX_AGE must be an integer between 0 and 63072000');
    for (const key of ['HSTS_INCLUDE_SUBDOMAINS', 'HSTS_PRELOAD'])
        if (env[key] && !['true', 'false'].includes(env[key])) throw new Error(`${key} must be true or false`);
    const includeSubDomains = env.HSTS_INCLUDE_SUBDOMAINS === 'true';
    const preload = env.HSTS_PRELOAD === 'true';
    if (preload && (!includeSubDomains || maxAge < 31536000)) throw new Error('HSTS preload requires subdomain coverage and at least one year');
    return { maxAge, includeSubDomains, preload };
}
function hstsHeader(env) {
    const value = hstsOptions(env);
    return `max-age=${value.maxAge}` + (value.includeSubDomains ? '; includeSubDomains' : '') + (value.preload ? '; preload' : '');
}
module.exports = { hstsOptions, hstsHeader };
