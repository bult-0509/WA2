import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {config} from 'dotenv';
import {Pool} from 'pg';
import sharp from 'sharp';
import products from '../data/products.mjs';

const root=resolve(import.meta.dirname,'..');
config({path:resolve(root,'.env'),quiet:true});
if(!process.env.DATABASE_URL)throw new Error('Configure the local PostgreSQL database first.');

function stableUuid(value){
  const bytes=createHash('sha256').update(`wemove:${value}`).digest().subarray(0,16);
  bytes[6]=(bytes[6]&0x0f)|0x50;bytes[8]=(bytes[8]&0x3f)|0x80;
  const hex=bytes.toString('hex');
  return `${hex.slice(0,8)}-${hex.slice(8,12)}-${hex.slice(12,16)}-${hex.slice(16,20)}-${hex.slice(20)}`;
}

if(products.length!==24)throw new Error(`Expected 24 catalog products, received ${products.length}.`);
for(const key of ['slug','sku','image']){
  if(new Set(products.map(product=>product[key])).size!==products.length)throw new Error(`Product ${key} values must be unique.`);
}

const mediaDir=resolve(root,'.local/media');
await mkdir(mediaDir,{recursive:true});
const pool=new Pool({connectionString:process.env.DATABASE_URL});
const client=await pool.connect();
try{
  await client.query('BEGIN');
  for(const [index,product] of products.entries()){
    const productId=stableUuid(`product:${product.slug}`);
    const mediaId=stableUuid(`media:${product.slug}`);
    const variantId=stableUuid(`variant:${product.slug}`);
    const image=await readFile(resolve(root,'assets/products',product.image));
    const metadata=await sharp(image).metadata();
    if(metadata.format!=='webp'||!metadata.width||!metadata.height)throw new Error(`Invalid product image: ${product.image}`);
    await writeFile(resolve(mediaDir,`${mediaId}.webp`),image);
    await client.query(`INSERT INTO media(id,file_name,alt,width,height) VALUES($1,$2,$3,$4,$5)
      ON CONFLICT(id) DO UPDATE SET file_name=excluded.file_name,alt=excluded.alt,width=excluded.width,height=excluded.height`,
      [mediaId,`${mediaId}.webp`,product.image_alt,metadata.width,metadata.height]);
    const values=[productId,product.slug,product.name,product.summary,product.description,product.category,product.age_min,product.age_max,
      product.environment,JSON.stringify(product.features),JSON.stringify(product.specs),product.safety_notes,mediaId,product.seo_title,product.seo_description];
    const saved=await client.query(`INSERT INTO products(id,slug,name,summary,description,category,age_min,age_max,environment,features,specs,safety_notes,image_id,status,seo_title,seo_description)
      VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,'active',$14,$15)
      ON CONFLICT(slug) DO UPDATE SET name=excluded.name,summary=excluded.summary,description=excluded.description,category=excluded.category,
      age_min=excluded.age_min,age_max=excluded.age_max,environment=excluded.environment,features=excluded.features,specs=excluded.specs,
      safety_notes=excluded.safety_notes,image_id=excluded.image_id,status='active',seo_title=excluded.seo_title,seo_description=excluded.seo_description,
      version=products.version+1,updated_at=now() RETURNING id`,values);
    const actualId=saved.rows[0].id;
    const variant=await client.query('UPDATE variants SET sku=$1 WHERE product_id=$2 AND is_default RETURNING id',[product.sku,actualId]);
    if(!variant.rowCount)await client.query('INSERT INTO variants(id,product_id,sku) VALUES($1,$2,$3)',[variantId,actualId,product.sku]);
    await client.query(`INSERT INTO audit_logs(id,action,entity,entity_id,after_value) VALUES($1,'catalog_seed','product',$2,$3)
      ON CONFLICT(id) DO UPDATE SET after_value=excluded.after_value`,
      [stableUuid(`audit:${product.slug}:${index}`),actualId,{slug:product.slug,sku:product.sku,status:'active'}]);
  }
  await client.query('COMMIT');
  console.log(`Published ${products.length} products with catalog images.`);
}catch(error){
  await client.query('ROLLBACK');throw error;
}finally{
  client.release();await pool.end();
}
