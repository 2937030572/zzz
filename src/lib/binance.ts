/**
 * 币安期权 (European Options) API 对接模块
 * 官方文档: https://developers.binance.com/docs/derivatives/option/trade
 *
 * 只读模式：仅使用 API Key + Secret 拉取交易历史，不下任何订单
 */

import crypto from 'crypto';

const BINANCE_BASE_URL = 'https://eapi.binance.com';

// ─────────────────────────────────────────
// 工具函数
// ─────────────────────────────────────────

/** 生成 HMAC-SHA256 签名 */
function sign(queryString: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(queryString)
    .digest('hex');
}

/** 构造带签名的请求头和 URL */
function buildSignedRequest(
  endpoint: string,
  params: Record<string, string | number>,
  apiKey: string,
  apiSecret: string,
): { url: string; headers: Record<string, string> } {
  const timestamp = Date.now();
  const queryParams = new URLSearchParams({
    ...Object.fromEntries(
      Object.entries(params).map(([k, v]) => [k, String(v)]),
    ),
    timestamp: String(timestamp),
  });

  const signature = sign(queryParams.toString(), apiSecret);
  queryParams.append('signature', signature);

  return {
    url: `${BINANCE_BASE_URL}${endpoint}?${queryParams.toString()}`,
    headers: {
      'X-MBX-APIKEY': apiKey,
      'Content-Type': 'application/json',
    },
  };
}

// ─────────────────────────────────────────
// 类型定义（与币安 API 响应字段对应）
// ─────────────────────────────────────────

export interface BinanceOptionTrade {
  id: string;           // tradeId
  tradeId: string;      // 成交ID
  orderId: string;      // 订单ID
  symbol: string;       // 合约标的，如 ETH-240329-2200-C
  price: string;        // 成交价格
  quantity: string;     // 成交数量
  fee: string;          // 手续费
  realizedProfit: string; // 已实现盈亏
  side: string;         // BUY/SELL
  type: string;         // 订单类型
  volatility: string;   // 隐含波动率
  liquidity: string;    // 流动性
  quoteAsset: string;   // 计价资产
  time: number;         // 成交时间戳 (ms)
  priceScale: number;
  quantityScale: number;
  optionSide: string;   // CALL/PUT
  expiryDate: number;   // 到期时间戳 (ms)
}

export interface ParsedOptionTrade {
  id: string;       // tradeId，作为数据库主键
  tradeId: string;
  orderId: string;  // orderId，仅供参考
  symbol: string;
  underlying: string;
  strikePrice: number;
  expiryDate: string;
  optionType: string;
  side: string;
  quantity: number;
  price: number;
  totalCost: number;
  fee: number;
  feeAsset: string;
  realizedPnl: number;
  tradeTime: number;
  tradeDate: string;
  rawData: object;
}

// ─────────────────────────────────────────
// 解析辅助函数
// ─────────────────────────────────────────

/**
 * 解析 symbol 字符串，提取底层资产、行权价、到期日、期权类型
 * 示例: ETH-240329-2200-C → { underlying: 'ETH', expiry: '240329', strike: 2200, type: 'CALL' }
 */
function parseSymbol(symbol: string): {
  underlying: string;
  expiryDate: string;
  strikePrice: number;
  optionType: string;
} {
  // 格式: UNDERLYING-YYMMDD-STRIKE-TYPE
  const parts = symbol.split('-');
  if (parts.length >= 4) {
    const underlying = parts[0];
    const expiryDate = parts[1];
    const strikePrice = parseFloat(parts[2]);
    const optionType = parts[3] === 'C' ? 'CALL' : 'PUT';
    return { underlying, expiryDate, strikePrice, optionType };
  }
  return {
    underlying: symbol,
    expiryDate: '',
    strikePrice: 0,
    optionType: 'UNKNOWN',
  };
}

/** 将时间戳转为 YYYY-MM-DD 格式日期字符串（UTC+8 北京时间） */
function tsToDateStr(ts: number): string {
  const d = new Date(ts);
  // 调整到 UTC+8
  const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000);
  return utc8.toISOString().split('T')[0];
}

