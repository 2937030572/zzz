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
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');
    const accountId = searchParams.get('accountId');

    let query = supabase.from('trades').select('*');

    if (accountId) {
      query = query.eq('account_id', accountId);
    }

    if (startDate && endDate) {
      query = query.gte('date', startDate).lte('date', endDate);
    }

    query = query.order('created_at', { ascending: false });

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching trades:', error);
      return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
    }

    const trades = data.map((row: any) => ({
      id: row.id,
      symbol: row.symbol,
      strategy: row.strategy,
      position: Number(row.position),
      openAmount: Number(row.open_amount),
      openTime: row.open_time,
      closeReason: row.close_reason,
      remark: row.remark,
      profitLoss: Number(row.profit_loss),
      date: row.date,
      isClosed: row.is_closed,
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
    const targetAccountId = accountId || '00000000-0000-0000-0000-000000000001';

    // 处理数据
    const symbol = body.symbol || '';
    const strategy = body.strategy || '';
    const position = body.position ?? 0;
    const openAmount = body.openAmount ?? 0;
    const openTime = body.openTime || '';
    const date = body.date || '';
    const isClosed = body.isClosed ?? true;
    const closeReason = body.closeReason;
    const remark = body.remark;
    const profitLoss = body.profitLoss ?? 0;

    // 开始事务
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .insert({
        symbol,
        strategy,
        position,
        open_amount: Number(openAmount),
        open_time: openTime,
        close_reason: closeReason,
        remark: remark,
        profit_loss: Number(profitLoss),
        date,
        is_closed: isClosed,
        account_id: targetAccountId
      })
      .select()
      .single();

    if (tradeError) {
      console.error('Error creating trade:', tradeError);
      return NextResponse.json({
        error: 'Failed to create trade',
        details: tradeError?.message || 'Unknown error',
      }, { status: 500 });
    }

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
        console.error('Error fetching balance:', balanceError);
        return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
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
    const targetAccountId = accountId || '00000000-0000-0000-0000-000000000001';

    // 获取旧交易记录
    const { data: oldTrade, error: oldTradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single();

    if (oldTradeError) {
      console.error('Error fetching old trade:', oldTradeError);
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const actualNewProfitLoss = newProfitLoss !== undefined && newProfitLoss !== null && newProfitLoss !== ''
      ? newProfitLoss
      : Number(oldTrade.profit_loss);

    // 构建更新数据
    const updateData: any = {};
    if (data.symbol !== undefined) updateData.symbol = data.symbol;
    if (data.strategy !== undefined) updateData.strategy = data.strategy;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.openAmount !== undefined) updateData.open_amount = Number(data.openAmount);
    if (data.openTime !== undefined) updateData.open_time = data.openTime;
    if (data.closeReason !== undefined) updateData.close_reason = data.closeReason;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (newProfitLoss !== undefined) updateData.profit_loss = Number(newProfitLoss);
    if (data.date !== undefined) updateData.date = data.date;
    if (data.isClosed !== undefined) updateData.is_closed = data.isClosed;
    updateData.updated_at = new Date().toISOString();

    // 更新交易记录
    if (Object.keys(updateData).length > 0) {
      const { error: updateError } = await supabase
        .from('trades')
        .update(updateData)
        .eq('id', id);

      if (updateError) {
        console.error('Error updating trade:', updateError);
        return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
      }
    }

    // 计算新余额
    let newBalance = 0;
    if (newProfitLoss !== undefined) {
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
      const oldProfitLoss = Number(oldTrade.profit_loss);
      newBalance = currentBalance - oldProfitLoss + Number(actualNewProfitLoss);

      if (newBalance < 0) {
        return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
      }

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
    }

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
    const targetAccountId = accountId || '00000000-0000-0000-0000-000000000001';

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    // 获取要删除的交易记录
    const { data: trade, error: tradeError } = await supabase
      .from('trades')
      .select('*')
      .eq('id', id)
      .single();

    if (tradeError) {
      console.error('Error fetching trade:', tradeError);
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    const profitLoss = Number(trade.profit_loss);

    // 删除交易记录
    const { error: deleteError } = await supabase
      .from('trades')
      .delete()
      .eq('id', id);

    if (deleteError) {
      console.error('Error deleting trade:', deleteError);
      return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
    }

    // 更新余额
    let newBalance = 0;
    if (profitLoss !== 0) {
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
      newBalance = currentBalance - profitLoss;

      if (newBalance < 0) {
        newBalance = 0; // 防止负数
      }

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
    }

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
