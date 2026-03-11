import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'deposit' | 'withdraw' | null;
    const accountId = searchParams.get('accountId');
    const limit = parseInt(searchParams.get('limit') || '10');

    let query = supabase.from('fund_records').select('*');

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (type) {
      query = query.eq('type', type);
    }

    query = query.order('created_at', { ascending: false }).limit(limit);

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fund records:', error);
      return NextResponse.json({ error: 'Failed to fetch fund records' }, { status: 500 });
    }

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
    const targetAccountId = accountId || '00000000-0000-0000-0000-000000000001';

    // 获取当前余额
    const { data: balanceData, error: balanceError } = await supabase
      .from('balance')
      .select('amount')
      .eq('account_id', targetAccountId)
      .single();
    
    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching balance:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
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
      .insert({
        type,
        amount: Number(amount),
        date,
        account_id: targetAccountId
      })
      .select()
      .single();

    if (recordError) {
      console.error('Error creating fund record:', recordError);
      return NextResponse.json({ error: 'Failed to create fund record' }, { status: 500 });
    }

    // 更新余额
    if (balanceData) {
      const { error: updateError } = await supabase
        .from('balance')
        .update({ amount: newBalance })
        .eq('account_id', targetAccountId);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
      }
    } else {
      const { error: insertError } = await supabase
        .from('balance')
        .insert({ amount: newBalance, account_id: targetAccountId });

      if (insertError) {
        console.error('Error inserting balance:', insertError);
        return NextResponse.json({ error: 'Failed to insert balance' }, { status: 500 });
      }
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
    const targetAccountId = accountId || '00000000-0000-0000-0000-000000000001';

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
      console.error('Error fetching fund record:', recordError);
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    // 获取当前余额
    const { data: balanceData, error: balanceError } = await supabase
      .from('balance')
      .select('amount')
      .eq('account_id', targetAccountId)
      .single();
    
    if (balanceError && balanceError.code !== 'PGRST116') {
      console.error('Error fetching balance:', balanceError);
      return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
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

    if (deleteError) {
      console.error('Error deleting fund record:', deleteError);
      return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
    }

    // 更新余额
    if (balanceData) {
      const { error: updateError } = await supabase
        .from('balance')
        .update({ amount: newBalance })
        .eq('account_id', targetAccountId);

      if (updateError) {
        console.error('Error updating balance:', updateError);
        return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error deleting fund record:', error);
    return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
  }
}
