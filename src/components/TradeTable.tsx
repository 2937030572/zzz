'use client';

import { Maximize2, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
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
import { ReviewPreview } from '@/components/TradeReview';
import { CardHeading, Money, toneOf } from './primitives';

interface Props {
  trades: Trade[];
  onEdit: (trade: Trade) => void;
  /** 打开详情只读面板 */
  onView: (trade: Trade) => void;
  onDelete: (id: string) => void;
  action: React.ReactNode;
}

/**
 * 交易列表。
 * 行高固定、所有单元格单行截断，长备注 / 长策略不会撑开整行；
 * 操作按钮默认隐藏，鼠标悬停该行或键盘聚焦时浮出（触屏设备常驻显示）。
 */
export function TradeTable({ trades, onEdit, onView, onDelete, action }: Props) {
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
            <Table className="table-fixed min-w-[1020px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[130px]">品种</TableHead>
                  <TableHead className="w-[110px]">开仓时间</TableHead>
                  <TableHead className="w-[150px]">策略</TableHead>
                  <TableHead className="w-[170px]">复盘</TableHead>
                  <TableHead className="w-[64px]">仓位</TableHead>
                  <TableHead className="w-[96px]">开仓金额</TableHead>
                  <TableHead className="w-[96px]">盈亏</TableHead>
                  <TableHead className="w-[104px]">状态</TableHead>
                  <TableHead className="w-[100px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {trades.map((trade) => {
                  const [level, ...rest] = trade.strategy.split('/');
                  const pl = Number(trade.profitLoss) || 0;
                  const statusText = trade.isClosed
                    ? getCloseReasonText(trade.closeReason, trade.remark)
                    : '持有中';
                  return (
                    <TableRow key={trade.id} className="group h-12">
                      <TableCell className="p-2 align-middle">
                        <span className="block truncate" title={trade.symbol}>
                          {trade.symbol}
                          {trade.direction && (
                            <span className="ml-1.5 rounded border border-border px-1 py-0.5 text-[11px] font-normal text-muted-foreground">
                              {trade.direction}
                            </span>
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="num p-2 align-middle text-xs text-muted-foreground">
                        <span className="block truncate">
                          {formatTradeDateTime(trade.date, trade.openTime)}
                        </span>
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <span className="block truncate" title={trade.strategy}>
                          <span className={getLevelColor(level)}>{level}</span>
                          {rest.length > 0 && (
                            <span className="text-muted-foreground">/{rest.join('/')}</span>
                          )}
                        </span>
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <span className="block truncate">
                          <ReviewPreview
                            score={trade.executionScore}
                            emotion={trade.emotion}
                            tags={trade.disciplineTags}
                          />
                        </span>
                      </TableCell>

                      <TableCell className="num p-2 align-middle text-muted-foreground">
                        <span className="block truncate">{trade.position}%</span>
                      </TableCell>

                      <TableCell className="num p-2 align-middle text-muted-foreground">
                        <span className="block truncate">{fmt(trade.openAmount)}</span>
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <Money value={pl} tone={toneOf(pl)} signed className="text-sm font-medium" />
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        {trade.isClosed ? (
                          <span
                            className="block truncate text-xs text-muted-foreground"
                            title={statusText}
                          >
                            {statusText}
                          </span>
                        ) : (
                          <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">
                            持有中
                          </span>
                        )}
                      </TableCell>

                      <TableCell className="p-2 align-middle">
                        <div className="flex items-center justify-end gap-0.5 opacity-100 transition-opacity sm:opacity-0 sm:group-hover:opacity-100 sm:focus-within:opacity-100">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            title="编辑"
                            aria-label="编辑"
                            onClick={() => onEdit(trade)}
                          >
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground"
                            title="查看详情"
                            aria-label="查看详情"
                            onClick={() => onView(trade)}
                          >
                            <Maximize2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-7 w-7 text-muted-foreground hover:text-down"
                            title="删除"
                            aria-label="删除"
                            onClick={() => {
                              if (window.confirm('删除这条交易记录？')) onDelete(trade.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
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
