'use client';
import Link from 'next/link';
import {useState} from 'react';
export default function Login(){const[error,setError]=useState(''),[busy,setBusy]=useState(false);
 async function submit(e:React.FormEvent<HTMLFormElement>){e.preventDefault();setBusy(true);setError('');const data=new FormData(e.currentTarget);
  try{const res=await fetch('/api/auth/login',{method:'POST',headers:{'Content-Type':'application/json','x-wm-csrf':'1'},body:JSON.stringify(Object.fromEntries(data))});const body=await res.json();if(!res.ok)throw new Error(body.message);window.location.href='/admin';}catch(e){setError(e instanceof Error?e.message:'Sign-in failed.');setBusy(false);}}
 return <main className="login-page" id="main-content"><Link href="/" className="wordmark">WEMOVE<span>SPORTS</span></Link><div className="login-panel"><p className="eyebrow">TEAM WORKSPACE</p><h1>Welcome back.</h1><p>Sign in to manage the collection and customer inquiries.</p><form onSubmit={submit}>{error&&<div className="error-summary" role="alert">{error}</div>}
 <label>Email<input type="email" name="email" autoComplete="username" required/></label><label>Password<input type="password" name="password" autoComplete="current-password" maxLength={128} required/></label><label>Authenticator code<input name="code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} autoComplete="one-time-code" required/><small>Enter the current six-digit code from your authenticator.</small></label><button className="button" disabled={busy}>{busy?'Signing in…':'Sign in →'}</button></form></div><Link href="/">← Return to website</Link></main>;
}
