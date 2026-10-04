import { z } from 'zod';

/** 默认账户 ID：历史数据中 account_id 为 null 的记录一律归属于该账户 */
export const DEFAULT_ACCOUNT_ID = 1;

// ── 枚举 ────────────────────────────────────────────────────────────────────

export const closeReasonSchema = z.enum(['profit', 'loss', 'other', 'pending']);
export const fundTypeSchema = z.enum(['deposit', 'withdraw']);
export const volumeTrendSchema = z.enum(['top_divergence', 'bottom_divergence', 'no_trend']);
export const bollContractionSchema = z.enum(['1h', '2h', '4h_plus']);
export const bollWidthSchema = z.enum(['converged', 'not_converged']);
export const patternSchema = z.enum([
  'head_shoulders',
  'double_top_bottom',
  'triple_top_bottom',
  'triangle',
  'cup_handle',
  'channel',
  'none',
]);

export type CloseReason = z.infer<typeof closeReasonSchema>;
export type FundType = z.infer<typeof fundTypeSchema>;
export type VolumeTrend = z.infer<typeof volumeTrendSchema>;
export type BollContraction = z.infer<typeof bollContractionSchema>;
export type BollWidth = z.infer<typeof bollWidthSchema>;
export type Pattern = z.infer<typeof patternSchema>;
export type PositionType = number;

// ── 实体 ────────────────────────────────────────────────────────────────────

export const accountSchema = z.object({
  id: z.number().int(),
  name: z.string(),
  created_at: z.string().nullable().optional(),
  updated_at: z.string().nullable().optional(),
});
export type Account = z.infer<typeof accountSchema>;

export const tradeSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  strategy: z.string(),
  position: z.number(),
  openAmount: z.number(),
  openTime: z.string(),
  closeReason: closeReasonSchema.catch('profit'),
  remark: z.string().default(''),
  profitLoss: z.number(),
  date: z.string(),
  isClosed: z.boolean(),
  accountId: z.number().nullable().optional(),
  source: z.string().default('manual'),
  isReadOnly: z.boolean().default(false),
});
export type Trade = z.infer<typeof tradeSchema>;

export const fundRecordSchema = z.object({
  id: z.string(),
  type: fundTypeSchema.catch('deposit'),
  amount: z.number(),
  date: z.string(),
  accountId: z.number().nullable().optional(),
});
export type FundRecord = z.infer<typeof fundRecordSchema>;

// ── 数据库行 → 实体（宽松解析，兼容脏数据） ──────────────────────────────────

const num = z.union([z.number(), z.string(), z.null()]).transform((v) => {
  const n = Number(v ?? 0);
  return Number.isFinite(n) ? n : 0;
});

export function parseTrade(row: Record<string, unknown>): Trade {
  return tradeSchema.parse({
    id: String(row.id ?? ''),
    symbol: String(row.symbol ?? ''),
    strategy: String(row.strategy ?? ''),
    position: Number(row.position ?? 0) || 0,
    openAmount: num.parse(row.open_amount ?? row.openAmount ?? 0),
    openTime: String(row.open_time ?? row.openTime ?? ''),
    closeReason: row.close_reason ?? row.closeReason ?? 'profit',
    remark: String(row.remark ?? ''),
    profitLoss: num.parse(row.profit_loss ?? row.profitLoss ?? 0),
    date: String(row.date ?? ''),
    isClosed: row.is_closed ?? row.isClosed ?? true,
    accountId: row.account_id != null ? Number(row.account_id) : null,
    source: String(row.source ?? 'manual'),
    isReadOnly: Boolean(row.isReadOnly ?? false),
  });
}

export function parseFundRecord(row: Record<string, unknown>): FundRecord {
  return fundRecordSchema.parse({
    id: String(row.id ?? ''),
    type: row.type ?? 'deposit',
    amount: num.parse(row.amount ?? 0),
    date: String(row.date ?? ''),
    accountId: row.account_id != null ? Number(row.account_id) : null,
  });
}

// ── 请求体校验 ──────────────────────────────────────────────────────────────

/** YYYY-MM-DD，且必须是真实存在的日期（拒绝 2026-13-40 这类脏值） */
const dateStrSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, '日期格式必须为 YYYY-MM-DD')
  .refine(
    (s) => {
      const [y, m, d] = s.split('-').map(Number);
      if (y < 2000 || y > 2100 || m < 1 || m > 12 || d < 1 || d > 31) return false;
      const dt = new Date(y, m - 1, d);
      return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
    },
    { message: '日期不存在' }
  );

/** HH:mm 或空字符串 */
const timeStrSchema = z
  .string()
  .regex(/^$|^([01]\d|2[0-3]):[0-5]\d$/, '时间格式必须为 HH:mm')
  .max(8)
  .optional()
  .default('');

/** 有限数值：拒绝 NaN / Infinity（zod v3 默认放行 Infinity）。
 *  注意 refine 必须在 min/positive 之后调用（ZodEffects 不再支持链式数值约束）。 */
const finiteNumber = z.coerce.number().refine(Number.isFinite, { message: '必须是有限数值' });
const finiteNonNegative = z.coerce
  .number()
  .min(0)
  .refine(Number.isFinite, { message: '必须是有限数值' });
const finitePositive = z.coerce
  .number()
  .positive('金额必须大于 0')
  .refine(Number.isFinite, { message: '必须是有限数值' });

const optionalAccountId = z
  .union([z.number().int().positive(), z.string(), z.null()])
  .optional()
  .transform((v) => {
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : DEFAULT_ACCOUNT_ID;
  });

export const createTradeSchema = z.object({
  symbol: z.string().trim().min(1, '交易品种不能为空').max(64),
  strategy: z.string().trim().max(128).optional().default(''),
  position: z.coerce.number().min(0).max(100).optional().default(0),
  openAmount: finiteNonNegative.optional().default(0),
  openTime: timeStrSchema,
  closeReason: closeReasonSchema.optional().default('profit'),
  remark: z.string().trim().max(500).optional(),
  profitLoss: finiteNumber.optional().default(0),
  date: dateStrSchema,
  isClosed: z.coerce.boolean().optional().default(true),
  accountId: optionalAccountId,
});
export type CreateTradeInput = z.infer<typeof createTradeSchema>;

export const updateTradeSchema = createTradeSchema.partial().extend({
  id: z.string().min(1, '缺少交易 ID'),
  accountId: optionalAccountId,
});
export type UpdateTradeInput = z.infer<typeof updateTradeSchema>;

export const createFundRecordSchema = z.object({
  type: fundTypeSchema,
  amount: finitePositive,
  date: dateStrSchema,
  accountId: optionalAccountId,
});
export type CreateFundRecordInput = z.infer<typeof createFundRecordSchema>;

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, '账户名称不能为空').max(50),
});

export const updateAccountSchema = z.object({
  id: z.coerce.number().int().positive(),
  name: z.string().trim().min(1, '账户名称不能为空').max(50),
});

/**
 * 解析 query string 中的 accountId。
 * 缺省返回默认账户；显式传入但不是正整数时返回 null（调用方应返回 400）。
 */
export function parseAccountIdParam(raw: string | null): number | null {
  if (raw == null || raw === '') return DEFAULT_ACCOUNT_ID;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}
