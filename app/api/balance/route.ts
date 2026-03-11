import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    let query = 'SELECT * FROM balance';
    const params: any[] = [];

    if (accountId) {
      query += ' WHERE account_id = $1';
      params.push(accountId);
    }

    const result = await pool.query(query, params);

    if (result.rows.length === 0) {
      // 如果没有余额记录，返回0
      return NextResponse.json({ balance: 0 });
    }

    // 处理amount字段，可能是字符串或对象
    let amount = result.rows[0].amount;
    if (typeof amount === 'object' && amount !== null) {
      amount = 0;
    } else {
      amount = Number(amount);
    }

    return NextResponse.json({ balance: amount });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount, accountId } = body;

    const targetAccountId = accountId || 1;

    // 检查该账户是否已有余额记录
    const checkResult = await pool.query(
      'SELECT id FROM balance WHERE account_id = $1',
      [targetAccountId]
    );

    if (checkResult.rows.length === 0) {
      // 插入新记录
      await pool.query(
        'INSERT INTO balance (amount, account_id) VALUES ($1, $2)',
        [String(amount), targetAccountId]
      );
    } else {
      // 更新现有记录
      await pool.query(
        'UPDATE balance SET amount = $1 WHERE account_id = $2',
        [String(amount), targetAccountId]
      );
    }

    return NextResponse.json({ balance: Number(amount) });
  } catch (error) {
    console.error('Error updating balance:', error);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
}
