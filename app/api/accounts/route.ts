import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

// 获取所有账户
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching accounts:', error);
      return NextResponse.json({ error: 'Failed to fetch accounts' }, { status: 500 });
    }

    return NextResponse.json({ accounts: data });
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

    // 创建账户
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (accountError) {
      console.error('Error creating account:', accountError);
      if (accountError.code === '23505') {
        return NextResponse.json({ error: 'Account name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to create account' }, { status: 500 });
    }

    // 为新账户创建初始余额记录
    const { error: balanceError } = await supabase
      .from('balance')
      .insert({ amount: 0, account_id: account.id });

    if (balanceError) {
      console.error('Error creating balance record:', balanceError);
      return NextResponse.json({ error: 'Failed to create balance record' }, { status: 500 });
    }

    return NextResponse.json({ account });
  } catch (error) {
    console.error('Error creating account:', error);
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

    const { data, error } = await supabase
      .from('accounts')
      .update({ name: name.trim(), updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      console.error('Error updating account:', error);
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Account name already exists' }, { status: 400 });
      }
      return NextResponse.json({ error: 'Failed to update account' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account: data });
  } catch (error) {
    console.error('Error updating account:', error);
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
    const { error: balanceError } = await supabase
      .from('balance')
      .delete()
      .eq('account_id', id);

    if (balanceError) {
      console.error('Error deleting balance records:', balanceError);
      return NextResponse.json({ error: 'Failed to delete balance records' }, { status: 500 });
    }

    // 删除账户相关的交易记录
    const { error: tradesError } = await supabase
      .from('trades')
      .delete()
      .eq('account_id', id);

    if (tradesError) {
      console.error('Error deleting trades:', tradesError);
      return NextResponse.json({ error: 'Failed to delete trades' }, { status: 500 });
    }

    // 删除账户相关的出入金记录
    const { error: fundRecordsError } = await supabase
      .from('fund_records')
      .delete()
      .eq('account_id', id);

    if (fundRecordsError) {
      console.error('Error deleting fund records:', fundRecordsError);
      return NextResponse.json({ error: 'Failed to delete fund records' }, { status: 500 });
    }

    // 删除账户
    const { data, error: accountError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (accountError) {
      console.error('Error deleting account:', accountError);
      return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
    }

    if (!data) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
