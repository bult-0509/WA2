'use client';
/**
 * 模块说明：咨询表单组件
 *
 * 所在层：Next.js 客户端交互层
 * 主要职责：管理联系表单提交、幂等键、字段错误和成功回执
 * 输入：用户输入、可选商品信息和语言上下文
 * 输出：咨询编号或可定位的错误摘要
 *
 * 执行流程：
 * 1. 生成并保留一次提交标识。
 * 2. 发送同源 JSON 请求。
 * 3. 映射字段错误并移动焦点。
 *
 * 约束：重试同一内容复用幂等键，冲突后才更换。
 * 失败处理：网络或校验失败时保留输入并恢复按钮。
 * 维护提示：修改字段时同步 aria 描述和后端 schema。
 * 验证重点：双击提交、409 冲突、键盘焦点与成功状态。
 */
import {useRef,useState} from 'react';
import {useLocale} from './language-provider';
import {localizeApiMessage,pick} from '../lib/i18n';
export function ContactForm({productId,productName}:{productId?:string;productName?:string}){
 const{locale}=useLocale();
 const [busy,setBusy]=useState(false),[reference,setReference]=useState(''),[error,setError]=useState(''),[fields,setFields]=useState<Record<string,string>>({});
 const key=useRef<string|null>(null),summary=useRef<HTMLDivElement>(null);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');setFields({});
  const data=new FormData(event.currentTarget);key.current??=crypto.randomUUID();
  try{const response=await fetch('/api/forms/contact',{method:'POST',headers:{'Content-Type':'application/json','x-wm-csrf':'1'},body:JSON.stringify({
    name:data.get('name'),email:data.get('email'),country:data.get('country'),type:data.get('type'),subject:data.get('subject'),message:data.get('message'),
    website:data.get('website'),consent:data.get('consent')==='on',product_id:productId||null,idempotency_key:key.current,
  })});const result=await response.json();if(!response.ok){if(response.status===409)key.current=null;setFields(result.field_errors||{});throw new Error(result.message);}
  setReference(result.reference);
  }catch(e){setError(localizeApiMessage(locale,e instanceof Error?e.message:'Please try again.'));setTimeout(()=>summary.current?.focus(),0);}finally{setBusy(false);}
 }
 if(reference)return <div className="success-panel" role="status"><p className="eyebrow">{pick(locale,'MESSAGE RECEIVED','已收到消息')}</p><h2>{pick(locale,'Thank you for reaching out.','感谢您的联系。')}</h2><p>{pick(locale,'Your reference is','您的咨询编号为')} <strong>{reference}</strong>.</p><p>{pick(locale,'Your message has been saved for the team to review. Email confirmations are not enabled in this local preview.','消息已保存，团队稍后会进行查看。本地预览暂未启用邮件确认。')}</p><a className="button secondary" href="/products">{pick(locale,'Explore products','浏览产品')}</a></div>;
 const errorFor=(name:string)=>fields[name]?<small id={`${name}-error`} className="field-error">{fields[name]}</small>:null;
 return <form onSubmit={submit} className="contact-form">
 {error&&<div className="error-summary" role="alert" tabIndex={-1} ref={summary}><strong>{error}</strong>{Object.entries(fields).map(([key,value])=><a href={`#${key}`} key={key}>{value}</a>)}</div>}
 {productName&&<p className="notice">{pick(locale,'Product question','产品咨询')}: {productName}</p>}
 <div className="form-columns">{[{name:'name',label:pick(locale,'Your name','姓名'),type:'text',max:100},{name:'email',label:pick(locale,'Email address','邮箱地址'),type:'email',max:254},{name:'country',label:pick(locale,'Country / region','国家或地区'),type:'text',max:80}].map(f=><label key={f.name}>{f.label}<input id={f.name} name={f.name} type={f.type} maxLength={f.max} required aria-describedby={`${f.name}-error`}/>{errorFor(f.name)}</label>)}
 <label>{pick(locale,'How can we help?','需要哪方面的帮助？')}<select name="type" id="type" defaultValue={productId?'Product Question':'General'}><option value="General">{pick(locale,'General','一般咨询')}</option><option value="Product Question">{pick(locale,'Product Question','产品咨询')}</option><option value="Dealer Inquiry">{pick(locale,'Dealer Inquiry','经销商咨询')}</option></select></label></div>
 <label>{pick(locale,'Subject','主题')}<input id="subject" name="subject" minLength={3} maxLength={160} required defaultValue={productName?pick(locale,`Question about ${productName}`,`咨询产品 ${productName}`):''} aria-describedby="subject-error"/>{errorFor('subject')}</label>
 <label>{pick(locale,'Message','消息')}<textarea id="message" name="message" rows={5} minLength={10} maxLength={5000} required aria-describedby="message-error"/>{errorFor('message')}</label>
 <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
 <label className="checkbox"><input id="consent" name="consent" type="checkbox" required/><span>{pick(locale,'I agree that my details will be used to respond to this inquiry.','我同意使用所填信息回复本次咨询。')} <a href="/privacy">{pick(locale,'Read the privacy notice.','阅读隐私说明。')}</a></span></label>{errorFor('consent')}
 <button className="button" disabled={busy}>{busy?pick(locale,'Sending…','正在发送…'):pick(locale,'Send your message ↗','发送消息 ↗')}</button></form>;
}
