import { NextResponse } from 'next/server';
import { getSupabase, toPublicError } from '@/lib/supabase';
import { DEFAULT_ACCOUNT_ID, createAccountSchema, updateAccountSchema } from '@/lib/schema';

function fail(message: string, status = 500, error?: unknown) {
  if (error) console.error(message, error);
  return NextResponse.json({ error: message }, { status });
}

export async function GET() {
  try {
    const { data, error } = await getSupabase()
      .from('accounts')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) throw error;
    return NextResponse.json({ accounts: data ?? [] });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to fetch accounts'), 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createAccountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '请求参数不合法', 400);
    }

    const sb = getSupabase();
    const { data: account, error } = await sb
      .from('accounts')
      .insert({ name: parsed.data.name })
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return fail('账户名称已存在', 400);
      throw error;
    }

    // 为新账户建立初始余额快照。
    // 非致命：快照缺失时 readBalance 会实时重算，下次写操作也会自动补行。
    const { error: balanceError } = await sb
      .from('balance')
      .insert({ amount: '0', account_id: account.id });

    if (balanceError) console.error('初始余额快照创建失败（可自动恢复）:', balanceError);

    return NextResponse.json({ account });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to create account'), 500, error);
  }
}

export async function PUT(request: Request) {
  try {
    const parsed = updateAccountSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '请求参数不合法', 400);
    }

    const { data: account, error } = await getSupabase()
      .from('accounts')
      .update({ name: parsed.data.name, updated_at: new Date().toISOString() })
      .eq('id', parsed.data.id)
      .select()
      .single();

    if (error) {
      if (error.code === '23505') return fail('账户名称已存在', 400);
      throw error;
    }
    if (!account) return fail('Account not found', 404);

    return NextResponse.json({ account });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to update account'), 500, error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = Number(searchParams.get('id'));

    if (!Number.isInteger(id) || id <= 0) return fail('Account ID is required', 400);
    if (id === DEFAULT_ACCOUNT_ID) return fail('不能删除默认账户', 400);

    const sb = getSupabase();

    // 先清理关联数据，最后删除账户本身；任一步失败都直接中止，避免出现孤儿记录
    for (const table of ['balance', 'trades', 'fund_records', 'equity_history']) {
      const { error } = await sb.from(table).delete().eq('account_id', id);
      if (error) throw error;
    }

    const { data: account, error } = await sb
      .from('accounts')
      .delete()
      .eq('id', id)
      .select()
      .single();

    if (error) throw error;
    if (!account) return fail('Account not found', 404);

    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to delete account'), 500, error);
  }
}
