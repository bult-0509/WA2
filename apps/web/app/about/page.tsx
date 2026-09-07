import {api,HomeContent} from '../../lib/api';
import {Site,Unavailable} from '../../components/site';
import {getLocale} from '../../lib/locale';
import {localizeDefaultContent,pick} from '../../lib/i18n';
export default async function About(){const locale=await getLocale();let content:HomeContent;try{content=await api('content/home');}catch{return <Site><Unavailable/></Site>;}
 return <Site><section className="page-heading prose"><p className="eyebrow">{pick(locale,'OUR STORY','品牌故事')}</p><h1>{pick(locale,'More room','为运动')}<br/>{pick(locale,'for movement.','留出更多空间。')}</h1><p className="preserve-text lead">{localizeDefaultContent(locale,content.data.about)}</p><a href="/contact" className="button">{pick(locale,'Get in touch','联系我们')} ↗</a></section></Site>;}
