/** 数字格式化：复用 Intl.NumberFormat 实例，避免每次调用重建 */

const formatterCache = new Map<string, Intl.NumberFormat>();

function getFormatter(decimals: number): Intl.NumberFormat {
  const key = String(decimals);
  let f = formatterCache.get(key);
  if (!f) {
    f = new Intl.NumberFormat('zh-CN', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    });
    formatterCache.set(key, f);
  }
  return f;
}

/** 安全格式化为货币字符串，任何非数字返回 '-' */
export function fmt(
  value: unknown,
  opts: { prefix?: string; decimals?: number } = {}
): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const { prefix = '$', decimals = 2 } = opts;
  return `${prefix}${getFormatter(decimals).format(n)}`;
}

/** recharts tick 格式化（不带小数） */
export function fmtTick(value: unknown): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '';
  return `$${getFormatter(0).format(n)}`;
}

/** 带正负号的金额，用于盈亏展示 */
export function fmtSigned(value: unknown, opts: { decimals?: number } = {}): string {
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  const body = getFormatter(opts.decimals ?? 2).format(Math.abs(n));
  return `${n >= 0 ? '+' : '-'}$${body}`;
}

/** 根据交易级别返回颜色类 */
export function getLevelColor(level: string): string {
  switch (level) {
    case 'A+': return 'text-amber-600 font-semibold';
    case 'A':  return 'text-emerald-600 font-semibold';
    case 'A-': return 'text-teal-600 font-semibold';
    case 'B+': return 'text-sky-600 font-semibold';
    case 'B':  return 'text-indigo-600 font-semibold';
    case 'B-': return 'text-violet-600 font-semibold';
    case 'C':  return 'text-stone-400 font-semibold';
    default:   return 'text-stone-700 font-semibold';
  }
}

/** 平仓原因 → 可读文本 */
export function getCloseReasonText(reason: string, remark?: string): string {
  switch (reason) {
    case 'profit': return '止盈';
    case 'loss':
    case 'stop_loss': return '止损';
    case 'other': return `其他${remark ? `（${remark}）` : ''}`;
    case 'pending': return '持有中';
    default: return reason;
  }
}
