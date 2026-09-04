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
