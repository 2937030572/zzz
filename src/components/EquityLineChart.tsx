'use client';

import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { fmt, fmtTick } from '@/lib/format';
import type { ChartData } from '@/hooks/useTradeStats';

/**
 * 图表单独成文件，由 EquityChart 在展开时动态加载。
 * recharts 体积较大，而走势图默认折叠，不应进入首屏 bundle。
 */
export default function EquityLineChart({ points }: { points: ChartData['points'] }) {
  return (
    <div className="text-muted-foreground h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 4, right: 8, bottom: 0, left: -8 }}>
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
  );
}
