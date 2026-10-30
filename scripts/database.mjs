import pg from 'pg';
import {DatabaseSync} from 'node:sqlite';
import {resolve} from 'node:path';
import {openPostgres} from '../src/store.js';

async function run(){
  if(!process.env.PGPASSWORD) throw new Error('Preencha PGPASSWORD no arquivo .env local antes de conectar.');
  const database=process.env.PGDATABASE || 'zfood';
  if(!/^[a-z][a-z0-9_]{0,62}$/.test(database))throw new Error('Nome do banco inválido. Use letras minúsculas, números e sublinhado.');
  if(process.argv[2]==='setup'){
    const client=new pg.Client({database:'postgres',connectionTimeoutMillis:5000});
    try{
      await client.connect();
      const found=await client.query('SELECT 1 FROM pg_database WHERE datname=$1',[database]);
      if(!found.rowCount) await client.query(`CREATE DATABASE "${database}"`);
    }finally{await client.end();}
    const store=await openPostgres({database});await store.close();
    console.log(`Banco ${database} pronto. No pgAdmin, atualize Databases do servidor PostgreSQL 18.`);
    return;
  }
  if(process.argv[2]!=='migrate')throw new Error('Use setup ou migrate.');
  // O SQLite é aberto apenas para leitura. A origem permanece intacta.
  const source=new DatabaseSync(resolve(process.env.ZFOOD_SQLITE_SOURCE || 'data/zfood.sqlite'),{readOnly:true});
  let users,orders,profiles=[],addresses=[];
  try{
    source.exec('BEGIN');
    users=source.prepare('SELECT id,name,email,password,role FROM users').all();
    orders=source.prepare('SELECT id,user_id,request_key,payload FROM orders ORDER BY rowid').all();
    const tables=source.prepare("SELECT name FROM sqlite_master WHERE type='table'").all().map(t=>t.name);
    if(tables.includes('customer_profiles'))profiles=source.prepare('SELECT user_id,phone,default_address_id FROM customer_profiles').all();
    if(tables.includes('addresses'))addresses=source.prepare('SELECT id,user_id,payload,created_at FROM addresses').all();
    source.exec('COMMIT');
  }finally{source.close();}
  const client=new pg.Client({database,connectionTimeoutMillis:5000});
  try{
    await client.connect();await client.query('BEGIN');
    await client.query('LOCK TABLE users,orders,sessions,customer_profiles,addresses IN ACCESS EXCLUSIVE MODE');
    const occupied=await client.query('SELECT (SELECT count(*) FROM users)+(SELECT count(*) FROM orders)+(SELECT count(*) FROM sessions)+(SELECT count(*) FROM customer_profiles)+(SELECT count(*) FROM addresses) AS total');
    if(Number(occupied.rows[0].total)!==0)throw new Error('O banco de destino já tem dados. Migração interrompida sem substituir registros.');
    for(const u of users)await client.query('INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)',[u.id,u.name,u.email,u.password,u.role]);
    for(const o of orders)await client.query('INSERT INTO orders(id,user_id,request_key,payload) VALUES($1,$2,$3,$4)',[o.id,o.user_id,o.request_key,o.payload]);
    for(const p of profiles)await client.query('INSERT INTO customer_profiles(user_id,phone,default_address_id) VALUES($1,$2,$3)',[p.user_id,p.phone,p.default_address_id]);
    for(const a of addresses)await client.query('INSERT INTO addresses(id,user_id,payload,created_at) VALUES($1,$2,$3,$4)',[a.id,a.user_id,a.payload,a.created_at]);
    await client.query('COMMIT');
    console.log(`Migração concluída: ${users.length} contas, ${orders.length} pedidos e ${addresses.length} endereços. Faça login novamente; sessões não foram copiadas.`);
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{await client.end();}
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
