import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

/** 从 fund_records + trades 实时计算真实余额（不加 account_id 过滤，兼容历史 null 数据） */
async function calcRealBalance(): Promise<number> {
  const [fundsRes, tradesRes] = await Promise.all([
    supabase.from('fund_records').select('type, amount'),
    supabase.from('trades').select('profit_loss'),
  ]);
  if (fundsRes.error) throw fundsRes.error;
  if (tradesRes.error) throw tradesRes.error;

  let balance = 0;
  for (const r of fundsRes.data ?? []) {
    const amt = Number(r.amount) || 0;
    balance += r.type === 'deposit' ? amt : -amt;
  }
  for (const t of tradesRes.data ?? []) {
    balance += Number(t.profit_loss) || 0;
  }
  return balance;
}

/** 同步 balance 快照（直接 update account_id 对应的行） */
async function syncBalanceSnapshot(accountId: number, newBalance: number): Promise<void> {
  await supabase
    .from('balance')
    .update({ amount: String(newBalance) })
    .eq('account_id', accountId);
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = searchParams.get('accountId');

    let query = supabase.from('trades').select('*')
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) throw error;

    const trades = data.map((row: any) => ({
      id: row.id,
      symbol: row.symbol || '',
      strategy: row.strategy || '',
      position: Number(row.position) || 0,
      openAmount: row.open_amount != null ? (Number(row.open_amount) || 0) : 0,
      openTime: row.open_time || '',
      closeReason: row.close_reason || 'profit',
      remark: row.remark || '',
      profitLoss: row.profit_loss != null ? (Number(row.profit_loss) || 0) : 0,
      date: row.date || '',
      isClosed: row.is_closed ?? true,
      accountId: row.account_id,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { accountId } = body;
    const targetAccountId = accountId || 1;

    // 处理数据
    const symbol = body.symbol || '';
    const strategy = body.strategy || '';
    const position = body.position ?? 0;
    const openAmount = String(body.openAmount ?? 0);
    const openTime = body.openTime || '';
    const date = body.date || '';
    const isClosed = body.isClosed ?? true;
    const closeReason = body.closeReason;
    const remark = body.remark;
    const profitLoss = body.profitLoss !== undefined && body.profitLoss !== null ? String(body.profitLoss) : '0';

    // 创建交易记录
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        symbol,
        strategy,
        position,
        open_amount: openAmount,
        open_time: openTime,
        close_reason: closeReason,
        remark: remark,
        profit_loss: profitLoss,
        date,
        is_closed: isClosed,
        account_id: targetAccountId
      })
      .select()
      .single();

    if (tradeError) throw tradeError;

    // 计算新余额
    let newBalance = 0;
    if (body.profitLoss !== undefined && body.profitLoss !== null && body.profitLoss !== '') {
      const profitLossNum = Number(body.profitLoss);
      
      // 获取当前账户余额
      const { data: balanceData, error: balanceError } = await supabase
        .from('balance')
        .select('amount')
        .eq('account_id', targetAccountId)
        .single();

      if (balanceError && balanceError.code !== 'PGRST116') {
        throw balanceError;
      }
      
      const currentBalance = balanceData ? Number(balanceData.amount) : 0;
      
      newBalance = currentBalance + profitLossNum;

      if (newBalance < 0) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

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
    }

    return NextResponse.json({
      trade: {
        id: trade.id,
        symbol: trade.symbol,
        strategy: trade.strategy,
        position: Number(trade.position),
        openAmount: Number(trade.open_amount),
        openTime: trade.open_time,
        closeReason: trade.close_reason,
        remark: trade.remark,
        profitLoss: Number(trade.profit_loss),
        date: trade.date,
        isClosed: trade.is_closed,
        accountId: trade.account_id,
        createdAt: trade.created_at,
        updatedAt: trade.updated_at,
      },
      balance: newBalance,
    });
  } catch (error: any) {
    console.error('Error creating trade:', error);
    return NextResponse.json({
      error: 'Failed to create trade',
      details: error?.message || 'Unknown error',
    }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, profitLoss: newProfitLoss, accountId, ...data } = body;
    const targetAccountId = accountId || 1;

    // 获取旧交易记录（旧记录 account_id 可能为 null，不加 account_id 过滤）
    const { data: oldTrade, error: oldTradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single();

    if (oldTradeError) {
      if (oldTradeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
      }
      throw oldTradeError;
    }

    const actualNewProfitLoss = newProfitLoss !== undefined && newProfitLoss !== null && newProfitLoss !== ''
      ? newProfitLoss
      : Number(oldTrade.profit_loss);

    // 构建更新数据
    const updateData: any = {};
    if (data.symbol !== undefined) updateData.symbol = data.symbol;
    if (data.strategy !== undefined) updateData.strategy = data.strategy;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.openAmount !== undefined) updateData.open_amount = String(data.openAmount);
    if (data.openTime !== undefined) updateData.open_time = data.openTime;
    if (data.closeReason !== undefined) updateData.close_reason = data.closeReason;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (newProfitLoss !== undefined) updateData.profit_loss = String(newProfitLoss);
    if (data.date !== undefined) updateData.date = data.date;
    if (data.isClosed !== undefined) updateData.is_closed = data.isClosed;
    updateData.updated_at = new Date();

    // 更新交易记录
    if (Object.keys(updateData).length > 1) { // 至少有一个字段要更新
      const { error: updateError } = await supabase
        .from('trades')
        .update(updateData)
        .eq('id', id);

      if (updateError) throw updateError;
    }

    // 更新后实时重算真实余额（避免依赖 balance 快照脏数据）
    const numericAccountId = Number(targetAccountId) || 1;
    const newBalance = await calcRealBalance();
    await syncBalanceSnapshot(numericAccountId, newBalance);

    return NextResponse.json({
      trade: { id, ...data, profitLoss: actualNewProfitLoss, accountId: targetAccountId },
      balance: newBalance
    });
  } catch (error: any) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const accountId = searchParams.get('accountId');
    const targetAccountId = accountId || 1;

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    // 获取要删除的交易记录（旧记录 account_id 可能为 null，不加 account_id 过滤）
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single();

    if (tradeError) {
      if (tradeError.code === 'PGRST116') {
        return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
      }
      throw tradeError;
    }

    const profitLoss = Number(trade.profit_loss);

    // 删除交易记录
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);

    if (deleteError) throw deleteError;

    // 删除后实时重算真实余额（避免依赖 balance 快照脏数据）
    const newBalance = await calcRealBalance();
    await syncBalanceSnapshot(Number(targetAccountId) || 1, newBalance);

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
