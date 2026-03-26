import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * 将平仓原因枚举转为可读文本
 * 在 TradeTable 和 page.tsx 的 handleDownloadData 中复用
 */
export function getCloseReasonText(reason: string, remark?: string): string {
  if (reason === 'profit') return '正常止盈';
  if (reason === 'loss' || reason === 'stop_loss') return '正常止损';
  if (reason === 'other') return `其他原因 (${remark || '无备注'})`;
  return reason;
}
