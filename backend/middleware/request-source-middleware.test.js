'use strict';

const { requireTrustedSource } = require('./request-source-middleware');

const ERLAUBT = ['https://localhost:5500'];

function mockRes() {
    const res = {};
    res.statusCode = null;
    res.body = null;
    res.status = (code) => { res.statusCode = code; return res; };
    res.json = (body) => { res.body = body; return res; };
    return res;
}

describe('requireTrustedSource', () => {
    const mw = requireTrustedSource(ERLAUBT);

    test('erlaubter Origin + POST wird durchgelassen', (done) => {
        const req = { method: 'POST', originalUrl: '/api/auth/login', headers: { origin: 'https://localhost:5500' } };
        mw(req, mockRes(), () => done());
    });

    test('Sec-Fetch-Site: cross-site + POST -> 403', () => {
        const req = { method: 'POST', originalUrl: '/api/payments/create-order', headers: { 'sec-fetch-site': 'cross-site' } };
        const res = mockRes();
        mw(req, res, () => { throw new Error('next() haette nicht aufgerufen werden duerfen'); });
        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('CSRF_CROSS_SITE');
    });

    test('unbekannter Origin + POST -> 403', () => {
        const req = { method: 'POST', originalUrl: '/api/admin/tracks/upload', headers: { origin: 'https://boese-seite.example' } };
        const res = mockRes();
        mw(req, res, () => { throw new Error('next() haette nicht aufgerufen werden duerfen'); });
        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('CSRF_BAD_ORIGIN');
    });

    test('erlaubter Origin bei Login erreicht die eigentliche Route', (done) => {
        const req = { method: 'POST', originalUrl: '/api/auth/login', headers: { origin: 'https://localhost:5500' } };
        mw(req, mockRes(), () => done());
    });

    test('GET wird von der Middleware nicht blockiert', (done) => {
        const req = { method: 'GET', originalUrl: '/api/tracks', headers: {} };
        mw(req, mockRes(), () => done());
    });

    test('fehlende Fetch-Metadata, Origin und Referer -> 403, kein stilles Durchlassen', () => {
        const req = { method: 'DELETE', originalUrl: '/api/admin/tracks/5', headers: {} };
        const res = mockRes();
        mw(req, res, () => { throw new Error('next() haette nicht aufgerufen werden duerfen'); });
        expect(res.statusCode).toBe(403);
        expect(res.body.code).toBe('CSRF_NO_SOURCE');
    });
});
