import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface EquityChartProps {
  netEquity: Array<{ date: string; value: number }>;
}

// 安全格式化数字，防止 recharts tick formatter 拿到非数字时崩溃
const safeFormat = (val: unknown): string => {
  const n = Number(val);
  if (isNaN(n)) return '';
  return '$' + n.toLocaleString('zh-CN', { minimumFractionDigits: 0, maximumFractionDigits: 0 });
};

export const EquityChart: React.FC<EquityChartProps> = ({ netEquity }) => {
  // 严格过滤：date 和 value 都必须有效，防止 recharts 内部崩溃
  const safeData = (netEquity || []).filter(
    (item) =>
      item != null &&
      typeof item.date === 'string' && item.date !== '' &&
      typeof item.value === 'number' && !isNaN(item.value)
  );

  return (
    <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="text-cyan-400">资产走势图</CardTitle>
        <CardDescription className="text-cyan-500/60">减去出金后的资产变化趋势</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="h-[300px] w-full">
          {safeData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={safeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.1)" />
                <XAxis dataKey="date" stroke="#06b6d4" tick={{ fill: '#06b6d4', fontSize: 12 }} />
                <YAxis stroke="#06b6d4" tickFormatter={safeFormat} tick={{ fill: '#06b6d4', fontSize: 12 }} width={80} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: '#06b6d4', borderWidth: 1 }}
                  itemStyle={{ color: '#06b6d4' }}
                  formatter={(value: unknown) => [safeFormat(value), '净权益']}
                />
                <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} activeDot={{ r: 6, fill: '#22d3ee', stroke: '#06b6d4', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-cyan-500/50">
              暂无数据
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};