'use client';

import { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TrendingUp } from 'lucide-react';

interface BalanceHistory {
  date: string;
  balance: number;
  type: string;
  tradeId?: string;
  symbol?: string;
  profitLoss?: number;
}

interface BalanceChartData {
  name: string;
  balance: number;
  profitLoss?: number;
}

interface BalanceChartProps {
  refreshTrigger?: number;
}

export default function BalanceChart({ refreshTrigger = 0 }: BalanceChartProps) {
  const [history, setHistory] = useState<BalanceHistory[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchBalanceHistory();
  }, [refreshTrigger]);

  const fetchBalanceHistory = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/balance/history');
      const data = await response.json();
      setHistory(data.history || []);
    } catch (error) {
      console.error('Error fetching balance history:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatChartData = (): BalanceChartData[] => {
    return history.map((item) => ({
      name: item.type === 'initial' ? '初始' : new Date(item.date).toLocaleDateString('zh-CN'),
      balance: item.balance,
      profitLoss: item.profitLoss,
    }));
  };

  const formatCurrency = (value: number) => {
    return `$${value.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-background border rounded-lg p-3 shadow-lg">
          <p className="text-sm font-medium mb-1">{label}</p>
          <p className="text-sm">
            余额: <span className="font-bold">{formatCurrency(data.balance)}</span>
          </p>
          {data.profitLoss !== undefined && (
            <p className={`text-sm ${data.profitLoss >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              变化: {data.profitLoss >= 0 ? '+' : ''}{formatCurrency(data.profitLoss)}
            </p>
          )}
        </div>
      );
    }
    return null;
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="w-4 h-4" />
            资产走势
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">加载中...</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  const chartData = formatChartData();
  const currentBalance = history.length > 0 ? history[history.length - 1].balance : 0;
  const initialBalance = history.length > 0 ? history[0].balance : 0;
  const totalChange = currentBalance - initialBalance;
  const isProfitable = totalChange >= 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="w-4 h-4" />
          资产走势
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="mb-4 p-4 bg-muted rounded-lg">
          <div className="text-sm text-muted-foreground mb-1">当前余额</div>
          <div className="text-2xl font-bold">{formatCurrency(currentBalance)}</div>
          {history.length > 1 && (
            <div className={`text-sm mt-1 ${isProfitable ? 'text-green-600' : 'text-red-600'}`}>
              {isProfitable ? '+' : ''}{formatCurrency(totalChange)}
              <span className="text-muted-foreground ml-2">
                ({isProfitable ? '盈利' : '亏损'})
              </span>
            </div>
          )}
        </div>
        {chartData.length > 1 ? (
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
              <XAxis
                dataKey="name"
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <YAxis
                tickFormatter={(value) => `$${value.toLocaleString()}`}
                className="text-xs"
                tick={{ fill: 'currentColor' }}
              />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="balance"
                stroke={isProfitable ? '#22c55e' : '#ef4444'}
                strokeWidth={2}
                dot={{ r: 4 }}
                activeDot={{ r: 6 }}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[300px] flex items-center justify-center">
            <div className="text-muted-foreground">
              暂无交易数据
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
