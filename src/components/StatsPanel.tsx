'use client';

import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { PeriodStat } from '@/hooks/useTradeStats';
import { CardHeading, Money, SectionLabel, Stat, toneOf } from './primitives';

const PERIOD_GROUPS: { days: number; label: string }[][] = [
  [
    { days: 0, label: '今天' },
    { days: 2, label: '3天' },
    { days: 4, label: '5天' },
  ],
  [
    { days: 2, label: '3天' },
    { days: 6, label: '7天' },
    { days: 9, label: '10天' },
    { days: 14, label: '15天' },
  ],
  [
    { days: 6, label: '1周' },
    { days: 13, label: '2周' },
    { days: 20, label: '3周' },
    { days: 27, label: '4周' },
  ],
  [
    { days: 29, label: '1月' },
    { days: 59, label: '2月' },
    { days: 89, label: '3月' },
  ],
];

const QUICK_RANGES: { key: string; label: string; days: number }[] = [
  { key: '1w', label: '近一周', days: 7 },
  { key: '1m', label: '近一月', days: 30 },
  { key: '3m', label: '近三月', days: 90 },
  { key: '1y', label: '近一年', days: 365 },
];

interface Props {
  periodSelections: number[];
  setPeriodSelections: (next: number[]) => void;
  periodStats: PeriodStat[];
  filterStartDate: string;
  filterEndDate: string;
  setFilterStartDate: (v: string) => void;
  setFilterEndDate: (v: string) => void;
  dateRangeInvalid: boolean;
  onQuickRange: (days: number) => void;
  stats: {
    winTotal: number;
    winCount: number;
    lossTotal: number;
    lossCount: number;
    total: number;
    winRate: number;
  };
  tradeCount: number;
}

export function StatsPanel({
  periodSelections,
  setPeriodSelections,
  periodStats,
  filterStartDate,
  filterEndDate,
  setFilterStartDate,
  setFilterEndDate,
  dateRangeInvalid,
  onQuickRange,
  stats,
  tradeCount,
}: Props) {
  return (
    <Card>
      <CardHeader>
        <CardHeading title="交易统计" hint="按开仓日期筛选，统计区间内的盈亏表现" />
      </CardHeader>

      <CardContent className="space-y-6">
        {/* 时间段卡片 */}
        <div>
          <SectionLabel className="mb-2">区间表现</SectionLabel>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {periodSelections.map((days, index) => {
              const options = PERIOD_GROUPS[index];
              const statsForPeriod = periodStats[index] ?? { count: 0, totalPL: 0, winRate: 0 };
              return (
                <div key={index} className="rounded-lg border border-border px-3 py-2.5">
                  <Select
                    value={String(days)}
                    onValueChange={(value) => {
                      const next = [...periodSelections];
                      next[index] = Number(value);
                      setPeriodSelections(next);
                    }}
                  >
                    <SelectTrigger className="h-7 w-full justify-center border-0 bg-transparent p-0 text-sm font-medium shadow-none focus:ring-0">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {options.map((o) => (
                        <SelectItem key={o.days} value={String(o.days)}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <div className="mt-2 space-y-1 border-t border-border pt-2 text-xs">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">笔数</span>
                      <span className="num">{statsForPeriod.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">盈亏</span>
                      <Money
                        value={statsForPeriod.totalPL}
                        tone={toneOf(statsForPeriod.totalPL)}
                        signed
                        className="text-xs"
                      />
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">胜率</span>
                      <span className="num">{statsForPeriod.winRate}%</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 日期筛选 */}
        <div className="space-y-3 border-t border-border pt-5">
          <SectionLabel>日期筛选</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="filter-start" className="text-xs text-muted-foreground">
                开始日期
              </Label>
              <Input
                id="filter-start"
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="num"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="filter-end" className="text-xs text-muted-foreground">
                结束日期
              </Label>
              <Input
                id="filter-end"
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="num"
              />
            </div>
          </div>
          {dateRangeInvalid && (
            <p className="text-xs text-down">开始日期不能晚于结束日期，已按空结果处理</p>
          )}
          <div className="flex flex-wrap gap-2">
            {QUICK_RANGES.map((r) => (
              <Button
                key={r.key}
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onQuickRange(r.days)}
              >
                {r.label}
              </Button>
            ))}
            {(filterStartDate || filterEndDate) && (
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs text-muted-foreground"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
              >
                清除
              </Button>
            )}
          </div>
        </div>

        {/* 盈亏统计 */}
        <div className="space-y-3 border-t border-border pt-5">
          <SectionLabel>筛选结果</SectionLabel>
          <div className="grid grid-cols-2 gap-3">
            <Stat label="盈利金额" value={stats.winTotal} tone="up" signed />
            <Stat label="盈利笔数" value={stats.winCount} format="int" />
            <Stat label="亏损金额" value={stats.lossTotal} tone="down" signed />
            <Stat label="亏损笔数" value={stats.lossCount} format="int" />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Stat label="净盈亏" value={stats.total} tone={toneOf(stats.total)} signed />
            <Stat label="交易笔数" value={tradeCount} format="int" />
            <Stat label="胜率" value={stats.winRate} format="percent" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
