import { NextResponse } from 'next/server';
import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// 获取所有账户
export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM accounts ORDER BY created_at ASC');
    return NextResponse.json({ accounts: result.rows });
  } catch (error) {
    console.error('Error fetching accounts:', error);
    return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
  }
}

// 创建新账户
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name } = body;

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'Account name is required' }, { status: 400 });
    }

    const result = await pool.query(
      'INSERT INTO accounts (name) VALUES ($1) RETURNING *',
      [name.trim()]
    );

    // 为新账户创建初始余额记录
    await pool.query(
      'INSERT INTO balance (amount, account_id) VALUES ($1, $2)',
      ['0', result.rows[0].id]
    );

    return NextResponse.json({ account: result.rows[0] });
  } catch (error: any) {
    console.error('Error creating account:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Account name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
  }
}

// 更新账户名称
export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, name } = body;

    if (!id || !name || !name.trim()) {
      return NextResponse.json({ error: 'Account ID and name are required' }, { status: 400 });
    }

    const result = await pool.query(
      'UPDATE accounts SET name = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *',
      [name.trim(), id]
    );

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account: result.rows[0] });
  } catch (error: any) {
    console.error('Error updating account:', error);
    if (error.code === '23505') {
      return NextResponse.json({ error: 'Account name already exists' }, { status: 400 });
    }
    return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
  }
}

// 删除账户
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Account ID is required' }, { status: 400 });
    }

    // 检查是否是默认账户（ID=1），不允许删除
    if (id === '1') {
      return NextResponse.json({ error: 'Cannot delete default account' }, { status: 400 });
    }

    // 删除账户相关的余额记录
    await pool.query('DELETE FROM balance WHERE account_id = $1', [id]);
    
    // 删除账户相关的交易记录
    await pool.query('DELETE FROM trades WHERE account_id = $1', [id]);
    
    // 删除账户相关的出入金记录
    await pool.query('DELETE FROM fund_records WHERE account_id = $1', [id]);

    // 删除账户
    const result = await pool.query('DELETE FROM accounts WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
