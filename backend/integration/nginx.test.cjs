const {test,before,after}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');const os=require('node:os');const path=require('node:path');
const https=require('node:https');const net=require('node:net');const {spawn,spawnSync}=require('node:child_process');
let directory,server,app,nginx,cert,port,token;
process.env.NODE_ENV='test';process.env.JWT_SECRET='synthetic-nginx-jwt-secret-at-least-32-characters';
process.env.SESSION_SECRET='synthetic-nginx-session-secret-at-least-32-characters';process.env.PAYMENTS_ENABLED='false';
const files=[];
async function freePort(){const s=net.createServer();await new Promise(r=>s.listen(0,'127.0.0.1',r));const p=s.address().port;await new Promise(r=>s.close(r));return p;}
function call(route,headers={},method='GET') {return new Promise((resolve,reject)=>{
    const r=https.request({host:'127.0.0.1',port,path:route,method,headers,ca:cert},res=>{
        const chunks=[];res.on('data',b=>chunks.push(b));res.on('end',()=>resolve({status:res.statusCode,headers:res.headers,body:Buffer.concat(chunks)}));
    });r.on('error',reject);r.end();
});}
before(async()=>{
    directory=fs.mkdtempSync(path.join(os.tmpdir(),'song-nginx-'));
    const pair=await require('../utils/development-certificate').developmentCertificate();cert=pair.cert;
    fs.writeFileSync(path.join(directory,'page.html'), '<h1>synthetic</h1>');
    fs.writeFileSync(path.join(directory,'style.css'), 'body{color:black}');
    fs.writeFileSync(path.join(directory,'cert.pem'),cert);fs.writeFileSync(path.join(directory,'key.pem'),pair.key,{mode:0o600});
    const db={query:async(sql,args)=>{
        if(/JOIN auth_sessions/.test(sql))return{rows:[{id:1,token_version:1,is_active:true,role:'user'}]};
        if(/FROM purchases/.test(sql))return{rows:[{id:1}]};
        if(/FROM tracks/.test(sql))return{rows:[{id:1,is_free:false,duration_seconds:100,free_preview_duration:1}]};
        return {rows:[],rowCount:0};
    },on(){},end(){}};
    require.cache[require.resolve('../db')]={id:require.resolve('../db'),filename:require.resolve('../db'),loaded:true,exports:{pool:db}};
    app=require('../app').createApp({consoleLogging:false});
    app.get('/api/cache-control-fixture',(req,res)=>res.set('Cache-Control','public, max-age=60').json({synthetic:true}));
    server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));
    token=require('../utils/auth-session').generateJWT({id:1,token_version:1},'11111111-1111-4111-8111-111111111111');
    for(const ext of ['mp3','ogg','m4a','opus']){
        const file=path.join(__dirname,'../public/audio/nginx-fixture.'+ext);files.push(file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,Buffer.alloc(1000000,0x6b));
    }
    port=await freePort();const httpPort=await freePort();
    let site=require('../../scripts/deploy/render-nginx.cjs').render('localhost',{});
    site=site.replace(/listen 80;/,'listen 127.0.0.1:'+httpPort+';').replace(/listen \[::\]:80;/,'')
        .replace(/listen 443 ssl http2;/,'listen 127.0.0.1:'+port+' ssl;').replace(/listen \[::\]:443 ssl http2;/,'')
        .replaceAll('http://127.0.0.1:3000','http://127.0.0.1:'+server.address().port)
        .replace(/ssl_certificate\s+[^;]+;/,'ssl_certificate '+directory+'/cert.pem;')
        .replace(/ssl_certificate_key\s+[^;]+;/,'ssl_certificate_key '+directory+'/key.pem;')
        .replace(/include\s+\/etc\/letsencrypt[^;]+;/,'').replace(/ssl_dhparam\s+[^;]+;/,'')
        .replaceAll('/var/www/song-nexus/frontend',directory).replaceAll('/var/www/html',directory);
    // Deliberately turn on a shared proxy cache to test the future-CDN failure mode.
    // Routing, authentication, range handling and response headers stay production code.
    site=site.replaceAll('proxy_http_version 1.1;',`proxy_http_version 1.1;
        proxy_cache media; proxy_cache_key "$request_uri|$http_range";
        proxy_cache_valid 200 206 1m; add_header X-Proxy-Cache $upstream_cache_status always;`)
        .replace('proxy_buffering    off;','proxy_buffering on;');
    const conf=`pid ${directory}/nginx.pid; error_log ${directory}/error.log; events {} http {
        access_log off; client_body_temp_path ${directory}/body; proxy_temp_path ${directory}/proxy;
        proxy_cache_path ${directory}/cache keys_zone=media:1m;
        ${site} }`;
    fs.writeFileSync(path.join(directory,'nginx.conf'),conf);
    const binary=process.env.NGINX_BINARY||'nginx';
    const syntax=spawnSync(binary,['-t','-p',directory,'-c',path.join(directory,'nginx.conf')],{encoding:'utf8'});
    assert.equal(syntax.status,0,syntax.stderr||String(syntax.error));
    nginx=spawn(binary,['-p',directory,'-c',path.join(directory,'nginx.conf'),'-g','daemon off; master_process off;'],{stdio:'ignore'});
    let ready=false;
    for(let i=0;i<100;i++) {try{await call('/missing');ready=true;break;}catch{await new Promise(r=>setTimeout(r,25));}}
    assert.ok(ready,'nginx must start');
});
after(async()=>{
    if(nginx){nginx.kill('SIGTERM');await new Promise(r=>nginx.once('exit',r));}
    if(server)await new Promise(r=>server.close(r));app?.locals.dispose();
    for(const file of files)fs.rmSync(file,{force:true});if(directory)fs.rmSync(directory,{recursive:true,force:true});
});
test('the shared test proxy cache really stores public responses',async()=>{
    const a=await call('/api/cache-control-fixture');assert.equal(a.status,200);
    const b=await call('/api/cache-control-fixture');assert.equal(b.headers['x-proxy-cache'],'HIT');
});
for(const ext of ['mp3','ogg','m4a','opus'])test(`${ext} reaches backend for GET and HEAD; buyer bytes never leak to guest cache`,async()=>{
    const route='/api/tracks/audio/nginx-fixture.'+ext,headers={Cookie:'auth_token='+token,Range:'bytes=900000-900031'};
    const buyer=await call(route,headers);assert.equal(buyer.status,206);assert.equal(buyer.body.length,32);
    assert.equal(buyer.headers['cache-control'],'private, no-store');
    const head=await call(route,headers,'HEAD');assert.equal(head.status,206);assert.equal(head.body.length,0);
    const guest=await call(route,{Range:headers.Range});assert.equal(guest.status,416);assert.notEqual(guest.headers['x-proxy-cache'],'HIT');
    assert.notDeepEqual(guest.body,buyer.body);
    const repeated=await call(route,headers);assert.notEqual(repeated.headers['x-proxy-cache'],'HIT');
});


test('nginx serves security headers on static HTML, assets and errors',async()=>{
    for(const route of ['/page.html','/style.css','/missing']){
        const reply=await call(route);
        assert.equal(reply.headers['strict-transport-security'],'max-age=300');
        assert.match(reply.headers['content-security-policy'],/script-src 'self' 'sha256-/);
        assert.match(reply.headers['content-security-policy'],/script-src-attr 'none'/);
        assert.equal(reply.headers['x-content-type-options'],'nosniff');
    }
});
