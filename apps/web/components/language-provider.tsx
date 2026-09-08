'use client';
/**
 * 模块说明：语言状态提供器
 *
 * 所在层：Next.js 客户端状态层
 * 主要职责：在英文与中文之间切换并跨页面保存偏好
 * 输入：服务端初始语言和切换按钮事件
 * 输出：语言上下文、Cookie 和刷新的服务端组件
 *
 * 执行流程：
 * 1. 使用初值完成首屏水合。
 * 2. 更新 html lang 与 Cookie。
 * 3. 触发路由刷新获取对应服务端文本。
 *
 * 约束：只允许 en 与 zh，避免任意值进入界面。
 * 失败处理：切换期间禁用按钮防止状态竞争。
 * 维护提示：增加语言需扩展 Locale、Cookie 解析和全部文案。
 * 验证重点：首次加载、快速切换、刷新保持和辅助技术标签。
 */
import {createContext,useContext,useEffect,useState,useTransition} from 'react';
import {useRouter} from 'next/navigation';
import type {Locale} from '../lib/i18n';
const LanguageContext=createContext<{locale:Locale;change:(locale:Locale)=>void;pending:boolean}>({locale:'en',change:()=>{},pending:false});
export function LanguageProvider({initialLocale,children}:{initialLocale:Locale;children:React.ReactNode}){
 const[locale,setLocale]=useState(initialLocale),[pending,startTransition]=useTransition();const router=useRouter();
 useEffect(()=>{document.documentElement.lang=locale==='zh'?'zh-CN':'en';},[locale]);
 function change(next:Locale){if(next===locale)return;setLocale(next);document.cookie=`wm_locale=${next}; path=/; max-age=31536000; SameSite=Lax`;startTransition(()=>router.refresh());}
 return <LanguageContext.Provider value={{locale,change,pending}}>{children}</LanguageContext.Provider>;
}
export function useLocale(){return useContext(LanguageContext);}
export function LanguageSwitcher({compact=false}:{compact?:boolean}){const{locale,change,pending}=useLocale();return <div className={`language-switcher${compact?' compact':''}`} role="group" aria-label={locale==='zh'?'选择语言':'Choose language'}><button type="button" aria-pressed={locale==='en'} disabled={pending} onClick={()=>change('en')}>EN</button><span aria-hidden="true">/</span><button type="button" aria-pressed={locale==='zh'} disabled={pending} onClick={()=>change('zh')}>中文</button></div>;}
