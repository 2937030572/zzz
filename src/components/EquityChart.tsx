'use client';

import { useState } from 'react';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { fmt, fmtTick } from '@/lib/format';
import type { ChartData } from '@/hooks/useTradeStats';
import { CardHeading, Stat, toneOf } from './primitives';

interface Props {
  balance: number;
  chartData: ChartData | null;
}

export function EquityChart({ balance, chartData }: Props) {
  const [open, setOpen] = useState(false);

  return (
    <Collapsible open={open} onOpenChange={setOpen}>
      <Card>
        <CollapsibleTrigger asChild>
          <CardHeader className="cursor-pointer">
            <CardHeading
              title="资产走势"
              hint="按交易与出入金逐日累计"
              action={
                <span className="text-muted-foreground">
                  {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                </span>
              }
            />
          </CardHeader>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <CardContent className="space-y-4">
            {!chartData ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                暂无数据，添加交易或出入金后即可查看走势
              </p>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Stat label="当前余额" value={balance} />
                  <Stat label="累计盈利" value={chartData.totalPL} tone={toneOf(chartData.totalPL)} signed />
                  <Stat label="净投入（入金-出金）" value={chartData.totalDep - chartData.totalWit} />
                  <Stat
                    label="收益率"
                    value={Number(chartData.returnRate)}
                    tone={toneOf(Number(chartData.returnRate))}
                    format="percent"
                    signed
                  />
                </div>

                <div className="text-muted-foreground h-64 w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={chartData.points} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
                      <CartesianGrid stroke="currentColor" strokeDasharray="3 3" opacity={0.15} />
                      <XAxis
                        dataKey="date"
                        tick={{ fill: 'currentColor', fontSize: 12 }}
                        tickLine={false}
                        axisLine={{ stroke: 'currentColor', opacity: 0.2 }}
                        minTickGap={24}
                      />
                      <YAxis
                        tick={{ fill: 'currentColor', fontSize: 12 }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={fmtTick}
                        width={64}
                      />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: 'var(--popover)',
                          border: '1px solid var(--border)',
                          borderRadius: '12px',
                          color: 'var(--popover-foreground)',
                          fontSize: 13,
                        }}
                        formatter={(value: unknown) => [fmt(value), '余额']}
                      />
                      <Line
                        type="monotone"
                        dataKey="balance"
                        stroke="currentColor"
                        strokeWidth={2}
                        dot={false}
                        activeDot={{ r: 4 }}
                        name="余额"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
