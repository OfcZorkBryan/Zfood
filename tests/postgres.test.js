import {test} from 'node:test';
import assert from 'node:assert/strict';
import pg from 'pg';
import {randomUUID} from 'node:crypto';
import {createApp} from '../src/server.js';

test('PostgreSQL: cadastro, checkout simultâneo idempotente, cancelamento e persistência',{skip:!process.env.ZFOOD_TEST_POSTGRES},async()=>{
  const schema='zfood_test_'+randomUUID().replaceAll('-','');
  const control=new pg.Client();await control.connect();
  let app;
  try{
    await control.query(`CREATE SCHEMA "${schema}"`);
    const postgres={options:`-c search_path=${schema}`};
    app=await createApp({postgres});
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));
    let base=`http://127.0.0.1:${app.server.address().port}`;
    async function call(path,method='GET',body,cookie){
      const res=await fetch(base+path,{method,headers:{...(body&&{'Content-Type':'application/json'}),...(cookie&&{cookie}),'Idempotency-Key':'pg-checkout'},body:body&&JSON.stringify(body)});
      return {status:res.status,data:await res.json(),cookie:res.headers.get('set-cookie')?.split(';')[0]};
    }
    const account=await call('/api/register','POST',{name:'Teste PostgreSQL',email:'pg@example.com',password:'SenhaPostgres2026!'});
    assert.equal(account.status,201);
    const input={items:[{id:'b1',quantity:1}],coupon:'HALLOWEEN10',address:'Rua de Teste, 100, Cidade',phone:'11999990000',payment:'cash'};
    const results=await Promise.all([call('/api/orders','POST',input,account.cookie),call('/api/orders','POST',input,account.cookie)]);
    assert.deepEqual(results.map(r=>r.status).sort(),[200,201]);
    assert.equal(results[0].data.order.id,results[1].data.order.id);
    assert.equal(results[0].data.order.total,3560);
    const id=results[0].data.order.id;
    const canceled=await call(`/api/orders/${id}/cancel`,'POST',{},account.cookie);
    assert.equal(canceled.status,200);assert.equal(canceled.data.order.history.length,2);
    await app.close();app=await createApp({postgres});
    await new Promise(r=>app.server.listen(0,'127.0.0.1',r));base=`http://127.0.0.1:${app.server.address().port}`;
    const orders=await call('/api/orders','GET',undefined,account.cookie);
    assert.equal(orders.data.orders.length,1);assert.equal(orders.data.orders[0].status,'canceled');
  }finally{
    if(app)await app.close();
    await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await control.end();
  }
});
