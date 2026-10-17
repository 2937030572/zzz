import { NextResponse } from 'next/server';
import { getSupabase, toPublicError } from '@/lib/supabase';
import { recalcAndPersistBalance } from '@/lib/balance';
import {
  DEFAULT_ACCOUNT_ID,
  createTradeSchema,
  updateTradeSchema,
  parseTrade,
  parseAccountIdParam,
} from '@/lib/schema';

/** 默认账户额外包含 account_id 为 null 的历史数据 */
function accountScope(accountId: number): string {
  return accountId === DEFAULT_ACCOUNT_ID
    ? `account_id.eq.${accountId},account_id.is.null`
    : `account_id.eq.${accountId}`;
}

function fail(message: string, status = 500, error?: unknown) {
  if (error) console.error(message, error);
  return NextResponse.json({ error: message }, { status });
}

/**
 * 后加的可选列（direction 来自 003，复盘字段来自 004）。
 * 迁移脚本没跑时表结构可能是旧的，写入失败会逐个剔除缺列后重试，
 * 保证「没跑迁移」也不会写不进交易，只是新字段暂时存不下。
 */
const OPTIONAL_COLUMNS = ['direction', 'execution_score', 'discipline_tags', 'emotion'] as const;

function missingColumnOf(error: unknown): string | null {
  const e = error as { code?: string; message?: string; details?: string } | null;
  if (!e) return null;
  const text = `${e.code ?? ''} ${e.message ?? ''} ${e.details ?? ''}`.toLowerCase();
  const looksMissing =
    text.includes('42703') ||
    text.includes('does not exist') ||
    text.includes('could not find') ||
    text.includes('schema cache');
  if (!looksMissing) return null;
  return OPTIONAL_COLUMNS.find((column) => text.includes(column)) ?? null;
}

/** 写入 trades，遇到缺列就剔除该列重试，直到成功或确认是别的错误 */
async function writeTrade(
  payload: Record<string, unknown>,
  run: (data: Record<string, unknown>) => PromiseLike<{ data: unknown; error: unknown }>
): Promise<Record<string, unknown>> {
  let current = payload;
  for (let attempt = 0; attempt <= OPTIONAL_COLUMNS.length; attempt += 1) {
    const result = await run(current);
    if (!result.error) return result.data as Record<string, unknown>;

    const column = missingColumnOf(result.error);
    if (!column || !(column in current)) throw result.error;

    current = { ...current };
    delete current[column];
  }
  throw new Error('写入 trades 失败');
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = parseAccountIdParam(searchParams.get('accountId'));
    if (accountId === null) return fail('accountId 不合法', 400);

    let query = getSupabase()
      .from('trades')
      .select('*')
      .or(accountScope(accountId))
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (startDate) query = query.gte('date', startDate);
    if (endDate) query = query.lte('date', endDate);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({
      trades: (data ?? []).map((row: Record<string, unknown>) => parseTrade(row)),
    });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to fetch trades'), 500, error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = createTradeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '请求参数不合法', 400);
    }
    const input = parsed.data;
    const sb = getSupabase();

    const insertPayload: Record<string, unknown> = {
      symbol: input.symbol,
      direction: input.direction,
      strategy: input.strategy,
      position: input.position,
      open_amount: String(input.openAmount),
      open_time: input.openTime,
      close_reason: input.isClosed ? input.closeReason : 'pending',
      remark: input.closeReason === 'other' ? (input.remark ?? null) : null,
      profit_loss: String(input.isClosed ? input.profitLoss : 0),
      date: input.date,
      is_closed: input.isClosed,
      account_id: input.accountId,
      execution_score: input.executionScore,
      discipline_tags: input.disciplineTags,
      emotion: input.emotion,
    };

    const trade = await writeTrade(insertPayload, (data) =>
      sb.from('trades').insert(data).select().single()
    );
    const insertedId = trade.id as string;

    const newBalance = await recalcAndPersistBalance(input.accountId);

    // 余额不能为负：不合法则回滚刚插入的交易
    if (newBalance < 0) {
      await sb.from('trades').delete().eq('id', insertedId);
      await recalcAndPersistBalance(input.accountId);
      return fail('余额不足，无法添加这笔亏损交易', 400);
    }

    return NextResponse.json({
      trade: parseTrade(trade),
      balance: newBalance,
    });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to create trade'), 500, error);
  }
}

