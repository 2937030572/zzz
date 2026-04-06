'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import {
  RefreshCw, Check, X, Pencil, ChevronLeft, ChevronRight,
  TrendingUp, TrendingDown, Minus,
} from 'lucide-react';
import { toast } from 'sonner';
import { Toaster } from 'sonner';

// ─────────────────────────────────────────
// 类型
// ─────────────────────────────────────────
interface OptionTrade {
  id: string;
  tradeId: string;
  symbol: string;
  underlying: string;
  strikePrice: number;
  expiryDate: string;
  optionType: string;  // CALL / PUT
  side: string;        // BUY / SELL
  quantity: number;
  price: number;
  totalCost: number;
  fee: number;
  feeAsset: string;
  realizedPnl: number;
  tradeTime: number;
  tradeDate: string;
  remark: string;
}

interface Summary {
  totalPnl: number;
  totalFee: number;
  tradeCount: number;
  callCount: number;
  putCount: number;
}

interface Pagination {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

// ─────────────────────────────────────────
// 辅助函数
// ─────────────────────────────────────────
function fmtUSDT(val: number): string {
  return (val >= 0 ? '+' : '') + val.toFixed(4) + ' USDT';
}

function fmtDate(tradeTime: number): string {
  const d = new Date(tradeTime);
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${day} ${h}:${mi}`;
}

// ─────────────────────────────────────────
// 主组件
// ─────────────────────────────────────────
export default function OptionsTradesPage() {
  // ── 数据状态 ──
  const [trades, setTrades] = useState<OptionTrade[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [pagination, setPagination] = useState<Pagination>({
    page: 1, pageSize: 50, total: 0, totalPages: 1,
  });
  const [loading, setLoading] = useState(false);

  // ── 筛选状态 ──
  const [filterSymbol, setFilterSymbol] = useState('');
  const [filterOptionType, setFilterOptionType] = useState('ALL');
  const [filterSide, setFilterSide] = useState('ALL');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // ── 同步状态 ──
  const [syncing, setSyncing] = useState(false);
  const [syncDays, setSyncDays] = useState('90');

  // ── 行内编辑状态 ──
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingRemark, setEditingRemark] = useState('');
  const [savingRemark, setSavingRemark] = useState(false);
  const remarkInputRef = useRef<HTMLInputElement>(null);

  // ─────────────────────────────────────────
  // 拉取列表
  // ─────────────────────────────────────────
  const fetchTrades = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page: String(page), pageSize: '50' });
      if (filterSymbol.trim()) params.set('symbol', filterSymbol.trim());
      if (filterOptionType !== 'ALL') params.set('optionType', filterOptionType);
      if (filterSide !== 'ALL') params.set('side', filterSide);
      if (filterStartDate) params.set('startDate', filterStartDate);
      if (filterEndDate) params.set('endDate', filterEndDate);

      const res = await fetch(`/api/options-trades?${params}`);
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || '请求失败');
      }
      const data = await res.json();
      setTrades(data.trades ?? []);
      setSummary(data.summary ?? null);
      setPagination(data.pagination ?? { page: 1, pageSize: 50, total: 0, totalPages: 1 });
    } catch (err: any) {
      toast.error('加载失败：' + err.message);
    } finally {
      setLoading(false);
    }
  }, [filterSymbol, filterOptionType, filterSide, filterStartDate, filterEndDate]);

  useEffect(() => { fetchTrades(1); }, [fetchTrades]);

  // ─────────────────────────────────────────
  // 一键同步
  // ─────────────────────────────────────────
  const handleSync = async () => {
    setSyncing(true);
    try {
      const days = Math.max(1, parseInt(syncDays) || 90);
      const endTime = Date.now();
      const startTime = endTime - days * 24 * 60 * 60 * 1000;

      const res = await fetch('/api/options-trades/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startTime, endTime }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '同步失败');

      toast.success(data.message || `同步完成：${data.synced} 条`);
      // 同步完成后刷新列表
      fetchTrades(1);
    } catch (err: any) {
      toast.error('同步失败：' + err.message);
    } finally {
      setSyncing(false);
    }
  };

  // ─────────────────────────────────────────
  // 行内编辑备注
  // ─────────────────────────────────────────
  const startEdit = (trade: OptionTrade) => {
    setEditingId(trade.id);
    setEditingRemark(trade.remark);
    // 聚焦输入框（下一帧）
    setTimeout(() => remarkInputRef.current?.focus(), 50);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditingRemark('');
  };

  const saveRemark = async (id: string) => {
    setSavingRemark(true);
    try {
      const res = await fetch('/api/options-trades', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, remark: editingRemark }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || '保存失败');

      // 更新本地状态，无需重新请求
      setTrades(prev =>
        prev.map(t => t.id === id ? { ...t, remark: editingRemark } : t),
      );
      setEditingId(null);
      toast.success('备注已保存');
    } catch (err: any) {
      toast.error('保存失败：' + err.message);
    } finally {
      setSavingRemark(false);
    }
  };

  // ─────────────────────────────────────────
  // 渲染
  // ─────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-zinc-950 to-black p-4 md:p-8 relative overflow-hidden">
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(234,179,8,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(234,179,8,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />

      <div className="mx-auto max-w-7xl space-y-6 relative z-10">

        {/* ── 标题 ── */}
        <div className="rounded-xl border border-amber-500/30 bg-gray-900/90 p-4 sm:p-6 shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">
                币安期权交易历史
              </h1>
              <p className="mt-1 text-sm text-amber-500/60">
                只读同步 · 在线查看 · 可编辑备注
              </p>
            </div>
            <a
              href="/"
              className="text-sm text-amber-400/70 hover:text-amber-400 underline underline-offset-2 transition-colors"
            >
              ← 返回主页
            </a>
          </div>
        </div>

        {/* ── 统计卡片 ── */}
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            <StatCard
              label="总盈亏"
              value={summary.totalPnl.toFixed(4)}
              unit="USDT"
              trend={summary.totalPnl > 0 ? 'up' : summary.totalPnl < 0 ? 'down' : 'flat'}
            />
            <StatCard label="总手续费" value={summary.totalFee.toFixed(4)} unit="USDT" />
            <StatCard label="成交笔数" value={String(summary.tradeCount)} unit="笔" />
            <StatCard label="看涨（CALL）" value={String(summary.callCount)} unit="笔" accent="green" />
            <StatCard label="看跌（PUT）" value={String(summary.putCount)} unit="笔" accent="red" />
          </div>
        )}

        {/* ── 同步区域 ── */}
        <Card className="border-amber-500/30 bg-gray-900/90 shadow-[0_0_20px_rgba(234,179,8,0.08)] backdrop-blur-sm">
          <CardHeader className="border-b border-amber-500/20 pb-3">
            <CardTitle className="text-base bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              数据同步
            </CardTitle>
            <CardDescription className="text-amber-500/60 text-xs">
              从币安 API 拉取期权成交历史并存入数据库，备注字段不会被覆盖
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-end gap-4">
              <div className="space-y-1.5">
                <Label className="text-amber-400 text-sm">同步最近天数</Label>
                <div className="flex items-center gap-2">
                  <Select value={syncDays} onValueChange={setSyncDays}>
                    <SelectTrigger className="w-32 border-amber-500/30 bg-gray-800 text-white h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-500/30 bg-gray-800">
                      {['7', '30', '90', '180', '365'].map(d => (
                        <SelectItem key={d} value={d} className="text-white hover:bg-gray-700">
                          最近 {d} 天
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <Button
                onClick={handleSync}
                disabled={syncing}
                className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold shadow-[0_0_20px_rgba(234,179,8,0.3)] h-9"
              >
                <RefreshCw className={`mr-2 h-4 w-4 ${syncing ? 'animate-spin' : ''}`} />
                {syncing ? '同步中...' : '一键同步'}
              </Button>

              <p className="text-xs text-gray-500 self-end pb-1">
                使用环境变量中的 BINANCE_API_KEY / BINANCE_API_SECRET（只读权限即可）
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── 筛选区域 ── */}
        <Card className="border-amber-500/30 bg-gray-900/90 shadow-[0_0_20px_rgba(234,179,8,0.08)] backdrop-blur-sm">
          <CardHeader className="border-b border-amber-500/20 pb-3">
            <CardTitle className="text-base bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              筛选
            </CardTitle>
          </CardHeader>
          <CardContent className="pt-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <div className="space-y-1.5 col-span-2 sm:col-span-1">
                <Label className="text-amber-400 text-xs">合约标的</Label>
                <Input
                  placeholder="如 ETH-240329"
                  value={filterSymbol}
                  onChange={e => setFilterSymbol(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500 h-9 text-sm"
                  onKeyDown={e => e.key === 'Enter' && fetchTrades(1)}
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-amber-400 text-xs">期权类型</Label>
                <Select value={filterOptionType} onValueChange={setFilterOptionType}>
                  <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-amber-500/30 bg-gray-800">
                    <SelectItem value="ALL" className="text-white hover:bg-gray-700">全部</SelectItem>
                    <SelectItem value="CALL" className="text-white hover:bg-gray-700">CALL（看涨）</SelectItem>
                    <SelectItem value="PUT" className="text-white hover:bg-gray-700">PUT（看跌）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-amber-400 text-xs">方向</Label>
                <Select value={filterSide} onValueChange={setFilterSide}>
                  <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-amber-500/30 bg-gray-800">
                    <SelectItem value="ALL" className="text-white hover:bg-gray-700">全部</SelectItem>
                    <SelectItem value="BUY" className="text-white hover:bg-gray-700">BUY（买入）</SelectItem>
                    <SelectItem value="SELL" className="text-white hover:bg-gray-700">SELL（卖出）</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label className="text-amber-400 text-xs">开始日期</Label>
                <Input
                  type="date"
                  value={filterStartDate}
                  onChange={e => setFilterStartDate(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500 h-9 text-sm"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-amber-400 text-xs">结束日期</Label>
                <Input
                  type="date"
                  value={filterEndDate}
                  onChange={e => setFilterEndDate(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500 h-9 text-sm"
                />
              </div>
            </div>

            <div className="mt-3 flex gap-2">
              <Button
                size="sm"
                onClick={() => fetchTrades(1)}
                className="bg-amber-500 hover:bg-amber-600 text-black font-semibold h-8"
              >
                查询
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  setFilterSymbol('');
                  setFilterOptionType('ALL');
                  setFilterSide('ALL');
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-gray-400 hover:text-gray-300 h-8"
              >
                清除筛选
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ── 交易记录表格 ── */}
        <Card className="border-amber-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-sm">
          <CardHeader className="border-b border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                  期权成交记录
                </CardTitle>
                <CardDescription className="text-amber-500/60">
                  共 {pagination.total} 条 · 点击备注列编辑
                </CardDescription>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => fetchTrades(pagination.page)}
                disabled={loading}
                className="text-amber-400 hover:bg-amber-500/10 h-8"
              >
                <RefreshCw className={`h-3.5 w-3.5 mr-1 ${loading ? 'animate-spin' : ''}`} />
                刷新
              </Button>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20 text-amber-400/60">
                <RefreshCw className="h-6 w-6 animate-spin mr-2" />
                加载中...
              </div>
            ) : trades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-amber-500/50 gap-2">
                <p className="text-base">暂无期权交易记录</p>
                <p className="text-xs">请先配置币安 API 密钥，然后点击「一键同步」</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader className="sticky top-0 bg-gray-900 z-10">
                    <TableRow className="border-amber-500/20 hover:bg-transparent">
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">成交时间</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">合约</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">类型</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">行权价</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">到期日</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">方向</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">数量</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">成交价</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">总成本</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">手续费</TableHead>
                      <TableHead className="text-amber-400 text-xs whitespace-nowrap">已实现盈亏</TableHead>
                      <TableHead className="text-amber-400 text-xs w-48">备注（可编辑）</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {trades.map(trade => (
                      <TradeRow
                        key={trade.id}
                        trade={trade}
                        isEditing={editingId === trade.id}
                        editingRemark={editingRemark}
                        savingRemark={savingRemark}
                        remarkInputRef={editingId === trade.id ? remarkInputRef : undefined}
                        onStartEdit={() => startEdit(trade)}
                        onCancelEdit={cancelEdit}
                        onSaveRemark={() => saveRemark(trade.id)}
                        onRemarkChange={setEditingRemark}
                      />
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* 分页 */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between px-4 py-3 border-t border-amber-500/20">
                <span className="text-xs text-gray-400">
                  第 {pagination.page} / {pagination.totalPages} 页，共 {pagination.total} 条
                </span>
                <div className="flex items-center gap-1">
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pagination.page <= 1 || loading}
                    onClick={() => fetchTrades(pagination.page - 1)}
                    className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    disabled={pagination.page >= pagination.totalPages || loading}
                    onClick={() => fetchTrades(pagination.page + 1)}
                    className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Toaster
        position="top-right"
        toastOptions={{
          style: { background: '#1F2937', border: '1px solid rgba(245,158,11,0.3)', color: '#F3F4F6' },
        }}
      />
    </div>
  );
}

// ─────────────────────────────────────────
// 子组件：统计卡片
// ─────────────────────────────────────────
function StatCard({
  label, value, unit, trend, accent,
}: {
  label: string;
  value: string;
  unit: string;
  trend?: 'up' | 'down' | 'flat';
  accent?: 'green' | 'red';
}) {
  const numVal = parseFloat(value);
  const colorClass = trend
    ? numVal > 0 ? 'text-green-400' : numVal < 0 ? 'text-red-400' : 'text-gray-400'
    : accent === 'green' ? 'text-green-400' : accent === 'red' ? 'text-red-400' : 'text-amber-400';

  return (
    <div className="rounded-lg border border-amber-500/20 bg-gray-800/60 p-3 text-center">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className={`text-base font-bold ${colorClass} flex items-center justify-center gap-1`}>
        {trend === 'up' && <TrendingUp className="h-3.5 w-3.5" />}
        {trend === 'down' && <TrendingDown className="h-3.5 w-3.5" />}
        {trend === 'flat' && <Minus className="h-3.5 w-3.5" />}
        {numVal > 0 && trend ? '+' : ''}{value}
      </div>
      <div className="text-xs text-gray-500 mt-0.5">{unit}</div>
    </div>
  );
}

// ─────────────────────────────────────────
// 子组件：表格行（含行内编辑）
// ─────────────────────────────────────────
interface TradeRowProps {
  trade: OptionTrade;
  isEditing: boolean;
  editingRemark: string;
  savingRemark: boolean;
  remarkInputRef?: React.RefObject<HTMLInputElement | null>;
  onStartEdit: () => void;
  onCancelEdit: () => void;
  onSaveRemark: () => void;
  onRemarkChange: (v: string) => void;
}

function TradeRow({
  trade, isEditing, editingRemark, savingRemark, remarkInputRef,
  onStartEdit, onCancelEdit, onSaveRemark, onRemarkChange,
}: TradeRowProps) {
  const pnlColor =
    trade.realizedPnl > 0 ? 'text-green-400' :
    trade.realizedPnl < 0 ? 'text-red-400' :
    'text-gray-400';

  const pnlPrefix = trade.realizedPnl > 0 ? '+' : '';

  return (
    <TableRow className="border-amber-500/10 hover:bg-amber-500/5 transition-colors">
      {/* 成交时间 */}
      <TableCell className="text-gray-300 text-xs whitespace-nowrap font-mono">
        {fmtDate(trade.tradeTime)}
      </TableCell>

      {/* 合约 */}
      <TableCell className="text-white text-xs font-medium">
        {trade.symbol}
      </TableCell>

      {/* 期权类型 */}
      <TableCell>
        <Badge
          className={`text-xs font-semibold px-1.5 py-0 border ${
            trade.optionType === 'CALL'
              ? 'bg-green-500/10 text-green-400 border-green-500/30'
              : 'bg-red-500/10 text-red-400 border-red-500/30'
          }`}
          variant="outline"
        >
          {trade.optionType}
        </Badge>
      </TableCell>

      {/* 行权价 */}
      <TableCell className="text-amber-300 text-xs font-mono text-right">
        {trade.strikePrice > 0 ? trade.strikePrice.toLocaleString() : '-'}
      </TableCell>

      {/* 到期日 */}
      <TableCell className="text-gray-400 text-xs whitespace-nowrap font-mono">
        {trade.expiryDate || '-'}
      </TableCell>

      {/* 方向 */}
      <TableCell>
        <Badge
          className={`text-xs font-semibold px-1.5 py-0 border ${
            trade.side === 'BUY'
              ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
              : 'bg-orange-500/10 text-orange-400 border-orange-500/30'
          }`}
          variant="outline"
        >
          {trade.side === 'BUY' ? '买入' : '卖出'}
        </Badge>
      </TableCell>

      {/* 数量 */}
      <TableCell className="text-gray-300 text-xs font-mono text-right">
        {trade.quantity}
      </TableCell>

      {/* 成交价 */}
      <TableCell className="text-gray-300 text-xs font-mono text-right">
        {trade.price.toFixed(4)}
      </TableCell>

      {/* 总成本 */}
      <TableCell className="text-amber-400 text-xs font-mono text-right">
        {trade.totalCost.toFixed(4)}
      </TableCell>

      {/* 手续费 */}
      <TableCell className="text-gray-400 text-xs font-mono text-right">
        -{trade.fee.toFixed(4)}
      </TableCell>

      {/* 已实现盈亏 */}
      <TableCell className={`text-xs font-semibold font-mono text-right ${pnlColor}`}>
        {pnlPrefix}{trade.realizedPnl.toFixed(4)}
      </TableCell>

      {/* 备注（可编辑） */}
      <TableCell className="min-w-[180px]">
        {isEditing ? (
          <div className="flex items-center gap-1">
            <Input
              ref={remarkInputRef as React.RefObject<HTMLInputElement>}
              value={editingRemark}
              onChange={e => onRemarkChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') onSaveRemark();
                if (e.key === 'Escape') onCancelEdit();
              }}
              className="h-7 text-xs border-amber-500/50 bg-gray-800 text-white focus:border-amber-500 px-2 min-w-[120px]"
              placeholder="输入备注..."
              disabled={savingRemark}
            />
            <Button
              size="sm"
              onClick={onSaveRemark}
              disabled={savingRemark}
              className="h-7 w-7 p-0 bg-green-600 hover:bg-green-700 text-white"
            >
              <Check className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={onCancelEdit}
              disabled={savingRemark}
              className="h-7 w-7 p-0 text-gray-400 hover:bg-gray-700"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div
            className="group flex items-center gap-1.5 cursor-pointer rounded px-1.5 py-0.5 hover:bg-amber-500/10 transition-colors"
            onClick={onStartEdit}
            title="点击编辑备注"
          >
            <span className={`text-xs ${trade.remark ? 'text-amber-300' : 'text-gray-600'} flex-1 min-w-[80px]`}>
              {trade.remark || '点击添加备注...'}
            </span>
            <Pencil className="h-3 w-3 text-amber-500/50 group-hover:text-amber-400 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
          </div>
        )}
      </TableCell>
    </TableRow>
  );
}
