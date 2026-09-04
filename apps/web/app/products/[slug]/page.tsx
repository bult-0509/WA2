import Link from 'next/link';
import {notFound} from 'next/navigation';
import {api,ApiError,Product} from '../../../lib/api';
import {Site,Unavailable} from '../../../components/site';
export async function generateMetadata({params}:{params:Promise<{slug:string}>}){
 try{const p=await api<Product>(`products/${encodeURIComponent((await params).slug)}`);return {title:p.seo_title||p.name,description:p.seo_description||p.summary};}catch{return {title:'Product · WEMOVE SPORTS'};}
}
export default async function Detail({params}:{params:Promise<{slug:string}>}){
 let p:Product;try{p=await api(`products/${encodeURIComponent((await params).slug)}`);}catch(e){if(e instanceof ApiError&&e.status===404)notFound();return <Site><Unavailable/></Site>;}
 return <Site><section className="detail-section"><nav className="breadcrumb" aria-label="Breadcrumb"><Link href="/products">Products</Link><span>/</span><span>{p.name}</span></nav>
 <div className="detail-top"><div className="detail-image">{p.image_id?<img src={`/api/media/${p.image_id}`} alt={p.image_alt||p.name} width="1000" height="1000"/>:<span>Image to come</span>}</div>
 <div className="detail-copy"><p className="eyebrow">{p.category}</p><h1>{p.name}</h1><p className="lead">{p.summary}</p><p className="muted">SKU {p.sku} · Ages {p.age_min}–{p.age_max}</p>
 {p.status==='archived'?<div className="notice">This product is no longer available. <Link href="/products">Explore the current collection.</Link></div>:<Link className="button" href={`/contact?product=${p.id}&name=${encodeURIComponent(p.name)}`}>Ask about this product ↗</Link>}
 <ul className="features">{p.features.map((f,i)=><li key={i}>{f}</li>)}</ul></div></div>
 <div className="detail-bottom"><section><p className="eyebrow">DISCOVER</p><h2>A closer look.</h2><p className="preserve-text">{p.description}</p><h3>Safety & care</h3><p className="preserve-text">{p.safety_notes}</p></section>
 <section><h2>Product details</h2><dl className="specs"><div><dt>Recommended age</dt><dd>{p.age_min}–{p.age_max}</dd></div><div><dt>Play space</dt><dd>{p.environment}</dd></div>{Object.entries(p.specs).map(([key,value])=><div key={key}><dt>{key}</dt><dd>{value}</dd></div>)}</dl></section></div></section></Site>;
}
