import { NextRequest, NextResponse } from "next/server";
import { tradeManager } from "@/storage/database/tradeManager";
import { getDb } from "coze-coding-dev-sdk";
import { balance } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import * as schema from "@/storage/database/shared/schema";

// POST /api/data/restore - 从备份恢复数据
export async function POST(request: NextRequest) {
  try {
    const db = await getDb(schema);
    const backupData = await request.json();

    // 验证备份数据格式
    if (!backupData.version || !backupData.data) {
      return NextResponse.json(
        { error: "Invalid backup data format" },
        { status: 400 }
      );
    }

    const results = {
      balance: { success: false, message: "" },
      trades: { success: false, message: "", count: 0 },
    };

    // 恢复资产余额
    if (backupData.data.balance) {
      try {
        const balData = backupData.data.balance;

        // 检查是否已存在
        const existing = await db.select().from(balance).limit(1);

        if (existing.length > 0) {
          // 更新现有记录
          await db
            .update(balance)
            .set({
              amount: balData.amount,
              withdrawalAmount: balData.withdrawalAmount || "0",
              updatedAt: new Date(),
            })
            .where(eq(balance.id, existing[0].id));
        } else {
          // 插入新记录
          await db.insert(balance).values({
            id: balData.id,
            amount: balData.amount,
            withdrawalAmount: balData.withdrawalAmount || "0",
            createdAt: balData.createdAt || new Date(),
            updatedAt: new Date(),
          });
        }

        results.balance.success = true;
        results.balance.message = "资产余额恢复成功";
      } catch (error) {
        console.error("Error restoring balance:", error);
        results.balance.message = `资产余额恢复失败: ${error}`;
      }
    }

    // 恢复交易记录
    if (backupData.data.trades && Array.isArray(backupData.data.trades)) {
      try {
        let successCount = 0;
        let errorCount = 0;

        for (const tradeData of backupData.data.trades) {
          try {
            // 检查交易是否已存在
            const existing = await tradeManager.getTradeById(tradeData.id);

            if (existing) {
              // 更新现有记录
              await tradeManager.updateTrade(tradeData.id, {
                symbol: tradeData.symbol,
                direction: tradeData.direction,
                entryPrice: tradeData.entryPrice,
                exitPrice: tradeData.exitPrice,
                quantity: tradeData.quantity,
                strategySummary: tradeData.strategySummary,
                tradeLevel: tradeData.tradeLevel,
                positionSize: tradeData.positionSize,
                profitLoss: tradeData.profitLoss,
                exitReason: tradeData.exitReason,
                entryTime: tradeData.entryTime,
                exitTime: tradeData.exitTime,
                notes: tradeData.notes,
                isClosed: tradeData.isClosed,
              });
            } else {
              // 插入新记录
              await tradeManager.createTrade({
                symbol: tradeData.symbol,
                direction: tradeData.direction,
                entryPrice: tradeData.entryPrice,
                exitPrice: tradeData.exitPrice,
                quantity: tradeData.quantity,
                strategySummary: tradeData.strategySummary,
                tradeLevel: tradeData.tradeLevel,
                positionSize: tradeData.positionSize,
                profitLoss: tradeData.profitLoss,
                exitReason: tradeData.exitReason,
                entryTime: tradeData.entryTime,
                exitTime: tradeData.exitTime,
                notes: tradeData.notes,
                isClosed: tradeData.isClosed,
              });
            }
            successCount++;
          } catch (error) {
            console.error(`Error restoring trade ${tradeData.id}:`, error);
            errorCount++;
          }
        }

        results.trades.success = true;
        results.trades.count = successCount;
        results.trades.message = `成功恢复 ${successCount} 条交易记录${errorCount > 0 ? `，失败 ${errorCount} 条` : ""}`;
      } catch (error) {
        console.error("Error restoring trades:", error);
        results.trades.message = `交易记录恢复失败: ${error}`;
      }
    }

    return NextResponse.json({
      success: true,
      message: "数据恢复完成",
      results,
      backupInfo: {
        version: backupData.version,
        exportedAt: backupData.exportedAt,
        environment: backupData.environment,
      },
    });
  } catch (error) {
    console.error("Error restoring data:", error);
    return NextResponse.json(
      { error: "Failed to restore data" },
      { status: 500 }
    );
  }
}
