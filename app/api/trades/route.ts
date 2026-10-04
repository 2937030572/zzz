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

    const { data: trade, error } = await sb
      .from('trades')
      .insert({
        symbol: input.symbol,
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
      })
      .select()
      .single();

    if (error) throw error;
    const insertedId = trade.id as string;

    const newBalance = await recalcAndPersistBalance(input.accountId);

    // 余额不能为负：不合法则回滚刚插入的交易
    if (newBalance < 0) {
      await sb.from('trades').delete().eq('id', insertedId);
      await recalcAndPersistBalance(input.accountId);
      return fail('余额不足，无法添加这笔亏损交易', 400);
    }

    return NextResponse.json({
      trade: parseTrade(trade as Record<string, unknown>),
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
    if (rest.strategy !== undefined) updateData.strategy = rest.strategy;
    if (rest.position !== undefined) updateData.position = rest.position;
    if (rest.openAmount !== undefined) updateData.open_amount = String(rest.openAmount);
    if (rest.openTime !== undefined) updateData.open_time = rest.openTime;
    if (rest.date !== undefined) updateData.date = rest.date;
    if (rest.isClosed !== undefined) updateData.is_closed = rest.isClosed;
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

    const { data: updated, error: updateError } = await sb
      .from('trades')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) throw updateError;

    const newBalance = await recalcAndPersistBalance(accountId);

    if (newBalance < 0) {
      // 回滚本次修改
      await sb
        .from('trades')
        .update({
          symbol: oldTrade.symbol,
          strategy: oldTrade.strategy,
          position: oldTrade.position,
          open_amount: oldTrade.open_amount,
          open_time: oldTrade.open_time,
          close_reason: oldTrade.close_reason,
          remark: oldTrade.remark,
          profit_loss: oldTrade.profit_loss,
          date: oldTrade.date,
          is_closed: oldTrade.is_closed,
        })
        .eq('id', id);
      await recalcAndPersistBalance(accountId);
      return fail('修改后的盈亏会导致余额为负数，无法保存', 400);
    }

    return NextResponse.json({
      trade: parseTrade(updated as Record<string, unknown>),
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
