import { readFile, readdir, mkdir, writeFile, appendFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { config } from 'dotenv';
import { Pool } from 'pg';
import { TOTP, Secret } from 'otpauth';
import security from '../apps/api/dist/security.js';

const root=resolve(import.meta.dirname,'..');
config({path:resolve(root,'.env'),quiet:true});
if(!process.env.DATABASE_URL)throw new Error('Configure the local PostgreSQL database first.');
const pool=new Pool({connectionString:process.env.DATABASE_URL});
try{
  const client=await pool.connect();
  try{
    // 串行迁移并校验已执行脚本，防止无意修改历史迁移。
    await client.query('SELECT pg_advisory_lock(8170231)');
    await client.query('CREATE TABLE IF NOT EXISTS schema_migrations(name text PRIMARY KEY,checksum text NOT NULL,applied_at timestamptz NOT NULL DEFAULT now())');
    for(const name of (await readdir(resolve(root,'database/migrations'))).filter(n=>n.endsWith('.sql')).sort()){
      const sql=await readFile(resolve(root,'database/migrations',name),'utf8');
      const checksum=createHash('sha256').update(sql).digest('hex');
      const existing=(await client.query('SELECT checksum FROM schema_migrations WHERE name=$1',[name])).rows[0];
      if(existing){if(existing.checksum!==checksum)throw new Error(`Applied migration changed: ${name}`);continue;}
      await client.query('BEGIN');
      try{await client.query(sql);await client.query('INSERT INTO schema_migrations(name,checksum) VALUES($1,$2)',[name,checksum]);await client.query('COMMIT');}
      catch(error){await client.query('ROLLBACK');throw error;}
      console.log(`Applied ${name}`);
    }
  }finally{await client.query('SELECT pg_advisory_unlock(8170231)');client.release();}

  if(process.argv.includes('--seed')){
    if(!process.env.APP_KEY){process.env.APP_KEY=randomBytes(32).toString('hex');await appendFile(resolve(root,'.env'),`\nAPP_KEY=${process.env.APP_KEY}\n`);}
    const email='admin@wemove.local';
    const found=await pool.query('SELECT id FROM staff WHERE email=$1',[email]);
    if(!found.rowCount){
      const password=randomBytes(18).toString('base64url');const secret=new Secret({size:20});
      const totp=new TOTP({issuer:'WEMOVE Local',label:email,secret});
      const permissions=['products:read','products:write','products:publish','leads:read','leads:write','content:write','audit:read'];
      await pool.query('INSERT INTO staff(id,email,password_hash,totp_secret,permissions) VALUES($1,$2,$3,$4,$5)',[randomUUID(),email,security.hashPassword(password),security.encryptSecret(secret.base32),permissions]);
      await mkdir(resolve(root,'.local'),{recursive:true});
      await writeFile(resolve(root,'.local/dev-admin.json'),JSON.stringify({email,password,totp_secret:secret.base32,authenticator_uri:totp.toString()},null,2));
      console.log('Local administrator created. Credentials are in .local/dev-admin.json; import its authenticator URI into your authenticator.');
    }
  }
  console.log('Database migrations complete.');
}finally{await pool.end();}
