/**
 * POST /api/options-trades/sync - 从币安API同步期权交易历史
 *
 * Body:
 *   { startTime?: number, endTime?: number }
 *   - 不传时默认同步最近 90 天
 *   - startTime / endTime 为 Unix 时间戳（毫秒）
 */

import { NextResponse } from 'next/server';
import { fetchAllBinanceOptionTrades, type ParsedOptionTrade } from '@/lib/binance';
import { query } from '@/lib/db';

export async function POST(request: Request) {
  try {
    // 读取 API 密钥（仅服务端可见）
    const apiKey = process.env.BINANCE_API_KEY;
    const apiSecret = process.env.BINANCE_API_SECRET;

    if (!apiKey || !apiSecret) {
      return NextResponse.json(
        { error: '未配置币安 API 密钥，请在环境变量中设置 BINANCE_API_KEY 和 BINANCE_API_SECRET' },
        { status: 500 },
      );
    }

    // 解析请求体
    let body: { startTime?: number; endTime?: number } = {};
    try {
      body = await request.json();
    } catch {
      // 没有请求体时使用默认值
    }

    const endTime = body.endTime ?? Date.now();
    // 默认拉取最近 90 天
    const startTime = body.startTime ?? endTime - 90 * 24 * 60 * 60 * 1000;

    // 从币安拉取数据
    const trades = await fetchAllBinanceOptionTrades(apiKey, apiSecret, startTime, endTime);

    if (trades.length === 0) {
      return NextResponse.json({
        success: true,
        synced: 0,
        skipped: 0,
        message: '该时间范围内无交易记录',
      });
    }

    // 批量 Upsert 到数据库（以 id=orderId 为唯一键）
    let synced = 0;
    let skipped = 0;

    for (const trade of trades) {
      try {
        await upsertTrade(trade);
        synced++;
      } catch (err: any) {
        console.error(`[sync] upsert 失败 trade_id=${trade.tradeId}:`, err.message);
        skipped++;
      }
    }

    return NextResponse.json({
      success: true,
      synced,
      skipped,
      total: trades.length,
      timeRange: {
        start: new Date(startTime).toISOString(),
        end: new Date(endTime).toISOString(),
      },
      message: `同步完成：成功 ${synced} 条，跳过 ${skipped} 条`,
    });
  } catch (err: any) {
    console.error('[POST /api/options-trades/sync]', err);

    // 区分错误类型给用户友好提示
    let userMsg = err.message;
    if (err.message?.includes('Invalid API-key')) {
      userMsg = '无效的 API Key，请检查 BINANCE_API_KEY 配置';
    } else if (err.message?.includes('Signature')) {
      userMsg = 'API 签名错误，请检查 BINANCE_API_SECRET 配置';
    } else if (err.message?.includes('IP')) {
      userMsg = 'IP 不在白名单，请在币安后台添加服务器 IP';
    } else if (err.message?.includes('-1021')) {
      userMsg = '服务器时间偏差过大，请检查服务器时间同步';
    }

    return NextResponse.json({ error: userMsg }, { status: 500 });
  }
}

// ─────────────────────────────────────────
// Upsert 单条交易（INSERT OR UPDATE）
// ─────────────────────────────────────────
async function upsertTrade(trade: ParsedOptionTrade): Promise<void> {
  await query(
    `INSERT INTO binance_options_trades (
      id, trade_id, order_id, symbol, underlying, strike_price, expiry_date,
      option_type, side, quantity, price, total_cost, fee, fee_asset,
      realized_pnl, trade_time, trade_date, raw_data, created_at, updated_at
    ) VALUES (
      $1, $2, $3, $4, $5, $6, $7,
      $8, $9, $10, $11, $12, $13, $14,
      $15, $16, $17::date, $18, NOW(), NOW()
    )
    ON CONFLICT (id) DO UPDATE SET
      -- 保留用户编辑的备注，不覆盖
      order_id      = EXCLUDED.order_id,
      symbol        = EXCLUDED.symbol,
      underlying    = EXCLUDED.underlying,
      strike_price  = EXCLUDED.strike_price,
      expiry_date   = EXCLUDED.expiry_date,
      option_type   = EXCLUDED.option_type,
      side          = EXCLUDED.side,
      quantity      = EXCLUDED.quantity,
      price         = EXCLUDED.price,
      total_cost    = EXCLUDED.total_cost,
      fee           = EXCLUDED.fee,
      fee_asset     = EXCLUDED.fee_asset,
      realized_pnl  = EXCLUDED.realized_pnl,
      trade_time    = EXCLUDED.trade_time,
      trade_date    = EXCLUDED.trade_date,
      raw_data      = EXCLUDED.raw_data,
      updated_at    = NOW()
      -- remark 字段故意不更新，保留用户已填写的备注`,
    [
      trade.id,        // $1 = tradeId（主键）
      trade.tradeId,   // $2 = trade_id（同上，冗余）
      trade.orderId,   // $3 = order_id
      trade.symbol,
      trade.underlying,
      trade.strikePrice,
      trade.expiryDate,
      trade.optionType,
      trade.side,
      trade.quantity,
      trade.price,
      trade.totalCost,
      trade.fee,
      trade.feeAsset,
      trade.realizedPnl,
      trade.tradeTime,
      trade.tradeDate,
      JSON.stringify(trade.rawData),
    ],
  );
}
