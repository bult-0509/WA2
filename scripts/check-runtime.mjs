/**
 * 模块说明：运行状态检查
 *
 * 所在层：本地验证工具层
 * 主要职责：一次检查前端、API 存活和数据库就绪状态
 * 输入：三个固定本机健康地址
 * 输出：JSON 状态数组和进程退出码
 *
 * 执行流程：
 * 1. 并行发起限时请求。
 * 2. 记录每项状态码。
 * 3. 任一未就绪时设置失败退出码。
 *
 * 约束：只访问回环地址，不探测外部或生产服务。
 * 失败处理：网络异常被转换为 ready false。
 * 维护提示：增加检查项时保持名称稳定便于文档引用。
 * 验证重点：全启动、单服务停止、超时和非 200 响应。
 */
// 存活与数据库就绪分别验证，不因网页可访问而报告完整环境成功。
const checks = [
  ['web', 'http://127.0.0.1:3100'],
  ['api', 'http://127.0.0.1:3101/api/v1/health/live'],
  ['database', 'http://127.0.0.1:3101/api/v1/health/ready'],
];
const results = await Promise.all(checks.map(async ([name, url]) => {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    return { name, status: response.status, ready: response.ok };
  } catch { return { name, status: null, ready: false }; }
}));
console.log(JSON.stringify(results, null, 2));
if (results.some(result => !result.ready)) process.exitCode = 1;
