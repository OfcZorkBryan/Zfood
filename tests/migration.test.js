import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {spawnSync} from 'node:child_process';
import pg from 'pg';
import {openStore,openPostgres,hashPassword} from '../src/store.js';
test('migração copia perfil e endereço, mantém origem e recusa destino ocupado',{skip:!process.env.ZFOOD_TEST_POSTGRES},async()=>{
  const dir=await mkdtemp(join(tmpdir(),'zfood-migration-')),sourcePath=join(dir,'source.sqlite');
  const schema='zfood_migration_'+randomUUID().replaceAll('-','');
  const control=new pg.Client();await control.connect();
  try{
    await control.query(`CREATE SCHEMA "${schema}"`);
    const target=await openPostgres({options:`-c search_path=${schema}`});await target.close();
    const source=openStore(sourcePath);
    try{
      source.prepare('INSERT INTO users VALUES (?,?,?,?,?)').run('user1','Pessoa Teste','migracao@example.com',await hashPassword('SenhaTeste2026!'),'customer');
      source.prepare('INSERT INTO customer_profiles(user_id,phone,default_address_id) VALUES (?,?,?)').run('user1','11999990000','address1');
      source.prepare('INSERT INTO addresses VALUES (?,?,?,?)').run('address1','user1',JSON.stringify({id:'address1',street:'Rua de Teste',number:'123'}),Date.now());
      source.prepare('INSERT INTO orders VALUES (?,?,?,?)').run('order1','user1','key1',JSON.stringify({id:'order1',status:'placed',address:'Rua de Teste, 123'}));
    }finally{source.close();}
    const run=()=>spawnSync(process.execPath,['scripts/database.mjs','migrate'],{env:{...process.env,PGOPTIONS:`-c search_path=${schema}`,ZFOOD_SQLITE_SOURCE:sourcePath},encoding:'utf8'});
    const first=run();assert.equal(first.status,0,first.stderr);
    const query=new pg.Client({options:`-c search_path=${schema}`});await query.connect();
    try{
      assert.equal((await query.query('SELECT * FROM users')).rowCount,1);
      assert.equal((await query.query('SELECT * FROM orders')).rowCount,1);
      assert.equal((await query.query('SELECT * FROM addresses')).rows[0].id,'address1');
      assert.equal((await query.query('SELECT * FROM customer_profiles')).rows[0].default_address_id,'address1');
      const again=run();assert.equal(again.status,1);assert.match(again.stderr,/já tem dados/);
      assert.equal((await query.query('SELECT * FROM addresses')).rowCount,1);
    }finally{await query.end();}
    const original=openStore(sourcePath);assert.equal(original.prepare('SELECT count(*) AS total FROM addresses').get().total,1);original.close();
  }finally{await control.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);await control.end();await rm(dir,{recursive:true,force:true});}
});
