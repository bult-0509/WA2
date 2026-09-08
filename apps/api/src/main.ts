/**
 * 模块说明：API 启动与全局边界
 *
 * 所在层：NestJS 入口层
 * 主要职责：装配控制器、健康检查、统一错误格式和请求防护
 * 输入：环境变量与来自浏览器的 HTTP 请求
 * 输出：监听中的 API 服务和结构一致的响应
 *
 * 执行流程：
 * 1. 读取根目录环境配置。
 * 2. 安装请求体、CSRF 和错误中间件。
 * 3. 启动本机回环地址上的服务。
 *
 * 约束：写请求必须同时满足同源和自定义请求头检查。
 * 失败处理：验证错误与数据库故障映射为稳定状态码。
 * 维护提示：新增控制器时在 AppModule 注册并保持全局前缀。
 * 验证重点：健康端点、错误字段、正文上限和关闭钩子。
 */
import 'reflect-metadata';
import { ArgumentsHost, Catch, Controller, ExceptionFilter, Get, HttpException, Module, ServiceUnavailableException } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { config } from 'dotenv';
import { resolve } from 'node:path';
import { randomUUID } from 'node:crypto';
import { json, Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { Database } from './database';
import { AuthController, StaffGuard, RateLimiter } from './auth';
import { CatalogController } from './catalog';
import { ContentController } from './content';

config({ path: resolve(__dirname, '../../../.env'), quiet: true });

@Catch()
class ApiErrors implements ExceptionFilter {
  catch(error: unknown, host: ArgumentsHost) {
    const response = host.switchToHttp().getResponse<Response>();
    let status = 500; let message = 'The request could not be completed.'; let code = 'INTERNAL_ERROR';
    const field_errors: Record<string,string> = {};
    if (error instanceof ZodError) {
      status=400;code='VALIDATION_ERROR';message='Please check the highlighted fields.';
      for(const issue of error.issues) field_errors[issue.path.join('.')||'form']=issue.message;
    } else if (error instanceof HttpException) {
      status=error.getStatus();code=`HTTP_${status}`;message=error.message;
    } else if ((error as {code?:string})?.code==='23505') {
      status=409;code='DUPLICATE_VALUE';message='This SKU or URL already exists.';
    } else if (['ECONNREFUSED','57P01','42P01'].includes((error as {code?:string})?.code||'')) {
      status=503;code='DATABASE_NOT_READY';message='Database setup is incomplete or temporarily unavailable.';
    }
    response.status(status).json({code,message,field_errors,request_id:randomUUID()});
  }
}
@Controller('health')
class HealthController {
  constructor(private readonly db:Database){}
  @Get('live') live(){return {status:'ok',service:'wemove-api',request_id:randomUUID()};}
  @Get('ready') async ready(){
    const database=await this.db.ready();
    if(database!=='connected')throw new ServiceUnavailableException('Database connection is not ready.');
    return {status:'ok',database,request_id:randomUUID()};
  }
}
@Module({controllers:[HealthController,AuthController,CatalogController,ContentController],providers:[Database,StaffGuard,RateLimiter]})
class AppModule{}
async function bootstrap(){
  const app=await NestFactory.create(AppModule,{bodyParser:false});
  app.use(json({limit:'5mb'}));
  app.use((req:Request,res:Response,next:NextFunction)=>{
    res.setHeader('X-Content-Type-Options','nosniff');
    res.setHeader('Cache-Control','no-store');
    // 同源校验与自定义请求头联合防护。前端代理必须原样传入浏览器来源。
    if(!['GET','HEAD','OPTIONS'].includes(req.method)){
      if(req.headers.origin!==(process.env.WEB_ORIGIN||'http://127.0.0.1:3100') || req.headers['x-wm-csrf']!=='1'){
        res.status(403).json({code:'CSRF_REJECTED',message:'Request origin could not be verified.',field_errors:{},request_id:randomUUID()});return;
      }
    }
    next();
  });
  app.useGlobalFilters(new ApiErrors());app.setGlobalPrefix('api/v1');app.enableShutdownHooks();
  await app.listen(Number(process.env.API_PORT||3101),'127.0.0.1');
}
bootstrap().catch(()=>{process.exitCode=1;});
