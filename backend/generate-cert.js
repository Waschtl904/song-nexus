const forge = require('node-forge');
const fs = require('fs');
const path = require('path');

const certDir = path.join(__dirname, 'certs');

// Create certs directory
if (!fs.existsSync(certDir)) {
    fs.mkdirSync(certDir, { recursive: true });
}

console.log('🔐 Generating self-signed certificate...');

// Generate RSA key pair
const keys = forge.pki.rsa.generateKeyPair(2048);

// Create certificate
const cert = forge.pki.createCertificate();
cert.publicKey = keys.publicKey;
cert.serialNumber = '01';
cert.validity.notBefore = new Date();
cert.validity.notAfter = new Date();
cert.validity.notAfter.setFullYear(cert.validity.notBefore.getFullYear() + 1);

const attrs = [
    { name: 'commonName', value: 'localhost' },
    { name: 'organizationName', value: 'Song-Nexus' },
    { name: 'countryName', value: 'AT' }
];

cert.setSubject(attrs);
cert.setIssuer(attrs);

// Self-sign
cert.sign(keys.privateKey, forge.md.sha256.create());

// Convert to PEM
const keyPEM = forge.pki.privateKeyToPem(keys.privateKey);
const certPEM = forge.pki.certificateToPem(cert);

// Write files
fs.writeFileSync(path.join(certDir, 'key.pem'), keyPEM);
fs.writeFileSync(path.join(certDir, 'cert.pem'), certPEM);

console.log('✅ Certificate generated successfully!');
console.log(`📁 Location: ${certDir}`);
console.log('');
console.log('Key files:');
console.log(`  - ${path.join(certDir, 'key.pem')}`);
console.log(`  - ${path.join(certDir, 'cert.pem')}`);
