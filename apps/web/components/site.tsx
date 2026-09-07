'use client';
import Link from 'next/link';
import type {Product} from '../lib/api';
import {LanguageSwitcher,useLocale} from './language-provider';
import {displayCategory,displayEnvironment,pick} from '../lib/i18n';

export function Site({children}:{children:React.ReactNode}){const{locale}=useLocale();return <>
 <div className="preview-bar">{pick(locale,'LOCAL PREVIEW','本地预览')} <span>{pick(locale,'Content is being prepared for the new website.','新网站内容正在准备中。')}</span></div>
 <header className="site-header"><Link href="/" className="wordmark" aria-label="WEMOVE SPORTS home">WEMOVE<span>SPORTS</span></Link>
 <div className="header-actions"><nav aria-label={pick(locale,'Main navigation','主导航')}><Link href="/products">{pick(locale,'Products','产品')}</Link><Link href="/about">{pick(locale,'Our story','品牌故事')}</Link><Link href="/contact">{pick(locale,'Contact','联系我们')} <span aria-hidden="true">↗</span></Link></nav><LanguageSwitcher/></div></header>
 <main id="main-content">{children}</main>
 <footer className="site-footer"><div><Link href="/" className="wordmark">WEMOVE<span>SPORTS</span></Link><p>{pick(locale,'Movement. Play. Time together.','运动、玩耍、相伴时光。')}</p></div>
 <nav aria-label={pick(locale,'Footer navigation','页脚导航')}><Link href="/products">{pick(locale,'Explore products','浏览产品')}</Link><Link href="/contact">{pick(locale,'Get in touch','联系我们')}</Link><Link href="/privacy">{pick(locale,'Privacy','隐私说明')}</Link><Link href="/admin">{pick(locale,'Team access','团队入口')}</Link></nav>
 <p className="footer-note">{pick(locale,'Local development preview · No retail checkout is enabled.','本地开发预览 · 暂未启用零售结算。')}</p></footer>
 </>;}
export function ProductCard({product:p}:{product:Product}){const{locale}=useLocale();return <article className="product-card">
 <Link href={`/products/${p.slug}`} className="product-visual" aria-label={`${pick(locale,'Explore','查看')} ${p.name}`}>
 {p.image_id?<img src={`/api/media/${p.image_id}`} alt={p.image_alt||p.name} width="600" height="600" loading="lazy"/>:<span>{pick(locale,'Image to come','图片待补充')}</span>}
 <span className="product-category">{displayCategory(locale,p.category)}</span></Link>
 <div className="product-meta"><span>{pick(locale,'Ages','适龄')} {p.age_min}–{p.age_max}</span><span>{displayEnvironment(locale,p.environment)}</span></div>
 <h3><Link href={`/products/${p.slug}`}>{p.name}</Link></h3><p>{p.summary}</p><Link className="text-link" href={`/products/${p.slug}`}>{pick(locale,'Discover more','查看详情')} <span aria-hidden="true">↗</span></Link>
 </article>;}
export function Unavailable(){const{locale}=useLocale();return <section className="empty-state"><h2>{pick(locale,'We couldn’t load this content.','暂时无法加载内容。')}</h2><p>{pick(locale,'Please try again in a moment. No information has been lost.','请稍后重试，已有信息不会丢失。')}</p><a className="button" href="">{pick(locale,'Try again','重新加载')}</a></section>;}
