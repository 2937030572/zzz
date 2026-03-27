import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

/**
 * 从 fund_records + trades 实时计算真实余额。
 * 不加 account_id 过滤（兼容历史 null 数据，且目前只有单账户）。
 */
async function calcRealBalance(): Promise<number> {
  const [fundsRes, tradesRes] = await Promise.all([
    supabase.from('fund_records').select('type, amount'),
    supabase.from('trades').select('profit_loss'),
  ]);

  if (fundsRes.error) throw fundsRes.error;
  if (tradesRes.error) throw tradesRes.error;

  let balance = 0;
  for (const r of fundsRes.data ?? []) {
    const amt = Number(r.amount) || 0;
    balance += r.type === 'deposit' ? amt : -amt;
  }
  for (const t of tradesRes.data ?? []) {
    balance += Number(t.profit_loss) || 0;
  }
  return balance;
}

/** 同步 balance 快照（直接 update account_id=1 的行，不做额外查询） */
async function syncBalanceSnapshot(accountId: number, newBalance: number): Promise<void> {
  await supabase
    .from('balance')
    .update({ amount: String(newBalance) })
    .eq('account_id', accountId);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'deposit' | 'withdraw' | null;
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase
      .from('fund_records')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (accountId) query = query.eq('account_id', accountId);
    if (type) query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    const records = data.map((row: any) => ({
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
  try {
    const body = await request.json();
    const { type, amount, date, accountId } = body;
    const targetAccountId = Number(accountId) || 1;

    // 创建记录
    const { data: record, error: recordError } = await supabase
      .from('fund_records')
      .insert({ type, amount: String(amount), date, account_id: targetAccountId })
      .select()
      .single();

    if (recordError) throw recordError;

    // 插入后实时重算余额
    const newBalance = await calcRealBalance();
    await syncBalanceSnapshot(targetAccountId, newBalance);

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
    console.error('Error creating fund record:', error);
    return NextResponse.json({ error: 'Failed to create fund record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const accountId = searchParams.get('accountId');
    const targetAccountId = Number(accountId) || 1;

    console.log('[fund-records DELETE] id:', id, 'targetAccountId:', targetAccountId);

    if (!id) {
      return NextResponse.json({ error: 'Fund record ID is required' }, { status: 400 });
    }

    // 删除记录（不加 account_id 过滤，兼容历史 null 数据）
    const { error: deleteError } = await supabase
      .from('fund_records')
      .delete()
      .eq('id', id);

    console.log('[fund-records DELETE] deleteError:', deleteError);
    if (deleteError) throw deleteError;

    // 删除后重算真实余额
    const newBalance = await calcRealBalance();
    console.log('[fund-records DELETE] newBalance:', newBalance);

    await syncBalanceSnapshot(targetAccountId, newBalance);

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('[fund-records DELETE] ERROR:', error);
    return NextResponse.json({ error: 'Failed to delete fund record', detail: String(error) }, { status: 500 });
  }
}
