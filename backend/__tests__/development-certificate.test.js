const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');
const { X509Certificate } = require('node:crypto');
const tls = require('node:tls');
const { generateCertificate } = require('../generate-cert');
let directory;
beforeEach(async()=>{ directory=await fs.mkdtemp(path.join(os.tmpdir(),'song-cert-review-')); });
afterEach(async()=>{ jest.restoreAllMocks(); await fs.rm(directory,{recursive:true,force:true}); });
async function readPair() {
    return { key: await fs.readFile(path.join(directory,'localhost-key.pem'),'utf8'),
        cert: await fs.readFile(path.join(directory,'localhost.pem'),'utf8') };
}
test('explicit renewal replaces a matching pair and keeps the private key restricted',async()=>{
    await generateCertificate(directory); const old=await readPair();
    await generateCertificate(directory,{renew:true}); const current=await readPair();
    expect(new X509Certificate(current.cert).fingerprint256).not.toBe(new X509Certificate(old.cert).fingerprint256);
    expect(current.key).not.toBe(old.key);
    expect(()=>tls.createSecureContext(current)).not.toThrow();
    if(process.platform!=='win32')expect((await fs.stat(path.join(directory,'localhost-key.pem'))).mode&0o777).toBe(0o600);
});
test('existing pair is preserved when renewal was not requested',async()=>{
    await generateCertificate(directory); const old=await readPair();
    await expect(generateCertificate(directory)).rejects.toThrow('--renew');
    expect(await readPair()).toEqual(old);
});
test('failed second replacement restores the old matching pair',async()=>{
    await generateCertificate(directory); const old=await readPair(); const rename=fs.rename;
    jest.spyOn(fs,'rename').mockImplementation(async(from,to)=>{
        if(to===path.join(directory,'localhost.pem'))throw new Error('synthetic certificate rename failure');
        return rename(from,to);
    });
    await expect(generateCertificate(directory,{renew:true})).rejects.toThrow('synthetic certificate rename failure');
    expect(await readPair()).toEqual(old);
    expect((await fs.readdir(directory)).sort()).toEqual(['localhost-key.pem','localhost.pem']);
});
test('a concurrent generator cannot replace a pair while its lock is held',async()=>{
    await fs.writeFile(path.join(directory,'.generate.lock'),'');
    await expect(generateCertificate(directory,{renew:true})).rejects.toMatchObject({code:'EEXIST'});
    expect(await fs.readdir(directory)).toEqual(['.generate.lock']);
});
