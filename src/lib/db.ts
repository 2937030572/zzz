/**
 * PostgreSQL 数据库连接
 * 使用 pg 库，兼容 Vercel Postgres 和 Supabase PostgreSQL 直连
 *
 * 环境变量:
 *   POSTGRES_URL          - Vercel Postgres 连接串 (优先)
 *   DATABASE_URL          - 通用 PostgreSQL 连接串 (备用)
 */

import { Pool } from 'pg';

declare global {
  // 防止 Next.js 开发热重载时重复创建连接池
  // eslint-disable-next-line no-var
  var _pgPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString =
    process.env.POSTGRES_URL ||
    process.env.DATABASE_URL;

  if (!connectionString) {
    throw new Error(
      '缺少数据库连接配置，请设置环境变量 POSTGRES_URL 或 DATABASE_URL',
    );
  }

  return new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false }, // Vercel Postgres / Supabase 需要 SSL
    max: 10,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 5000,
  });
}

// 单例模式：开发环境复用连接池
const pool: Pool =
  process.env.NODE_ENV === 'production'
    ? createPool()
    : (global._pgPool ?? (global._pgPool = createPool()));

export default pool;

// 便捷查询函数
export async function query<T = any>(
  sql: string,
  params?: any[],
): Promise<T[]> {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

export async function queryOne<T = any>(
  sql: string,
  params?: any[],
): Promise<T | null> {
  const rows = await query<T>(sql, params);
  return rows[0] ?? null;
}
