import Link from 'next/link';
import {notFound} from 'next/navigation';
import {api,ApiError,Product} from '../../../lib/api';
import {Site,Unavailable} from '../../../components/site';
import {getLocale} from '../../../lib/locale';
import {displayCategory,displayEnvironment,pick} from '../../../lib/i18n';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 const locale=await getLocale();
 try{const p=await api<Product>(`products/${encodeURIComponent((await params).slug)}`);return {title:p.seo_title||p.name,description:p.seo_description||p.summary};}catch{return {title:pick(locale,'Product · WEMOVE SPORTS','产品 · WEMOVE SPORTS')};}
}
export default async function Detail({params}:{params:Promise<{slug:string}>}){
 const locale=await getLocale();
 let p:Product;try{p=await api(`products/${encodeURIComponent((await params).slug)}`);}catch(e){if(e instanceof ApiError&&e.status===404)notFound();return <Site><Unavailable/></Site>;}
 return <Site><section className="detail-section"><nav className="breadcrumb" aria-label={pick(locale,'Breadcrumb','路径导航')}><Link href="/products">{pick(locale,'Products','产品')}</Link><span>/</span><span>{p.name}</span></nav>
 <div className="detail-top"><div className="detail-image">{p.image_id?<img src={`/api/media/${p.image_id}`} alt={p.image_alt||p.name} width="1000" height="1000"/>:<span>{pick(locale,'Image to come','图片待补充')}</span>}</div>
 <div className="detail-copy"><p className="eyebrow">{displayCategory(locale,p.category)}</p><h1>{p.name}</h1><p className="lead">{p.summary}</p><p className="muted">SKU {p.sku} · {pick(locale,'Ages','适龄')} {p.age_min}–{p.age_max}</p>
 {p.status==='archived'?<div className="notice">{pick(locale,'This product is no longer available.','该产品已停止供应。')} <Link href="/products">{pick(locale,'Explore the current collection.','浏览当前产品系列。')}</Link></div>:<Link className="button" href={`/contact?product=${p.id}&name=${encodeURIComponent(p.name)}`}>{pick(locale,'Ask about this product','咨询该产品')} ↗</Link>}
 <ul className="features">{p.features.map((f,i)=><li key={i}>{f}</li>)}</ul></div></div>
 <div className="detail-bottom"><section><p className="eyebrow">{pick(locale,'DISCOVER','详细了解')}</p><h2>{pick(locale,'A closer look.','进一步了解。')}</h2><p className="preserve-text">{p.description}</p><h3>{pick(locale,'Safety & care','安全与保养')}</h3><p className="preserve-text">{p.safety_notes}</p></section>
 <section><h2>{pick(locale,'Product details','产品详情')}</h2><dl className="specs"><div><dt>{pick(locale,'Recommended age','建议年龄')}</dt><dd>{p.age_min}–{p.age_max}</dd></div><div><dt>{pick(locale,'Play space','使用空间')}</dt><dd>{displayEnvironment(locale,p.environment)}</dd></div>{Object.entries(p.specs).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section></div></section></Site>;
}
