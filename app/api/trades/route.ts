import { NextResponse } from 'next/server';
import { tradeManager, balanceManager } from '@/storage/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate');
    const endDate = searchParams.get('endDate');

    let trades;
    if (startDate && endDate) {
      trades = await tradeManager.getTradesByDateRange(startDate, endDate);
    } else {
      trades = await tradeManager.getTrades();
    }

    return NextResponse.json({ trades });
  } catch (error) {
    console.error('Error fetching trades:', error);
    return NextResponse.json({ error: 'Failed to fetch trades' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { profitLoss, expectedBalance } = body;

    // 获取当前余额
    const currentBalance = await balanceManager.getBalance();

    // 前端传入了预期余额，进行并发校验
    if (expectedBalance !== undefined && currentBalance !== Number(expectedBalance)) {
      console.error(`Balance mismatch: expected ${expectedBalance}, actual ${currentBalance}`);
      return NextResponse.json(
        { error: 'Balance has been changed by another operation. Please refresh and try again.' },
        { status: 409 }
      );
    }

    // 创建交易记录
    const trade = await tradeManager.createTrade(body);

    // 计算新余额
    const newBalance = currentBalance + Number(profitLoss);

    // 余额不能为负数
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 更新余额
    await balanceManager.updateBalance({ amount: newBalance });

    return NextResponse.json({ trade, balance: newBalance });
  } catch (error) {
    console.error('Error creating trade:', error);
    return NextResponse.json({ error: 'Failed to create trade' }, { status: 500 });
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const { id, profitLoss: newProfitLoss, expectedBalance, ...data } = body;

    // 获取当前余额
    const currentBalance = await balanceManager.getBalance();

    // 前端传入了预期余额，进行并发校验
    if (expectedBalance !== undefined && currentBalance !== Number(expectedBalance)) {
      console.error(`Balance mismatch: expected ${expectedBalance}, actual ${currentBalance}`);
      return NextResponse.json(
        { error: 'Balance has been changed by another operation. Please refresh and try again.' },
        { status: 409 }
      );
    }

    // 获取旧交易记录
    const oldTrade = await tradeManager.getTradeById(id);
    if (!oldTrade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // 如果没有传递新的 profitLoss，使用旧值
    const actualNewProfitLoss = newProfitLoss !== undefined ? newProfitLoss : oldTrade.profitLoss;

    // 更新交易记录
    const trade = await tradeManager.updateTrade(id, data);
    if (!trade) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // 计算余额变化
    const balanceChange = Number(actualNewProfitLoss) - oldTrade.profitLoss;
    const newBalance = currentBalance + balanceChange;

    // 余额不能为负数
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 更新余额
    await balanceManager.updateBalance({ amount: newBalance });

    return NextResponse.json({ trade, balance: newBalance });
  } catch (error) {
    console.error('Error updating trade:', error);
    return NextResponse.json({ error: 'Failed to update trade' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const expectedBalance = searchParams.get('expectedBalance');

    if (!id) {
      return NextResponse.json({ error: 'Trade ID is required' }, { status: 400 });
    }

    // 获取要删除的交易记录
    const tradeToDelete = await tradeManager.getTradeById(id);
    if (!tradeToDelete) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // 获取当前余额
    const currentBalance = await balanceManager.getBalance();

    // 前端传入了预期余额，进行并发校验
    if (expectedBalance !== undefined && currentBalance !== Number(expectedBalance)) {
      console.error(`Balance mismatch: expected ${expectedBalance}, actual ${currentBalance}`);
      return NextResponse.json(
        { error: 'Balance has been changed by another operation. Please refresh and try again.' },
        { status: 409 }
      );
    }

    // 计算新余额
    const newBalance = currentBalance - tradeToDelete.profitLoss;

    // 余额不能为负数
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 删除交易记录
    const success = await tradeManager.deleteTrade(id);
    if (!success) {
      return NextResponse.json({ error: 'Trade not found' }, { status: 404 });
    }

    // 更新余额
    await balanceManager.updateBalance({ amount: newBalance });

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error deleting trade:', error);
    return NextResponse.json({ error: 'Failed to delete trade' }, { status: 500 });
  }
}
