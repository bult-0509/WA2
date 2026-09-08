/**
 * 模块说明：应用根布局
 *
 * 所在层：Next.js 框架层
 * 主要职责：设置页面元数据、语言初值并挂载全站外壳
 * 输入：请求 Cookie、页面子树和字体配置
 * 输出：带语言上下文的完整 HTML 文档
 *
 * 执行流程：
 * 1. 读取语言 Cookie。
 * 2. 设置 html 语言属性。
 * 3. 组合 LanguageProvider 与 Site。
 *
 * 约束：服务端只接受 en 或 zh 两个受控语言值。
 * 失败处理：无 Cookie 时稳定回退英文。
 * 维护提示：修改全局导航或元数据时从此入口评估影响。
 * 验证重点：首屏水合、语言一致性和页面标题。
 */
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
