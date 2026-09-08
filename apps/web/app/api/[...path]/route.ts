/**
 * 模块说明：前端同源 API 代理
 *
 * 所在层：Next.js 服务端边界
 * 主要职责：把浏览器同源请求转发到本机 NestJS API
 * 输入：动态路径、方法、请求头、Cookie 与正文
 * 输出：保留状态码和必要响应头的代理响应
 *
 * 执行流程：
 * 1. 拼接受控的 API 目标地址。
 * 2. 转发请求并注入可信来源。
 * 3. 回传正文及会话 Cookie。
 *
 * 约束：路径只能指向固定的本机 API 基址。
 * 失败处理：上游不可达时返回结构化 503，而非泄露内部异常。
 * 维护提示：变更 Cookie 或 CSRF 规则时同步检查此代理。
 * 验证重点：GET 与写请求、Set Cookie、二进制媒体和断连。
 */
import type {NextRequest} from 'next/server';

async function proxy(request:NextRequest,context:{params:Promise<{path:string[]}>}){
 const {path}=await context.params;const route=path.join('/');
 // 固定上游并限制已知业务入口，避免成为任意 URL 代理。
 if(!/^(products|content|forms|auth|admin|media|health)(\/|$)/.test(route))return Response.json({message:'Not found.'},{status:404});
 if(path.some(p=>p==='..'||p.includes('/')||p.includes('\\')))return new Response(null,{status:400});
 const write=!['GET','HEAD'].includes(request.method);
 if(write&&(request.headers.get('origin')!==(process.env.WEB_ORIGIN||'http://127.0.0.1:3100')||request.headers.get('x-wm-csrf')!=='1')){
  return Response.json({message:'Request origin could not be verified.'},{status:403});
 }
 if(Number(request.headers.get('content-length')||0)>5000000)return Response.json({message:'Upload is too large.'},{status:413});
 const headers=new Headers();
 for(const name of ['content-type','cookie','origin','x-wm-csrf']){const value=request.headers.get(name);if(value)headers.set(name,value);}
 try{
  const response=await fetch(`http://127.0.0.1:3101/api/v1/${path.map(encodeURIComponent).join('/')}${new URL(request.url).search}`,{
   method:request.method,headers,body:write?await request.arrayBuffer():undefined,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(15000),
  });
  const outgoing=new Headers({'Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
  outgoing.set('Content-Type',response.headers.get('content-type')||'application/json');
  for(const cookie of response.headers.getSetCookie())outgoing.append('Set-Cookie',cookie);
  return new Response(response.body,{status:response.status,headers:outgoing});
 }catch{return Response.json({message:'The service is temporarily unavailable. Your changes were not saved.'},{status:503});}
}
export const GET=proxy;export const POST=proxy;export const PATCH=proxy;
