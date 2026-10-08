'use client';

import { useState } from 'react';
import dynamic from 'next/dynamic';
import { ChevronDown, ChevronUp } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import type { ChartData } from '@/hooks/useTradeStats';
import { CardHeading, Stat, toneOf } from './primitives';

/** 展开时才加载：recharts 体积较大，而走势图默认折叠，不该进入首屏 bundle */
const EquityLineChart = dynamic(() => import('./EquityLineChart'), {
  ssr: false,
  loading: () => <div className="h-64 w-full animate-pulse rounded-lg bg-muted/40" />,
});

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

                {/* 仅在展开后渲染，recharts 此时才下载 */}
                {open && <EquityLineChart points={chartData.points} />}
              </>
            )}
          </CardContent>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
