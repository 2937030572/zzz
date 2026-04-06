/**
 * GET  /api/options-trades         - 查询期权交易记录列表
 * PATCH /api/options-trades        - 更新单条记录的备注
 */

import { NextResponse } from 'next/server';
import { query, queryOne } from '@/lib/db';

// ─────────────────────────────────────────
// GET: 查询列表
// ─────────────────────────────────────────
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1'));
    const pageSize = Math.min(200, Math.max(1, parseInt(searchParams.get('pageSize') ?? '50')));
    const symbol = searchParams.get('symbol') ?? '';
    const optionType = searchParams.get('optionType') ?? ''; // CALL / PUT
    const side = searchParams.get('side') ?? '';             // BUY / SELL
    const startDate = searchParams.get('startDate') ?? '';
    const endDate = searchParams.get('endDate') ?? '';

    const offset = (page - 1) * pageSize;

    // 动态构建 WHERE 子句
    const conditions: string[] = [];
    const params: any[] = [];
    let idx = 1;

    if (symbol) {
      conditions.push(`symbol ILIKE $${idx++}`);
      params.push(`%${symbol}%`);
    }
    if (optionType) {
      conditions.push(`option_type = $${idx++}`);
      params.push(optionType.toUpperCase());
    }
    if (side) {
      conditions.push(`side = $${idx++}`);
      params.push(side.toUpperCase());
    }
    if (startDate) {
      conditions.push(`trade_date >= $${idx++}`);
      params.push(startDate);
    }
    if (endDate) {
      conditions.push(`trade_date <= $${idx++}`);
      params.push(endDate);
    }

    const where = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // 查询总数
    const countRows = await query<{ count: string }>(
      `SELECT COUNT(*) as count FROM binance_options_trades ${where}`,
      params,
    );
    const total = parseInt(countRows[0]?.count ?? '0');

    // 查询分页数据
    const dataParams = [...params, pageSize, offset];
    const trades = await query(
      `SELECT
        id, trade_id, symbol, underlying, strike_price, expiry_date,
        option_type, side, quantity, price, total_cost, fee, fee_asset,
        realized_pnl, trade_time, trade_date, remark, created_at, updated_at
       FROM binance_options_trades
       ${where}
       ORDER BY trade_time DESC
       LIMIT $${idx++} OFFSET $${idx++}`,
      dataParams,
    );

    // 统计摘要（不受分页影响）
    const summaryRows = await query<{
      total_pnl: string;
      total_fee: string;
      trade_count: string;
      call_count: string;
      put_count: string;
    }>(
      `SELECT
        COALESCE(SUM(realized_pnl), 0)::text  AS total_pnl,
        COALESCE(SUM(fee), 0)::text            AS total_fee,
        COUNT(*)::text                          AS trade_count,
        COUNT(*) FILTER (WHERE option_type = 'CALL')::text AS call_count,
        COUNT(*) FILTER (WHERE option_type = 'PUT')::text  AS put_count
       FROM binance_options_trades ${where}`,
      params,
    );
    const summary = summaryRows[0] ?? {};

    return NextResponse.json({
      trades: trades.map(normalizeRow),
      pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
      summary: {
        totalPnl: parseFloat(summary.total_pnl ?? '0'),
        totalFee: parseFloat(summary.total_fee ?? '0'),
        tradeCount: parseInt(summary.trade_count ?? '0'),
        callCount: parseInt(summary.call_count ?? '0'),
        putCount: parseInt(summary.put_count ?? '0'),
      },
    });
  } catch (err: any) {
    console.error('[GET /api/options-trades]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────
// PATCH: 更新备注
// ─────────────────────────────────────────
export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const { id, remark } = body as { id: string; remark: string };

    if (!id) {
      return NextResponse.json({ error: '缺少 id 参数' }, { status: 400 });
    }

    const updated = await queryOne(
      `UPDATE binance_options_trades
       SET remark = $1, updated_at = NOW()
       WHERE id = $2
       RETURNING id, remark, updated_at`,
      [remark ?? '', id],
    );

    if (!updated) {
      return NextResponse.json({ error: '记录不存在' }, { status: 404 });
    }

    return NextResponse.json({ success: true, trade: updated });
  } catch (err: any) {
    console.error('[PATCH /api/options-trades]', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// ─────────────────────────────────────────
// 辅助：字段名蛇形转驼峰
// ─────────────────────────────────────────
function normalizeRow(row: any) {
  return {
    id: row.id,
    tradeId: row.trade_id,
    symbol: row.symbol,
    underlying: row.underlying,
    strikePrice: parseFloat(row.strike_price ?? '0'),
    expiryDate: row.expiry_date,
    optionType: row.option_type,
    side: row.side,
    quantity: parseFloat(row.quantity ?? '0'),
    price: parseFloat(row.price ?? '0'),
    totalCost: parseFloat(row.total_cost ?? '0'),
    fee: parseFloat(row.fee ?? '0'),
    feeAsset: row.fee_asset,
    realizedPnl: parseFloat(row.realized_pnl ?? '0'),
    tradeTime: Number(row.trade_time),
    tradeDate: row.trade_date
      ? (row.trade_date instanceof Date
          ? row.trade_date.toISOString().split('T')[0]
          : String(row.trade_date).split('T')[0])
      : '',
    remark: row.remark ?? '',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
