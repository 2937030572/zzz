'use client';

import type { ReactNode } from 'react';
import { fmt, fmtSigned } from '@/lib/format';
import { cn } from '@/lib/utils';

export type Tone = 'up' | 'down' | 'neutral';

const toneClass: Record<Tone, string> = {
  up: 'text-up',
  down: 'text-down',
  neutral: 'text-foreground',
};

/** 区块小标题 */
export function SectionLabel({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('text-xs font-medium tracking-wide text-muted-foreground', className)}>
      {children}
    </div>
  );
}

/** 卡片标题区 */
export function CardHeading({
  title,
  hint,
  action,
}: {
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h2 className="text-[15px] font-medium">{title}</h2>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

/** 数值展示：等宽 + 涨跌配色 */
export function Money({
  value,
  tone = 'neutral',
  signed = false,
  decimals = 2,
  className,
}: {
  value: unknown;
  tone?: Tone;
  signed?: boolean;
  decimals?: number;
  className?: string;
}) {
  return (
    <span className={cn('num', toneClass[tone], className)}>
      {signed ? fmtSigned(value, { decimals }) : fmt(value, { decimals })}
    </span>
  );
}

/** 数值模式：money 带货币符号，int 为整数计数，percent 为百分比，
 *  percent1 为一位小数百分比（回撤），ratio 为一位小数比值（盈亏比），text 原样输出 */
export type ValueFormat = 'money' | 'int' | 'percent' | 'percent1' | 'ratio' | 'text';

function renderValue(value: unknown, format: ValueFormat, signed: boolean): string {
  if (format === 'text') return String(value ?? '-');
  const n = Number(value);
  if (!Number.isFinite(n)) return '-';
  if (format === 'int') return String(Math.round(n));
  if (format === 'percent') {
    const sign = signed && n > 0 ? '+' : '';
    return `${sign}${n.toFixed(n % 1 === 0 ? 0 : 2)}%`;
  }
  if (format === 'percent1') return `${n.toFixed(1)}%`;
  if (format === 'ratio') return n.toFixed(1); // 盈亏比：保留一位小数
  return signed ? fmtSigned(value) : fmt(value);
}

/** 统计小格：标签 + 数值 + 可选副标题 */
export function Stat({
  label,
  value,
  tone = 'neutral',
  signed = false,
  format = 'money',
  hint,
}: {
  label: string;
  value: unknown;
  tone?: Tone;
  signed?: boolean;
  format?: ValueFormat;
  hint?: string;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className={cn('num mt-1 text-lg font-medium', toneClass[tone])}>
        {renderValue(value, format, signed)}
      </div>
      {hint && <div className="num mt-0.5 text-[11px] text-muted-foreground">{hint}</div>}
    </div>
  );
}

/** 空状态 */
export function EmptyState({ text }: { text: string }) {
  return <div className="py-10 text-center text-sm text-muted-foreground">{text}</div>;
}

/** 涨跌判定，避免各处重复写三元表达式 */
export function toneOf(value: number): Tone {
  return value > 0 ? 'up' : value < 0 ? 'down' : 'neutral';
}
