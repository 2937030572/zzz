import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'deposit' | 'withdraw' | null;
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase.from('fund_records').select('*').order('created_at', { ascending: false }).limit(limit);

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

    // 获取当前余额
    const { data: balanceData, error: balanceError } = await supabase
      .from('balance')
      .select('amount')
      .eq('account_id', targetAccountId)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError;
    }

    const currentBalance = balanceData ? Number(balanceData.amount) : 0;

    // 计算新余额
    const newBalance = type === 'deposit' 
      ? currentBalance + Number(amount) 
      : currentBalance - Number(amount);

    // 余额不能为负数
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

    // 更新余额
    if (balanceData) {
      const { error: updateError } = await supabase
        .from('balance')
        .update({ amount: String(newBalance) })
        .eq('account_id', targetAccountId);

      if (updateError) throw updateError;
    } else {
      const { error: insertError } = await supabase
        .from('balance')
        .insert({ amount: String(newBalance), account_id: targetAccountId });

      if (insertError) throw insertError;
    }

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
    const targetAccountId = accountId || 1;

    if (!id) {
      return NextResponse.json({ error: 'Fund record ID is required' }, { status: 400 });
    }

    // 获取要删除的记录
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

    // 获取当前余额
    const { data: balanceData, error: balanceError } = await supabase
      .from('balance')
      .select('amount')
      .eq('account_id', targetAccountId)
      .single();

    if (balanceError && balanceError.code !== 'PGRST116') {
      throw balanceError;
    }

    const currentBalance = balanceData ? Number(balanceData.amount) : 0;

    // 计算新余额
    const newBalance = record.type === 'deposit'
      ? currentBalance - Number(record.amount)
      : currentBalance + Number(record.amount);

    // 余额不能为负数
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 删除记录
    const { error: deleteError } = await supabase
      .from('fund_records')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 更新余额
    if (balanceData) {
      const { error: updateError } = await supabase
        .from('balance')
        .update({ amount: String(newBalance) })
        .eq('account_id', targetAccountId);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error deleting fund record:', error);
    return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
  }
}
