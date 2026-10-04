import { NextResponse } from 'next/server';
import { getSupabase, toPublicError } from '@/lib/supabase';
import { recalcAndPersistBalance } from '@/lib/balance';
import {
  DEFAULT_ACCOUNT_ID,
  createFundRecordSchema,
  parseFundRecord,
  parseAccountIdParam,
} from '@/lib/schema';

const MAX_LIMIT = 1000;

function accountScope(accountId: number): string {
  return accountId === DEFAULT_ACCOUNT_ID
    ? `account_id.eq.${accountId},account_id.is.null`
    : `account_id.eq.${accountId}`;
}

function fail(message: string, status = 500, error?: unknown) {
  if (error) console.error(message, error);
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');
    const accountId = parseAccountIdParam(searchParams.get('accountId'));
    if (accountId === null) return fail('accountId 不合法', 400);
    const rawLimit = Number(searchParams.get('limit')) || 200;
    const limit = Math.max(1, Math.min(rawLimit, MAX_LIMIT));

    let query = getSupabase()
      .from('fund_records')
      .select('*')
      .or(accountScope(accountId))
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (type === 'deposit' || type === 'withdraw') query = query.eq('type', type);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      records: (data ?? []).map((row: Record<string, unknown>) => parseFundRecord(row)),
    });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to fetch fund records'), 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createFundRecordSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '请求参数不合法', 400);
    }
    const input = parsed.data;
    const sb = getSupabase();

    const { data: record, error } = await sb
      .from('fund_records')
      .insert({
        type: input.type,
        amount: String(input.amount),
        date: input.date,
        account_id: input.accountId,
      })
      .select()
      .single();

    if (error) throw error;

    const newBalance = await recalcAndPersistBalance(input.accountId);

    if (newBalance < 0) {
      // 出金超出余额：回滚
      await sb.from('fund_records').delete().eq('id', record.id);
      await recalcAndPersistBalance(input.accountId);
      return fail('余额不足，无法完成出金', 400);
    }

    return NextResponse.json({
      record: parseFundRecord(record as Record<string, unknown>),
      balance: newBalance,
    });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to create fund record'), 500, error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const accountIdParam = searchParams.get('accountId');
    if (!id) return fail('Fund record ID is required', 400);

    const sb = getSupabase();
    const { data: record, error: findError } = await sb
      .from('fund_records')
      .select('id, account_id')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!record) return fail('Fund record not found', 404);

    const accountId = Number(record.account_id ?? accountIdParam) || DEFAULT_ACCOUNT_ID;

    const { error: deleteError } = await sb.from('fund_records').delete().eq('id', id);
    if (deleteError) throw deleteError;

    const newBalance = await recalcAndPersistBalance(accountId);
    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to delete fund record'), 500, error);
  }
}
