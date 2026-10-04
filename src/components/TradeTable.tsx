'use client';

import { MoreVertical, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import type { Trade } from '@/lib/schema';
import { fmt, getLevelColor, getCloseReasonText } from '@/lib/format';
import { formatTradeDateTime } from '@/lib/date';
import { CardHeading, Money, toneOf } from './primitives';

interface Props {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  onDelete: (id: string) => void;
  action: React.ReactNode;
}

export function TradeTable({ trades, onEdit, onDelete, action }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardHeading title="交易记录" hint={`共 ${trades.length} 笔`} action={action} />
      </CardHeader>

      <CardContent>
        {trades.length === 0 ? (
          <p className="py-12 text-center text-sm text-muted-foreground">
            当前筛选条件下没有交易记录
          </p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="whitespace-nowrap">品种</TableHead>
                  <TableHead className="whitespace-nowrap">开仓时间</TableHead>
                  <TableHead className="whitespace-nowrap">策略</TableHead>
                  <TableHead className="whitespace-nowrap">仓位</TableHead>
                  <TableHead className="whitespace-nowrap">开仓金额</TableHead>
                  <TableHead className="whitespace-nowrap">盈亏</TableHead>
                  <TableHead className="whitespace-nowrap">状态</TableHead>
                  <TableHead className="w-10" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => {
                  const [level, ...rest] = trade.strategy.split('/');
                  const pl = Number(trade.profitLoss) || 0;
                  return (
                    <TableRow key={trade.id}>
                      <TableCell className="font-medium">{trade.symbol}</TableCell>
                      <TableCell className="num text-xs text-muted-foreground">
                        {formatTradeDateTime(trade.date, trade.openTime)}
                      </TableCell>
                      <TableCell className="max-w-[220px]">
                        <span className={getLevelColor(level)}>{level}</span>
                        {rest.length > 0 && (
                          <span className="text-muted-foreground">/{rest.join('/')}</span>
                        )}
                      </TableCell>
                      <TableCell className="num text-muted-foreground">{trade.position}%</TableCell>
                      <TableCell className="num text-muted-foreground">
                        {fmt(trade.openAmount)}
                      </TableCell>
                      <TableCell>
                        <Money value={pl} tone={toneOf(pl)} signed className="text-sm font-medium" />
                      </TableCell>
                      <TableCell>
                        {trade.isClosed ? (
                          <span className="text-xs text-muted-foreground">
                            {getCloseReasonText(trade.closeReason, trade.remark)}
                          </span>
                        ) : (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            持有中
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Popover>
                          <PopoverTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7 text-muted-foreground"
                              aria-label="操作"
                            >
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent align="end" className="w-32 p-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs"
                              onClick={() => onEdit(trade)}
                            >
                              <Pencil className="mr-2 h-3.5 w-3.5" />
                              编辑
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="w-full justify-start text-xs text-down hover:text-down"
                              onClick={() => {
                                if (window.confirm('删除这条交易记录？')) onDelete(trade.id);
                              }}
                            >
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                              删除
                            </Button>
                          </PopoverContent>
                        </Popover>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
