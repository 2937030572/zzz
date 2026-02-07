import { NextRequest, NextResponse } from "next/server";
import { tradeManager } from "@/storage/database/tradeManager";

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const symbol = searchParams.get("symbol") || undefined;
    const isClosed = searchParams.get("isClosed");
    const skip = parseInt(searchParams.get("skip") || "0");
    const limit = parseInt(searchParams.get("limit") || "100");

    const trades = await tradeManager.getTrades({
      skip,
      limit,
      symbol: symbol as string | undefined,
      isClosed: isClosed ? isClosed === "true" : undefined,
    });

    return NextResponse.json(trades);
  } catch (error) {
    console.error("Error fetching trades:", error);
    return NextResponse.json(
      { error: "Failed to fetch trades" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    // quantity 作为 decimal 类型，保持字符串
    const trade = await tradeManager.createTrade(body);
    return NextResponse.json(trade, { status: 201 });
  } catch (error) {
    console.error("Error creating trade:", error);
    return NextResponse.json(
      { error: "Failed to create trade" },
      { status: 500 }
    );
  }
}
