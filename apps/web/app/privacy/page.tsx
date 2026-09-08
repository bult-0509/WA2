/**
 * 模块说明：隐私说明页面
 *
 * 所在层：Next.js 展示层
 * 主要职责：解释本地演示环境对咨询数据的处理范围
 * 输入：语言上下文
 * 输出：中英文隐私说明
 *
 * 执行流程：
 * 1. 读取语言。
 * 2. 选择对应文本。
 * 3. 用正文样式展示。
 *
 * 约束：不声称尚未实现的合规或第三方处理能力。
 * 失败处理：语言异常时沿用全局回退。
 * 维护提示：接入真实邮件或分析工具后必须更新说明。
 * 验证重点：两种语言、正文可读性和链接导航。
 */
import {Site} from '../../components/site';
import {getLocale} from '../../lib/locale';
import {pick} from '../../lib/i18n';
export default async function Privacy(){const locale=await getLocale();return <Site><section className="page-heading prose"><p className="eyebrow">{pick(locale,'LOCAL PREVIEW','本地预览')}</p><h1>{pick(locale,'Privacy notice','隐私说明')}</h1><p>{pick(locale,'This development site stores contact inquiries in the project’s local database. The name, email, country, subject and message you submit are available to authorized team accounts for inquiry handling.','本开发网站会把联系咨询保存在项目本地数据库中。提交的姓名、邮箱、国家或地区、主题和消息仅供获得授权的团队账号处理咨询。')}</p><p>{pick(locale,'No marketing emails, external analytics or payment services are connected. Please use test information while reviewing this local site. This notice describes the current development preview; the production privacy policy will be confirmed before launch.','当前没有接入营销邮件、外部统计或支付服务。评审本地网站时请使用测试信息。本说明仅描述当前开发预览，正式隐私政策将在上线前确认。')}</p><p>{pick(locale,'Staff access uses a necessary session cookie that expires after 30 minutes. Public browsing does not require an account.','团队后台使用必要的会话 Cookie，并在 30 分钟后过期。浏览公开网站不需要账号。')}</p></section></Site>;}
