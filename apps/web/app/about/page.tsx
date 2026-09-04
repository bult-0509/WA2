import {api,HomeContent} from '../../lib/api';
import {Site,Unavailable} from '../../components/site';
export default async function About(){let content:HomeContent;try{content=await api('content/home');}catch{return <Site><Unavailable/></Site>;}
 return <Site><section className="page-heading prose"><p className="eyebrow">OUR STORY</p><h1>More room<br/>for movement.</h1><p className="preserve-text lead">{content.data.about}</p><a href="/contact" className="button">Get in touch ↗</a></section></Site>;}
