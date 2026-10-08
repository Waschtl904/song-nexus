const net=require('node:net');const tls=require('node:tls');const {Client}=require('pg');
const {databaseOptions}=require('../utils/db-options');
const {hstsOptions,hstsHeader}=require('../utils/hsts');
const {developmentCertificate}=require('../utils/development-certificate');
test('remote database always verifies certificates',()=>{
    expect(databaseOptions({DB_HOST:'db.example'}).ssl.rejectUnauthorized).toBe(true);
    expect(()=>databaseOptions({DB_HOST:'db.example',DB_SSL:'off'})).toThrow();
    expect(()=>databaseOptions({DB_SSL:'require'})).toThrow();
    expect(databaseOptions({DB_HOST:'/var/run/postgresql'}).ssl).toBe(false);
});
test('HSTS starts cautiously; preload requires an explicit consistent configuration',()=>{
    expect(hstsHeader({})).toBe('max-age=300');
    expect(hstsOptions({}).preload).toBe(false);
    expect(()=>hstsOptions({HSTS_PRELOAD:'true'})).toThrow();
    expect(()=>hstsOptions({HSTS_MAX_AGE:'bad'})).toThrow();
});
test('real node-postgres TLS handshake accepts trusted CA and rejects wrong CA/hostname',async()=>{
    const good=await developmentCertificate(),wrong=await developmentCertificate();
    const context=tls.createSecureContext(good);const sockets=new Set();
    const server=net.createServer(socket=>{
        sockets.add(socket);socket.on('close',()=>sockets.delete(socket));socket.on('error',()=>{});
        socket.once('data',data=>{
            expect(data.readInt32BE(4)).toBe(80877103);socket.write('S');
            const secure=new tls.TLSSocket(socket,{isServer:true,secureContext:context});
            secure.on('error',()=>{});
            secure.once('data',()=>secure.write(Buffer.from([82,0,0,0,8,0,0,0,0,90,0,0,0,5,73])));
        });
    });
    await new Promise(r=>server.listen(0,'127.0.0.1',r));
    async function connect(ca,servername) {
        const options=databaseOptions({DB_HOST:'127.0.0.1',DB_SSL:'verify-full',DB_SSL_CA:ca});
        const client=new Client({...options,port:server.address().port,user:'synthetic',database:'synthetic',
            ssl:{...options.ssl,...(servername?{servername}:{})},connectionTimeoutMillis:2000});
        try {await client.connect();} finally {await client.end();}
    }
    try {
        await expect(connect(good.cert)).resolves.toBeUndefined();
        await expect(connect(wrong.cert)).rejects.toThrow();
        await expect(connect(good.cert,'wrong.example')).rejects.toThrow(/Hostname|IP|altnames/i);
    } finally {for(const socket of sockets)socket.destroy();await new Promise(r=>server.close(r));}
},10000);

test('static page CSP hashes exact script contents without permitting arbitrary inline code',()=>{
    const fs=require('fs'),os=require('os'),path=require('path'),crypto=require('crypto');
    const dir=fs.mkdtempSync(path.join(os.tmpdir(),'csp-fixture-'));
    try {
        fs.writeFileSync(path.join(dir,'page.html'),'<script>window.fixture = 1;\r\n</script>');
        const policy=require('../utils/static-csp').staticCSP(dir);
        const hash=crypto.createHash('sha256').update('window.fixture = 1;\n').digest('base64');
        expect(policy).toContain(`script-src 'self' 'sha256-${hash}'`);
        expect(policy.split('; ').find(s=>s.startsWith('script-src '))).not.toContain('unsafe-inline');
    } finally {fs.rmSync(dir,{recursive:true,force:true});}
});
