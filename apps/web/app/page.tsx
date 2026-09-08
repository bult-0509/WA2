/**
 * 模块说明：官网首页
 *
 * 所在层：Next.js 展示层
 * 主要职责：读取可维护首页文案并展示主要产品入口
 * 输入：当前语言、首页内容 API 和产品目录
 * 输出：品牌首屏、精选产品与行动入口
 *
 * 执行流程：
 * 1. 并行读取内容和产品。
 * 2. 根据语言组织界面固定文字。
 * 3. 复用商品卡呈现公开数据。
 *
 * 约束：接口失败不能阻止整个页面呈现可恢复状态。
 * 失败处理：读取失败时使用最小后备内容。
 * 维护提示：首页字段变更应同步后台编辑表单。
 * 验证重点：无数据、接口失败、两种语言和精选卡片数量。
 */
import Link from 'next/link';
import {api,HomeContent,ProductList} from '../lib/api';
import {Site,ProductCard,Unavailable} from '../components/site';
import {getLocale} from '../lib/locale';
import {localizeDefaultContent,pick} from '../lib/i18n';
export const dynamic='force-dynamic';
export default async function Home(){
 const locale=await getLocale();
 let content:HomeContent;let products:ProductList;
 try{[content,products]=await Promise.all([api<HomeContent>('content/home'),api<ProductList>('products')]);}catch{return <Site><Unavailable/></Site>;}
 return <Site><section className="hero"><div className="hero-copy"><p className="eyebrow">{pick(locale,'MOVEMENT STARTS WITH PLAY','从玩耍开始运动')}</p><h1>{localizeDefaultContent(locale,content.data.hero_title)}</h1><p className="lead">{localizeDefaultContent(locale,content.data.hero_subtitle)}</p><Link href="/products" className="button">{localizeDefaultContent(locale,content.data.cta_label)} <span aria-hidden="true">↗</span></Link><div className="hero-caption"><span className="line"/>{pick(locale,'Small moments. More movement.','从小小日常，走向更多运动。')}</div></div>
 <div className="play-art" aria-hidden="true"><span className="art-label">{pick(locale,'PLAY IS A WAY OF MOVING.','玩耍也是一种运动。')}</span><div className="orb orb-one"/><div className="orb orb-two"/><div className="art-ring"/><span className="art-word">move.</span><div className="art-baseline"><span>{pick(locale,'01 / EVERYDAY PLAY','01 / 日常玩耍')}</span><span>WEMOVE SPORTS</span></div></div></section>
 <section className="activity-strip"><span>{pick(locale,'MAKE SPACE FOR','为兴趣留出空间')}</span><Link href="/products?category=Bowling">{pick(locale,'Bowling','保龄球')} <span>↗</span></Link><Link href="/products?category=Balance+%26+coordination">{pick(locale,'Balance & coordination','平衡与协调')} <span>↗</span></Link><Link href="/products?category=Outdoor+games">{pick(locale,'Outdoor games','户外游戏')} <span>↗</span></Link></section>
 <section className="home-collection"><div className="section-heading"><div><p className="eyebrow">{pick(locale,'THE COLLECTION','产品系列')}</p><h2>{pick(locale,'More ways to play.','发现更多玩法。')}</h2></div><Link className="text-link" href="/products">{pick(locale,'Explore all products','浏览全部产品')} ↗</Link></div>
 {products.items.length?<div className="product-grid">{products.items.slice(0,3).map(p=><ProductCard product={p} key={p.id}/>)}</div>:<div className="collection-placeholder"><span className="large-number">01—03</span><div><h3>{pick(locale,'A new collection is taking shape.','新产品系列正在准备中。')}</h3><p>{pick(locale,'We’re preparing the product details. Have something in mind?','我们正在整理产品资料。如有想法，欢迎告诉我们。')}</p><Link className="text-link" href="/contact">{pick(locale,'Start a conversation','联系我们')} ↗</Link></div></div>}</section>
 <section className="story-band"><p className="eyebrow">{pick(locale,'TIME WELL PLAYED','认真享受玩耍时光')}</p><h2>{pick(locale,'A little movement.','一点运动。')}<br/>{pick(locale,'A lot of together.','更多陪伴。')}</h2><p>{localizeDefaultContent(locale,content.data.about)}</p><Link href="/about" className="text-link">{pick(locale,'Discover our story','了解品牌故事')} ↗</Link></section>
 <section className="partner-band"><div><p className="eyebrow">{pick(locale,'FOR RETAILERS & PARTNERS','面向零售商与合作伙伴')}</p><h2>{pick(locale,'Bring more play','把更多玩耍')}<br/>{pick(locale,'to your world.','带进日常。')}</h2></div><div><p>{pick(locale,'Interested in WEMOVE SPORTS for your store, school or next project?','希望把 WEMOVE SPORTS 带进门店、学校或下一个项目？')}</p><Link className="button" href="/contact">{pick(locale,'Let’s talk','联系我们')} ↗</Link></div></section></Site>;
}
