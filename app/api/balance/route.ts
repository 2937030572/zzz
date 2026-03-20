import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId');

    let query = supabase.from('balance').select('*');

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    const { data, error } = await query;

    if (error) throw error;

    if (data.length === 0) {
      // 如果没有余额记录，返回0
      return NextResponse.json({ balance: 0 });
    }

    // 处理amount字段，可能是字符串或对象
    let amount = data[0].amount;
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
    const { data: existing, error: checkError } = await supabase
      .from('balance')
      .select('id')
      .eq('account_id', targetAccountId)
      .single();

    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }

    if (!existing) {
      // 插入新记录
      const { error: insertError } = await supabase
        .from('balance')
        .insert({ amount: String(amount), account_id: targetAccountId });

      if (insertError) throw insertError;
    } else {
      // 更新现有记录
      const { error: updateError } = await supabase
        .from('balance')
        .update({ amount: String(amount) })
        .eq('account_id', targetAccountId);

      if (updateError) throw updateError;
    }

    return NextResponse.json({ balance: Number(amount) });
  } catch (error) {
    console.error('Error updating balance:', error);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
}
