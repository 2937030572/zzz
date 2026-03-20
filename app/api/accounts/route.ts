import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

// 获取所有账户
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
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

    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .insert({ name: name.trim() })
      .select()
      .single();

    if (accountError) throw accountError;

    // 为新账户创建初始余额记录
    const { error: balanceError } = await supabase
      .from('balance')
      .insert({ amount: '0', account_id: account.id });

    if (balanceError) throw balanceError;

    return NextResponse.json({ account });
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

    const { data: account, error } = await supabase
      .from('accounts')
      .update({ name: name.trim(), updated_at: new Date() })
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ account });
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
    const { error: balanceError } = await supabase
      .from('balance')
      .delete()
      .eq('account_id', id);

    if (balanceError) throw balanceError;

    // 删除账户相关的交易记录
    const { error: tradesError } = await supabase
      .from('trades')
      .delete()
      .eq('account_id', id);

    if (tradesError) throw tradesError;

    // 删除账户相关的出入金记录
    const { error: fundRecordsError } = await supabase
      .from('fund_records')
      .delete()
      .eq('account_id', id);

    if (fundRecordsError) throw fundRecordsError;

    // 删除账户
    const { data: account, error: accountError } = await supabase
      .from('accounts')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (accountError) throw accountError;
    if (!account) {
      return NextResponse.json({ error: 'Account not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting account:', error);
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
