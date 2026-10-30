import {randomUUID} from 'node:crypto';
export function formatAddress(a){return `${a.street}, ${a.number}${a.complement?' · '+a.complement:''} — ${a.district}, ${a.city}/${a.state} · CEP ${a.zip}${a.reference?' · Referência: '+a.reference:''}`;}
export async function customerRoutes(req,res,path,{db,user,body,send,text,fail}){
  if(path!=='/api/profile'&&!path.startsWith('/api/addresses'))return false;
  const u=await user(req);
  if(path==='/api/profile'&&req.method==='GET'){
    const profile=await db.prepare('SELECT phone,default_address_id FROM customer_profiles WHERE user_id=?').get(u.id);
    const addresses=(await db.prepare('SELECT payload FROM addresses WHERE user_id=? ORDER BY created_at DESC,id').all(u.id)).map(r=>JSON.parse(r.payload));
    send(res,200,{user:u,phone:profile?.phone||'',addresses,defaultAddressId:addresses.some(a=>a.id===profile?.default_address_id)?profile.default_address_id:addresses[0]?.id||null});return true;
  }
  if(path==='/api/profile'&&req.method==='PATCH'){
    const data=await body(req),name=text(data.name,2,80,'Nome'),phone=text(data.phone,0,20,'Telefone');
    if(phone&&(!/^\+?[\d\s()-]+$/.test(phone)||phone.replace(/\D/g,'').length<10))fail(400,'Informe um telefone com DDD.');
    await db.prepare('UPDATE users SET name=? WHERE id=?').run(name,u.id);
    await db.prepare('INSERT INTO customer_profiles(user_id,phone) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone').run(u.id,phone);
    send(res,200,{user:{...u,name},phone});return true;
  }
  const match=path.match(/^\/api\/addresses\/([^/]+)(\/default)?$/);
  if(match){
    const row=await db.prepare('SELECT payload FROM addresses WHERE id=? AND user_id=?').get(match[1],u.id);
    if(!row)fail(404,'Endereço não encontrado.');
    if(match[2]&&req.method==='POST'){
      await body(req);
      await db.prepare('INSERT INTO customer_profiles(user_id,default_address_id) VALUES (?,?) ON CONFLICT(user_id) DO UPDATE SET default_address_id=excluded.default_address_id').run(u.id,match[1]);
      send(res,200,{ok:true});return true;
    }
    if(!match[2]&&req.method==='DELETE'){
      await db.prepare('DELETE FROM addresses WHERE id=? AND user_id=?').run(match[1],u.id);send(res,200,{ok:true});return true;
    }
  }
  if((path==='/api/addresses'&&req.method==='POST')||(match&&!match[2]&&req.method==='PATCH')){
    const data=await body(req);
    const address={id:match?match[1]:randomUUID(),label:text(data.label,2,40,'Nome do endereço'),zip:text(data.zip,8,9,'CEP').replace(/\D/g,''),street:text(data.street,3,120,'Rua'),number:text(data.number,1,15,'Número'),district:text(data.district,2,80,'Bairro'),city:text(data.city,2,80,'Cidade'),state:text(data.state,2,2,'Estado').toUpperCase(),complement:text(data.complement||'',0,80,'Complemento'),reference:text(data.reference||'',0,100,'Referência')};
    if(!/^\d{8}$/.test(address.zip)||!['AC','AL','AP','AM','BA','CE','DF','ES','GO','MA','MT','MS','MG','PA','PB','PR','PE','PI','RJ','RN','RS','RO','RR','SC','SP','SE','TO'].includes(address.state))fail(400,'Confira o CEP e a sigla do estado.');
    if(match){const result=await db.prepare('UPDATE addresses SET payload=? WHERE id=? AND user_id=?').run(JSON.stringify(address),address.id,u.id);if(!result.changes)fail(404,'Endereço não encontrado.');}
    else await db.prepare('INSERT INTO addresses(id,user_id,payload,created_at) VALUES (?,?,?,?)').run(address.id,u.id,JSON.stringify(address),Date.now());
    send(res,match?200:201,{address});return true;
  }
  return false;
}
