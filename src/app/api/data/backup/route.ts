import { NextResponse } from "next/server";
import { tradeManager } from "@/storage/database/tradeManager";
import { getDb } from "coze-coding-dev-sdk";
import { balance } from "@/storage/database/shared/schema";
import * as schema from "@/storage/database/shared/schema";

// GET /api/data/backup - 导出完整数据备份
export async function GET() {
  try {
    const db = await getDb(schema);

    // 获取资产余额
    const balanceResult = await db.select().from(balance).limit(1);

    // 获取所有交易记录
    const trades = await tradeManager.getTrades({ limit: 1000 });

    // 创建备份数据
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      environment: process.env.NODE_ENV || "development",
      data: {
        balance: balanceResult.length > 0 ? {
          id: balanceResult[0].id,
          amount: balanceResult[0].amount.toString(),
          withdrawalAmount: balanceResult[0].withdrawalAmount?.toString() || "0",
          createdAt: balanceResult[0].createdAt,
          updatedAt: balanceResult[0].updatedAt,
        } : null,
        trades: trades.map(trade => ({
          id: trade.id,
          symbol: trade.symbol,
          direction: trade.direction,
          entryPrice: trade.entryPrice.toString(),
          exitPrice: trade.exitPrice?.toString() || null,
          quantity: trade.quantity?.toString() || '1',
          strategySummary: trade.strategySummary,
          tradeLevel: trade.tradeLevel,
          positionSize: trade.positionSize,
          profitLoss: trade.profitLoss?.toString() || null,
          exitReason: trade.exitReason || null,
          entryTime: trade.entryTime,
          exitTime: trade.exitTime || null,
          notes: trade.notes || null,
          isClosed: trade.isClosed,
          createdAt: trade.createdAt,
          updatedAt: trade.updatedAt,
        })),
      },
      summary: {
        totalTrades: trades.length,
        closedTrades: trades.filter(t => t.isClosed).length,
        openTrades: trades.filter(t => !t.isClosed).length,
        hasBalance: balanceResult.length > 0,
      },
    };

    // 返回 JSON 文件下载
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="trade-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error creating backup:", error);
    return NextResponse.json(
      { error: "Failed to create backup" },
      { status: 500 }
    );
  }
}
