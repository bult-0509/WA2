/**
 * 模块说明：商品目录页面
 *
 * 所在层：Next.js 展示层
 * 主要职责：提供搜索、分类、年龄、环境筛选和分页浏览
 * 输入：URL 查询参数、语言和公开目录 API
 * 输出：筛选后的商品卡片与分页导航
 *
 * 执行流程：
 * 1. 解析允许的查询参数。
 * 2. 请求服务端分页目录。
 * 3. 保留筛选条件生成翻页链接。
 *
 * 约束：查询参数要经过 API 再次校验，前端不承担安全判断。
 * 失败处理：空结果与接口失败分别给出明确界面。
 * 维护提示：新增筛选项时同步 URL、API schema 与表单。
 * 验证重点：组合筛选、最后一页、空目录和特殊字符。
 */
import Link from 'next/link';
import {api,ProductList} from '../../lib/api';
import {Site,ProductCard,Unavailable} from '../../components/site';
import {getLocale} from '../../lib/locale';
import {displayCategory,pick} from '../../lib/i18n';
export async function generateMetadata(){const locale=await getLocale();return {title:pick(locale,'Products · WEMOVE SPORTS','产品 · WEMOVE SPORTS')};}
export default async function Products({searchParams}:{searchParams:Promise<Record<string,string|string[]|undefined>>}){
 const locale=await getLocale();
 const query=await searchParams;const params=new URLSearchParams();for(const key of ['q','category','sort','page','age','environment'])if(typeof query[key]==='string'&&query[key]!=='')params.set(key,query[key]);
 let results:ProductList;try{results=await api(`products?${params}`);}catch{return <Site><Unavailable/></Site>;}
 const pageLink=(page:number)=>{const next=new URLSearchParams(params);next.set('page',String(page));return `/products?${next}`;};
 return <Site><section className="page-heading"><p className="eyebrow">{pick(locale,'THE COLLECTION','产品系列')}</p><h1>{pick(locale,'Find your next','寻找下一种')}<br/>{pick(locale,'way to play.','快乐玩法。')}</h1><p>{pick(locale,'Explore by age, activity and the space around you.','按年龄、活动类型和使用空间查找产品。')}</p></section>
 <section className="catalog-section"><form className="filters" action="/products">
 <label>{pick(locale,'Search','搜索')}<input name="q" type="search" placeholder={pick(locale,'Name or SKU','名称或 SKU')} defaultValue={params.get('q')||''}/></label>
 <label>{pick(locale,'Activity','活动类型')}<select name="category" defaultValue={params.get('category')||''}><option value="">{pick(locale,'All activities','全部活动')}</option>{['Bowling','Balance & coordination','Outdoor games'].map(v=><option key={v} value={v}>{displayCategory(locale,v)}</option>)}</select></label>
 <label>{pick(locale,'Age','年龄')}<input name="age" type="number" min="0" max="99" placeholder={pick(locale,'Any age','不限')} defaultValue={params.get('age')||''}/></label>
 <label>{pick(locale,'Play space','使用空间')}<select name="environment" defaultValue={params.get('environment')||''}><option value="">{pick(locale,'Anywhere','不限场地')}</option><option value="indoor">{pick(locale,'Indoor','室内')}</option><option value="outdoor">{pick(locale,'Outdoor','户外')}</option></select></label>
 <label>{pick(locale,'Sort','排序')}<select name="sort" defaultValue={params.get('sort')||'newest'}><option value="newest">{pick(locale,'Newest','最新')}</option><option value="name">{pick(locale,'Name A–Z','名称 A–Z')}</option></select></label>
 <button className="button" type="submit">{pick(locale,'Apply filters','应用筛选')}</button><Link className="text-link" href="/products">{pick(locale,'Clear','清除')}</Link>
 </form><p className="result-count">{locale==='zh'?`共 ${results.total} 件产品`:`${results.total} ${results.total===1?'product':'products'}`}</p>
 {results.items.length?<div className="product-grid">{results.items.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="empty-state"><h2>{params.toString()?pick(locale,'No products match these filters.','没有符合筛选条件的产品。'):pick(locale,'Our collection is being prepared.','产品系列正在准备中。')}</h2><p>{params.toString()?pick(locale,'Try a different activity or clear the filters.','请尝试其他条件，或清除筛选。'):pick(locale,'Product details will appear here once they are ready to share.','产品资料准备完成后会在这里展示。')}</p><Link className="button secondary" href={params.toString()?'/products':'/contact'}>{params.toString()?pick(locale,'Clear filters','清除筛选'):pick(locale,'Ask a product question','咨询产品')}</Link></div>}
 <nav className="pagination" aria-label={pick(locale,'Product pages','产品分页')}>{results.page>1&&<Link href={pageLink(results.page-1)}>← {pick(locale,'Previous','上一页')}</Link>}<span>{locale==='zh'?`第 ${results.page} 页，共 ${Math.max(1,Math.ceil(results.total/12))} 页`:`Page ${results.page} of ${Math.max(1,Math.ceil(results.total/12))}`}</span>{results.page*12<results.total&&<Link href={pageLink(results.page+1)}>{pick(locale,'Next','下一页')} →</Link>}</nav>
 </section></Site>;
}
