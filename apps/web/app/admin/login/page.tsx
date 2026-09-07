'use client';
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
