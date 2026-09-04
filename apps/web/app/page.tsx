import Link from 'next/link';
import {api,HomeContent,ProductList} from '../lib/api';
import {Site,ProductCard,Unavailable} from '../components/site';
export const dynamic='force-dynamic';
export default async function Home(){
 let content:HomeContent;let products:ProductList;
 try{[content,products]=await Promise.all([api<HomeContent>('content/home'),api<ProductList>('products')]);}catch{return <Site><Unavailable/></Site>;}
 return <Site><section className="hero"><div className="hero-copy"><p className="eyebrow">MOVEMENT STARTS WITH PLAY</p><h1>{content.data.hero_title}</h1><p className="lead">{content.data.hero_subtitle}</p><Link href="/products" className="button">{content.data.cta_label} <span aria-hidden="true">↗</span></Link><div className="hero-caption"><span className="line"/>Small moments. More movement.</div></div>
 <div className="play-art" aria-hidden="true"><span className="art-label">PLAY IS A WAY OF MOVING.</span><div className="orb orb-one"/><div className="orb orb-two"/><div className="art-ring"/><span className="art-word">move.</span><div className="art-baseline"><span>01 / EVERYDAY PLAY</span><span>WEMOVE SPORTS</span></div></div></section>
 <section className="activity-strip"><span>MAKE SPACE FOR</span><Link href="/products?category=Bowling">Bowling <span>↗</span></Link><Link href="/products?category=Balance+%26+coordination">Balance & coordination <span>↗</span></Link><Link href="/products?category=Outdoor+games">Outdoor games <span>↗</span></Link></section>
 <section className="home-collection"><div className="section-heading"><div><p className="eyebrow">THE COLLECTION</p><h2>More ways to play.</h2></div><Link className="text-link" href="/products">Explore all products ↗</Link></div>
 {products.items.length?<div className="product-grid">{products.items.slice(0,3).map(p=><ProductCard product={p} key={p.id}/>)}</div>:<div className="collection-placeholder"><span className="large-number">01—03</span><div><h3>A new collection is taking shape.</h3><p>We’re preparing the product details. Have something in mind?</p><Link className="text-link" href="/contact">Start a conversation ↗</Link></div></div>}</section>
 <section className="story-band"><p className="eyebrow">TIME WELL PLAYED</p><h2>A little movement.<br/>A lot of together.</h2><p>{content.data.about}</p><Link href="/about" className="text-link">Discover our story ↗</Link></section>
 <section className="partner-band"><div><p className="eyebrow">FOR RETAILERS & PARTNERS</p><h2>Bring more play<br/>to your world.</h2></div><div><p>Interested in WEMOVE SPORTS for your store, school or next project?</p><Link className="button" href="/contact">Let’s talk ↗</Link></div></section></Site>;
}
