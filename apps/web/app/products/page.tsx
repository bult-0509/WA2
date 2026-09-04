import Link from 'next/link';
import {api,ProductList} from '../../lib/api';
import {Site,ProductCard,Unavailable} from '../../components/site';
export const metadata={title:'Products · WEMOVE SPORTS'};
export default async function Products({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const query=await searchParams;const params=new URLSearchParams();for(const key of ['q','category','sort','page','age','environment'])if(typeof query[key]==='string'&&query[key]!=='')params.set(key,query[key]);
 let results:ProductList;try{results=await api(`products?${params}`);}catch{return <Site><Unavailable/></Site>;}
 const pageLink=(page:number)=>{const next=new URLSearchParams(params);next.set('page',String(page));return `/products?${next}`;};
 return <Site><section className="page-heading"><p className="eyebrow">THE COLLECTION</p><h1>Find your next<br/>way to play.</h1><p>Explore by age, activity and the space around you.</p></section>
 <section className="catalog-section"><form className="filters" action="/products">
 <label>Search<input name="q" type="search" placeholder="Name or SKU" defaultValue={params.get('q')||''}/></label>
 <label>Activity<select name="category" defaultValue={params.get('category')||''}><option value="">All activities</option>{['Bowling','Balance & coordination','Outdoor games'].map(v=><option key={v}>{v}</option>)}</select></label>
 <label>Age<input name="age" type="number" min="0" max="99" placeholder="Any age" defaultValue={params.get('age')||''}/></label>
 <label>Play space<select name="environment" defaultValue={params.get('environment')||''}><option value="">Anywhere</option><option value="indoor">Indoor</option><option value="outdoor">Outdoor</option></select></label>
 <label>Sort<select name="sort" defaultValue={params.get('sort')||'newest'}><option value="newest">Newest</option><option value="name">Name A–Z</option></select></label>
 <button className="button" type="submit">Apply filters</button><Link className="text-link" href="/products">Clear</Link>
 </form><p className="result-count">{results.total} {results.total===1?'product':'products'}</p>
 {results.items.length?<div className="product-grid">{results.items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-state"><h2>{params.toString()?'No products match these filters.':'Our collection is being prepared.'}</h2><p>{params.toString()?'Try a different activity or clear the filters.':'Product details will appear here once they are ready to share.'}</p><Link className="button secondary" href={params.toString()?'/products':'/contact'}>{params.toString()?'Clear filters':'Ask a product question'}</Link></div>}
 <nav className="pagination" aria-label="Product pages">{results.page>1&&<Link href={pageLink(results.page-1)}>← Previous</Link>}<span>Page {results.page} of {Math.max(1,Math.ceil(results.total/12))}</span>{results.page*12<results.total&&<Link href={pageLink(results.page+1)}>Next →</Link>}</nav>
 </section></Site>;
}
