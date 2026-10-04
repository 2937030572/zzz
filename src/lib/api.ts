import { z } from 'zod';
import {
  accountSchema,
  tradeSchema,
  fundRecordSchema,
  type Account,
  type Trade,
  type FundRecord,
  type CreateTradeInput,
  type UpdateTradeInput,
  type CreateFundRecordInput,
} from './schema';

const API_BASE = '/api';

/** 统一请求封装：解析 JSON、提取错误信息、校验响应结构 */
async function request<T>(
  path: string,
  init: RequestInit | undefined,
  schema: z.ZodType<T, z.ZodTypeDef, unknown>
): Promise<T> {
  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...init,
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    });
  } catch {
    throw new Error('网络连接失败，请检查网络后重试');
  }

  const text = await res.text();
  let payload: unknown = {};
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new Error(`服务端返回异常 (${res.status})`);
    }
  }

  if (!res.ok) {
    const msg =
      payload && typeof payload === 'object' && typeof (payload as { error?: unknown }).error === 'string'
        ? (payload as { error: string }).error
        : `请求失败 (${res.status})`;
    throw new Error(msg);
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    throw new Error('服务端返回的数据格式异常');
  }
  return parsed.data;
}

const qs = (params: Record<string, string | number | undefined>) => {
  const search = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== '') search.append(k, String(v));
  }
  const s = search.toString();
  return s ? `?${s}` : '';
};

// ── 响应结构 ────────────────────────────────────────────────────────────────

const accountsRes = z.object({ accounts: z.array(accountSchema) });
const balanceRes = z.object({ balance: z.number() });
const tradesRes = z.object({ trades: z.array(tradeSchema) });
const tradeWriteRes = z.object({ trade: tradeSchema, balance: z.number() });
const fundRecordsRes = z.object({ records: z.array(fundRecordSchema) });
const fundWriteRes = z.object({ record: fundRecordSchema, balance: z.number() });
const deleteRes = z.object({ success: z.boolean(), balance: z.number() });

// ── API ─────────────────────────────────────────────────────────────────────

export const api = {
  accounts: {
    getAll: () => request('/accounts', undefined, accountsRes),
    create: (name: string) =>
      request('/accounts', { method: 'POST', body: JSON.stringify({ name }) }, z.object({ account: accountSchema })),
    update: (id: number, name: string) =>
      request('/accounts', { method: 'PUT', body: JSON.stringify({ id, name }) }, z.object({ account: accountSchema })),
    delete: (id: number) =>
      request(`/accounts${qs({ id })}`, { method: 'DELETE' }, z.object({ success: z.boolean() })),
  },

  balance: {
    get: (accountId?: number) => request(`/balance${qs({ accountId })}`, undefined, balanceRes),
  },

  trades: {
    getAll: (params?: { startDate?: string; endDate?: string; accountId?: number }) =>
      request(`/trades${qs(params ?? {})}`, undefined, tradesRes),
    create: (data: CreateTradeInput) =>
      request('/trades', { method: 'POST', body: JSON.stringify(data) }, tradeWriteRes),
    update: (id: string, data: Omit<UpdateTradeInput, 'id'>) =>
      request('/trades', { method: 'PUT', body: JSON.stringify({ id, ...data }) }, tradeWriteRes),
    delete: (id: string, accountId?: number) =>
      request(`/trades${qs({ id, accountId })}`, { method: 'DELETE' }, deleteRes),
  },

  fundRecords: {
    getAll: (limit: number, accountId?: number) =>
      request(`/fund-records${qs({ limit, accountId })}`, undefined, fundRecordsRes),
    create: (data: CreateFundRecordInput) =>
      request('/fund-records', { method: 'POST', body: JSON.stringify(data) }, fundWriteRes),
    delete: (id: string, accountId?: number) =>
      request(`/fund-records${qs({ id, accountId })}`, { method: 'DELETE' }, deleteRes),
  },
};

export type { Account, Trade, FundRecord };
