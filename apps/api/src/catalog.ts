import { Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, Res, UseGuards, BadRequestException, ForbiddenException } from '@nestjs/common';
import type { Request, Response } from 'express';
import { randomUUID } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import sharp, { Metadata } from 'sharp';
import { z } from 'zod';
import { Database } from './database';
import { StaffGuard, Permission, StaffRequest, sessionToken } from './auth';
import { digest } from './security';

const idSchema = z.string().uuid();
export const productSchema = z.object({
  name: z.string().trim().min(2).max(160), slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(160),
  sku: z.string().trim().min(2).max(60).regex(/^[A-Za-z0-9_-]+$/),
  summary: z.string().trim().max(280), description: z.string().trim().max(12000),
  category: z.enum(['Bowling', 'Balance & coordination', 'Outdoor games']),
  age_min: z.number().int().min(0).max(99), age_max: z.number().int().min(0).max(99),
  environment: z.enum(['indoor','outdoor','both']),
  features: z.array(z.string().trim().min(1).max(180)).max(6),
  specs: z.record(z.string().min(1).max(50), z.string().max(200)).refine(v => Object.keys(v).length <= 20),
  safety_notes: z.string().trim().max(4000), image_id: idSchema.nullable(),
  seo_title: z.string().trim().max(160), seo_description: z.string().trim().max(300),
  status: z.enum(['draft','active','archived']), version: z.number().int().min(1).optional(),
}).superRefine((p,ctx) => {
  if(p.age_max<p.age_min) ctx.addIssue({code:'custom',path:['age_max'],message:'Maximum age must be at least the minimum age.'});
  if(p.status==='active') {
    for(const field of ['summary','description','safety_notes','seo_title','seo_description'] as const)
      if(!p[field]) ctx.addIssue({code:'custom',path:[field],message:'Required before publishing.'});
    if(!p.image_id) ctx.addIssue({code:'custom',path:['image_id'],message:'Upload a main image before publishing.'});
    if(p.features.length<3) ctx.addIssue({code:'custom',path:['features'],message:'Add at least three specific features before publishing.'});
  }
});
const selection = `SELECT p.*,v.sku,m.alt AS image_alt FROM products p
 JOIN variants v ON v.product_id=p.id AND v.is_default LEFT JOIN media m ON m.id=p.image_id`;
const uploads = resolve(__dirname, '../../../.local/media');

@Controller()
export class CatalogController {
  constructor(private readonly db: Database) {}

  @Get('products')
  async list(@Query() query: Record<string,string>) {
    const data = z.object({ q:z.string().max(100).default(''),category:z.string().max(80).default(''),
      sort:z.enum(['newest','name']).default('newest'),page:z.coerce.number().int().min(1).max(10000).default(1),
      age:z.coerce.number().int().min(0).max(99).optional(),environment:z.enum(['indoor','outdoor']).optional() }).parse(query);
    // 排序只取白名单；所有筛选值参数化，永远不返回草稿和归档内容。
    const values:unknown[] = [`%${data.q}%`, data.category, data.age ?? null, data.environment ?? null];
    const where = `p.status='active' AND (p.name ILIKE $1 OR v.sku ILIKE $1 OR p.summary ILIKE $1)
      AND ($2='' OR p.category=$2) AND ($3::int IS NULL OR $3 BETWEEN p.age_min AND p.age_max)
      AND ($4::text IS NULL OR p.environment IN ($4,'both'))`;
    const count = await this.db.query(`SELECT count(*)::int AS total FROM products p JOIN variants v ON v.product_id=p.id AND v.is_default WHERE ${where}`, values);
    const {rows} = await this.db.query(`${selection} WHERE ${where} ORDER BY ${data.sort==='name'?'p.name ASC':'p.created_at DESC'} LIMIT 12 OFFSET $5`, [...values,(data.page-1)*12]);
    return {items:rows,total:count.rows[0].total,page:data.page,pageSize:12};
  }
  @Get('products/:slug')
  async detail(@Param('slug') slug:string) {
    const {rows} = await this.db.query(`${selection} WHERE p.slug=$1 AND p.status IN ('active','archived')`,[slug]);
    if(!rows[0]) throw new NotFoundException('Product not found.');
    return rows[0];
  }
  @Get('admin/products') @UseGuards(StaffGuard) @Permission('products:read')
  async adminList() { return (await this.db.query(`${selection} ORDER BY p.updated_at DESC`)).rows; }

  @Post('admin/products') @UseGuards(StaffGuard) @Permission('products:write')
  create(@Body() body:unknown,@Req() req:StaffRequest) { return this.save(undefined,body,req); }
  @Patch('admin/products/:id') @UseGuards(StaffGuard) @Permission('products:write')
  update(@Param('id') id:string,@Body() body:unknown,@Req() req:StaffRequest) { return this.save(idSchema.parse(id),body,req); }

