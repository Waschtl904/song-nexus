// Shared by classic pages and the module bundle. No credential is exposed to JS.
(function (root) {
    if (root.CookieSession) return;
    for (const storageName of ['localStorage', 'sessionStorage']) {
        try { for (const key of ['auth_token', 'auth_token_expiry', 'token', 'songNexusAdminToken']) root[storageName].removeItem(key); }
        catch { /* Storage may be disabled; cookies remain the only credential. */ }
    }
    let renewing;
    const api = {
        user: null,
        async renew(force = false) {
            if (!renewing) {
                const run = async () => {
                    // Another tab may already have renewed while this tab waited.
                    let response = await fetch('/api/auth/me', { credentials: 'same-origin' });
                    if (force || response.status === 401 || response.status === 403)
                        response = await fetch('/api/auth/refresh-token', { method: 'POST', credentials: 'same-origin' });
                    if (!response.ok) { api.user = null; return false; }
                    api.user = (await response.json()).user;
                    return true;
                };
                renewing = (root.navigator?.locks ? root.navigator.locks.request('song-nexus-session', run) : run())
                    .finally(() => { renewing = null; });
            }
            return renewing;
        },
        async request(url, options = {}) {
            const target = new URL(url, root.location.href);
            if (target.origin !== root.location.origin) throw new Error('Only same-origin API requests allowed');
            const opts = { ...options, credentials: 'same-origin' };
            let response = await fetch(url, opts);
            const error = [401, 403].includes(response.status) ? await response.clone().json().catch(() => ({})) : {};
            if ((error.code === 'SESSION_INVALID' || error.code === 'AUTH_REQUIRED') && await api.renew())
                response = await fetch(url, opts);
            return response;
        },
    };
    root.CookieSession = api;
    if (root.document) {
        // Renew before native <audio> makes its next range request.
        let timer;
        const arm = () => { clearInterval(timer); timer = setInterval(() => {
            if (api.user) api.renew(true).catch(() => {});
        }, 600000); };
        arm();
        root.addEventListener('pagehide', () => clearInterval(timer));
        root.addEventListener('pageshow', () => { arm(); api.renew().catch(() => {}); });
        document.addEventListener('visibilitychange', () => {
            if (!document.hidden && api.user) api.renew(true).catch(() => {});
        });
    }
})(globalThis);
