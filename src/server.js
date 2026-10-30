import { createServer } from 'node:http';
import { readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve, extname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { restaurants, products } from './catalog.js';
import { openStore, openPostgres, hashPassword, checkPassword } from './store.js';

const root = fileURLToPath(new URL('../public/',import.meta.url));
const fail = (status,message) => { throw Object.assign(new Error(message),{status}); };
const publicUser = ({id,name,email,role})=>({id,name,email,role});
const digest = token => createHash('sha256').update(token).digest('hex');
function recordStatus(order,status,actor) {
  order.history ??= [{status:'placed',at:order.createdAt,actor:'customer'}];
  order.status=status;
  order.history.push({status,at:new Date().toISOString(),actor});
}
const text = (v,min,max,label) => {
  if (typeof v !== 'string' || v.trim().length < min || v.trim().length > max) fail(400,`${label}: informe entre ${min} e ${max} caracteres.`);
  return v.trim();
};
export async function createApp(options={}) {
  const dbPath = options.dbPath || resolve('data/zfood.sqlite');
  if(!options.postgres && dbPath !== ':memory:') await mkdir(dirname(dbPath),{recursive:true});
  const db = options.postgres ? await openPostgres(options.postgres):openStore(dbPath);
  if(options.adminEmail && options.adminPassword) {
    if(options.adminPassword.length<12) throw new Error('A senha administrativa deve ter pelo menos 12 caracteres.');
    const email = options.adminEmail.trim().toLowerCase();
    const existing = await db.prepare('SELECT id FROM users WHERE email=?').get(email);
    // Nunca promover uma conta pública que já exista.
    if(!existing) await db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(randomUUID(),'Admin Zfood',email,await hashPassword(options.adminPassword),'admin');
  }
  const attempts = new Map();
  function send(res,status,data) { res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'});res.end(JSON.stringify(data)); }
  async function body(req) {
    if(!req.headers['content-type']?.startsWith('application/json')) fail(415,'Envie JSON.');
    let raw='';
    for await(const chunk of req) { raw+=chunk; if(Buffer.byteLength(raw)>20000) fail(413,'Pedido muito grande.'); }
    try { const data=JSON.parse(raw);if(!data || Array.isArray(data) || typeof data!=='object') fail(400,'JSON inválido.');return data; } catch { fail(400,'JSON inválido.'); }
  }
  async function user(req) {
    const token = req.headers.cookie?.match(/(?:^|;\s*)zfood_session=([a-f0-9]{64})(?:;|$)/)?.[1];
    if(!token) fail(401,'Entre na sua conta para continuar.');
    const row=await db.prepare('SELECT users.* FROM users JOIN sessions ON users.id=sessions.user_id WHERE sessions.token=? AND sessions.expires>?').get(digest(token),Date.now());
    if(!row) fail(401,'Sua sessão expirou. Entre novamente.');
    return publicUser(row);
  }
  async function session(res,id) {
    const token=randomBytes(32).toString('hex');
    await db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    await db.prepare('INSERT INTO sessions VALUES (?,?,?)').run(digest(token),id,Date.now()+7*86400000);
    res.setHeader('Set-Cookie',`zfood_session=${token}; HttpOnly; SameSite=Strict; Path=/; Max-Age=604800${options.secureCookies ? '; Secure':''}`);
  }
  const server = createServer(async(req,res)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Referrer-Policy','same-origin');
    res.setHeader('Content-Security-Policy',"default-src 'self'; img-src 'self' https://images.unsplash.com data:; style-src 'self'; script-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'");
    try {
      const url=new URL(req.url,'http://localhost');
      const path=url.pathname;
      if(req.method!=='GET' && req.method!=='HEAD') {
        if(req.headers['sec-fetch-site']==='cross-site') fail(403,'Origem não permitida.');
        if(req.headers.origin) {
          const expected=`${options.secureCookies?'https':'http'}://${req.headers.host}`;
          if(req.headers.origin!==expected) fail(403,'Origem não permitida.');
        }
      }
      if(path==='/api/catalog' && req.method==='GET') return send(res,200,{restaurants,products});
      if(['/api/register','/api/login'].includes(path) && req.method==='POST') {
        const ip=req.socket.remoteAddress;
        const now=Date.now();
        if(attempts.size>1000) for(const [key,v] of attempts) if(v.until<now) attempts.delete(key);
        const rate=attempts.get(ip);
        if(rate && rate.until>now && rate.count>=30) fail(429,'Muitas tentativas. Aguarde 15 minutos.');
        attempts.set(ip,{count:rate && rate.until>now ? rate.count+1:1,until:rate && rate.until>now?rate.until:now+900000});
        const data=await body(req);
        const email=text(data.email,5,254,'Email').toLowerCase();
        if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) fail(400,'Informe um email válido.');
        const password=text(data.password,1,128,'Senha');
        let row;
        if(path==='/api/register') {
          const name=text(data.name,2,80,'Nome');
          if(password.length<10) fail(400,'A senha precisa ter pelo menos 10 caracteres.');
          if(await db.prepare('SELECT id FROM users WHERE email=?').get(email)) fail(409,'Este email já tem cadastro.');
          row={id:randomUUID(),name,email,role:'customer'};
          const hash=await hashPassword(password);
          try { await db.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run(row.id,name,email,hash,'customer'); }
          catch(error) { if(error.code==='23505'||error.message.includes('UNIQUE')) fail(409,'Este email já tem cadastro.');throw error; }
        } else {
          row=await db.prepare('SELECT * FROM users WHERE email=?').get(email);
          if(!row || !await checkPassword(password,row.password)) fail(401,'Email ou senha incorretos.');
        }
        await session(res,row.id);
        return send(res,path==='/api/register'?201:200,{user:publicUser(row)});
      }
      if(path==='/api/me' && req.method==='GET') return send(res,200,{user:await user(req)});
      if(path==='/api/logout' && req.method==='POST') {
        const token=req.headers.cookie?.match(/zfood_session=([a-f0-9]{64})/)?.[1];
        if(token) await db.prepare('DELETE FROM sessions WHERE token=?').run(digest(token));
        res.setHeader('Set-Cookie','zfood_session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0');
        return send(res,200,{ok:true});
      }
      if(path==='/api/orders' && req.method==='GET') {
        const u=await user(req);
        return send(res,200,{orders:(await db.prepare('SELECT payload FROM orders WHERE user_id=? ORDER BY rowid DESC').all(u.id)).map(r=>JSON.parse(r.payload))});
      }
      if(path==='/api/orders' && req.method==='POST') {
        const u=await user(req),data=await body(req);
        const key=text(req.headers['idempotency-key'] || randomUUID(),1,100,'Identificador');
        const existing=await db.prepare('SELECT payload FROM orders WHERE user_id=? AND request_key=?').get(u.id,key);
        if(existing) return send(res,200,{order:JSON.parse(existing.payload)});
        if(!Array.isArray(data.items) || !data.items.length || data.items.length>30) fail(400,'Adicione itens ao carrinho.');
        const seen=new Set();
        const items=data.items.map(item=>{
          if(!item || seen.has(item.id)) fail(400,'Item inválido ou duplicado.');
          seen.add(item.id);
          const p=products.find(p=>p.id===item.id);
          if(!p || !Number.isInteger(item.quantity) || item.quantity<1 || item.quantity>20) fail(400,'Item ou quantidade inválida.');
          return {id:p.id,name:p.name,restaurantId:p.restaurantId,price:p.price,quantity:item.quantity};
        });
        if(new Set(items.map(i=>i.restaurantId)).size!==1) fail(400,'Escolha itens de um restaurante por pedido.');
        const restaurant=restaurants.find(r=>r.id===items[0].restaurantId);
        const coupon=typeof data.coupon==='string'?data.coupon.trim().toUpperCase():'';
        if(coupon && coupon!=='HALLOWEEN10') fail(400,'Cupom não encontrado. Use HALLOWEEN10.');
        const subtotal=items.reduce((sum,i)=>sum+i.price*i.quantity,0);
        const discount=coupon ? Math.round(subtotal*.1):0;
        if(data.payment!=='cash') fail(400,'Nesta versão, o pagamento é na entrega.');
        const address=text(data.address,10,250,'Endereço');
        const phone=text(data.phone,10,20,'Telefone');
        if(!/^\+?[\d\s()-]+$/.test(phone) || phone.replace(/\D/g,'').length<10) fail(400,'Informe um telefone válido com DDD.');
        const notes=data.notes ? text(data.notes,0,500,'Observações'):'';
        const order={id:randomUUID(),number:`ZF-${randomBytes(3).toString('hex').toUpperCase()}`,customer:u.name,items,restaurant:restaurant.name,subtotal,discount,fee:restaurant.fee,total:subtotal-discount+restaurant.fee,coupon,address,phone,notes,payment:'cash',status:'placed',createdAt:new Date().toISOString()};
        order.history=[{status:'placed',at:order.createdAt,actor:'customer'}];
        const inserted=await db.prepare('INSERT INTO orders (id,user_id,request_key,payload) VALUES (?,?,?,?) ON CONFLICT(user_id,request_key) DO NOTHING').run(order.id,u.id,key,JSON.stringify(order));
        if(!inserted.changes) {
          const previous=await db.prepare('SELECT payload FROM orders WHERE user_id=? AND request_key=?').get(u.id,key);
          return send(res,200,{order:JSON.parse(previous.payload)});
        }
        return send(res,201,{order});
      }
      const cancelMatch=path.match(/^\/api\/orders\/([^/]+)\/cancel$/);
      if(cancelMatch && req.method==='POST') {
        const u=await user(req);
        await body(req);
        const row=await db.prepare('SELECT payload FROM orders WHERE id=? AND user_id=?').get(cancelMatch[1],u.id);
        if(!row) fail(404,'Pedido não encontrado.');
        const order=JSON.parse(row.payload);
        if(order.status!=='placed') fail(409,'Só é possível cancelar antes do início do preparo.');
        recordStatus(order,'canceled','customer');
        const updated=await db.prepare('UPDATE orders SET payload=? WHERE id=? AND payload=?').run(JSON.stringify(order),order.id,row.payload);
        if(!updated.changes) fail(409,'O pedido foi atualizado. Confira o status antes de continuar.');
        return send(res,200,{order});
      }
      if(path.startsWith('/api/admin/')) {
        if((await user(req)).role!=='admin') fail(403,'Acesso restrito à administração.');
        if(path==='/api/admin/orders' && req.method==='GET') return send(res,200,{orders:(await db.prepare('SELECT payload FROM orders ORDER BY rowid DESC').all()).map(r=>JSON.parse(r.payload))});
        if(path.startsWith('/api/admin/orders/') && req.method==='PATCH') {
          const data=await body(req);
          const id=path.slice('/api/admin/orders/'.length);
          const row=await db.prepare('SELECT payload FROM orders WHERE id=?').get(id);
          if(!row) fail(404,'Pedido não encontrado.');
          const order=JSON.parse(row.payload);
          const allowed={placed:['preparing','canceled'],preparing:['delivering','canceled'],delivering:['delivered'],delivered:[],canceled:[]};
          if(!allowed[order.status]?.includes(data.status)) fail(400,'Esta mudança de status não é permitida.');
          recordStatus(order,data.status,'admin');
          const updated=await db.prepare('UPDATE orders SET payload=? WHERE id=? AND payload=?').run(JSON.stringify(order),id,row.payload);
          if(!updated.changes) fail(409,'O pedido foi atualizado. Confira o status antes de continuar.');
          return send(res,200,{order});
        }
      }
      if(path.startsWith('/api/')) fail(404,'Rota não encontrada.');
      const files={'/':'index.html','/index.html':'index.html','/style.css':'style.css','/app.js':'app.js','/favicon.svg':'favicon.svg','/halloween.svg':'halloween.svg'};
      if(!files[path] || !['GET','HEAD'].includes(req.method)) fail(404,'Página não encontrada.');
      const data=await readFile(resolve(root,files[path]));
      const types={'.html':'text/html; charset=utf-8','.css':'text/css; charset=utf-8','.js':'text/javascript; charset=utf-8','.svg':'image/svg+xml'};
      res.writeHead(200,{'Content-Type':types[extname(files[path])]});res.end(req.method==='HEAD'?undefined:data);
    } catch(error) {
      if(!error.status) console.error('Erro interno:',error.message);
      send(res,error.status || 500,{error:error.status?error.message:'Não foi possível concluir. Tente novamente.'});
    }
  });
  return {server,close:async()=>{if(server.listening) await new Promise((r,j)=>server.close(e=>e?j(e):r()));await db.close();}};
}
if(process.argv[1] && resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const app=await createApp({dbPath:process.env.ZFOOD_DB,postgres:process.env.ZFOOD_STORAGE==='postgres'?{}:null,adminEmail:process.env.ZFOOD_ADMIN_EMAIL,adminPassword:process.env.ZFOOD_ADMIN_PASSWORD,secureCookies:process.env.ZFOOD_SECURE_COOKIES==='true'});
  app.server.listen(Number(process.env.PORT || 3000),'127.0.0.1',()=>console.log(`Zfood em http://127.0.0.1:${app.server.address().port}`));
  for(const signal of ['SIGINT','SIGTERM']) process.on(signal,async()=>{await app.close();process.exit(0);});
}
