import { Body, CanActivate, Controller, ExecutionContext, ForbiddenException, Get, HttpException, Injectable, Post, Req, Res, SetMetadata, UnauthorizedException, UseGuards } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import type { Request, Response } from 'express';
import { randomBytes, randomUUID } from 'node:crypto';
import { TOTP } from 'otpauth';
import { z } from 'zod';
import { Database } from './database';
import { decryptSecret, digest, hashPassword, verifyPassword } from './security';

export type StaffRequest = Request & { staff: { id: string; email: string; permissions: string[] } };
export const Permission = (name: string) => SetMetadata('permission', name);
export function sessionToken(req: Request) {
  return req.headers.cookie?.split(';').map(s => s.trim()).find(s => s.startsWith('wm_session='))?.slice(11) || '';
}
@Injectable()
export class RateLimiter {
  constructor(private readonly db: Database) {}
  async take(key: string, limit: number, seconds: number) {
    const { rows } = await this.db.query(`INSERT INTO rate_limits(key,count,expires_at) VALUES($1,1,now()+$2*interval '1 second')
      ON CONFLICT(key) DO UPDATE SET count=CASE WHEN rate_limits.expires_at<now() THEN 1 ELSE rate_limits.count+1 END,
      expires_at=CASE WHEN rate_limits.expires_at<now() THEN EXCLUDED.expires_at ELSE rate_limits.expires_at END RETURNING count`, [digest(key), seconds]);
    if (rows[0].count > limit) throw new HttpException('Too many attempts. Please try again later.', 429);
  }
}
@Injectable()
export class StaffGuard implements CanActivate {
  constructor(private readonly db: Database, private readonly reflector: Reflector) {}
  async canActivate(context: ExecutionContext) {
    const req = context.switchToHttp().getRequest<StaffRequest>();
    const token = sessionToken(req);
    if (!/^[a-f\d]{64}$/.test(token)) throw new UnauthorizedException('Please sign in.');
    const { rows } = await this.db.query(`SELECT u.id,u.email,u.permissions FROM sessions s JOIN staff u ON u.id=s.staff_id
      WHERE s.token_hash=$1 AND s.expires_at>now() AND u.active`, [digest(token)]);
    if (!rows[0]) throw new UnauthorizedException('Session expired. Please sign in again.');
    req.staff = rows[0];
    const permission = this.reflector.get<string>('permission', context.getHandler());
    if (permission && !req.staff.permissions.includes(permission)) throw new ForbiddenException('This account cannot perform this action.');
    return true;
  }
}
const loginSchema = z.object({ email: z.string().email().max(254), password: z.string().min(1).max(128), code: z.string().regex(/^\d{6}$/) });
const dummyHash = hashPassword(randomBytes(32).toString('hex'));

@Controller('auth')
export class AuthController {
  constructor(private readonly db: Database, private readonly limits: RateLimiter) {}
  @Post('login')
  async login(@Body() body: unknown, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    const data = loginSchema.parse(body); const email = data.email.toLowerCase();
    await this.limits.take(`login-ip:${req.ip}`, 30, 900);
    await this.limits.take(`login-email:${email}`, 10, 900);
    const { rows } = await this.db.query('SELECT * FROM staff WHERE email=$1 AND active', [email]);
    const user = rows[0];
    const validPassword = verifyPassword(data.password, user?.password_hash || dummyHash);
    if (!user || !validPassword) throw new UnauthorizedException('Invalid email, password or verification code.');
    const totp = new TOTP({ secret: decryptSecret(user.totp_secret) });
    const delta = totp.validate({ token: data.code, window: 1 });
    if (delta === null) throw new UnauthorizedException('Invalid email, password or verification code.');
    const counter = totp.counter() + delta;
    const token = randomBytes(32).toString('hex');
    await this.db.transaction(async client => {
      // 原子更新保证同一验证码不能通过两个并发请求重复登录。
      const updated = await client.query('UPDATE staff SET last_totp_counter=$1 WHERE id=$2 AND last_totp_counter<$1 RETURNING id', [counter, user.id]);
      if (!updated.rowCount) throw new UnauthorizedException('Verification code already used. Wait for the next code.');
      await client.query(`INSERT INTO sessions(token_hash,staff_id,expires_at) VALUES($1,$2,now()+interval '30 minutes')`, [digest(token), user.id]);
      await client.query('INSERT INTO audit_logs(id,actor,action,entity,entity_id) VALUES($1,$2,$3,$4,$5)', [randomUUID(), user.id, 'login', 'staff',user.id]);
    });
    res.cookie('wm_session', token, { httpOnly: true, sameSite: 'strict', secure: process.env.WEB_ORIGIN?.startsWith('https:') || false, path: '/', maxAge: 1800000 });
    return { email: user.email, permissions: user.permissions };
  }
  @Get('me') @UseGuards(StaffGuard)
  me(@Req() req: StaffRequest) { return req.staff; }
  @Post('logout') @UseGuards(StaffGuard)
  async logout(@Req() req: StaffRequest, @Res({ passthrough: true }) res: Response) {
    await this.db.query('DELETE FROM sessions WHERE token_hash=$1', [digest(sessionToken(req))]);
    res.clearCookie('wm_session', { path: '/', httpOnly: true, sameSite: 'strict' });
    return { ok: true };
  }
}
