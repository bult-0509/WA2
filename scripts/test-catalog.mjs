import assert from 'node:assert/strict';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {config} from 'dotenv';
import {Pool} from 'pg';
import {TOTP,Secret} from 'otpauth';
import sharp from 'sharp';
import security from '../apps/api/dist/security.js';

const root=resolve(import.meta.dirname,'..');config({path:resolve(root,'.env'),quiet:true});
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const results=[];const staffId=randomUUID();const readonlyId=randomUUID();const prefix=`qa-${randomUUID().slice(0,8)}`;
const email=`${prefix}@example.test`,password=randomUUID()+randomUUID();const secret=new Secret({size:20});const totp=new TOTP({secret});
const productIds=[];const leadKeys=[];const mediaIds=[];
let cookie='';
async function call(path,{body,method='POST',auth=true,origin='http://127.0.0.1:3100',csrf=true}={}){
 const headers={};if(body!==undefined){headers['Content-Type']='application/json';headers.Origin=origin;if(csrf)headers['x-wm-csrf']='1';}
 if(auth&&cookie)headers.Cookie=cookie;
 const res=await fetch(`http://127.0.0.1:3100/api/${path}`,{method:body===undefined?'GET':method,headers,body:body===undefined?undefined:JSON.stringify(body)});
 const text=await res.text();let data;try{data=JSON.parse(text);}catch{data=text;}
 return {status:res.status,data,cookie:res.headers.getSetCookie()[0]?.split(';')[0]};
}
function passed(name){results.push({name,status:'passed'});console.log(`PASS ${name}`);}
try{
 const perms=['products:read','products:write','products:publish','leads:read','leads:write','content:write','audit:read'];
 await pool.query('INSERT INTO staff(id,email,password_hash,totp_secret,permissions) VALUES($1,$2,$3,$4,$5)',[staffId,email,security.hashPassword(password),security.encryptSecret(secret.base32),perms]);
 let res=await call('admin/products',{auth:false});assert.equal(res.status,401);passed('Anonymous admin access rejected');
 res=await call('auth/login',{body:{email,password,code:totp.generate()},origin:'https://other.example'});assert.equal(res.status,403);passed('Foreign-origin login rejected');
 res=await call('auth/login',{body:{email,password,code:totp.generate()},csrf:false});assert.equal(res.status,403);passed('Missing CSRF header rejected');
 res=await call('auth/login',{body:{email,password:'incorrect',code:totp.generate()}});assert.equal(res.status,401);passed('Incorrect password rejected');
 const code=totp.generate();res=await call('auth/login',{body:{email,password,code}});assert.equal(res.status,201,JSON.stringify(res.data));cookie=res.cookie;assert.ok(cookie);passed('Password and TOTP login succeeds');
 res=await call('auth/login',{body:{email,password,code}});assert.equal(res.status,401);passed('TOTP replay rejected');
 const base={name:`QA sample ${prefix}`,slug:prefix,sku:prefix.toUpperCase(),summary:'Sample information for automated verification.',description:'This is a test fixture, not a real brand product.',category:'Bowling',age_min:3,age_max:8,environment:'indoor',features:['Test feature A','Test feature B','Test feature C'],specs:{Purpose:'Automated verification'},safety_notes:'Sample only. Not intended for consumer use.',image_id:null,status:'draft',seo_title:`QA sample ${prefix}`,seo_description:'A local integration test fixture.'};
 res=await call('admin/products',{body:base});assert.equal(res.status,201,JSON.stringify(res.data));let product=res.data;productIds.push(product.id);passed('Draft product persists with a default SKU');
 res=await call(`products/${prefix}`,{auth:false});assert.equal(res.status,404);passed('Draft detail is private');
 res=await call(`admin/products/${product.id}`,{method:'PATCH',body:{...base,status:'active',version:product.version}});assert.equal(res.status,400);assert.ok(res.data.field_errors.image_id);passed('Publishing without an image fails validation');
 res=await call('admin/media',{body:{data:'data:image/png;base64,SGVsbG8=',alt:'Invalid test file'}});assert.equal(res.status,400);passed('A disguised non-image upload is rejected');
 const image=await sharp({create:{width:120,height:120,channels:3,background:'#b8c7c1'}}).png().toBuffer();
 res=await call('admin/media',{body:{data:`data:image/png;base64,${image.toString('base64')}`,alt:'Automated test fixture'}});assert.equal(res.status,201,JSON.stringify(res.data));const media=res.data.id;mediaIds.push(media);passed('Image decoded and converted to WebP');
 res=await call(`media/${media}`,{auth:false});assert.equal(res.status,404);passed('Unpublished media is not public');
 res=await call(`admin/products/${product.id}`,{method:'PATCH',body:{...base,image_id:media,status:'active',version:product.version}});assert.equal(res.status,200,JSON.stringify(res.data));product=res.data;passed('Complete product publishes');
 res=await call(`products?q=${encodeURIComponent(prefix)}`,{auth:false});assert.equal(res.data.total,1);assert.equal(res.data.items[0].sku,base.sku);passed('Published product is searchable');
 const html=await(await fetch(`http://127.0.0.1:3100/products/${prefix}`)).text();assert.ok(html.includes(base.name));passed('Product content exists in server-rendered HTML');
 res=await call('admin/products',{body:{...base,slug:`${prefix}-duplicate`}});assert.equal(res.status,409);assert.equal((await pool.query('SELECT count(*)::int n FROM products WHERE slug=$1',[`${prefix}-duplicate`])).rows[0].n,0);passed('Duplicate SKU rolls back the entire product transaction');
 res=await call(`admin/products/${product.id}`,{method:'PATCH',body:{...base,image_id:media,status:'active',version:1}});assert.equal(res.status,409);passed('Stale product version cannot overwrite newer edits');
 const idempotency_key=randomUUID();leadKeys.push(idempotency_key);
 const inquiry={idempotency_key,name:'QA Contact',email:`${prefix}@example.test`,country:'Test region',type:'Product Question',subject:`QA inquiry ${prefix}`,message:'An integration test inquiry, no real customer data.',product_id:product.id,consent:true,website:''};
 res=await call('forms/contact',{body:{...inquiry,consent:false},auth:false});assert.equal(res.status,400);passed('Contact requires consent');
 res=await call('forms/contact',{body:inquiry,auth:false});assert.equal(res.status,201,JSON.stringify(res.data));const reference=res.data.reference;
 res=await call('forms/contact',{body:inquiry,auth:false});assert.equal(res.status,201);assert.equal(res.data.reference,reference);assert.equal((await pool.query('SELECT count(*)::int n FROM leads WHERE idempotency_key=$1',[idempotency_key])).rows[0].n,1);passed('Repeated contact submission returns one persisted inquiry');
 res=await call('forms/contact',{body:{...inquiry,message:'A different message using the same identifier.'},auth:false});assert.equal(res.status,409);passed('Idempotency key cannot be reused for different content');
 res=await call('admin/leads');const lead=res.data.find(l=>l.reference===reference);assert.ok(lead);res=await call(`admin/leads/${lead.id}`,{method:'PATCH',body:{status:'resolved',internal_note:'QA verified',version:lead.version}});assert.equal(res.status,200);passed('Inquiry can be resolved with an internal note');
 res=await call('admin/audit');assert.ok(res.data.some(a=>a.entity_id===lead.id&&a.action==='update'));passed('Inquiry changes create an audit record');
 const secondSecret=new Secret({size:20});const secondEmail=`readonly-${prefix}@example.test`;
 await pool.query('INSERT INTO staff(id,email,password_hash,totp_secret,permissions) VALUES($1,$2,$3,$4,$5)',[readonlyId,secondEmail,security.hashPassword(password),security.encryptSecret(secondSecret.base32),['products:read']]);
 const adminCookie=cookie;res=await call('auth/login',{body:{email:secondEmail,password,code:new TOTP({secret:secondSecret}).generate()}});assert.equal(res.status,201);cookie=res.cookie;
 res=await call('admin/products',{body:{...base,slug:`prefix-readonly`}});assert.equal(res.status,403);passed('Read-only role cannot create products');cookie=adminCookie;
 res=await call(`admin/products/${product.id}`,{method:'PATCH',body:{...base,image_id:media,status:'archived',version:product.version}});assert.equal(res.status,200);
 res=await call(`products?q=${prefix}`,{auth:false});assert.equal(res.data.total,0);res=await call(`products/${prefix}`,{auth:false});assert.equal(res.status,200);assert.equal(res.data.status,'archived');passed('Archived product leaves the catalog but retains its URL');
 res=await call('auth/logout',{body:{}});assert.equal(res.status,201);res=await call('admin/products');assert.equal(res.status,401);passed('Logout revokes the stored session');
}catch(error){results.push({name:'Suite failure',status:'failed',message:error.message});console.error(error.message);process.exitCode=1;}
finally{
 // 只清理本次测试生成的 UUID 数据，不清空业务表或用户输入。
 await pool.query('DELETE FROM leads WHERE idempotency_key=ANY($1::uuid[])',[leadKeys]);
 await pool.query('DELETE FROM variants WHERE product_id=ANY($1::uuid[])',[productIds]);
 await pool.query('DELETE FROM products WHERE id=ANY($1::uuid[])',[productIds]);
 await pool.query('DELETE FROM media WHERE id=ANY($1::uuid[])',[mediaIds]);
 await pool.query('DELETE FROM sessions WHERE staff_id=ANY($1::uuid[])',[[staffId,readonlyId]]);
 await pool.query('DELETE FROM audit_logs WHERE actor=ANY($1::uuid[])',[[staffId,readonlyId]]);
 await pool.query('DELETE FROM staff WHERE id=ANY($1::uuid[])',[[staffId,readonlyId]]);
 await pool.end();await mkdir(resolve(root,'tmp/verification'),{recursive:true});
 await writeFile(resolve(root,'tmp/verification/catalog-tests.json'),JSON.stringify({at:new Date().toISOString(),results},null,2));
}
