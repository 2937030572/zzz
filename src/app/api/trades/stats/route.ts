import { NextRequest, NextResponse } from "next/server";
import { tradeManager } from "@/storage/database/tradeManager";

export async function GET(request: NextRequest) {
  try {
    const stats = await tradeManager.getTradeStats();
    return NextResponse.json(stats);
  } catch (error) {
    console.error("Error fetching trade stats:", error);
    return NextResponse.json(
      { error: "Failed to fetch trade stats" },
      { status: 500 }
    );
  }
}
