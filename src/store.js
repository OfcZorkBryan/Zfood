import { DatabaseSync } from 'node:sqlite';
import { randomBytes, scrypt as scryptCallback, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
const scrypt = promisify(scryptCallback);
export async function hashPassword(password) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${(await scrypt(password,salt,64)).toString('hex')}`;
}
export async function checkPassword(password,stored) {
  const [salt,hash] = stored.split(':');
  return timingSafeEqual(await scrypt(password,salt,64),Buffer.from(hash,'hex'));
}
export function openStore(path) {
  const db = new DatabaseSync(path);
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON;
    CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer');
    CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),request_key TEXT NOT NULL,payload TEXT NOT NULL,UNIQUE(user_id,request_key));`);
  return db;
}
export async function openPostgres(config={}) {
  const {Pool}=await import('pg');
  const pool=new Pool({...config,connectionTimeoutMillis:5000,max:5});
  try {
    await pool.query(`CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY,name TEXT NOT NULL,email TEXT NOT NULL UNIQUE,password TEXT NOT NULL,role TEXT NOT NULL DEFAULT 'customer');
      CREATE TABLE IF NOT EXISTS sessions (token TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),expires BIGINT NOT NULL);
      CREATE TABLE IF NOT EXISTS orders (id TEXT PRIMARY KEY,user_id TEXT REFERENCES users(id),request_key TEXT NOT NULL,payload TEXT NOT NULL,rowid BIGSERIAL UNIQUE,UNIQUE(user_id,request_key));`);
  } catch(error) {await pool.end();throw error;}
  return {
    prepare(sql) {
      let position=0;const query=sql.replace(/\?/g,()=>`$${++position}`);
      return {
        get:async(...args)=>(await pool.query(query,args)).rows[0],
        all:async(...args)=>(await pool.query(query,args)).rows,
        run:async(...args)=>({changes:(await pool.query(query,args)).rowCount})
      };
    },
    close:()=>pool.end()
  };
}