/** 将原始币安 API 响应转换为规范格式 */
export function parseBinanceTrade(raw: BinanceOptionTrade): ParsedOptionTrade {
  const { underlying, expiryDate, strikePrice, optionType } = parseSymbol(raw.symbol);
  const quantity = parseFloat(raw.quantity);
  const price = parseFloat(raw.price);

  return {
    id: raw.tradeId || raw.id,   // 用成交ID作为主键（唯一）
    tradeId: raw.tradeId || raw.id,
    orderId: raw.orderId,
    symbol: raw.symbol,
    underlying,
    strikePrice,
    expiryDate,
    optionType,
    side: raw.side,
    quantity,
    price,
    totalCost: Math.abs(quantity * price),
    fee: parseFloat(raw.fee || '0'),
    feeAsset: raw.quoteAsset || 'USDT',
    realizedPnl: parseFloat(raw.realizedProfit || '0'),
    tradeTime: raw.time,
    tradeDate: tsToDateStr(raw.time),
    rawData: raw,
  };
}

// ─────────────────────────────────────────
// 核心 API 调用
// ─────────────────────────────────────────

export interface FetchTradesOptions {
  /** 开始时间戳 (ms)，不传则拉最近 7 天 */
  startTime?: number;
  /** 结束时间戳 (ms) */
  endTime?: number;
  /** 每次最多拉取条数，最大 1000 */
  limit?: number;
  /** 具体合约标的，不传则拉全部 */
  symbol?: string;
}

/**
 * 拉取币安期权成交历史（只读）
 * 接口: GET /eapi/v1/userTrades
 * 权限: 只需 Read 权限的 API Key
 */
export async function fetchBinanceOptionTrades(
  apiKey: string,
  apiSecret: string,
  options: FetchTradesOptions = {},
): Promise<ParsedOptionTrade[]> {
  const params: Record<string, string | number> = {
    limit: options.limit ?? 1000,
  };

  if (options.symbol) params.symbol = options.symbol;
  if (options.startTime) params.startTime = options.startTime;
  if (options.endTime) params.endTime = options.endTime;

  const { url, headers } = buildSignedRequest(
    '/eapi/v1/userTrades',
    params,
    apiKey,
    apiSecret,
  );

  const res = await fetch(url, { headers, cache: 'no-store' });

  if (!res.ok) {
    const errText = await res.text();
    let errMsg = `币安API请求失败 (${res.status})`;
    try {
      const errJson = JSON.parse(errText);
      errMsg = errJson.msg || errMsg;
    } catch {
      // ignore
    }
    throw new Error(errMsg);
  }

  const data: BinanceOptionTrade[] = await res.json();

  if (!Array.isArray(data)) {
    throw new Error('币安API返回格式异常');
  }

  return data.map(parseBinanceTrade);
}

/**
 * 分页拉取所有历史（每次最多1000条，自动翻页）
 * startTime 到 endTime 范围内的全部成交
 */
export async function fetchAllBinanceOptionTrades(
  apiKey: string,
  apiSecret: string,
  startTime: number,
  endTime: number,
): Promise<ParsedOptionTrade[]> {
  const allTrades: ParsedOptionTrade[] = [];
  let currentStart = startTime;
  const pageSize = 1000;

  // 最多循环 50 页，避免无限循环
  for (let page = 0; page < 50; page++) {
    const trades = await fetchBinanceOptionTrades(apiKey, apiSecret, {
      startTime: currentStart,
      endTime,
      limit: pageSize,
    });

    if (trades.length === 0) break;

    allTrades.push(...trades);

    if (trades.length < pageSize) break; // 最后一页

    // 下一页从最后一条时间 + 1ms 开始
    currentStart = trades[trades.length - 1].tradeTime + 1;

    if (currentStart >= endTime) break;

    // 避免请求过于频繁
    await new Promise(r => setTimeout(r, 300));
  }

  return allTrades;
}
