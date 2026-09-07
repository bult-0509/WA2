import {cookies} from 'next/headers';
import type {Locale} from './i18n';
export async function getLocale():Promise<Locale>{return (await cookies()).get('wm_locale')?.value==='zh'?'zh':'en';}
