/**
 * 模块说明：数据库连接封装
 *
 * 所在层：NestJS 基础设施层
 * 主要职责：集中管理 PostgreSQL 连接池、事务和健康检查
 * 输入：参数化 SQL、绑定值和事务回调
 * 输出：查询结果、事务结果或服务不可用异常
 *
 * 执行流程：
 * 1. 确认连接池已配置。
 * 2. 为事务获取独占客户端。
 * 3. 提交或回滚后释放连接。
 *
 * 约束：业务模块不得绕过该类自行创建连接池。
 * 失败处理：连接缺失或 SQL 失败时保留原错误语义。
 * 维护提示：修改连接参数时评估并发数与本机资源。
 * 验证重点：提交、回滚、客户端释放和关闭钩子。
 */
import { Injectable, OnApplicationShutdown, ServiceUnavailableException } from '@nestjs/common';
import { Pool, PoolClient, QueryResultRow } from 'pg';

@Injectable()
export class Database implements OnApplicationShutdown {
  private readonly pool = process.env.DATABASE_URL ? new Pool({
    connectionString: process.env.DATABASE_URL, connectionTimeoutMillis: 2500, max: 10,
  }) : undefined;
  constructor() { this.pool?.on('error', () => undefined); }

  async query<T extends QueryResultRow = any>(sql: string, values: unknown[] = []) {
    if (!this.pool) throw new ServiceUnavailableException('Database is not configured.');
    return this.pool.query<T>(sql, values);
  }
  async transaction<T>(work: (client: PoolClient) => Promise<T>): Promise<T> {
    if (!this.pool) throw new ServiceUnavailableException('Database is not configured.');
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      const result = await work(client);
      await client.query('COMMIT');
      return result;
    } catch (error) { await client.query('ROLLBACK'); throw error; }
    finally { client.release(); }
  }
  async ready() {
    if (!this.pool) return 'not_configured';
    try { await this.pool.query('SELECT 1'); return 'connected'; } catch { return 'unavailable'; }
  }
  async onApplicationShutdown() { await this.pool?.end(); }
}
