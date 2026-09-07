'use client';
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
