/**
 * 模块说明：首页内容与咨询处理
 *
 * 所在层：NestJS 业务层
 * 主要职责：维护首页文案并把公开联系表单转成可追踪询盘
 * 输入：首页版本、联系表单、请求来源和后台身份
 * 输出：首页内容、咨询编号、询盘列表或审计结果
 *
 * 执行流程：
 * 1. 用 Zod 校验数据。
 * 2. 在事务中处理幂等写入。
 * 3. 用版本号保护后台修改。
 *
 * 约束：蜜罐字段、频率限制和产品状态共同约束提交。
 * 失败处理：冲突、失效产品或版本落后时拒绝写入。
 * 维护提示：更改表单字段时同时更新前端、迁移与哈希输入。
 * 验证重点：重复提交、并发编辑、隐私同意和状态流转。
 */
import { Body, ConflictException, Controller, Get, NotFoundException, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { Database } from './database';
import { Permission, RateLimiter, StaffGuard, StaffRequest } from './auth';
import { digest } from './security';

const contactSchema=z.object({
  idempotency_key:z.string().uuid(),name:z.string().trim().min(2).max(100),email:z.string().email().max(254),
  country:z.string().trim().min(2).max(80),type:z.enum(['General','Product Question','Dealer Inquiry']),
  subject:z.string().trim().min(3).max(160),message:z.string().trim().min(10).max(5000),
  product_id:z.string().uuid().nullable().default(null),consent:z.literal(true),website:z.string().max(0).default(''),
});
const siteSchema=z.object({hero_title:z.string().trim().min(3).max(100),hero_subtitle:z.string().trim().min(3).max(240),
  about:z.string().trim().min(10).max(4000),cta_label:z.string().trim().min(2).max(40),version:z.number().int().positive()});

@Controller()
export class ContentController {
  constructor(private readonly db:Database,private readonly limits:RateLimiter){}
  @Get('content/home') async home(){return (await this.db.query('SELECT data,version FROM site_content WHERE id=1')).rows[0];}
  @Patch('admin/content/home') @UseGuards(StaffGuard) @Permission('content:write')
  async updateHome(@Body() body:unknown,@Req() req:StaffRequest){
    const {version,...data}=siteSchema.parse(body);
    return this.db.transaction(async client=>{
      const old=(await client.query('SELECT * FROM site_content WHERE id=1 FOR UPDATE')).rows[0];
      if(old.version!==version)throw new ConflictException('Content changed. Reload before saving.');
      const result=await client.query('UPDATE site_content SET data=$1,version=version+1 WHERE id=1 RETURNING *',[data]);
      await client.query('INSERT INTO audit_logs(id,actor,action,entity,entity_id,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),req.staff.id,'update','content','home',old.data,data]);
      return result.rows[0];
    });
  }
  @Post('forms/contact')
  async contact(@Body() body:unknown,@Req() req:Request){
    const data=contactSchema.parse(body);
    await this.limits.take(`contact:${req.ip}`,15,600);
    const {idempotency_key,website,consent,...payload}=data;
    const hash=digest(JSON.stringify(payload));
    return this.db.transaction(async client=>{
      if(data.product_id&&!(await client.query("SELECT id FROM products WHERE id=$1 AND status='active'",[data.product_id])).rowCount)
        throw new NotFoundException('The selected product is no longer available.');
      const reference=`WM-${randomUUID().slice(0,8).toUpperCase()}`;
      await client.query(`INSERT INTO leads(id,reference,idempotency_key,payload_hash,name,email,country,type,subject,message,product_id)
        VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11) ON CONFLICT(idempotency_key) DO NOTHING`,
        [randomUUID(),reference,idempotency_key,hash,data.name,data.email.toLowerCase(),data.country,data.type,data.subject,data.message,data.product_id]);
      const result=(await client.query('SELECT reference,payload_hash FROM leads WHERE idempotency_key=$1',[idempotency_key])).rows[0];
      if(result.payload_hash!==hash)throw new ConflictException('This submission identifier was already used for a different message.');
      return {reference:result.reference};
    });
  }
  @Get('admin/leads') @UseGuards(StaffGuard) @Permission('leads:read')
  async leads(){return (await this.db.query('SELECT * FROM leads ORDER BY created_at DESC LIMIT 200')).rows;}
  @Patch('admin/leads/:id') @UseGuards(StaffGuard) @Permission('leads:write')
  async updateLead(@Param('id') id:string,@Body() body:unknown,@Req() req:StaffRequest){
    z.string().uuid().parse(id);
    const data=z.object({status:z.enum(['new','in_progress','resolved']),internal_note:z.string().trim().max(4000),version:z.number().int().positive()}).parse(body);
    return this.db.transaction(async client=>{
      const old=(await client.query('SELECT * FROM leads WHERE id=$1 FOR UPDATE',[id])).rows[0];
      if(!old)throw new NotFoundException('Inquiry not found.');
      if(old.version!==data.version)throw new ConflictException('Inquiry changed. Reload before saving.');
      const result=await client.query('UPDATE leads SET status=$1,internal_note=$2,version=version+1,updated_at=now() WHERE id=$3 RETURNING *',[data.status,data.internal_note,id]);
      await client.query('INSERT INTO audit_logs(id,actor,action,entity,entity_id,before_value,after_value) VALUES($1,$2,$3,$4,$5,$6,$7)',[randomUUID(),req.staff.id,'update','lead',id,{status:old.status,internal_note:old.internal_note},data]);
      return result.rows[0];
    });
  }
  @Get('admin/audit') @UseGuards(StaffGuard) @Permission('audit:read')
  async audit(){return (await this.db.query(`SELECT a.id,u.email,a.action,a.entity,a.entity_id,a.created_at
    FROM audit_logs a LEFT JOIN staff u ON u.id=a.actor ORDER BY a.created_at DESC LIMIT 100`)).rows;}
}
