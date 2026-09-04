import Link from 'next/link';
import type {Product} from '../lib/api';

export function Site({children}:{children:React.ReactNode}){return <>
 <div className="preview-bar">LOCAL PREVIEW <span>Content is being prepared for the new website.</span></div>
 <header className="site-header"><Link href="/" className="wordmark" aria-label="WEMOVE SPORTS home">WEMOVE<span>SPORTS</span></Link>
 <nav aria-label="Main navigation"><Link href="/products">Products</Link><Link href="/about">Our story</Link><Link href="/contact">Contact <span aria-hidden="true">↗</span></Link></nav></header>
 <main id="main-content">{children}</main>
 <footer className="site-footer"><div><Link href="/" className="wordmark">WEMOVE<span>SPORTS</span></Link><p>Movement. Play. Time together.</p></div>
 <nav aria-label="Footer navigation"><Link href="/products">Explore products</Link><Link href="/contact">Get in touch</Link><Link href="/privacy">Privacy</Link><Link href="/admin">Team access</Link></nav>
 <p className="footer-note">Local development preview · No retail checkout is enabled.</p></footer>
 </>;}
export function ProductCard({product:p}:{product:Product}){return <article className="product-card">
 <Link href={`/products/${p.slug}`} className="product-visual" aria-label={`Explore ${p.name}`}>
 {p.image_id?<img src={`/api/media/${p.image_id}`} alt={p.image_alt||p.name} width="600" height="600" loading="lazy"/>:<span>Image to come</span>}
 <span className="product-category">{p.category}</span></Link>
 <div className="product-meta"><span>Ages {p.age_min}–{p.age_max}</span><span>{p.environment==='both'?'Indoor & outdoor':p.environment}</span></div>
 <h3><Link href={`/products/${p.slug}`}>{p.name}</Link></h3><p>{p.summary}</p><Link className="text-link" href={`/products/${p.slug}`}>Discover more <span aria-hidden="true">↗</span></Link>
 </article>;}
export function Unavailable(){return <section className="empty-state"><h2>We couldn’t load this content.</h2><p>Please try again in a moment. No information has been lost.</p><a className="button" href="">Try again</a></section>;}
