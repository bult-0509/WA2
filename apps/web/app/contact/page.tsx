import {Site} from '../../components/site';
import {ContactForm} from '../../components/contact-form';
import {getLocale} from '../../lib/locale';
import {pick} from '../../lib/i18n';
export async function generateMetadata(){const locale=await getLocale();return {title:pick(locale,'Contact · WEMOVE SPORTS','联系我们 · WEMOVE SPORTS')};}
export default async function Contact({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const {product,name}=await searchParams;
 const locale=await getLocale();
 return <Site><section className="contact-layout"><div><p className="eyebrow">{pick(locale,'LET’S TALK','欢迎联系')}</p><h1>{pick(locale,'A question.','一个问题。')}<br/>{pick(locale,'A new possibility.','一种新可能。')}</h1><p className="lead">{pick(locale,'Whether you’re choosing a product or exploring a retail partnership, start a conversation with us.','无论是选择产品，还是洽谈零售合作，都可以从这里联系我们。')}</p><div className="contact-note"><h3>{pick(locale,'Tell us a little more.','请多介绍一些情况。')}</h3><p>{pick(locale,'Include the product name or SKU when you can. Please don’t include payment details or children’s personal information.','如有可能，请写明产品名称或 SKU。请勿填写支付信息或儿童个人信息。')}</p></div></div><ContactForm productId={product} productName={name}/></section></Site>;
}
