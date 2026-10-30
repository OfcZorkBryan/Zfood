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
  let users,orders;
  try{
    source.exec('BEGIN');
    users=source.prepare('SELECT id,name,email,password,role FROM users').all();
    orders=source.prepare('SELECT id,user_id,request_key,payload FROM orders ORDER BY rowid').all();
    source.exec('COMMIT');
  }finally{source.close();}
  const client=new pg.Client({database,connectionTimeoutMillis:5000});
  try{
    await client.connect();await client.query('BEGIN');
    await client.query('LOCK TABLE users,orders,sessions IN ACCESS EXCLUSIVE MODE');
    const occupied=await client.query('SELECT (SELECT count(*) FROM users)+(SELECT count(*) FROM orders)+(SELECT count(*) FROM sessions) AS total');
    if(Number(occupied.rows[0].total)!==0)throw new Error('O banco de destino já tem dados. Migração interrompida sem substituir registros.');
    for(const u of users)await client.query('INSERT INTO users(id,name,email,password,role) VALUES($1,$2,$3,$4,$5)',[u.id,u.name,u.email,u.password,u.role]);
    for(const o of orders)await client.query('INSERT INTO orders(id,user_id,request_key,payload) VALUES($1,$2,$3,$4)',[o.id,o.user_id,o.request_key,o.payload]);
    await client.query('COMMIT');
    console.log(`Migração concluída: ${users.length} contas e ${orders.length} pedidos. Faça login novamente; sessões não foram copiadas.`);
  }catch(error){await client.query('ROLLBACK').catch(()=>{});throw error;}
  finally{await client.end();}
}
run().catch(error=>{console.error(error.message);process.exitCode=1;});
