'use client';
import {useRef,useState} from 'react';
export function ContactForm({productId,productName}:{productId?:string;productName?:string}){
 const [busy,setBusy]=useState(false),[reference,setReference]=useState(''),[error,setError]=useState(''),[fields,setFields]=useState<Record<string,string>>({});
 const key=useRef<string|null>(null),summary=useRef<HTMLDivElement>(null);
 async function submit(event:React.FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');setFields({});
  const data=new FormData(event.currentTarget);key.current??=crypto.randomUUID();
  try{const response=await fetch('/api/forms/contact',{method:'POST',headers:{'Content-Type':'application/json','x-wm-csrf':'1'},body:JSON.stringify({
    name:data.get('name'),email:data.get('email'),country:data.get('country'),type:data.get('type'),subject:data.get('subject'),message:data.get('message'),
    website:data.get('website'),consent:data.get('consent')==='on',product_id:productId||null,idempotency_key:key.current,
  })});const result=await response.json();if(!response.ok){if(response.status===409)key.current=null;setFields(result.field_errors||{});throw new Error(result.message);}
  setReference(result.reference);
  }catch(e){setError(e instanceof Error?e.message:'Please try again.');setTimeout(()=>summary.current?.focus(),0);}finally{setBusy(false);}
 }
 if(reference)return <div className="success-panel" role="status"><p className="eyebrow">MESSAGE RECEIVED</p><h2>Thank you for reaching out.</h2><p>Your reference is <strong>{reference}</strong>.</p><p>Your message has been saved for the team to review. Email confirmations are not enabled in this local preview.</p><a className="button secondary" href="/products">Explore products</a></div>;
 const errorFor=(name:string)=>fields[name]?<small id={`${name}-error`} className="field-error">{fields[name]}</small>:null;
 return <form onSubmit={submit} className="contact-form">
 {error&&<div className="error-summary" role="alert" tabIndex={-1} ref={summary}><strong>{error}</strong>{Object.entries(fields).map(([key,value])=><a href={`#${key}`} key={key}>{value}</a>)}</div>}
 {productName&&<p className="notice">Product question: {productName}</p>}
 <div className="form-columns">{[{name:'name',label:'Your name',type:'text',max:100},{name:'email',label:'Email address',type:'email',max:254},{name:'country',label:'Country / region',type:'text',max:80}].map(f=><label key={f.name}>{f.label}<input id={f.name} name={f.name} type={f.type} maxLength={f.max} required aria-describedby={`${f.name}-error`}/>{errorFor(f.name)}</label>)}
 <label>How can we help?<select name="type" id="type" defaultValue={productId?'Product Question':'General'}><option>General</option><option>Product Question</option><option>Dealer Inquiry</option></select></label></div>
 <label>Subject<input id="subject" name="subject" minLength={3} maxLength={160} required defaultValue={productName?`Question about ${productName}`:''} aria-describedby="subject-error"/>{errorFor('subject')}</label>
 <label>Message<textarea id="message" name="message" rows={5} minLength={10} maxLength={5000} required aria-describedby="message-error"/>{errorFor('message')}</label>
 <label className="honeypot" aria-hidden="true">Website<input name="website" tabIndex={-1} autoComplete="off"/></label>
 <label className="checkbox"><input id="consent" name="consent" type="checkbox" required/><span>I agree that my details will be used to respond to this inquiry. <a href="/privacy">Read the privacy notice.</a></span></label>{errorFor('consent')}
 <button className="button" disabled={busy}>{busy?'Sending…':'Send your message ↗'}</button></form>;
}
