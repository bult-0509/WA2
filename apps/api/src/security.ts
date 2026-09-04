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
