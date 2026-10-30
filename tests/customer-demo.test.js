import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createApp} from '../src/server.js';
import pg from 'pg';
import {randomUUID} from 'node:crypto';

for(const engine of ['sqlite','postgres'])test(`perfil, endereços privados, promoções e pagamentos demonstrativos (${engine})`,{skip:engine==='postgres'&&!process.env.ZFOOD_TEST_POSTGRES},async()=>{
  let control;const schema='zfood_customer_'+randomUUID().replaceAll('-','');
  if(engine==='postgres'){control=new pg.Client();await control.connect();await control.query(`CREATE SCHEMA "${schema}"`);}
  const app=await createApp({dbPath:':memory:',postgres:control?{options:`-c search_path=${schema}`}:null,adminEmail:'admin@example.com',adminPassword:'AdminTeste2026!'});
  try{
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
    const base=`http://127.0.0.1:${app.server.address().port}`;
    async function call(path,method='GET',body,cookie){
      const r=await fetch(base+path,{method,headers:{...(body&&{'Content-Type':'application/json'}),...(cookie&&{cookie})},body:body&&JSON.stringify(body)});
      return {status:r.status,data:await r.json(),cookie:r.headers.get('set-cookie')?.split(';')[0]};
    }
    const a=await call('/api/register','POST',{name:'Cliente Demo',email:'demo@example.com',password:'SenhaTeste2026!'});
    const b=await call('/api/register','POST',{name:'Outro Cliente',email:'outro@example.com',password:'SenhaTeste2026!'});
    assert.equal((await call('/api/profile')).status,401);
    assert.equal((await call('/api/profile','PATCH',{name:'Cliente Demo',phone:'(11) 9999-9'},a.cookie)).status,400);
    assert.equal((await call('/api/profile','PATCH',{name:'Cliente Atualizado',phone:'11999990000'},a.cookie)).status,200);
    const input={label:'Casa',zip:'01001000',street:'Rua de Teste',number:'123',district:'Centro',city:'Cidade de Teste',state:'SP',complement:'Apto 1',reference:'Portão azul'};
    const address=await call('/api/addresses','POST',input,a.cookie);
    assert.equal(address.status,201);
    const id=address.data.address.id;
    assert.equal((await call('/api/profile','GET',undefined,b.cookie)).data.addresses.length,0);
    assert.equal((await call(`/api/addresses/${id}`,'PATCH',{...input,label:'Trabalho'},b.cookie)).status,404);
    assert.equal((await call(`/api/addresses/${id}`,'DELETE',{},b.cookie)).status,404);
    assert.equal((await call(`/api/addresses/${id}/default`,'POST',{},a.cookie)).status,200);
    const profile=await call('/api/profile','GET',undefined,a.cookie);
    assert.equal(profile.data.user.name,'Cliente Atualizado');assert.equal(profile.data.phone,'11999990000');
    assert.equal(profile.data.defaultAddressId,id);
    assert.equal((await call('/api/addresses','POST',{...input,zip:'123',state:'XX'},a.cookie)).status,400);
    const checkout={items:[{id:'b1',quantity:2}],addressId:id,phone:'11999990000',payment:'pix_demo',coupon:'BOO15'};
    const foreign=await call('/api/orders','POST',checkout,b.cookie);assert.equal(foreign.status,404);
    const order=await call('/api/orders','POST',checkout,a.cookie);
    assert.equal(order.status,201);
    assert.equal(order.data.order.discount,987);
    assert.equal(order.data.order.total,6192);
    assert.equal(order.data.order.paymentStatus,'pending_demo');
    assert.ok(order.data.order.address.includes('Rua de Teste, 123'));
    assert.equal((await call(`/api/orders/${order.data.order.id}/demo-payment`,'POST',{},b.cookie)).status,404);
    const admin=await call('/api/login','POST',{email:'admin@example.com',password:'AdminTeste2026!'});
    assert.equal((await call(`/api/admin/orders/${order.data.order.id}`,'PATCH',{status:'preparing'},admin.cookie)).status,409);
    const paid=await call(`/api/orders/${order.data.order.id}/demo-payment`,'POST',{},a.cookie);
    assert.equal(paid.data.order.paymentStatus,'approved_demo');
    const paidAgain=await call(`/api/orders/${order.data.order.id}/demo-payment`,'POST',{},a.cookie);
    assert.equal(paidAgain.status,200);assert.equal(paidAgain.data.order.paidAt,paid.data.order.paidAt);
    assert.equal((await call(`/api/admin/orders/${order.data.order.id}`,'PATCH',{status:'preparing'},admin.cookie)).status,200);
    const tooSmall=await call('/api/orders','POST',{...checkout,items:[{id:'b1',quantity:1}]},a.cookie);assert.equal(tooSmall.status,400);
    const free=await call('/api/orders','POST',{...checkout,coupon:'FRETEGRATIS',payment:'card_demo'},a.cookie);
    assert.equal(free.data.order.discount,599);assert.equal(free.data.order.total,6580);assert.equal(free.data.order.paymentStatus,'approved_demo');
    const noChange=await call('/api/orders','POST',{...checkout,coupon:'',payment:'cash',changeFor:100},a.cookie);assert.equal(noChange.status,400);
    const canceled=await call('/api/orders','POST',{...checkout,coupon:'',payment:'pix_demo'},a.cookie);
    await call(`/api/orders/${canceled.data.order.id}/cancel`,'POST',{},a.cookie);
    assert.equal((await call(`/api/orders/${canceled.data.order.id}/demo-payment`,'POST',{},a.cookie)).status,409);
    assert.equal((await call(`/api/addresses/${id}`,'DELETE',{},a.cookie)).status,200);
    assert.equal((await call('/api/profile','GET',undefined,a.cookie)).data.addresses.length,0);
    assert.ok((await call('/api/orders','GET',undefined,a.cookie)).data.orders.find(o=>o.id===order.data.order.id).address.includes('Rua de Teste'));
  }finally{await app.close();if(control){await control.query(`DROP SCHEMA "${schema}" CASCADE`);await control.end();}}
});
