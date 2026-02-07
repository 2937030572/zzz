import { NextRequest, NextResponse } from "next/server";
import { tradeManager } from "@/storage/database/tradeManager";

export async function GET(request: NextRequest) {
  try {
    const trades = await tradeManager.getTrades();

    // 添加时间戳
    const backupData = {
      version: "1.0",
      exportedAt: new Date().toISOString(),
      totalTrades: trades.length,
      trades: trades,
    };

    // 设置响应头，触发文件下载
    return new NextResponse(JSON.stringify(backupData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="trade-backup-${new Date().toISOString().split('T')[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Error exporting trades:", error);
    return NextResponse.json(
      { error: "Failed to export trades" },
      { status: 500 }
    );
  }
}