export async function PUT(request: Request) {
  try {
    const parsed = updateTradeSchema.safeParse(await request.json());
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? '请求参数不合法', 400);
    }
    const { id, accountId: clientAccountId, ...rest } = parsed.data;

    const sb = getSupabase();
    const { data: oldTrade, error: findError } = await sb
      .from('trades')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!oldTrade) return fail('Trade not found', 404);

    // 余额重算必须以该行实际归属的账户为准，不信任客户端传的 accountId
    const accountId = oldTrade.account_id != null ? Number(oldTrade.account_id) : clientAccountId;

    const updateData: Record<string, unknown> = { updated_at: new Date().toISOString() };
    if (rest.symbol !== undefined) updateData.symbol = rest.symbol;
    if (rest.direction !== undefined) updateData.direction = rest.direction;
    if (rest.strategy !== undefined) updateData.strategy = rest.strategy;
    if (rest.position !== undefined) updateData.position = rest.position;
    if (rest.openAmount !== undefined) updateData.open_amount = String(rest.openAmount);
    if (rest.openTime !== undefined) updateData.open_time = rest.openTime;
    if (rest.date !== undefined) updateData.date = rest.date;
    if (rest.isClosed !== undefined) updateData.is_closed = rest.isClosed;
    if (rest.executionScore !== undefined) updateData.execution_score = rest.executionScore;
    if (rest.disciplineTags !== undefined) updateData.discipline_tags = rest.disciplineTags;
    if (rest.emotion !== undefined) updateData.emotion = rest.emotion;
    const closed = rest.isClosed ?? Boolean(oldTrade.is_closed);
    if (rest.isClosed !== undefined || rest.closeReason !== undefined) {
      updateData.close_reason = closed ? (rest.closeReason ?? oldTrade.close_reason) : 'pending';
    }
    if (rest.remark !== undefined) updateData.remark = rest.remark ?? null;
    if (rest.profitLoss !== undefined) {
      updateData.profit_loss = String(closed ? rest.profitLoss : 0);
    }
    // 取消平仓（已平仓 → 持有中）时，必须清掉旧盈亏与备注，否则「持有中」的单子仍参与余额结算
    if (rest.isClosed === false) {
      updateData.profit_loss = '0';
      updateData.remark = null;
    }

    const updated = await writeTrade(updateData, (data) =>
      sb.from('trades').update(data).eq('id', id).select().single()
    );

    const newBalance = await recalcAndPersistBalance(accountId);

    if (newBalance < 0) {
      // 回滚本次修改
      await sb
        .from('trades')
        .update({
          symbol: oldTrade.symbol,
          direction: oldTrade.direction,
          strategy: oldTrade.strategy,
          position: oldTrade.position,
          open_amount: oldTrade.open_amount,
          open_time: oldTrade.open_time,
          close_reason: oldTrade.close_reason,
          remark: oldTrade.remark,
          profit_loss: oldTrade.profit_loss,
          date: oldTrade.date,
          is_closed: oldTrade.is_closed,
          execution_score: oldTrade.execution_score,
          discipline_tags: oldTrade.discipline_tags,
          emotion: oldTrade.emotion,
        })
        .eq('id', id);
      await recalcAndPersistBalance(accountId);
      return fail('修改后的盈亏会导致余额为负数，无法保存', 400);
    }

    return NextResponse.json({
      trade: parseTrade(updated),
      balance: newBalance,
    });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to update trade'), 500, error);
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const accountIdParam = searchParams.get('accountId');

    if (!id) return fail('Trade ID is required', 400);

    const sb = getSupabase();
    const { data: trade, error: findError } = await sb
      .from('trades')
      .select('id, account_id')
      .eq('id', id)
      .maybeSingle();

    if (findError) throw findError;
    if (!trade) return fail('Trade not found', 404);

    const accountId = Number(trade.account_id ?? accountIdParam) || DEFAULT_ACCOUNT_ID;

    const { error: deleteError } = await sb.from('trades').delete().eq('id', id);
    if (deleteError) throw deleteError;

    const newBalance = await recalcAndPersistBalance(accountId);
    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    return fail(toPublicError(error, 'Failed to delete trade'), 500, error);
  }
}
