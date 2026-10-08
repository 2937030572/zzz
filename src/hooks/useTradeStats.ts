'use client';

import { useMemo, useState } from 'react';
import type { Trade, FundRecord } from '@/lib/schema';
import { todayStr, daysAgoStr } from '@/lib/date';

export interface PeriodStat {
  count: number;
  totalPL: number;
  winRate: number;
}

export interface ChartData {
  points: { date: string; fullDate: string; balance: number }[];
  totalDep: number;
  totalWit: number;
  totalPL: number;
  returnRate: string;
}

/** 最大回撤：percent 为负数（用于展示 -12.3%），amount 为正的回撤金额 */
export interface MaxDrawdown {
  percent: number;
  amount: number;
}

export type StreakType = 'win' | 'loss' | 'none';

export interface StreakStats {
  /** 截至最新一笔的连续状态 */
  current: { type: StreakType; length: number };
  maxWin: number;
  maxLoss: number;
}

/** 统计全部派生自 trades / fundRecords，全部单次遍历 */
export function useTradeStats(trades: Trade[], fundRecords: FundRecord[]) {
  const [periodSelections, setPeriodSelections] = useState<number[]>([0, 2, 6, 29]);
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  const dateRangeInvalid = Boolean(
    filterStartDate && filterEndDate && filterStartDate > filterEndDate
  );

  const filteredTrades = useMemo(() => {
    if (!filterStartDate && !filterEndDate) return trades;
    if (dateRangeInvalid) return [];
    return trades.filter((t) => {
      if (filterStartDate && t.date < filterStartDate) return false;
      if (filterEndDate && t.date > filterEndDate) return false;
      return true;
    });
  }, [trades, filterStartDate, filterEndDate, dateRangeInvalid]);

  // 胜率口径：只统计已平仓交易。持有中的单子 profitLoss=0，
  // 计入分母会稀释胜率、虚增笔数，属于误导性统计。
  const filteredStats = useMemo(() => {
    let tradeCount = 0;
    let winTotal = 0;
    let winCount = 0;
    let lossTotal = 0;
    let lossCount = 0;
    for (const t of filteredTrades) {
      if (!t.isClosed) continue;
      const pl = Number(t.profitLoss) || 0;
      tradeCount++;
      if (pl > 0) {
        winTotal += pl;
        winCount++;
      } else if (pl < 0) {
        lossTotal += pl;
        lossCount++;
      }
    }
    const total = winTotal + lossTotal;

    // 盈亏比 = 平均每笔盈利 / 平均每笔亏损（绝对值）。
    // 无亏损笔数时为 Infinity（renderValue 会渲染为 '-'）；无盈亏数据时为 NaN，同样渲染 '-'。
    const avgWin = winCount > 0 ? winTotal / winCount : 0;
    const avgLoss = lossCount > 0 ? Math.abs(lossTotal) / lossCount : 0;
    const profitRatio =
      avgLoss > 0 ? avgWin / avgLoss : winCount > 0 ? Number.POSITIVE_INFINITY : Number.NaN;

    // 盈利因子 = 总盈利 / 总亏损（备用口径，当前未展示）
    const profitFactor = lossTotal < 0 ? winTotal / Math.abs(lossTotal) : Number.NaN;

    // 期望值 = 胜率×平均盈利 − 亏损率×平均亏损（数学上等价于 净盈亏/笔数，
    // 用胜率与均值展开更能反映系统特性）。无交易时为 NaN → 渲染 '-'。
    const winRate = tradeCount > 0 ? winCount / tradeCount : 0;
    const lossRate = tradeCount > 0 ? lossCount / tradeCount : 0;
    const expectancy = tradeCount > 0 ? winRate * avgWin - lossRate * avgLoss : Number.NaN;

    return {
      tradeCount,
      winTotal,
      winCount,
      lossTotal,
      lossCount,
      total,
      winRate: tradeCount > 0 ? Math.round((winCount / tradeCount) * 100) : 0,
      profitRatio,
      profitFactor,
      expectancy,
    };
  }, [filteredTrades]);

  const periodStats = useMemo<PeriodStat[]>(
    () =>
      periodSelections.map((days) => {
        const startStr = daysAgoStr(days);
        const endStr = todayStr();
        let count = 0;
        let totalPL = 0;
        let wins = 0;
        for (const t of trades) {
          if (!t.isClosed) continue;
          if (t.date >= startStr && t.date <= endStr) {
            const pl = Number(t.profitLoss) || 0;
            count++;
            totalPL += pl;
            if (pl > 0) wins++;
          }
        }
        return { count, totalPL, winRate: count > 0 ? Math.round((wins / count) * 100) : 0 };
      }),
    [trades, periodSelections]
  );

  const otherReasonTrades = useMemo(
    () => trades.filter((t) => t.closeReason === 'other' && t.remark).slice(0, 15),
    [trades]
  );

  const { totalDeposit, totalWithdraw } = useMemo(() => {
    let deposit = 0;
    let withdraw = 0;
    for (const r of fundRecords) {
      const amt = Number(r.amount) || 0;
      if (r.type === 'deposit') deposit += amt;
      else withdraw += amt;
    }
    return { totalDeposit: deposit, totalWithdraw: withdraw };
  }, [fundRecords]);

  const chartData = useMemo<ChartData | null>(() => {
    if (trades.length === 0 && fundRecords.length === 0) return null;

    const dayMap = new Map<string, { dep: number; wit: number; pl: number }>();
    const getOrCreate = (d: string) => {
      let v = dayMap.get(d);
      if (!v) {
        v = { dep: 0, wit: 0, pl: 0 };
        dayMap.set(d, v);
      }
      return v;
    };

    for (const r of fundRecords) {
      const acc = getOrCreate(r.date);
      if (r.type === 'deposit') acc.dep += Number(r.amount) || 0;
      else acc.wit += Number(r.amount) || 0;
    }
    for (const t of trades) {
      getOrCreate(t.date).pl += Number(t.profitLoss) || 0;
    }

    const sortedDates = Array.from(dayMap.keys()).sort();
    let cumDep = 0;
    let cumWit = 0;
    let cumPL = 0;
    const points = sortedDates.map((date) => {
      const { dep, wit, pl } = dayMap.get(date)!;
      cumDep += dep;
      cumWit += wit;
      cumPL += pl;
      return { date: date.slice(5), fullDate: date, balance: cumDep - cumWit + cumPL };
    });

    // 收益率口径：以期末净投入（入金-出金）为分母；若本金已全部撤出则退回累计入金。
    // 这是不考虑现金流发生时间的简单口径，多期大额出入金时仍会失真，精确口径应改用 TWR。
    const netDep = cumDep - cumWit;
    const base = netDep > 0 ? netDep : cumDep;
    const returnRate = base > 0 ? ((cumPL / base) * 100).toFixed(2) : '0.00';

    return { points, totalDep: cumDep, totalWit: cumWit, totalPL: cumPL, returnRate };
  }, [trades, fundRecords]);

  /**
   * 最大回撤（按资金曲线）：遍历逐日余额，取「历史峰值 − 当前值」的最大跌幅，
   * 比率以**当时的峰值**为分母（标准定义），而不是全局峰值。
   * 资金曲线 ≤ 0 时不计回撤（负值下比率无意义）。
   * 注意：出金会拉低资金曲线，可能被计为回撤，这是本口径的已知特性。
   */
  const maxDrawdown = useMemo<MaxDrawdown>(() => {
    if (!chartData || chartData.points.length === 0) {
      return { percent: 0, amount: 0 };
    }

    let peak = Number.NEGATIVE_INFINITY;
    let worstPercent = 0;
    let worstAmount = 0;

    for (const p of chartData.points) {
      if (p.balance > peak) peak = p.balance;
      if (peak <= 0) continue;
      const drop = peak - p.balance;
      if (drop <= 0) continue;
      const percent = (drop / peak) * 100;
      if (percent > worstPercent) {
        worstPercent = percent;
        worstAmount = drop;
      }
    }

    // percent 取负号用于展示（-12.3% 表示回撤），amount 为正数
    return { percent: -worstPercent, amount: worstAmount };
  }, [chartData]);

  /**
   * 连胜 / 连亏（按开仓时间升序，只统计已平仓）。
   * 打平（盈亏 = 0）视为打断，既不续连胜也不续连亏——这是最严格的口径。
   */
  const streaks = useMemo<StreakStats>(() => {
    const closed = filteredTrades.filter((t) => t.isClosed);
    const sorted = [...closed].sort((a, b) => {
      if (a.date !== b.date) return a.date < b.date ? -1 : 1;
      return (a.openTime ?? '') < (b.openTime ?? '') ? -1 : 1;
    });

    let currentType: StreakType = 'none';
    let currentLength = 0;
    let maxWin = 0;
    let maxLoss = 0;

    for (const t of sorted) {
      const pl = Number(t.profitLoss) || 0;
      const type: StreakType = pl > 0 ? 'win' : pl < 0 ? 'loss' : 'none';

      if (type === 'none') {
        currentType = 'none';
        currentLength = 0;
        continue;
      }

      currentLength = type === currentType ? currentLength + 1 : 1;
      currentType = type;
      if (type === 'win') maxWin = Math.max(maxWin, currentLength);
      else maxLoss = Math.max(maxLoss, currentLength);
    }

    return {
      current: { type: currentType, length: currentLength },
      maxWin,
      maxLoss,
    };
  }, [filteredTrades]);

  return {
    periodSelections,
    setPeriodSelections,
    filterStartDate,
    setFilterStartDate,
    filterEndDate,
    setFilterEndDate,
    dateRangeInvalid,
    filteredTrades,
    filteredStats,
    periodStats,
    otherReasonTrades,
    totalDeposit,
    totalWithdraw,
    chartData,
    maxDrawdown,
    streaks,
  };
}
