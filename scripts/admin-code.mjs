/**
 * 模块说明：开发验证码读取工具
 *
 * 所在层：本地开发工具层
 * 主要职责：根据本机种子账号密钥生成当前 TOTP 验证码
 * 输入：私有目录中的开发账号文件
 * 输出：当前六位动态验证码
 *
 * 执行流程：
 * 1. 读取本机 JSON。
 * 2. 解析 TOTP 密钥。
 * 3. 输出当前时间窗口验证码。
 *
 * 约束：仅限本地开发，文件和输出都不进入版本库。
 * 失败处理：凭据缺失时让进程失败以暴露未初始化状态。
 * 维护提示：生产部署应移除此工具并使用个人认证器。
 * 验证重点：凭据文件缺失、密钥损坏和验证码周期。
 */
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {TOTP} from 'otpauth';
// 仅用于本机生成的开发账号。生产环境应使用独立认证器，不部署此文件及种子凭据。
const account=JSON.parse(await readFile(resolve(import.meta.dirname,'../.local/dev-admin.json'),'utf8'));
console.log(new TOTP({secret:account.totp_secret}).generate());
