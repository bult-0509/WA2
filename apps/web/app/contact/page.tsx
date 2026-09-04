import {Site} from '../../components/site';
import {ContactForm} from '../../components/contact-form';
export const metadata={title:'Contact · WEMOVE SPORTS'};
export default async function Contact({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
 const {product,name}=await searchParams;
 return <Site><section className="contact-layout"><div><p className="eyebrow">LET’S TALK</p><h1>A question.<br/>A new possibility.</h1><p className="lead">Whether you’re choosing a product or exploring a retail partnership, start a conversation with us.</p><div className="contact-note"><h3>Tell us a little more.</h3><p>Include the product name or SKU when you can. Please don’t include payment details or children’s personal information.</p></div></div><ContactForm productId={product} productName={name}/></section></Site>;
}
