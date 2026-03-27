import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

/** 从 fund_records + trades 实时计算账户真实余额（不依赖 balance 快照，避免历史脏数据） */
async function calcRealBalance(accountId: number): Promise<number> {
  const [fundsRes, tradesRes] = await Promise.all([
    supabase
      .from('fund_records')
      .select('type, amount')
      .or(`account_id.eq.${accountId},account_id.is.null`),
    supabase
      .from('trades')
      .select('profit_loss')
      .or(`account_id.eq.${accountId},account_id.is.null`),
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

/** 更新 balance 快照表（upsert，保持 account_id=targetAccountId 那行同步） */
async function syncBalanceSnapshot(accountId: number, newBalance: number): Promise<void> {
  // 先检查是否存在 account_id 匹配的行
  const { data: existing } = await supabase
    .from('balance')
    .select('id')
    .eq('account_id', accountId)
    .single();

  if (existing) {
    await supabase
      .from('balance')
      .update({ amount: String(newBalance) })
      .eq('account_id', accountId);
  } else {
    await supabase
      .from('balance')
      .insert({ amount: String(newBalance), account_id: accountId });
  }
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

    if (accountId) {
      query = query.eq('account_id', accountId);
    }
    if (type) {
      query = query.eq('type', type);
    }

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
    const targetAccountId = accountId || 1;

    // 实时重算当前真实余额
    const currentBalance = await calcRealBalance(targetAccountId);
    const newBalance = type === 'deposit'
      ? currentBalance + Number(amount)
      : currentBalance - Number(amount);

    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 创建出入金记录
    const { data: record, error: recordError } = await supabase
      .from('fund_records')
      .insert({ type, amount: String(amount), date, account_id: targetAccountId })
      .select()
      .single();

    if (recordError) throw recordError;

    // 同步余额快照
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

    if (!id) {
      return NextResponse.json({ error: 'Fund record ID is required' }, { status: 400 });
    }

    // 获取要删除的记录（不加 account_id 过滤，兼容历史 null 数据）
    const { data: record, error: recordError } = await supabase
      .from('fund_records')
      .select('*')
      .eq('id', id)
      .single();

    if (recordError) {
      if (recordError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
      }
      throw recordError;
    }

    // 先删除记录，再重算余额（避免把要删的记录算进去）
    const { error: deleteError } = await supabase
      .from('fund_records')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 删除后重算真实余额
    const newBalance = await calcRealBalance(targetAccountId);

    // 同步余额快照
    await syncBalanceSnapshot(targetAccountId, newBalance);

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error deleting fund record:', error);
    return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
  }
}
