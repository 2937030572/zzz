import 'server-only';

import crypto from 'node:crypto';

const DEFAULT_BINANCE_OPTIONS_BASE_URL = 'https://eapi.binance.com';
const DEFAULT_BINANCE_OPTIONS_TESTNET_BASE_URL = 'https://testnet.binanceops.com';
const DEFAULT_LOOKBACK_DAYS = 90;
const DEFAULT_LIMIT = 200;
const MAX_LIMIT = 1000;
const DAY_IN_MS = 24 * 60 * 60 * 1000;

type BinanceOptionsTradeRaw = Record<string, unknown>;

export type BinanceOptionsTradeSide = 'BUY' | 'SELL' | 'UNKNOWN';
export type BinanceOptionsContractType = 'CALL' | 'PUT' | 'UNKNOWN';
export type BinanceOptionsLiquidity = 'MAKER' | 'TAKER' | 'UNKNOWN';

export interface BinanceOptionsTrade {
  id: string;
  orderId: string;
  symbol: string;
  side: BinanceOptionsTradeSide;
  contractType: BinanceOptionsContractType;
  liquidity: BinanceOptionsLiquidity;
  price: number;
  quantity: number;
  quoteAmount: number;
  fee: number;
  realizedProfit: number | null;
  executedAt: number;
}

export interface BinanceOptionsStatus {
  configured: boolean;
  enabled: boolean;
  count: number;
  error: string | null;
  lastSyncAt: string | null;
}

export interface FetchBinanceOptionsTradesParams {
  startDate?: string | null;
  endDate?: string | null;
  symbol?: string | null;
  limit?: number;
}

export interface FetchBinanceOptionsTradesResult {
  trades: BinanceOptionsTrade[];
  status: BinanceOptionsStatus;
}

function getEnvValue(...keys: string[]): string | undefined {
  for (const key of keys) {
    const value = process.env[key];
    if (value && value.trim()) {
      return value.trim();
    }
  }

  return undefined;
}

function toNumber(value: unknown): number {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : 0;
}

function parseBoolean(value: string | undefined): boolean {
  return value === '1' || value === 'true' || value === 'TRUE';
}

