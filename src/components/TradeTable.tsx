'use client';

import { ChevronLeft, ChevronRight, Maximize2, Pencil, Search, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { Trade } from '@/lib/schema';
import type { TradeFilters, TradeStatusFilter } from '@/hooks/useTradeBrowser';
import { fmt, getLevelColor, getCloseReasonText } from '@/lib/format';
import { formatTradeDateTime } from '@/lib/date';
import { ReviewPreview } from '@/components/TradeReview';
import { CardHeading, Money, toneOf } from './primitives';

interface Props {
  trades: Trade[];
  total: number;
  page: number;
  pageSize: number;
  filters: TradeFilters;
  loading?: boolean;
  error?: string | null;
  symbols: string[];
  directions: string[];
  onFilterChange: (patch: Partial<TradeFilters>) => void;
  onClearFilters: () => void;
  onPageChange: (page: number) => void;
  onRetry: () => void;
  onEdit: (trade: Trade) => void;
  onView: (trade: Trade) => void;
  onDelete: (id: string) => void;
  action: React.ReactNode;
}

const ALL = '__all__';

function TradeActions({ trade, onEdit, onView, onDelete }: Pick<Props, 'onEdit' | 'onView' | 'onDelete'> & { trade: Trade }) {
  return <div className="row-actions flex items-center justify-end gap-0.5">
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="编辑" aria-label="编辑" onClick={(e) => { e.stopPropagation(); onEdit(trade); }}><Pencil className="h-3.5 w-3.5" /></Button>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground" title="查看详情" aria-label="查看详情" onClick={(e) => { e.stopPropagation(); onView(trade); }}><Maximize2 className="h-3.5 w-3.5" /></Button>
    <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-down" title="删除" aria-label="删除" onClick={(e) => { e.stopPropagation(); if (window.confirm('删除这条交易记录？')) onDelete(trade.id); }}><Trash2 className="h-3.5 w-3.5" /></Button>
  </div>;
}

function TradeFiltersBar({ filters, symbols, directions, onFilterChange, onClearFilters }: Pick<Props, 'filters' | 'symbols' | 'directions' | 'onFilterChange' | 'onClearFilters'>) {
  const active = Object.values(filters).some((value) => value !== '' && value !== 'all');
  return <div className="trade-filters grid gap-2 rounded-xl border border-border p-3 sm:grid-cols-2 lg:grid-cols-6">
    <div className="relative lg:col-span-2"><Label htmlFor="trade-search" className="sr-only">搜索品种</Label><Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" /><Input id="trade-search" value={filters.keyword} onChange={(e) => onFilterChange({ keyword: e.target.value })} placeholder="搜索品种，例如 ETH" className="pl-9" /></div>
    <Select value={filters.direction || ALL} onValueChange={(value) => onFilterChange({ direction: value === ALL ? '' : value })}><SelectTrigger className="w-full"><SelectValue placeholder="方向" /></SelectTrigger><SelectContent><SelectItem value={ALL}>全部方向</SelectItem>{directions.map((value) => <SelectItem key={value} value={value}>{value}</SelectItem>)}</SelectContent></Select>
    <Select value={filters.status} onValueChange={(value) => onFilterChange({ status: value as TradeStatusFilter })}><SelectTrigger className="w-full"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="all">全部状态</SelectItem><SelectItem value="open">持有中</SelectItem><SelectItem value="closed">已平仓</SelectItem></SelectContent></Select>
    <Input value={filters.strategy} onChange={(e) => onFilterChange({ strategy: e.target.value })} placeholder="策略关键词" aria-label="策略关键词" />
    <Button variant="ghost" size="sm" className="justify-start text-muted-foreground" onClick={onClearFilters} disabled={!active}><X className="mr-1 h-3.5 w-3.5" />清除筛选</Button>
    <div className="flex gap-2 sm:col-span-2 lg:col-span-3"><Input type="date" value={filters.startDate} onChange={(e) => onFilterChange({ startDate: e.target.value })} aria-label="开始日期" /><Input type="date" value={filters.endDate} onChange={(e) => onFilterChange({ endDate: e.target.value })} aria-label="结束日期" /></div>
    {symbols.length > 0 && <div className="flex items-center gap-1 overflow-x-auto sm:col-span-2 lg:col-span-3"><span className="shrink-0 text-xs text-muted-foreground">快捷：</span>{symbols.slice(0, 5).map((symbol) => <button key={symbol} type="button" onClick={() => onFilterChange({ keyword: filters.keyword === symbol ? '' : symbol })} className="shrink-0 rounded-full border border-border px-2 py-1 text-xs text-muted-foreground hover:text-foreground">{symbol}</button>)}</div>}
  </div>;
}

export function TradeTable(props: Props) {
  const { trades, total, page, pageSize, filters, loading, error, symbols, directions, onFilterChange, onClearFilters, onPageChange, onRetry, onEdit, onView, onDelete, action } = props;
  const pages = Math.max(1, Math.ceil(total / pageSize));
  const handleRowClick = (trade: Trade) => {
    const selection = typeof window !== 'undefined' ? window.getSelection() : null;
    if (!selection?.toString().trim()) onView(trade);
  };
  return <Card>
    <CardHeader className="space-y-4"><CardHeading title="交易记录" hint={loading ? '正在加载…' : `共 ${total} 笔`} action={action} /><TradeFiltersBar filters={filters} symbols={symbols} directions={directions} onFilterChange={onFilterChange} onClearFilters={onClearFilters} /></CardHeader>
    <CardContent>
      {error ? <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-5 text-center"><p className="text-sm text-destructive">交易列表加载失败：{error}</p><Button className="mt-3" size="sm" variant="outline" onClick={onRetry}>重试</Button></div>
      : loading ? <div className="space-y-2 py-2">{Array.from({ length: 6 }, (_, index) => <div key={index} className="h-12 animate-pulse rounded-md bg-muted" />)}</div>
      : trades.length === 0 ? <div className="py-12 text-center"><p className="text-sm text-muted-foreground">当前筛选条件下没有交易记录</p><Button className="mt-3" size="sm" variant="outline" onClick={onClearFilters}>清除筛选</Button></div>
      : <><div className="hidden overflow-x-auto md:block"><Table className="table-fixed min-w-[880px]"><TableHeader><TableRow><TableHead className="w-[116px]">品种</TableHead><TableHead className="w-[98px]">开仓时间</TableHead><TableHead className="w-[128px]">策略</TableHead><TableHead className="w-[134px]">复盘</TableHead><TableHead className="w-[54px]">仓位</TableHead><TableHead className="w-[84px]">开仓金额</TableHead><TableHead className="w-[84px]">盈亏</TableHead><TableHead className="w-[90px]">状态</TableHead><TableHead className="w-[108px]" /></TableRow></TableHeader><TableBody>{trades.map((trade) => {
        const [level, ...rest] = trade.strategy.split('/'); const pl = Number(trade.profitLoss) || 0; const statusText = trade.isClosed ? getCloseReasonText(trade.closeReason, trade.remark) : '持有中';
        return <TableRow key={trade.id} className="row-hover group h-12 cursor-pointer hover:bg-muted" onClick={() => handleRowClick(trade)}><TableCell className="p-2"><span className="block truncate" title={trade.symbol}>{trade.symbol}{trade.direction && <span className="ml-1.5 rounded border border-border px-1 py-0.5 text-[11px] font-normal text-muted-foreground">{trade.direction}</span>}</span></TableCell><TableCell className="num p-2 text-xs text-muted-foreground">{formatTradeDateTime(trade.date, trade.openTime)}</TableCell><TableCell className="p-2"><span className="block truncate" title={trade.strategy}><span className={getLevelColor(level)}>{level}</span>{rest.length > 0 && <span className="text-muted-foreground">/{rest.join('/')}</span>}</span></TableCell><TableCell className="p-2"><ReviewPreview score={trade.executionScore} emotion={trade.emotion} tags={trade.disciplineTags} /></TableCell><TableCell className="num p-2 text-muted-foreground">{trade.position}%</TableCell><TableCell className="num p-2 text-muted-foreground">{fmt(trade.openAmount)}</TableCell><TableCell className="p-2"><Money value={pl} tone={toneOf(pl)} signed className="text-sm font-medium" /></TableCell><TableCell className="p-2">{trade.isClosed ? <span className="block truncate text-xs text-muted-foreground" title={statusText}>{statusText}</span> : <span className="rounded-full border border-border px-2 py-0.5 text-xs text-muted-foreground">持有中</span>}</TableCell><TableCell className="sticky right-0 z-[1] bg-card p-2 group-hover:bg-muted"><TradeActions trade={trade} onEdit={onEdit} onView={onView} onDelete={onDelete} /></TableCell></TableRow>;
      })}</TableBody></Table></div>
      <div className="space-y-2 md:hidden">{trades.map((trade) => { const pl = Number(trade.profitLoss) || 0; return <button key={trade.id} type="button" className="w-full rounded-lg border border-border bg-card p-3 text-left transition-colors active:bg-muted" onClick={() => onView(trade)}><div className="flex items-start justify-between gap-3"><div><p className="font-medium">{trade.symbol} {trade.direction && <span className="ml-1 text-xs text-muted-foreground">{trade.direction}</span>}</p><p className="num mt-1 text-xs text-muted-foreground">{formatTradeDateTime(trade.date, trade.openTime)}</p></div><Money value={pl} tone={toneOf(pl)} signed className="text-sm font-medium" /></div><div className="mt-3 flex items-center justify-between gap-2 text-xs text-muted-foreground"><span className="truncate">{trade.isClosed ? getCloseReasonText(trade.closeReason, trade.remark) : '持有中'} · {trade.position}%</span><span className="num">{fmt(trade.openAmount)}</span></div></button>; })}</div></>}
      {!loading && !error && total > 0 && <div className="mt-4 flex items-center justify-between border-t border-border pt-3"><span className="num text-xs text-muted-foreground">第 {page} / {pages} 页</span><div className="flex gap-1"><Button variant="outline" size="icon-sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)} aria-label="上一页"><ChevronLeft /></Button><Button variant="outline" size="icon-sm" disabled={page >= pages} onClick={() => onPageChange(page + 1)} aria-label="下一页"><ChevronRight /></Button></div></div>}
    </CardContent>
  </Card>;
}
