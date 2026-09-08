/**
 * 模块说明：前端数据访问封装
 *
 * 所在层：Next.js 数据层
 * 主要职责：集中定义 API 类型、地址和服务端读取行为
 * 输入：API 路径与请求缓存选项
 * 输出：类型化数据或可识别的请求错误
 *
 * 执行流程：
 * 1. 拼接固定服务地址。
 * 2. 执行不缓存请求。
 * 3. 验证响应状态后解析 JSON。
 *
 * 约束：浏览器组件通过同源代理访问，服务端读取本机 API。
 * 失败处理：非成功状态统一抛错交给页面处理。
 * 维护提示：API 响应变化必须先更新共享类型。
 * 验证重点：超时、非 JSON 错误、字段缺失和分页类型。
 */
export interface Product {
 id:string;slug:string;name:string;sku:string;summary:string;description:string;category:string;
 age_min:number;age_max:number;environment:string;features:string[];specs:Record<string,string>;
 safety_notes:string;image_id:string|null;image_alt:string|null;status:string;version:number;
 seo_title:string;seo_description:string;
}
export interface ProductList {items:Product[];total:number;page:number;pageSize:number}
export interface HomeContent {data:{hero_title:string;hero_subtitle:string;about:string;cta_label:string};version:number}
export class ApiError extends Error {constructor(public status:number,message:string){super(message);}}
// 公共内容由服务器获取，数据库配置与后台凭据不进入客户端代码。
export async function api<T>(path:string):Promise<T>{
 const response=await fetch(`http://127.0.0.1:3101/api/v1/${path}`,{cache:'no-store',signal:AbortSignal.timeout(5000)});
 if(!response.ok)throw new ApiError(response.status,'Content is temporarily unavailable. Please try again shortly.');
 return response.json();
}
