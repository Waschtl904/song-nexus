const express=require('express');
const request=require('supertest');
const {cache,cacheMiddleware}=require('../middleware/cache-middleware');
afterAll(()=>cache.close());
beforeEach(()=>cache.flushAll());
function app(status=200, headers={}) {
    const app=express(); let calls=0;
    app.get('/list',cacheMiddleware(30),(req,res)=>{ calls++; res.set(headers).status(status).json({call:calls,credential:!!(req.headers.cookie||req.headers.authorization)}); });
    return app;
}
test.each([400,401,403,404,429,500,503])('status %s is never cached or converted to 200',async status=>{
    const server=app(status); const first=await request(server).get('/list');const second=await request(server).get('/list');
    expect(first.status).toBe(status);expect(second.status).toBe(status);expect(second.body.call).toBe(2);
    expect(second.headers['cache-control']).toBe('private, no-store');
});
test('successful cache hit preserves non-default status',async()=>{
    const server=app(202);await request(server).get('/list');const hit=await request(server).get('/list');
    expect(hit.status).toBe(202);expect(hit.body.call).toBe(1);expect(hit.headers['x-cache']).toBe('HIT');
});
test.each(['Cookie','Authorization'])('%s bypasses reads and writes; guest never receives private data',async header=>{
    const server=app();await request(server).get('/list');
    const privateResponse=await request(server).get('/list').set(header,'synthetic');
    expect(privateResponse.body.credential).toBe(true);expect(privateResponse.body.call).toBe(2);
    expect(privateResponse.headers['cache-control']).toBe('private, no-store');
    const guest=await request(server).get('/list');expect(guest.body.credential).toBe(false);expect(guest.body.call).toBe(1);
});
test.each([{'Set-Cookie':'synthetic=1'},{'Cache-Control':'private'},{'Cache-Control':'no-store'}])('response privacy prevents storage: %j',async headers=>{
    const server=app(200,headers);await request(server).get('/list');expect((await request(server).get('/list')).body.call).toBe(2);
});
