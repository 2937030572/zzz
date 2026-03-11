import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'deposit' | 'withdraw' | null;
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = 'SELECT * FROM fund_records';
    const params: any[] = [];
    const conditions: string[] = [];

    if (accountId) {
      conditions.push(`account_id = $${params.length + 1}`);
      params.push(accountId);
    }

    if (type) {
      conditions.push(`type = $${params.length + 1}`);
      params.push(type);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }

    query += ` ORDER BY created_at DESC LIMIT $${params.length + 1}`;
    params.push(limit);

    const result = await pool.query(query, params);

    const records = result.rows.map((row: any) => ({
      id: row.id,
      type: row.type,
      amount: Number(row.amount),
      date: row.date,
      accountId: row.account_id,
      createdAt: row.created_at,
    }));

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching fund records:', error);
    return NextResponse.json({ error: 'Failed to fetch fund records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const client = await pool.connect();
  try {
    const body = await request.json();
    const { type, amount, date, accountId } = body;
    const targetAccountId = accountId || 1;

    await client.query('BEGIN');

    // 获取当前余额
    const balanceResult = await client.query(
      'SELECT amount FROM balance WHERE account_id = $1',
      [targetAccountId]
    );
    
    const currentBalance = balanceResult.rows.length > 0 
      ? Number(balanceResult.rows[0].amount)
      : 0;

    // 计算新余额
    const newBalance = type === 'deposit' 
      ? currentBalance + Number(amount) 
      : currentBalance - Number(amount);

    // 余额不能为负数
    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 创建出入金记录
    const recordResult = await client.query(
      'INSERT INTO fund_records (type, amount, date, account_id) VALUES ($1, $2, $3, $4) RETURNING *',
      [type, String(amount), date, targetAccountId]
    );

    // 更新余额
    if (balanceResult.rows.length > 0) {
      await client.query(
        'UPDATE balance SET amount = $1 WHERE account_id = $2',
        [String(newBalance), targetAccountId]
      );
    } else {
      await client.query(
        'INSERT INTO balance (amount, account_id) VALUES ($1, $2)',
        [String(newBalance), targetAccountId]
      );
    }

    await client.query('COMMIT');

    const record = recordResult.rows[0];
    return NextResponse.json({
      record: {
        id: record.id,
        type: record.type,
        amount: Number(record.amount),
        date: record.date,
        accountId: record.account_id,
        createdAt: record.created_at,
      },
      balance: newBalance,
    });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore
    }
    console.error('Error creating fund record:', error);
    return NextResponse.json({ error: 'Failed to create fund record' }, { status: 500 });
  } finally {
    client.release();
  }
}

export async function DELETE(request: Request) {
  const client = await pool.connect();
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const accountId = searchParams.get('accountId');
    const targetAccountId = accountId || 1;

    if (!id) {
      return NextResponse.json({ error: 'Fund record ID is required' }, { status: 400 });
    }

    await client.query('BEGIN');

    // 获取要删除的记录
    const recordResult = await client.query('SELECT * FROM fund_records WHERE id = $1', [id]);
    if (recordResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    const record = recordResult.rows[0];

    // 获取当前余额
    const balanceResult = await client.query(
      'SELECT amount FROM balance WHERE account_id = $1',
      [targetAccountId]
    );
    
    const currentBalance = balanceResult.rows.length > 0 
      ? Number(balanceResult.rows[0].amount)
      : 0;

    // 计算新余额
    const newBalance = record.type === 'deposit'
      ? currentBalance - Number(record.amount)
      : currentBalance + Number(record.amount);

    // 余额不能为负数
    if (newBalance < 0) {
      await client.query('ROLLBACK');
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 删除记录
    await client.query('DELETE FROM fund_records WHERE id = $1', [id]);

    // 更新余额
    if (balanceResult.rows.length > 0) {
      await client.query(
        'UPDATE balance SET amount = $1 WHERE account_id = $2',
        [String(newBalance), targetAccountId]
      );
    }

    await client.query('COMMIT');

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    try {
      await client.query('ROLLBACK');
    } catch (e) {
      // Ignore
    }
    console.error('Error deleting fund record:', error);
    return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
  } finally {
    client.release();
  }
}
