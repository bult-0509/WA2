'use client';
/**
 * 模块说明：后台登录页面
 *
 * 所在层：Next.js 交互层
 * 主要职责：收集邮箱、密码和动态验证码并建立后台会话
 * 输入：登录表单和 API 错误
 * 输出：已认证会话或可操作的错误提示
 *
 * 执行流程：
 * 1. 提交三项凭据。
 * 2. 调用同源认证代理。
 * 3. 成功后跳转后台首页。
 *
 * 约束：敏感字段不写入浏览器持久存储。
 * 失败处理：失败时保留页面并显示服务端通用消息。
 * 维护提示：认证字段变化必须同步 API 的登录 schema。
 * 验证重点：错误密码、六位验证码、重复提交和键盘操作。
 */
import Link from 'next/link';
import {useState} from 'react';
import {LanguageSwitcher,useLocale} from '../../../components/language-provider';
import {localizeApiMessage,pick} from '../../../lib/i18n';
export default function Login(){const[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const{locale}=useLocale();
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const data=new FormData(e.currentTarget);
  try{const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-wm-csrf':'1'},body:JSON.stringify(Object.fromEntries(data))});const body=await res.json();if(!res.ok)throw new Error(body.message);window.location.href='/admin';}catch(e){setError(localizeApiMessage(locale,e instanceof Error?e.message:'Sign-in failed.'));setBusy(false);}}
 return <main className="login-page" id="main-content"><div className="login-top"><Link href="/" className="wordmark">WEMOVE<span>SPORTS</span></Link><LanguageSwitcher compact/></div><div className="login-panel"><p className="eyebrow">{pick(locale,'TEAM WORKSPACE','团队工作台')}</p><h1>{pick(locale,'Welcome back.','欢迎回来。')}</h1><p>{pick(locale,'Sign in to manage the collection and customer inquiries.','登录后管理产品系列和客户咨询。')}</p><form onSubmit={submit}>{error&&<div className="error-summary" role="alert">{error}</div>}
 <label>{pick(locale,'Email','邮箱')}<input type="email" name="email" autoComplete="username" required/></label><label>{pick(locale,'Password','密码')}<input type="password" name="password" autoComplete="current-password" maxLength={128} required/></label><label>{pick(locale,'Authenticator code','动态验证码')}<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required/><small>{pick(locale,'Enter the current six-digit code from your authenticator.','输入身份验证器当前显示的六位验证码。')}</small></label><button className="button" disabled={busy}>{busy?pick(locale,'Signing in…','正在登录…'):pick(locale,'Sign in →','登录 →')}</button></form></div><Link href="/">← {pick(locale,'Return to website','返回网站')}</Link></main>;
}
