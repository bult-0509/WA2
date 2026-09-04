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
