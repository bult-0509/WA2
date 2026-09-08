/**
 * 代码注释率检查器。
 *
 * 统计范围只包含团队维护的可执行源码、样式、数据库迁移和本地运维脚本。
 * 依赖目录、构建产物、框架生成的 next-env.d.ts 与本检查器自身不计入结果。
 * 空行不参与分母；纯注释行计作注释，含代码的行计作代码。
 * 因此输出比例表示“注释行 /（注释行 + 代码行）”，便于教师复核。
 */
import { readdir, readFile } from 'node:fs/promises';
import { extname, join, relative, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const roots = ['apps/api/src', 'apps/web/app', 'apps/web/components', 'apps/web/lib', 'scripts', 'data', 'database/migrations'];
const standalone = ['start.bat'];
const extensions = new Set(['.ts', '.tsx', '.mjs', '.css', '.sql', '.ps1', '.bat']);
const excluded = new Set(['apps/web/next-env.d.ts', 'scripts/check-comment-ratio.mjs']);
const minimum = 1 / 3;

async function collect(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await collect(path));
    else if (extensions.has(extname(entry.name))) files.push(path);
  }
  return files;
}

function countLines(text, extension) {
  let block = false;
  let comments = 0;
  let code = 0;
  for (const sourceLine of text.split(/\r?\n/)) {
    const line = sourceLine.trim();
    if (!line) continue;
    if (block) {
      comments += 1;
      if (extension === '.ps1' ? line.includes('#>') : line.includes('*/')) block = false;
      continue;
    }
    const blockStart = extension === '.ps1' ? line.startsWith('<#') : line.startsWith('/*');
    if (blockStart) {
      comments += 1;
      const closes = extension === '.ps1' ? line.slice(2).includes('#>') : line.slice(2).includes('*/');
      block = !closes;
      continue;
    }
    const lineComment = extension === '.sql'
      ? line.startsWith('--')
      : extension === '.ps1'
        ? line.startsWith('#')
        : extension === '.bat'
          ? /^(rem\b|::)/i.test(line)
          : line.startsWith('//');
    if (lineComment) comments += 1;
    else code += 1;
  }
  return { comments, code };
}

const paths = (await Promise.all(roots.map(path => collect(resolve(root, path))))).flat()
  .concat(standalone.map(path => resolve(root, path)))
  .filter(path => !excluded.has(relative(root, path).replaceAll('\\', '/')))
  .sort();
const rows = [];
for (const path of paths) {
  const counts = countLines(await readFile(path, 'utf8'), extname(path));
  rows.push({ file: relative(root, path).replaceAll('\\', '/'), ...counts });
}
const comments = rows.reduce((sum, row) => sum + row.comments, 0);
const code = rows.reduce((sum, row) => sum + row.code, 0);
const ratio = comments / (comments + code);
console.table(rows.map(row => ({ ...row, ratio: `${(row.comments / (row.comments + row.code) * 100).toFixed(1)}%` })));
console.log(`Overall comment ratio: ${(ratio * 100).toFixed(2)}% (${comments} comment lines / ${comments + code} nonblank lines)`);
if (ratio < minimum) {
  console.error(`Comment ratio must be at least ${(minimum * 100).toFixed(2)}%.`);
  process.exitCode = 1;
}
