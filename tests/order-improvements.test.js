import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/server.js';

test('cliente cancela apenas pedido próprio recebido e histórico registra mudanças',async()=>{
  const app=await createApp({dbPath:':memory:',adminEmail:'admin@example.com',adminPassword:'AdminTeste2026!'});
  try{
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
    const base=`http://127.0.0.1:${app.server.address().port}`;
    async function call(path,method='GET',body,cookie,origin){
      const res=await fetch(base+path,{method,headers:{...(body&&{'Content-Type':'application/json'}),...(cookie&&{cookie}),...(origin&&{origin})},body:body&&JSON.stringify(body)});
      return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
    }
    const first=await call('/api/register','POST',{name:'Cliente um',email:'um@example.com',password:'SenhaTeste2026!'});
    const second=await call('/api/register','POST',{name:'Cliente dois',email:'dois@example.com',password:'SenhaTeste2026!'});
    const admin=await call('/api/login','POST',{email:'admin@example.com',password:'AdminTeste2026!'});
    const input={items:[{id:'b1',quantity:1}],address:'Rua de Teste, 100, Cidade',phone:'11999990000',payment:'cash'};
    const placed=await call('/api/orders','POST',input,first.cookie);
    const path=`/api/orders/${placed.data.order.id}/cancel`;
    assert.equal((await call(path,'POST',{})).status,401);
    assert.equal((await call(path,'POST',{},second.cookie)).status,404);
    assert.equal((await call(path,'POST',{},first.cookie,'https://externo.example')).status,403);
    const canceled=await call(path,'POST',{},first.cookie);
    assert.equal(canceled.status,200);
    assert.equal(canceled.data.order.status,'canceled');
    assert.deepEqual(canceled.data.order.history.map(h=>[h.status,h.actor]),[['placed','customer'],['canceled','customer']]);
    assert.ok(canceled.data.order.history.every(h=>Number.isFinite(Date.parse(h.at))));
    assert.equal((await call(path,'POST',{},first.cookie)).status,409);
    const next=await call('/api/orders','POST',input,first.cookie);
    const adminPath=`/api/admin/orders/${next.data.order.id}`;
    const preparing=await call(adminPath,'PATCH',{status:'preparing'},admin.cookie);
    assert.deepEqual(preparing.data.order.history.map(h=>[h.status,h.actor]),[['placed','customer'],['preparing','admin']]);
    assert.equal((await call(`/api/orders/${next.data.order.id}/cancel`,'POST',{},first.cookie)).status,409);
    const list=await call('/api/orders','GET',undefined,first.cookie);
    assert.equal(list.data.orders.find(o=>o.id===placed.data.order.id).history.length,2);
    assert.equal(list.data.orders.find(o=>o.id===next.data.order.id).status,'preparing');
  }finally{await app.close();}
});
