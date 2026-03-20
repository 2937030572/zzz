import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface TradingStatsProps {
  trades: any[];
  filterStartDate: string;
  setFilterStartDate: (value: string) => void;
  filterEndDate: string;
  setFilterEndDate: (value: string) => void;
  filteredTrades: any[];
}

export const TradingStats: React.FC<TradingStatsProps> = ({
  trades,
  filterStartDate,
  setFilterStartDate,
  filterEndDate,
  setFilterEndDate,
  filteredTrades
}) => {
  const totalProfit = filteredTrades.filter(t => t.profitLoss > 0).reduce((sum, t) => sum + t.profitLoss, 0);
  const totalLoss = filteredTrades.filter(t => t.profitLoss < 0).reduce((sum, t) => sum + t.profitLoss, 0);
  const totalTrades = filteredTrades.length;
  const winRate = totalTrades > 0 ? Math.round((filteredTrades.filter(t => t.profitLoss > 0).length / totalTrades) * 100) : 0;
  const totalPnL = filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0);

  return (
    <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="text-cyan-400">我的交易数据</CardTitle>
        <CardDescription className="text-cyan-500/60">交易统计信息</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="mb-4 grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="filter-start-date" className="text-cyan-400">开始日期</Label>
            <Input
              id="filter-start-date"
              type="date"
              value={filterStartDate}
              onChange={(e) => setFilterStartDate(e.target.value)}
              className="border-cyan-500/30 bg-gray-800 text-white focus:border-cyan-500"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="filter-end-date" className="text-cyan-400">结束日期</Label>
            <Input
              id="filter-end-date"
              type="date"
              value={filterEndDate}
              onChange={(e) => setFilterEndDate(e.target.value)}
              className="border-cyan-500/30 bg-gray-800 text-white focus:border-cyan-500"
            />
          </div>
        </div>
        
        {/* 盈利统计 */}
        <div className="mb-4">
          <div className="mb-2 text-sm text-green-400">盈利统计</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                ${totalProfit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-green-400/70">盈利金额</div>
            </div>
            <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
              <div className="text-2xl font-bold text-green-400">
                {filteredTrades.filter(t => t.profitLoss > 0).length}
              </div>
              <div className="text-sm text-green-400/70">盈利次数</div>
            </div>
          </div>
        </div>

        {/* 亏损统计 */}
        <div className="mb-4">
          <div className="mb-2 text-sm text-red-400">亏损统计</div>
          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                ${totalLoss.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-sm text-red-400/70">亏损金额</div>
            </div>
            <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
              <div className="text-2xl font-bold text-red-400">
                {filteredTrades.filter(t => t.profitLoss < 0).length}
              </div>
              <div className="text-sm text-red-400/70">亏损次数</div>
            </div>
          </div>
        </div>

        {/* 总体统计 */}
        <div className="grid grid-cols-3 gap-4">
          <div className="rounded-lg border border-cyan-500/30 bg-gray-800/50 p-4 text-center backdrop-blur-sm">
            <div className={`text-2xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {totalPnL >= 0 ? '+' : ''}
              ${totalPnL.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className="text-sm text-cyan-500/60">总盈亏</div>
          </div>
          <div className="rounded-lg border border-cyan-500/30 bg-gray-800/50 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-cyan-400">{totalTrades}</div>
            <div className="text-sm text-cyan-500/60">交易次数</div>
          </div>
          <div className="rounded-lg border border-cyan-500/30 bg-gray-800/50 p-4 text-center backdrop-blur-sm">
            <div className="text-2xl font-bold text-cyan-400">
              {winRate}%
            </div>
            <div className="text-sm text-cyan-500/60">胜率</div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};