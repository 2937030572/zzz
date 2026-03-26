'use client';

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { AlertCircle, Loader2 } from 'lucide-react';
import { api } from '@/lib/api';
import { useTradingData } from '@/hooks/useTradingData';
import { toast } from 'sonner';
import { BalanceCard } from '@/components/BalanceCard';
import { EquityChart } from '@/components/EquityChart';
import { TradingStats } from '@/components/TradingStats';
import { TradeTable } from '@/components/TradeTable';
import { Trade, PositionType } from '@/types';
import { AccountManager } from '@/components/AccountManager';
import { getCloseReasonText } from '@/lib/utils';

// 仓位选项：5% 到 50%，每个增加 5%
const POSITION_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);

// 交易表单的默认值，用于 reset
const DEFAULT_TRADE_FORM = {
  symbol: '',
  strategy: '',
  position: 5 as PositionType,
  openDateTime: new Date().toISOString().slice(0, 16),
  closeReason: 'profit' as 'profit' | 'loss' | 'other',
  remark: '',
  profitLoss: '',
  isClosed: true,
};

export default function TradingApp() {
  // 使用交易数据钩子
  const {
    accounts,
    currentAccountId,
    setCurrentAccountId,
    balance,
    trades,
    fundRecords,
    loading,
    error,
    loadData
  } = useTradingData();

  // 资产历史状态
  const [equityHistory, setEquityHistory] = useState<Array<{ date: string; value: number }>>([]);

  // 交易对话框状态
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);

  // 交易表单状态
  const [symbol, setSymbol] = useState(DEFAULT_TRADE_FORM.symbol);
  const [strategy, setStrategy] = useState(DEFAULT_TRADE_FORM.strategy);
  const [position, setPosition] = useState<PositionType>(DEFAULT_TRADE_FORM.position);
  const [openAmount, setOpenAmount] = useState<number>(0);
  const [openDateTime, setOpenDateTime] = useState(DEFAULT_TRADE_FORM.openDateTime);
  const [closeReason, setCloseReason] = useState(DEFAULT_TRADE_FORM.closeReason);
  const [remark, setRemark] = useState(DEFAULT_TRADE_FORM.remark);
  const [profitLoss, setProfitLoss] = useState(DEFAULT_TRADE_FORM.profitLoss);
  const [isClosed, setIsClosed] = useState(DEFAULT_TRADE_FORM.isClosed);

  // 日期筛选状态
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // 编辑相关状态
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 重置表单到默认值
  const resetTradeForm = useCallback(() => {
    setSymbol(DEFAULT_TRADE_FORM.symbol);
    setStrategy(DEFAULT_TRADE_FORM.strategy);
    setPosition(DEFAULT_TRADE_FORM.position);
    setOpenDateTime(new Date().toISOString().slice(0, 16));
    setCloseReason(DEFAULT_TRADE_FORM.closeReason);
    setRemark(DEFAULT_TRADE_FORM.remark);
    setProfitLoss(DEFAULT_TRADE_FORM.profitLoss);
    setIsClosed(DEFAULT_TRADE_FORM.isClosed);
  }, []);

  // 加载资产历史（随账户切换刷新）
  const loadEquityHistory = useCallback(async (accountId: number) => {
    try {
      const res = await api.equityHistory.getAll(accountId);
      setEquityHistory(res.history || []);
    } catch (err) {
      console.error('Failed to load equity history:', err);
    }
  }, []);

  useEffect(() => {
    loadEquityHistory(currentAccountId);
  }, [currentAccountId, loadEquityHistory]);

  // 计算开仓金额
  useEffect(() => {
    setOpenAmount((balance * position) / 100);
  }, [balance, position]);

  // 获取操作后的最新余额（避免 stale state 写入快照）
  const fetchLatestBalance = useCallback(async (accountId: number): Promise<number> => {
    const res = await api.balance.get(accountId);
    return res.balance ?? 0;
  }, []);

  // 添加资金记录
  const handleAddFund = useCallback(async (type: 'deposit' | 'withdraw', amount: number) => {
    if (!amount || amount <= 0) return;

    // 出金前端余额校验
    if (type === 'withdraw' && amount > balance) {
      toast.error(`出金金额 $${amount} 超过余额 $${balance.toFixed(2)}`);
      return;
    }

    try {
      await api.fundRecords.create({
        type,
        amount,
        date: new Date().toISOString().split('T')[0],
        accountId: currentAccountId,
      });

      // 重新加载数据以获取最新余额（静默刷新，不触发全屏 loading）
      await loadData(currentAccountId, true);

      // 用最新余额写入净值快照
      const latestBalance = await fetchLatestBalance(currentAccountId);
      await api.equityHistory.create({
        date: new Date().toISOString().split('T')[0],
        value: latestBalance,
        accountId: currentAccountId,
      });

      await loadEquityHistory(currentAccountId);

      toast.success(type === 'deposit' ? '入金成功' : '出金成功');
    } catch (err) {
      console.error('Failed to add fund record:', err);
      toast.error(type === 'deposit' ? '添加入金记录失败' : '添加出金记录失败');
    }
  }, [balance, currentAccountId, loadData, fetchLatestBalance, loadEquityHistory]);

  // 删除出入金记录
  const handleDeleteFundRecord = useCallback(async (id: string) => {
    if (!confirm('确定要删除这条出入金记录吗？')) return;
    try {
      await api.fundRecords.delete(id, currentAccountId);

      await loadData(currentAccountId, true);

      const latestBalance = await fetchLatestBalance(currentAccountId);
      await api.equityHistory.create({
        date: new Date().toISOString().split('T')[0],
        value: latestBalance,
        accountId: currentAccountId,
      });

      await loadEquityHistory(currentAccountId);

      toast.success('删除出入金记录成功');
    } catch (err) {
      console.error('Failed to delete fund record:', err);
      toast.error('删除出入金记录失败');
    }
  }, [currentAccountId, loadData, fetchLatestBalance, loadEquityHistory]);

  // 添加交易记录
  const handleAddTrade = useCallback(async () => {
    // profitLoss 允许为 '0'，只拦截空字符串
    if (!symbol || profitLoss === '' || !openDateTime) {
      toast.error('请填写交易品种、开仓日期和盈亏金额');
      return;
    }

    try {
      const pl = Number(profitLoss);
      const dateTime = new Date(openDateTime);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

      await api.trades.create({
        symbol,
        strategy,
        position,
        openAmount,
        openTime: time,
        closeReason,
        remark: closeReason === 'other' ? remark : '',
        profitLoss: pl,
        date,
        isClosed,
        accountId: currentAccountId,
      });

      await loadData(currentAccountId, true);

      const latestBalance = await fetchLatestBalance(currentAccountId);
      await api.equityHistory.create({
        date: new Date().toISOString().split('T')[0],
        value: latestBalance,
        accountId: currentAccountId,
      });

      await loadEquityHistory(currentAccountId);

      toast.success('添加交易记录成功');
    } catch (err) {
      console.error('Failed to add trade:', err);
      toast.error('添加交易记录失败');
    } finally {
      // 无论成功失败，都关闭对话框并重置表单
      resetTradeForm();
      setIsTradeDialogOpen(false);
    }
  }, [symbol, profitLoss, openDateTime, strategy, position, openAmount, closeReason, remark, isClosed, currentAccountId, loadData, fetchLatestBalance, loadEquityHistory, resetTradeForm]);

  // 计算累计入金和出金（单次遍历）
  const { totalDeposit, totalWithdraw } = useMemo(() => {
    let deposit = 0;
    let withdraw = 0;
    for (const r of fundRecords) {
      if (r.type === 'deposit') deposit += Number(r.amount) || 0;
      else withdraw += Number(r.amount) || 0;
    }
    return { totalDeposit: deposit, totalWithdraw: withdraw };
  }, [fundRecords]);

  // 数据下载功能
  const handleDownloadData = useCallback(() => {
    const data = {
      balance,
      totalDeposit,
      totalWithdraw,
      trades: trades.map(t => ({
        交易品种: t.symbol,
        入场策略: t.strategy,
        仓位: t.position + '%',
        开仓金额: '$' + t.openAmount,
        开仓时间: t.openTime,
        平仓原因: getCloseReasonText(t.closeReason, t.remark),
        盈亏金额: '$' + t.profitLoss,
        平仓状态: t.isClosed ? '已平仓' : '未平仓',
        日期: t.date
      }))
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `交易数据_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [balance, totalDeposit, totalWithdraw, trades]);

  // 删除交易记录
  const handleDeleteTrade = useCallback(async (tradeId: string) => {
    if (!confirm('确定要删除这条交易记录吗？')) return;

    try {
      await api.trades.delete(tradeId, currentAccountId);

      await loadData(currentAccountId, true);

      const latestBalance = await fetchLatestBalance(currentAccountId);
      await api.equityHistory.create({
        date: new Date().toISOString().split('T')[0],
        value: latestBalance,
        accountId: currentAccountId,
      });

      await loadEquityHistory(currentAccountId);

      toast.success('删除交易记录成功');
    } catch (err) {
      console.error('Failed to delete trade:', err);
      toast.error('删除交易记录失败');
    }
  }, [currentAccountId, loadData, fetchLatestBalance, loadEquityHistory]);

  // 编辑交易记录：填充表单并打开对话框
  const handleEditTrade = useCallback((trade: Trade) => {
    setEditingTrade(trade);
    setSymbol(trade.symbol);
    setStrategy(trade.strategy);
    setPosition(trade.position as PositionType);
    // openTime 可能为空字符串，兜底用 00:00
    const timeStr = trade.openTime && trade.openTime.length >= 5 ? trade.openTime : '00:00';
    setOpenDateTime(`${trade.date}T${timeStr}`);
    setCloseReason(trade.closeReason);
    setRemark(trade.remark || '');
    setProfitLoss(String(trade.profitLoss));
    setIsClosed(trade.isClosed);
    setIsEditDialogOpen(true);
  }, []);

  // 关闭编辑对话框时 reset 表单，防止污染添加表单
  const handleCloseEditDialog = useCallback((open: boolean) => {
    setIsEditDialogOpen(open);
    if (!open) {
      setEditingTrade(null);
      resetTradeForm();
    }
  }, [resetTradeForm]);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingTrade || !symbol || profitLoss === '' || !openDateTime) {
      toast.error('请填写交易品种、开仓日期和盈亏金额');
      return;
    }

    try {
      const newProfitLoss = Number(profitLoss);
      const dateTime = new Date(openDateTime);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

      await api.trades.update(editingTrade.id, {
        symbol,
        strategy,
        position,
        openTime: time,
        closeReason,
        remark: closeReason === 'other' ? remark : '',
        profitLoss: newProfitLoss,
        date,
        isClosed,
        accountId: currentAccountId,
      });

      await loadData(currentAccountId, true);

      const latestBalance = await fetchLatestBalance(currentAccountId);
      await api.equityHistory.create({
        date: new Date().toISOString().split('T')[0],
        value: latestBalance,
        accountId: currentAccountId,
      });

      await loadEquityHistory(currentAccountId);

      toast.success('保存交易记录成功');
    } catch (err) {
      console.error('Failed to save trade:', err);
      toast.error('保存交易记录失败');
    } finally {
      // 无论成功失败，都关闭对话框并清理状态
      setIsEditDialogOpen(false);
      setEditingTrade(null);
      resetTradeForm();
    }
  }, [editingTrade, symbol, profitLoss, openDateTime, strategy, position, closeReason, remark, isClosed, currentAccountId, loadData, fetchLatestBalance, loadEquityHistory, resetTradeForm]);

  // 计算净权益
  const netEquity = useMemo(() => {
    return equityHistory
      .filter((item) => item != null && item.value != null && !isNaN(Number(item.value)) && item.date != null && item.date !== '')
      .map((item) => {
        let totalWithdrawals = 0;
        for (const record of fundRecords) {
          if (!record || !record.date) continue;
          if (record.type === 'withdraw' && new Date(record.date) <= new Date(item.date)) {
            totalWithdrawals += (Number(record.amount) || 0);
          }
        }
        const raw = Number(item.value) - totalWithdrawals;
        const value = isNaN(raw) ? 0 : raw;
        const dateObj = new Date(item.date);
        const dateLabel = isNaN(dateObj.getTime()) ? item.date : dateObj.toLocaleDateString('zh-CN');
        return { date: dateLabel, value };
      });
  }, [equityHistory, fundRecords]);

  // 根据日期范围过滤交易
  const filteredTrades = useMemo(() => {
    if (!filterStartDate && !filterEndDate) return trades;

    return trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      const start = filterStartDate ? new Date(filterStartDate) : null;
      const end = filterEndDate ? new Date(filterEndDate) : null;

      if (start && end) return tradeDate >= start && tradeDate <= end;
      if (start) return tradeDate >= start;
      if (end) return tradeDate <= end;
      return true;
    });
  }, [trades, filterStartDate, filterEndDate]);

  // 共用的表单 JSX（添加/编辑复用）
  const renderTradeFormFields = () => (
    <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
      <div className="space-y-2">
        <Label className="text-cyan-400">交易品种</Label>
        <Input
          placeholder="例如：BTC/USDT"
          value={symbol}
          onChange={(e) => setSymbol(e.target.value)}
          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-cyan-400">开仓日期</Label>
        <Input
          type="datetime-local"
          value={openDateTime}
          onChange={(e) => setOpenDateTime(e.target.value)}
          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-cyan-400">入场策略 *</Label>
        <Input
          placeholder="请输入入场策略（必填）"
          value={strategy}
          onChange={(e) => setStrategy(e.target.value)}
          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-cyan-400">仓位 (%)</Label>
        <Select value={String(position)} onValueChange={(v) => setPosition(Number(v) as PositionType)}>
          <SelectTrigger className="border-cyan-500/30 bg-gray-800 text-white focus:border-cyan-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-cyan-500/30 bg-gray-800">
            {POSITION_OPTIONS.map((opt) => (
              <SelectItem key={opt} value={String(opt)} className="text-white hover:bg-gray-700">
                {opt}%
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label className="text-cyan-400">开仓金额</Label>
        <div className="rounded-md border border-cyan-500/30 bg-cyan-500/10 px-3 py-2 text-lg font-semibold text-cyan-400">
          ${(openAmount || 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
        </div>
        <p className="text-sm text-cyan-500/60">开仓金额 = 仓位 × 资产余额</p>
      </div>

      <div className="flex items-center justify-between space-x-2 py-2">
        <Label className="text-cyan-400 font-semibold">是否平仓</Label>
        <Switch
          checked={isClosed}
          onCheckedChange={setIsClosed}
          className="data-[state=checked]:bg-cyan-500 h-6 w-11 scale-110"
        />
      </div>

      <div className="space-y-2">
        <Label className="text-cyan-400">平仓原因</Label>
        <Select value={closeReason} onValueChange={(v) => setCloseReason(v as typeof closeReason)}>
          <SelectTrigger className="border-cyan-500/30 bg-gray-800 text-white focus:border-cyan-500">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="border-cyan-500/30 bg-gray-800">
            <SelectItem value="profit" className="text-white hover:bg-gray-700">正常止盈</SelectItem>
            <SelectItem value="loss" className="text-white hover:bg-gray-700">正常止损</SelectItem>
            <SelectItem value="other" className="text-white hover:bg-gray-700">其他原因</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {closeReason === 'other' && (
        <div className="space-y-2">
          <Label className="text-cyan-400">备注</Label>
          <Textarea
            placeholder="请输入备注信息"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
          />
        </div>
      )}

      <div className="space-y-2">
        <Label className="text-cyan-400">盈亏金额</Label>
        <Input
          type="number"
          placeholder="正数为盈利，负数为亏损"
          value={profitLoss}
          onChange={(e) => setProfitLoss(e.target.value)}
          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
        />
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-gray-900 p-4 md:p-8 relative overflow-hidden">
      {/* 背景网格效果 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />

      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        {/* 错误提示 */}
        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-400" />
            <span className="text-red-400">{error}</span>
          </div>
        )}

        {/* 加载状态 */}
        {loading ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-8 w-8 animate-spin text-cyan-400" />
            <span className="ml-2 text-cyan-400">加载中...</span>
          </div>
        ) : (
          <div className="space-y-6">
            {/* 标题和下载按钮 */}
            <div className="flex items-center justify-between gap-4">
              <div className="flex-1 rounded-xl border border-cyan-500/30 bg-gray-900/80 p-6 text-center shadow-[0_0_30px_rgba(6,182,212,0.2)] backdrop-blur-sm">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">交易记录系统</h1>
                <p className="mt-2 text-cyan-500/70">管理您的交易记录和资产</p>
              </div>
              <div className="flex flex-col items-end gap-2 shrink-0">
                <AccountManager
                  accounts={accounts}
                  currentAccountId={currentAccountId}
                  setCurrentAccountId={setCurrentAccountId}
                  onCreateAccount={async (name) => {
                    if (!name.trim()) return;
                    try {
                      await api.accounts.create(name.trim());
                      await loadData(currentAccountId);
                      toast.success('创建账户成功');
                    } catch (e: any) {
                      toast.error(e.message || '创建账户失败');
                    }
                  }}
                  onUpdateAccount={async (account, name) => {
                    if (!name.trim()) return;
                    try {
                      await api.accounts.update(account.id, name.trim());
                      await loadData(currentAccountId);
                      toast.success('更新账户成功');
                    } catch (e: any) {
                      toast.error(e.message || '更新账户失败');
                    }
                  }}
                  onDeleteAccount={async (id) => {
                    if (!confirm('确定要删除该账户及其所有数据吗？此操作不可撤销！')) return;
                    try {
                      await api.accounts.delete(id);
                      // 删除后取列表中第一个可用账户，不硬编码 1
                      const remaining = accounts.filter(a => a.id !== id);
                      const nextId = remaining.length > 0 ? remaining[0].id : 1;
                      setCurrentAccountId(nextId);
                      await loadData(nextId);
                      toast.success('删除账户成功');
                    } catch (e: any) {
                      toast.error(e.message || '删除账户失败');
                    }
                  }}
                />
                <Button
                  onClick={handleDownloadData}
                  className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
                >
                  下载数据
                </Button>
              </div>
            </div>

            {/* 资产余额卡片 */}
            <BalanceCard
              balance={balance}
              fundRecords={fundRecords}
              onAddFund={handleAddFund}
              onDeleteFundRecord={handleDeleteFundRecord}
              totalDeposit={totalDeposit}
              totalWithdraw={totalWithdraw}
            />

            {/* 资产走势图 */}
            <EquityChart netEquity={netEquity} />

            {/* 我的交易数据 */}
            <TradingStats
              filterStartDate={filterStartDate}
              setFilterStartDate={setFilterStartDate}
              filterEndDate={filterEndDate}
              setFilterEndDate={setFilterEndDate}
              filteredTrades={filteredTrades}
            />

            {/* 添加交易记录 */}
            <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
              <DialogTrigger asChild>
                <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-[0_0_20px_rgba(6,182,212,0.4)]" size="lg">
                  添加交易记录
                </Button>
              </DialogTrigger>
              <DialogContent className="border-cyan-500/30 bg-gray-900 text-white max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">添加交易记录</DialogTitle>
                  <DialogDescription className="text-cyan-500/60">填写交易信息</DialogDescription>
                </DialogHeader>
                {renderTradeFormFields()}
                <DialogFooter className="mt-4 pt-4 border-t border-cyan-500/20">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" onClick={handleAddTrade}>添加记录</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 编辑交易记录对话框 */}
            <Dialog open={isEditDialogOpen} onOpenChange={handleCloseEditDialog}>
              <DialogContent className="border-cyan-500/30 bg-gray-900 text-white max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">编辑交易记录</DialogTitle>
                  <DialogDescription className="text-cyan-500/60">修改交易信息</DialogDescription>
                </DialogHeader>
                {renderTradeFormFields()}
                <DialogFooter className="mt-4 pt-4 border-t border-cyan-500/20">
                  <Button
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => handleCloseEditDialog(false)}
                  >
                    取消
                  </Button>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" onClick={handleSaveEdit}>保存修改</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 交易记录列表（传 filteredTrades，和统计保持一致） */}
            <TradeTable
              trades={filteredTrades}
              onEditTrade={handleEditTrade}
              onDeleteTrade={handleDeleteTrade}
            />
          </div>
        )}
      </div>
    </div>
  );
}
