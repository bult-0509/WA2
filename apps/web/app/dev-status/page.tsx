import {Site} from '../../components/site';
import {getLocale} from '../../lib/locale';
import {pick} from '../../lib/i18n';
export const dynamic = 'force-dynamic';

// 只在服务端探测本机 API；不把内部地址或数据库凭据发送给浏览器。
async function inspectRuntime() {
  try {
    const [live, ready] = await Promise.all([
      fetch('http://127.0.0.1:3101/api/v1/health/live', { cache: 'no-store', signal: AbortSignal.timeout(3000) }),
      fetch('http://127.0.0.1:3101/api/v1/health/ready', { cache: 'no-store', signal: AbortSignal.timeout(3000) }),
    ]);
    return { api: live.ok, database: ready.ok };
  } catch { return { api: false, database: false }; }
}

export default async function Page() {
  const locale=await getLocale();
  const status = await inspectRuntime();
  return <Site><section className="page-intro">
    <p className="eyebrow">{pick(locale,'INTERNAL RUNTIME CHECK','内部工程检查')}</p><h1>{pick(locale,'Runtime status','运行状态')}</h1>
    <p>{pick(locale,'The first stage supports product management, public display, contact capture and inquiry handling. This page only checks service connections; it is not full acceptance.','第一阶段已支持商品维护、官网展示、联系留资和后台处理。此页只检查服务连接，不代表全量需求验收。')}</p>
    <ul><li>Next.js：{pick(locale,'Available','可访问')}</li><li>NestJS：{status.api ? pick(locale,'Connected','已连接') : pick(locale,'Disconnected','未连接')}</li><li>PostgreSQL：{status.database ? pick(locale,'Connected','已连接') : pick(locale,'Not configured or stopped','待配置或启动')}</li></ul>
    <a className="button" href="/dev-status">{pick(locale,'Check again','重新检查状态')}</a>
  </section></Site>;
}
