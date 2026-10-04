import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getSupabase, toPublicError } from '@/lib/supabase';
import { DEFAULT_ACCOUNT_ID } from '@/lib/schema';

function fail(message: string, status = 500, error?: unknown) {
  if (error) console.error(message, error);
  return NextResponse.json({ error: message }, { status });
}

const upsertSchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD'),
  value: z.coerce.number(),
  accountId: z.coerce.number().int().positive().optional().default(DEFAULT_ACCOUNT_ID),
});

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = Number(searchParams.get('accountId')) || DEFAULT_ACCOUNT_ID;

    const { data, error } = await getSupabase()
      .from('equity_history')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: true });

    if (error) throw error;

    const history = (data ?? [])
      .filter((row: Record<string, unknown>) => row.value != null && row.date != null)
      .map((row: Record<string, unknown>) => ({
        id: String(row.id ?? ''),
        date: String(row.date ?? ''),
        value: Number(row.value) || 0,
        accountId: Number(row.account_id) || accountId,
      }));

    return NextResponse.json({ history });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to fetch equity history'), 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = upsertSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '请求参数不合法', 400);
    }
    const { date, value, accountId } = parsed.data;
    const sb = getSupabase();

    const { data: existing } = await sb
      .from('equity_history')
      .select('id')
      .eq('date', date)
      .eq('account_id', accountId)
      .maybeSingle();

    const payload = { date, value: String(value), account_id: accountId };

    const { data: record, error } = existing
      ? await sb.from('equity_history').update(payload).eq('id', existing.id).select().single()
      : await sb.from('equity_history').insert(payload).select().single();

    if (error) throw error;

    return NextResponse.json({
      record: {
        id: String(record.id),
        date: record.date,
        value: Number(record.value) || 0,
        accountId: Number(record.account_id) || accountId,
      },
    });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to save equity history'), 500, error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountIdParam = searchParams.get('accountId');
    if (!accountIdParam) return fail('accountId is required', 400);

    const accountId = Number(accountIdParam);
    if (!Number.isInteger(accountId) || accountId <= 0) return fail('accountId 不合法', 400);

    const { error } = await getSupabase()
      .from('equity_history')
      .delete()
      .eq('account_id', accountId);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to clear equity history'), 500, error);
  }
}