function clamp(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function normalizeSide(value: unknown): BinanceOptionsTradeSide {
  const side = String(value ?? '').toUpperCase();
  if (side === 'BUY' || side === 'LONG') return 'BUY';
  if (side === 'SELL' || side === 'SHORT') return 'SELL';
  return 'UNKNOWN';
}

function normalizeLiquidity(value: unknown, isMaker: unknown): BinanceOptionsLiquidity {
  const liquidity = String(value ?? '').toUpperCase();
  if (liquidity === 'MAKER') return 'MAKER';
  if (liquidity === 'TAKER') return 'TAKER';

  if (typeof isMaker === 'boolean') {
    return isMaker ? 'MAKER' : 'TAKER';
  }

  return 'UNKNOWN';
}

function inferContractType(symbol: string): BinanceOptionsContractType {
  const suffix = symbol.split('-').pop()?.toUpperCase();
  if (suffix === 'C') return 'CALL';
  if (suffix === 'P') return 'PUT';
  return 'UNKNOWN';
}

function getBinanceOptionsBaseUrl(): string {
  const envBaseUrl = getEnvValue('BINANCE_OPTIONS_BASE_URL');
  if (envBaseUrl) {
    return envBaseUrl.replace(/\/$/, '');
  }

  const useTestnet = parseBoolean(getEnvValue('BINANCE_OPTIONS_USE_TESTNET', 'BINANCE_USE_TESTNET'));
  return useTestnet ? DEFAULT_BINANCE_OPTIONS_TESTNET_BASE_URL : DEFAULT_BINANCE_OPTIONS_BASE_URL;
}

function getBinanceCredentials() {
  const apiKey = getEnvValue('BINANCE_OPTIONS_API_KEY', 'BINANCE_API_KEY', 'BINANCE_KEY');
  const apiSecret = getEnvValue(
    'BINANCE_OPTIONS_API_SECRET',
    'BINANCE_API_SECRET',
    'BINANCE_SECRET_KEY',
    'BINANCE_SECRET',
  );

  return {
    apiKey,
    apiSecret,
    configured: Boolean(apiKey && apiSecret),
  };
}

function getRangeStart(startDate?: string | null): number {
  if (startDate) {
    return Date.parse(`${startDate}T00:00:00.000Z`);
  }

  const lookbackDays = clamp(
    toNumber(getEnvValue('BINANCE_OPTIONS_LOOKBACK_DAYS')) || DEFAULT_LOOKBACK_DAYS,
    1,
    365,
  );

  return Date.now() - lookbackDays * DAY_IN_MS;
}

function getRangeEnd(endDate?: string | null): number {
  if (endDate) {
    return Date.parse(`${endDate}T23:59:59.999Z`);
  }

  return Date.now();
}

function getTradeLimit(limit?: number): number {
  const configuredLimit = toNumber(getEnvValue('BINANCE_OPTIONS_LIMIT'));
  const effectiveLimit = limit ?? configuredLimit;
  return clamp(effectiveLimit || DEFAULT_LIMIT, 1, MAX_LIMIT);
}

function parseTrade(raw: BinanceOptionsTradeRaw): BinanceOptionsTrade | null {
  const symbol = String(raw.symbol ?? '').trim();
  const tradeId = String(raw.tradeId ?? raw.id ?? '').trim();
  const orderId = String(raw.orderId ?? '').trim();
  const executedAt = toNumber(raw.createDate ?? raw.time ?? raw.updateTime ?? raw.timestamp);

  if (!symbol || (!tradeId && !orderId) || !executedAt) {
    return null;
  }

  const price = toNumber(raw.price);
  const quantity = toNumber(raw.quantity ?? raw.qty);
  const quoteAmount = toNumber(raw.quoteQty) || price * quantity;
  const fee = toNumber(raw.fee ?? raw.commission);

  const rawRealizedProfit = raw.realizedProfit ?? raw.profit ?? raw.pnl;
  const hasRealizedProfit =
    rawRealizedProfit !== undefined && rawRealizedProfit !== null && String(rawRealizedProfit).trim() !== '';

  return {
    id: tradeId || `${orderId}-${executedAt}`,
    orderId,
    symbol,
    side: normalizeSide(raw.side ?? raw.direction),
    contractType: inferContractType(symbol),
    liquidity: normalizeLiquidity(raw.liquidity, raw.isMaker),
    price,
    quantity,
    quoteAmount,
    fee,
    realizedProfit: hasRealizedProfit ? toNumber(rawRealizedProfit) : null,
    executedAt,
  };
}

async function getBinanceServerTime(baseUrl: string): Promise<number> {
  try {
    const response = await fetch(`${baseUrl}/eapi/v1/time`, {
      cache: 'no-store',
    });

    if (!response.ok) {
      return Date.now();
    }

    const data = (await response.json()) as { serverTime?: number };
    return typeof data.serverTime === 'number' ? data.serverTime : Date.now();
  } catch {
    return Date.now();
  }
}

async function signedRequest<T>(
  path: string,
  params: Record<string, string | number | undefined>,
): Promise<T> {
  const { apiKey, apiSecret } = getBinanceCredentials();

  if (!apiKey || !apiSecret) {
    throw new Error('Missing Binance options API credentials');
  }

  const baseUrl = getBinanceOptionsBaseUrl();
  const timestamp = await getBinanceServerTime(baseUrl);

  // 收集所有需要签名的参数（按字母顺序排序）
  const signingParams: [string, string][] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== '') {
      signingParams.push([key, String(value)]);
    }
  }

  // timestamp 必须参与签名
  signingParams.push(['timestamp', String(timestamp)]);

  // 按字母顺序排序
  signingParams.sort((a, b) => a[0].localeCompare(b[0]));

  // 生成签名字符串
  const queryString = signingParams.map(([k, v]) => `${k}=${v}`).join('&');
  const signature = crypto.createHmac('sha256', apiSecret).update(queryString).digest('hex');

  // 构建完整查询字符串（recWindow 和 signature 不参与签名）
  const fullQueryString = `${queryString}&recvWindow=5000&signature=${signature}`;

  const response = await fetch(`${baseUrl}${path}?${fullQueryString}`, {
    cache: 'no-store',
    headers: {
      'X-MBX-APIKEY': apiKey,
    },
  });

  const payload = (await response.json().catch(() => null)) as
    | { code?: number; msg?: string }
    | T
    | null;

  if (!response.ok) {
    const message =
      payload && typeof payload === 'object' && 'msg' in payload && payload.msg
        ? String(payload.msg)
        : `Binance options request failed with status ${response.status}`;
    throw new Error(message);
  }

  const errorPayload = payload as { code?: number; msg?: string } | null;
  if (errorPayload && typeof errorPayload.code === 'number' && errorPayload.code < 0) {
    throw new Error(errorPayload.msg || 'Binance options request failed');
  }

  return payload as T;
}

export async function fetchBinanceOptionsTrades(
  params: FetchBinanceOptionsTradesParams = {},
): Promise<FetchBinanceOptionsTradesResult> {
  const { configured } = getBinanceCredentials();

  if (!configured) {
    return {
      trades: [],
      status: {
        configured: false,
        enabled: false,
        count: 0,
        error: null,
        lastSyncAt: null,
      },
    };
  }

  const startTime = getRangeStart(params.startDate);
  const endTime = getRangeEnd(params.endDate);

  try {
    const rawTrades = await signedRequest<BinanceOptionsTradeRaw[]>('/eapi/v1/userTrades', {
      symbol: params.symbol ?? undefined,
      startTime,
      endTime,
      limit: getTradeLimit(params.limit),
    });

    const trades = (Array.isArray(rawTrades) ? rawTrades : [])
      .map((trade) => parseTrade(trade))
      .filter((trade): trade is BinanceOptionsTrade => Boolean(trade))
      .sort((left, right) => right.executedAt - left.executedAt);

    return {
      trades,
      status: {
        configured: true,
        enabled: true,
        count: trades.length,
        error: null,
        lastSyncAt: new Date().toISOString(),
      },
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to fetch Binance options trades';

    return {
      trades: [],
      status: {
        configured: true,
        enabled: false,
        count: 0,
        error: message,
        lastSyncAt: null,
      },
    };
  }
}
