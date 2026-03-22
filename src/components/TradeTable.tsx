import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Trade } from '@/types';

interface TradeTableProps {
  trades: Trade[];
  onEditTrade: (trade: Trade) => void;
  onDeleteTrade: (tradeId: string) => void;
}

export const TradeTable: React.FC<TradeTableProps> = ({ trades, onEditTrade, onDeleteTrade }) => {
  // 平仓原因显示
  const getCloseReasonText = (reason: string, remark?: string) => {
    if (reason === 'profit') return '正常止盈';
    if (reason === 'loss') return '正常止损';
    if (reason === 'other') return `其他原因 (${remark || '无备注'})`;
    return reason;
  };

  // 获取带高亮的平仓原因组件
  const getCloseReasonComponent = (reason: string, remark?: string) => {
    if (reason === 'other' && remark) {
      return (
        <span>
          其他原因 (<span className="text-yellow-400 font-semibold">{remark}</span>)
        </span>
      );
    }
    return <span>{getCloseReasonText(reason, remark)}</span>;
  };

  return (
    <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
      <CardHeader className="border-b border-cyan-500/20">
        <CardTitle className="text-cyan-400">交易记录</CardTitle>
        <CardDescription className="text-cyan-500/60">所有交易历史记录</CardDescription>
      </CardHeader>
      <CardContent>
        <div className={trades.length > 15 ? 'max-h-[600px] overflow-y-auto' : 'overflow-x-auto'}>
          <Table>
            <TableHeader className={trades.length > 15 ? 'sticky top-0 bg-gray-900 z-10' : ''}>
              <TableRow>
                <TableHead className="text-cyan-400">交易品种</TableHead>
                <TableHead className="text-cyan-400">入场策略</TableHead>
                <TableHead className="text-cyan-400">仓位</TableHead>
                <TableHead className="text-cyan-400">开仓金额</TableHead>
                <TableHead className="text-cyan-400">开仓日期</TableHead>
                <TableHead className="text-cyan-400">平仓原因</TableHead>
                <TableHead className="text-cyan-400">盈亏金额</TableHead>
                <TableHead className="text-cyan-400">平仓状态</TableHead>
                <TableHead className="text-cyan-400">操作</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {trades.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center text-cyan-500/50">
                    暂无交易记录
                  </TableCell>
                </TableRow>
              ) : (
                trades.map((trade) => (
                  <TableRow key={trade.id} className="hover:bg-cyan-500/5 border-cyan-500/10">
                    <TableCell className="font-medium text-white">{trade.symbol}</TableCell>
                    <TableCell className="text-white">{trade.strategy}</TableCell>
                    <TableCell className="text-cyan-300">{trade.position}%</TableCell>
                    <TableCell className="font-semibold text-cyan-400">
                      ${(trade.openAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell className="text-gray-400">{trade.date} {trade.openTime}</TableCell>
                    <TableCell className="text-white">{getCloseReasonComponent(trade.closeReason, trade.remark)}</TableCell>
                    <TableCell className={`font-semibold ${(trade.profitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {(trade.profitLoss || 0) >= 0 ? '+' : ''}
                      ${(trade.profitLoss || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </TableCell>
                    <TableCell>
                      {trade.isClosed ? (
                        <span className="inline-flex items-center rounded-full bg-green-500/20 border border-green-500/40 px-2.5 py-0.5 text-xs font-medium text-green-400">
                          已平仓
                        </span>
                      ) : (
                        <span className="inline-flex items-center rounded-full bg-gray-500/20 border border-gray-500/40 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                          未平仓
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                          onClick={() => onEditTrade(trade)}
                        >
                          编辑
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10"
                          onClick={() => onDeleteTrade(trade.id)}
                        >
                          删除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
};