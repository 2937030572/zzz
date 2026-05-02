import { NextResponse } from 'next/server';
import { fetchBinanceOptionsTrades } from '@/lib/binance';

/**
 * POST /api/options-trades/sync
 *
 * 手动触发从币安拉取期权成交记录并返回结果。
 * 支持 query params: startDate, endDate, symbol, limit
 *
 * 注意：此接口只读，不写入数据库。实时数据通过 /api/trades GET 接口混入。
 */
export async function POST(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get('startDate') ?? undefined;
    const endDate = searchParams.get('endDate') ?? undefined;
    const symbol = searchParams.get('symbol') ?? undefined;
    const limitParam = searchParams.get('limit');
    const limit = limitParam ? Number(limitParam) : undefined;

    const result = await fetchBinanceOptionsTrades({
      startDate,
      endDate,
      symbol,
      limit,
    });

    return NextResponse.json({
      trades: result.trades,
      status: result.status,
      syncedAt: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error syncing Binance options trades:', error);
    return NextResponse.json(
      { error: 'Failed to sync Binance options trades' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/options-trades/sync
 *
 * 获取当前币安期权 API 连接状态。
 */
export async function GET() {
  try {
    const result = await fetchBinanceOptionsTrades({ limit: 1 });
    return NextResponse.json({ status: result.status });
  } catch (error) {
    console.error('Error checking Binance options status:', error);
    return NextResponse.json(
      { error: 'Failed to check Binance options status' },
      { status: 500 },
    );
  }
}
