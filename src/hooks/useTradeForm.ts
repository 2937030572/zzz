'use client';

import { useCallback, useMemo, useState } from 'react';
import type {
  CloseReason,
  PositionType,
  VolumeTrend,
  BollContraction,
  BollWidth,
  Pattern,
  CreateTradeInput,
} from '@/lib/schema';
import { calcTradeLevel, buildStrategyText } from '@/lib/tradeLevel';
import { nowDateTimeLocal, splitDateTimeLocal, combineDateTime } from '@/lib/date';

export interface TradeFormValues {
  symbol: string;
  /** 交易方向，来自用户自定义的快捷项；空串表示未指定 */
  direction: string;
  strategy: string;
  position: PositionType;
  openDateTime: string;
  closeReason: CloseReason;
  remark: string;
  profitLoss: string;
  isClosed: boolean;
  volumeTrend: VolumeTrend;
  bollContraction: BollContraction;
  bollWidth: BollWidth;
  pattern: Pattern;
}

function initialValues(): TradeFormValues {
  return {
    symbol: '',
    direction: '',
    strategy: '',
    position: 5,
    openDateTime: nowDateTimeLocal(),
    closeReason: 'profit',
    remark: '',
    profitLoss: '',
    isClosed: true,
    volumeTrend: 'no_trend',
    bollContraction: '1h',
    bollWidth: 'not_converged',
    pattern: 'none',
  };
}

export function useTradeForm(balance: number) {
  const [values, setValues] = useState<TradeFormValues>(initialValues);

  const set = useCallback(
    <K extends keyof TradeFormValues>(key: K, value: TradeFormValues[K]) => {
      setValues((prev) => ({ ...prev, [key]: value }));
    },
    []
  );

  /** reset 可接受覆盖值，用于把用户配置的默认方向预填进表单 */
  const reset = useCallback(
    (overrides?: Partial<TradeFormValues>) => setValues({ ...initialValues(), ...overrides }),
    []
  );

  /** 用已有交易填充表单（编辑场景） */
  const load = useCallback((trade: {
    symbol: string;
    direction?: string;
    strategy: string;
    position: number;
    date: string;
    openTime: string;
    closeReason: CloseReason;
    remark?: string;
    profitLoss: number;
    isClosed: boolean;
  }) => {
    setValues((prev) => ({
      ...prev,
      symbol: trade.symbol,
      direction: trade.direction ?? '',
      strategy: trade.strategy,
      position: trade.position as PositionType,
      openDateTime: combineDateTime(trade.date, trade.openTime),
      closeReason: trade.closeReason,
      remark: trade.remark ?? '',
      profitLoss: String(trade.profitLoss ?? 0),
      isClosed: trade.isClosed,
    }));
  }, []);

  const openAmount = useMemo(
    () => (Number(balance) * values.position) / 100,
    [balance, values.position]
  );

  const level = useMemo(
    () =>
      calcTradeLevel(values.volumeTrend, values.bollContraction, values.bollWidth, values.pattern),
    [values.volumeTrend, values.bollContraction, values.bollWidth, values.pattern]
  );

  /**
   * mode=create 时策略由分级系统生成；mode=edit 时沿用用户手写的策略文本。
   * 日期时间通过字符串切分，不做 Date 转换，避免时区偏移。
   */
  const buildPayload = useCallback(
    (mode: 'create' | 'edit', accountId: number): CreateTradeInput => {
      const { date, time } = splitDateTimeLocal(values.openDateTime);
      const pl = Number(values.profitLoss);
      const strategyText = buildStrategyText(
        values.volumeTrend,
        values.bollContraction,
        values.bollWidth,
        values.pattern
      );

      return {
        symbol: values.symbol.trim(),
        direction: values.direction.trim(),
        strategy: mode === 'create' ? strategyText : values.strategy.trim(),
        position: values.position,
        openAmount,
        openTime: time,
        closeReason: values.isClosed ? values.closeReason : 'pending',
        remark: values.isClosed && values.closeReason === 'other' ? values.remark.trim() : undefined,
        profitLoss: values.isClosed && Number.isFinite(pl) ? pl : 0,
        date,
        isClosed: values.isClosed,
        accountId,
      };
    },
    [values, openAmount]
  );

  return { values, set, reset, load, openAmount, level, buildPayload };
}
