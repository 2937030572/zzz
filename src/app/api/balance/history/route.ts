import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { trades, balance } from "@/storage/database/shared/schema";
import { desc, eq } from "drizzle-orm";

// GET /api/balance/history - 获取资产历史数据
export async function GET() {
  try {
    const db = await getDb();

    // 获取初始资产余额
    const balanceResult = await db.select().from(balance).limit(1);
    const initialBalance = balanceResult.length > 0
      ? parseFloat(balanceResult[0].amount)
      : 0;

    // 获取提现金额
    const withdrawalAmount = balanceResult.length > 0 && balanceResult[0].withdrawalAmount
      ? parseFloat(balanceResult[0].withdrawalAmount)
      : 0;

    // 获取所有已平仓的交易，按时间排序
    const closedTrades = await db
      .select()
      .from(trades)
      .where(eq(trades.isClosed, true))
      .orderBy(desc(trades.entryTime));

    // 计算资产历史
    const history = [];
    let currentBalance = initialBalance;

    // 添加初始点
    history.push({
      date: "初始",
      balance: initialBalance - withdrawalAmount, // 初始可用余额
      type: "initial",
    });

    // 从最早的交易开始计算
    const sortedTrades = [...closedTrades].reverse();
    sortedTrades.forEach((trade) => {
      if (trade.profitLoss) {
        const profitLoss = parseFloat(trade.profitLoss);
        currentBalance += profitLoss;
        history.push({
          date: trade.entryTime,
          balance: currentBalance - withdrawalAmount, // 可用余额 = 当前余额 - 提现金额
          type: "trade",
          tradeId: trade.id,
          symbol: trade.symbol,
          profitLoss: profitLoss,
        });
      }
    });

    // 计算可用余额（当前余额 - 提现金额）
    const availableBalance = currentBalance - withdrawalAmount;

    return NextResponse.json({
      initialBalance: initialBalance - withdrawalAmount, // 初始可用余额
      currentBalance: availableBalance, // 当前可用余额
      history,
      totalTrades: closedTrades.length,
    });
  } catch (error) {
    console.error("Error fetching balance history:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance history" },
      { status: 500 }
    );
  }
}
