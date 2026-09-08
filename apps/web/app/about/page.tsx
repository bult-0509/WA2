/**
 * 模块说明：品牌故事页面
 *
 * 所在层：Next.js 展示层
 * 主要职责：根据当前语言呈现简洁的品牌定位和价值说明
 * 输入：语言上下文
 * 输出：可访问的中英文品牌介绍页面
 *
 * 执行流程：
 * 1. 读取当前语言。
 * 2. 选择对应标题与正文。
 * 3. 复用全站排版样式输出。
 *
 * 约束：页面只展示公开内容，不读取后台会话。
 * 失败处理：语言上下文不可用时由提供器回退到英文。
 * 维护提示：品牌文案调整应保持中英文含义对应。
 * 验证重点：两种语言、标题层级和窄屏换行。
 */
import {api,HomeContent} from '../../lib/api';
import {Site,Unavailable} from '../../components/site';
import {getLocale} from '../../lib/locale';
import {localizeDefaultContent,pick} from '../../lib/i18n';
export default async function About(){const locale=await getLocale();let content:HomeContent;try{content=await api('content/home');}catch{return <Site><Unavailable/></Site>;}
 return <Site><section className="page-heading prose"><p className="eyebrow">{pick(locale,'OUR STORY','品牌故事')}</p><h1>{pick(locale,'More room','为运动')}<br/>{pick(locale,'for movement.','留出更多空间。')}</h1><p className="preserve-text lead">{localizeDefaultContent(locale,content.data.about)}</p><a href="/contact" className="button">{pick(locale,'Get in touch','联系我们')} ↗</a></section></Site>;}
