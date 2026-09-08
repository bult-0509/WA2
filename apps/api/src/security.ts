/**
 * 模块说明：密码与密钥保护工具
 *
 * 所在层：NestJS 安全基础设施层
 * 主要职责：提供密码散列、恒定时间校验与 TOTP 密钥加密
 * 输入：用户密码、密文或应用主密钥
 * 输出：不可逆密码摘要或可认证密文
 *
 * 执行流程：
 * 1. 为密码生成独立盐值。
 * 2. 用 scrypt 派生固定长度摘要。
 * 3. 用 AES GCM 加解密 TOTP 密钥。
 *
 * 约束：APP_KEY 必须是 32 字节十六进制随机值。
 * 失败处理：格式异常和认证标签错误直接中止操作。
 * 维护提示：算法参数变更需要兼容已有数据或设计迁移。
 * 验证重点：错误密码、损坏密文、缺失密钥和时序比较。
 */
import { createHash, scryptSync, timingSafeEqual, randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';

export const digest = (value: string) => createHash('sha256').update(value).digest('hex');
export function hashPassword(password: string) {
  const salt = randomBytes(16).toString('hex');
  return `${salt}:${scryptSync(password, salt, 64).toString('hex')}`;
}
export function verifyPassword(password: string, stored: string) {
  const [salt, expected] = stored.split(':');
  if (!salt || !expected || expected.length !== 128) return false;
  return timingSafeEqual(scryptSync(password, salt, 64), Buffer.from(expected, 'hex'));
}
function key() {
  if (!/^[a-f\d]{64}$/i.test(process.env.APP_KEY || '')) throw new Error('APP_KEY is not configured.');
  return Buffer.from(process.env.APP_KEY!, 'hex');
}
// TOTP 密钥不能哈希，但也不直接明文保存到数据库；使用项目外部配置密钥加密。
export function encryptSecret(secret: string) {
  const iv = randomBytes(12); const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const encrypted = Buffer.concat([cipher.update(secret, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), encrypted].map(part => part.toString('hex')).join(':');
}
export function decryptSecret(value: string) {
  const [iv, tag, encrypted] = value.split(':').map(part => Buffer.from(part, 'hex'));
  const cipher = createDecipheriv('aes-256-gcm', key(), iv); cipher.setAuthTag(tag);
  return Buffer.concat([cipher.update(encrypted), cipher.final()]).toString('utf8');
}
