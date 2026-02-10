import { NextResponse } from 'next/server';
import { Pool } from 'pg';

// 创建数据库连接池
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

export async function GET() {
  try {
    const result = await pool.query('SELECT * FROM equity_history ORDER BY created_at ASC');

    const history = result.rows.map((row: any) => ({
      id: row.id,
      date: row.date,
      value: Number(row.value),
      createdAt: row.created_at,
    }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching equity history:', error);
    return NextResponse.json({ error: 'Failed to fetch equity history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    const result = await pool.query(
      'INSERT INTO equity_history (date, value) VALUES ($1, $2) RETURNING *',
      [body.date, String(body.value)]
    );

    const record = {
      id: result.rows[0].id,
      date: result.rows[0].date,
      value: Number(result.rows[0].value),
      createdAt: result.rows[0].created_at,
    };

    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error creating equity history:', error);
    return NextResponse.json({ error: 'Failed to create equity history' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await pool.query('DELETE FROM equity_history');
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing equity history:', error);
    return NextResponse.json({ error: 'Failed to clear equity history' }, { status: 500 });
  }
}
