import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {TOTP} from 'otpauth';
// 仅用于本机生成的开发账号。生产环境应使用独立认证器，不部署此文件及种子凭据。
const account=JSON.parse(await readFile(resolve(import.meta.dirname,'../.local/dev-admin.json'),'utf8'));
console.log(new TOTP({secret:account.totp_secret}).generate());
