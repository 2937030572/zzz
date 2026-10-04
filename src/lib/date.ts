/** 本地日期工具：全程使用本地时区，不使用 toISOString()，避免 UTC 偏移导致日期差一天 */

const pad = (n: number) => String(n).padStart(2, '0');

/** Date → "YYYY-MM-DD"（本地时区） */
export function toDateStr(d: Date): string {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/** Date → "HH:mm"（本地时区） */
export function toTimeStr(d: Date): string {
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Date → "YYYY-MM-DDTHH:mm"，用于 datetime-local 输入框 */
export function toDateTimeLocal(d: Date): string {
  return `${toDateStr(d)}T${toTimeStr(d)}`;
}

export function todayStr(): string {
  return toDateStr(new Date());
}

/** 含今天往前 days 天的起始日期 */
export function daysAgoStr(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return toDateStr(d);
}

export function nowDateTimeLocal(): string {
  return toDateTimeLocal(new Date());
}

/**
 * 解析 datetime-local 的值（"YYYY-MM-DDTHH:mm"）为 { date, time }。
 * 直接做字符串切分，不经过 Date，因此不存在时区偏移。
 */
export function splitDateTimeLocal(value: string): { date: string; time: string } {
  const [date = '', time = '00:00'] = (value ?? '').split('T');
  return { date, time: (time || '00:00').slice(0, 5) };
}

/** date + time → "YYYY-MM-DDTHH:mm" */
export function combineDateTime(date: string, time: string): string {
  return `${date}T${(time || '00:00').slice(0, 5)}`;
}

/** "YY/M/D HH:mm"，去掉前导零 */
export function formatTradeDateTime(date: string, time: string): string {
  const [year, month, day] = (date ?? '').split('-');
  if (!year || !month || !day) return date ?? '';
  return `${year.slice(-2)}/${parseInt(month, 10)}/${parseInt(day, 10)} ${time ?? ''}`.trim();
}
