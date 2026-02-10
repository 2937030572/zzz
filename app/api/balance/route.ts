import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM balance');

    if (result.rows.length === 0) {
      return NextResponse.json({ balance: 0 });
    }

    return NextResponse.json({ balance: Number(result.rows[0].amount) });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount } = body;

    // 检查 balance 表是否有记录
    const checkResult = await pool.query('SELECT id FROM balance LIMIT 1');

    if (checkResult.rows.length === 0) {
      // 插入新记录
      await pool.query('INSERT INTO balance (amount) VALUES ($1)', [String(amount)]);
    } else {
      // 更新现有记录（假设只有一条）
      await pool.query('UPDATE balance SET amount = $1 WHERE id = $2', [String(amount), checkResult.rows[0].id]);
    }

    return NextResponse.json({ balance: Number(amount) });
  } catch (error) {
    console.error('Error updating balance:', error);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
}
