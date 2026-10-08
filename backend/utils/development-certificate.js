// Development/tests only. Never installs a CA or disables certificate validation.
const { webcrypto, KeyObject, randomBytes } = require('node:crypto');
async function developmentCertificate() {
    require('reflect-metadata');
    const x509 = require('@peculiar/x509');
    const algorithm = { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256',
        publicExponent: new Uint8Array([1, 0, 1]), modulusLength: 2048 };
    const keys = await webcrypto.subtle.generateKey(algorithm, true, ['sign', 'verify']);
    const certificate = await x509.X509CertificateGenerator.createSelfSigned({
        serialNumber: '01' + randomBytes(19).toString('hex'), name: 'CN=localhost', keys,
        signingAlgorithm: algorithm, notBefore: new Date(Date.now() - 60000),
        notAfter: new Date(Date.now() + 7 * 86400000),
        extensions: [new x509.SubjectAlternativeNameExtension([
            { type: 'dns', value: 'localhost' }, { type: 'ip', value: '127.0.0.1' },
            { type: 'ip', value: '::1' },
        ])],
    }, webcrypto);
    return { cert: certificate.toString('pem'),
        key: KeyObject.from(keys.privateKey).export({ type: 'pkcs8', format: 'pem' }) };
}
module.exports = { developmentCertificate };
