import type { Metadata } from 'next';
import './globals.css';
import {getLocale} from '../lib/locale';
import {LanguageProvider} from '../components/language-provider';
import {pick} from '../lib/i18n';

// 工程准备页始终禁止索引，品牌官网元信息在业务实现阶段独立配置。
export async function generateMetadata():Promise<Metadata>{
  const locale=await getLocale();
  return {title:pick(locale,'WEMOVE SPORTS · Make room for play','WEMOVE SPORTS · 为快乐运动留出空间'),robots:{index:false,follow:false}};
}
export default async function Layout({ children }: Readonly<{ children: React.ReactNode }>) {
  const locale=await getLocale();
  return <html lang={locale==='zh'?'zh-CN':'en'}><body><LanguageProvider initialLocale={locale}><a className="skip-link" href="#main-content">{pick(locale,'Skip to content','跳至正文')}</a>{children}</LanguageProvider></body></html>;
}
