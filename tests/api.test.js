import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { request } from 'node:http';
import { createApp } from '../src/server.js';

test('fluxo completo: contas, checkout seguro, isolamento, administração e persistência', async () => {
  const dir = await mkdtemp(join(tmpdir(), 'zfood-'));
  let app;
  try {
    app = await createApp({ dbPath: join(dir, 'test.sqlite'), adminEmail: 'admin@example.com', adminPassword: 'TesteAdmin123!' });
    await new Promise(r => app.server.listen(0, '127.0.0.1', r));
    let base = `http://127.0.0.1:${app.server.address().port}`;
    async function call(path, { method = 'GET', body, cookie, origin, key } = {}) {
      const res = await fetch(base + path, { method, headers: { ...(body && {'Content-Type': 'application/json'}), ...(cookie && {cookie}), ...(origin && {origin}), ...(key && {'Idempotency-Key': key}) }, body: body && JSON.stringify(body) });
      return { status: res.status, data: await res.json(), cookie: res.headers.get('set-cookie')?.split(';')[0] };
    }
    const menu = await call('/api/catalog');
    assert.equal(menu.status, 200);
    assert.ok(menu.data.products.length >= 8);
    const signup = await call('/api/register', { method: 'POST', body: {name:'Bryan', email:'b@example.com', password:'SenhaTeste123!'} });
    assert.equal(signup.status, 201);
    const cookie = signup.cookie;
    assert.equal(signup.data.user.role, 'customer');
    assert.equal((await call('/api/register', {method:'POST', body:{name:'Teste', email:'b@example.com', password:'SenhaTeste123!'}})).status, 409);
    assert.equal((await call('/api/login', {method:'POST', body:{email:'b@example.com',password:'errada'}})).status,401);
    assert.equal((await call('/api/orders')).status, 401);
    const product = menu.data.products[0];
    const restaurant = menu.data.restaurants.find(r=>r.id === product.restaurantId);
    const body = { items:[{id:product.id, quantity:2, price:1}], coupon:'HALLOWEEN10', address:'Rua das Flores, 123, Centro', phone:'11999998888', payment:'cash', notes:'Sem cebola' };
    assert.equal((await call('/api/orders',{method:'POST',cookie,body,origin:'https://evil.example'})).status,403);
    assert.equal((await call('/api/orders',{method:'POST',cookie,body:{...body,items:[{id:product.id,quantity:-1}]}})).status,400);
    assert.equal((await call('/api/orders',{method:'POST',cookie,body:{...body,coupon:'INVALIDO'}})).status,400);
    const otherProduct = menu.data.products.find(p=>p.restaurantId !== product.restaurantId);
    assert.equal((await call('/api/orders',{method:'POST',cookie,body:{...body,items:[{id:product.id,quantity:1},{id:otherProduct.id,quantity:1}]}})).status,400);
    const placed = await call('/api/orders',{method:'POST',cookie,body,key:'checkout-123'});
    assert.equal(placed.status,201);
    assert.equal(placed.data.order.total,product.price*2-Math.round(product.price*2*.1)+restaurant.fee);
    const again = await call('/api/orders',{method:'POST',cookie,body,key:'checkout-123'});
    assert.equal(again.data.order.id,placed.data.order.id);
    assert.equal((await call('/api/orders',{cookie})).data.orders.length,1);
    const other = await call('/api/register',{method:'POST',body:{name:'Outro',email:'outro@example.com',password:'OutraSenha123!'}});
    assert.equal((await call('/api/orders',{cookie:other.cookie})).data.orders.length,0);
    assert.equal((await call('/api/admin/orders',{cookie})).status,403);
    assert.equal((await call(`/api/admin/orders/${placed.data.order.id}`,{method:'PATCH',cookie,body:{status:'preparing'}})).status,403);
    const admin = await call('/api/login',{method:'POST',body:{email:'admin@example.com',password:'TesteAdmin123!'}});
    assert.equal(admin.data.user.role,'admin');
    assert.equal((await call('/api/admin/orders',{cookie:admin.cookie})).data.orders.length,1);
    assert.equal((await call(`/api/admin/orders/${placed.data.order.id}`,{method:'PATCH',cookie:admin.cookie,body:{status:'delivered'}})).status,400);
    for (const status of ['preparing','delivering','delivered']) {
      assert.equal((await call(`/api/admin/orders/${placed.data.order.id}`,{method:'PATCH',cookie:admin.cookie,body:{status}})).status,200);
    }
    assert.equal((await call('/api/orders',{cookie})).data.orders[0].status,'delivered');
    const raceOrder=await call('/api/orders',{method:'POST',cookie,body,key:'race-checkout'});
    const received=new Promise(resolve=>app.server.once('request',resolve));
    let slow;
    const slowResult=new Promise((resolve,reject)=>{
      slow=request(base+`/api/admin/orders/${raceOrder.data.order.id}`,{method:'PATCH',headers:{cookie:admin.cookie,'Content-Type':'application/json','Transfer-Encoding':'chunked'}},res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
      slow.on('error',reject);slow.flushHeaders();
    });
    await received;
    assert.equal((await call(`/api/admin/orders/${raceOrder.data.order.id}`,{method:'PATCH',cookie:admin.cookie,body:{status:'canceled'}})).status,200);
    slow.end(JSON.stringify({status:'preparing'}));
    assert.equal(await slowResult,400,'pedido cancelado não pode ser reaberto por request concorrente');
    await call('/api/logout',{method:'POST',cookie,body:{}});
    assert.equal((await call('/api/me',{cookie})).status,401);
    await app.close();
    app = await createApp({dbPath:join(dir,'test.sqlite')});
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
    base = `http://127.0.0.1:${app.server.address().port}`;
    const login = await call('/api/login',{method:'POST',body:{email:'b@example.com',password:'SenhaTeste123!'}});
    assert.equal(login.status,200);
    assert.equal((await call('/api/orders',{cookie:login.cookie})).data.orders.find(o=>o.id===placed.data.order.id).status,'delivered');
  } finally {
    if (app) await app.close();
    await rm(dir,{recursive:true,force:true});
  }
});
