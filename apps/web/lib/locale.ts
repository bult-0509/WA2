/**
 * 模块说明：服务端语言读取
 *
 * 所在层：Next.js 请求上下文层
 * 主要职责：把语言 Cookie 归一化为受控 Locale
 * 输入：当前请求的 wm_locale Cookie
 * 输出：en 或 zh
 *
 * 执行流程：
 * 1. 读取 Cookie。
 * 2. 检查是否为 zh。
 * 3. 其他情况回退 en。
 *
 * 约束：不得把未经校验的 Cookie 当作 Locale。
 * 失败处理：Cookie 缺失或非法时静默使用英文。
 * 维护提示：新增语言时同步类型和客户端提供器。
 * 验证重点：缺失、非法、中文和英文 Cookie。
 */
import {cookies} from 'next/headers';
import type {Locale} from './i18n';
export async function getLocale():Promise<Locale>{return (await cookies()).get('wm_locale')?.value==='zh'?'zh':'en';}
