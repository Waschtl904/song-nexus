const {test}=require('node:test');const assert=require('node:assert/strict');const vm=require('node:vm');const fs=require('node:fs');const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../js/cookie-session.js'),'utf8');
function setup(responses){
    const removed=[],calls=[];const context={Response,URL,location:{href:'https://music.example/',origin:'https://music.example'},
        localStorage:{removeItem:k=>removed.push(k)},sessionStorage:{removeItem:k=>removed.push(k)},
        fetch:async(url,options)=>{calls.push({url,options});const response=responses.shift();assert.ok(response,'unexpected network request');return response;}};
    vm.runInNewContext(source,context);return {api:context.CookieSession,removed,calls};
}
const response=(status,data)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json'}});
test('legacy credential copies are removed from both browser stores',()=>{
    const {removed}=setup([]);for(const key of ['auth_token','token','auth_token_expiry','songNexusAdminToken'])assert.equal(removed.filter(k=>k===key).length,2);
});
test('server profile determines identity and parallel renewal coalesces',async()=>{
    const {api,calls}=setup([response(401,{}),response(200,{user:{id:7}})]);
    assert.deepEqual(await Promise.all([api.renew(),api.renew()]),[true,true]);assert.equal(calls.length,2);assert.equal(api.user.id,7);
});
test('expired access renews and retries protected request once with cookies',async()=>{
    const {api,calls}=setup([response(403,{code:'SESSION_INVALID'}),response(401,{}),response(200,{user:{id:7}}),response(200,{owned:true})]);
    const result=await api.request('/api/payments/user-purchases');assert.equal(result.status,200);
    assert.ok(calls.every(c=>c.options.credentials==='same-origin'));assert.equal(calls.length,4);
});
test('authorization refusal is not retried as a login; foreign API is rejected',async()=>{
    const {api,calls}=setup([response(403,{code:'ADMIN_REQUIRED'})]);
    assert.equal((await api.request('/api/admin/private')).status,403);assert.equal(calls.length,1);
    await assert.rejects(api.request('https://elsewhere.example/api'),/same-origin/);
});
test('forced background renewal refreshes even while the access cookie still works',async()=>{
    const {api,calls}=setup([response(200,{user:{id:7}}),response(200,{user:{id:7}})]);
    assert.equal(await api.renew(true),true);assert.equal(calls[1].url,'/api/auth/refresh-token');
});
test('all classic inline page scripts remain syntactically valid',()=>{
    const walk=dir=>fs.readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?(['node_modules','dist','assets'].includes(e.name)?[]:walk(path.join(dir,e.name))):e.name.endsWith('.html')?[path.join(dir,e.name)]:[]);
    for(const file of walk(path.join(__dirname,'..'))){
        const html=fs.readFileSync(file,'utf8');for(const match of html.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)){
            if(/src=|type=["'](?:module|application\/)/i.test(match[1])||!match[2].trim())continue;
            new vm.Script(match[2],{filename:file});
        }
    }
});