  private async save(id:string|undefined,body:unknown,req:StaffRequest) {
    const p=productSchema.parse(body);
    if(p.status==='active'&&!req.staff.permissions.includes('products:publish')) throw new ForbiddenException('Publishing permission required.');
    return this.db.transaction(async client=>{
      const previous=id?(await client.query('SELECT * FROM products WHERE id=$1 FOR UPDATE',[id])).rows[0]:null;
      if(id&&!previous) throw new NotFoundException('Product not found.');
      if(previous&&previous.version!==p.version) throw new ConflictException('This product changed. Reload it before saving.');
      if(p.image_id&&!(await client.query('SELECT id FROM media WHERE id=$1',[p.image_id])).rowCount) throw new BadRequestException('Image does not exist.');
      const productId=id||randomUUID();
      const fields=['slug','name','summary','description','category','age_min','age_max','environment','features','specs','safety_notes','image_id','status','seo_title','seo_description'];
      const values=fields.map(field=>['features','specs'].includes(field)?JSON.stringify((p as any)[field]):(p as any)[field]);
      const result=id
        ?await client.query(`UPDATE products SET ${fields.map((f,i)=>`${f}=$${i+1}`).join(',')},version=version+1,updated_at=now() WHERE id=$16 RETURNING *`,[...values,productId])
        :await client.query(`INSERT INTO products(${fields.join(',')},id) VALUES(${values.map((_,i)=>`$${i+1}`).join(',')},$16) RETURNING *`,[...values,productId]);
      if(id) await client.query('UPDATE variants SET sku=$1 WHERE product_id=$2 AND is_default',[p.sku,productId]);
      else await client.query('INSERT INTO variants(id,product_id,sku) VALUES($1,$2,$3)',[randomUUID(),productId,p.sku]);
      await client.query('INSERT INTO audit_logs(id,actor,action,entity,entity_id,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6,$7)',
        [randomUUID(),req.staff.id,id?'update':'create','product',productId,previous,{...result.rows[0],sku:p.sku}]);
      return {...result.rows[0],sku:p.sku};
    });
  }

  @Post('admin/media') @UseGuards(StaffGuard) @Permission('products:write')
  async upload(@Body() body:unknown,@Req() req:StaffRequest) {
    const data=z.object({data:z.string().max(4000000),alt:z.string().trim().min(3).max(240)}).parse(body);
    const match=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/.exec(data.data);
    if(!match) throw new BadRequestException('Upload a PNG, JPEG or WebP image.');
    const input=Buffer.from(match[2],'base64');
    if(input.length>2*1024*1024) throw new BadRequestException('Images must be 2 MB or smaller.');
    let output:Buffer; let info:Metadata;
    try {
      const source=sharp(input,{limitInputPixels:25000000}); info=await source.metadata();
      if(!['png','jpeg','webp'].includes(info.format||'')) throw new Error('Unsupported image');
      output=await source.rotate().resize({width:1600,height:1600,fit:'inside',withoutEnlargement:true}).webp({quality:85}).toBuffer();
    } catch { throw new BadRequestException('The image could not be decoded safely.'); }
    const id=randomUUID(); const filename=`${id}.webp`;
    await mkdir(uploads,{recursive:true}); await writeFile(resolve(uploads,filename),output);
    await this.db.transaction(async client=>{
      await client.query('INSERT INTO media(id,file_name,alt,width,height) VALUES($1,$2,$3,$4,$5)',[id,filename,data.alt,info.width,info.height]);
      await client.query('INSERT INTO audit_logs(id,actor,action,entity,entity_id) VALUES($1,$2,$3,$4,$5)',[randomUUID(),req.staff.id,'upload','media',id]);
    });
    return {id,alt:data.alt};
  }
  @Get('media/:id')
  async media(@Param('id') id:string,@Req() req:Request,@Res() res:Response) {
    idSchema.parse(id);
    const {rows}=await this.db.query(`SELECT m.file_name FROM media m WHERE m.id=$1 AND (
      EXISTS(SELECT 1 FROM products WHERE image_id=m.id AND status IN ('active','archived')) OR
      EXISTS(SELECT 1 FROM sessions s JOIN staff u ON u.id=s.staff_id WHERE s.token_hash=$2 AND s.expires_at>now() AND u.active))`,[id,digest(sessionToken(req))]);
    if(!rows[0]) throw new NotFoundException('Image not found.');
    const image=await readFile(resolve(uploads,rows[0].file_name));
    res.setHeader('Cache-Control','private, no-store'); res.type('webp').send(image);
  }
}
