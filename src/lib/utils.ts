import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** 将平仓原因枚举转为可读文本 */
export function getCloseReasonText(reason: string, remark?: string): string {
  if (reason === 'profit') return '正常止盈';
  if (reason === 'loss' || reason === 'stop_loss') return '正常止损';
  if (reason === 'other') return `其他原因 (${remark || '无备注'})`;
  if (reason === 'pending') return '进行中';
  return reason;
}

/**
 * 安全格式化数字为货币字符串
 * 任何非数字值返回 '-'，防止 .toLocaleString(undefined) 崩溃
 */
export function fmt(
  value: unknown,
  opts: { prefix?: string; decimals?: number } = {}
): string {
  const n = Number(value);
  if (isNaN(n)) return '-';
  const { prefix = '$', decimals = 2 } = opts;
  return `${prefix}${n.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}`;
}

/**
 * 安全格式化 recharts tick（纯字符串，不含前缀符号处理）
 * 用于 YAxis tickFormatter / Tooltip formatter
 */
export function fmtTick(value: unknown): string {
  const n = Number(value);
  if (isNaN(n)) return '';
  return `$${n.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}`;
}

/**
 * 格式化交易日期+时间为精简格式 "YY/M/D HH:mm"
 * 去掉前导零，年份只取后两位
 */
export function formatTradeDateTime(date: string, time: string): string {
  const [year, month, day] = date.split('-');
  return `${year.slice(-2)}/${parseInt(month, 10)}/${parseInt(day, 10)} ${time}`;
}

/** 根据交易级别字符串返回对应 Tailwind 颜色类 */
export function getLevelColor(level: string): string {
  switch (level) {
    case 'A+': return 'text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]';
    case 'A':  return 'text-green-400 font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]';
    case 'A-': return 'text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]';
    case 'B+': return 'text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]';
    case 'B':  return 'text-indigo-400 font-bold drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]';
    case 'B-': return 'text-purple-400 font-bold drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]';
    case 'C':  return 'text-gray-400 font-bold';
    default:   return 'text-white font-bold';
  }
}

/** 获取今天 YYYY-MM-DD 格式 */
export function todayStr(): string {
  return new Date().toISOString().split('T')[0];
}

/** 计算指定天数范围（含今天往前 days 天）的起始日期字符串 */
export function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString().split('T')[0];
}
