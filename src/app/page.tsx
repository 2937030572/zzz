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

// 仓位选项：5% 到 50%，每个增加 5%
const POSITION_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);

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

  // 添加交易对话框状态
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState<string>('');

  // 交易表单状态
  const [symbol, setSymbol] = useState<string>('');
  const [strategy, setStrategy] = useState<string>('');
  const [position, setPosition] = useState<PositionType>(5);
  const [openAmount, setOpenAmount] = useState<number>(0);
  const [openDateTime, setOpenDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [closeReason, setCloseReason] = useState<'profit' | 'loss' | 'other'>('profit');
  const [remark, setRemark] = useState<string>('');
  const [profitLoss, setProfitLoss] = useState<string>('');
  const [isClosed, setIsClosed] = useState<boolean>(true);
  
  // 日期筛选状态
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // 编辑相关状态
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 账户管理状态
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<any | null>(null);
  const [editAccountName, setEditAccountName] = useState('');
  const [newAccountName, setNewAccountName] = useState('');

  // 账户操作
  const handleCreateAccount = useCallback(async (name: string) => {
    if (!name.trim()) return;
    try {
      await api.accounts.create(name.trim());
      setNewAccountName('');
      await loadData(currentAccountId);
      toast.success('创建账户成功');
    } catch (error: any) {
      toast.error(error.message || '创建账户失败');
    }
  }, [currentAccountId, loadData]);

  const handleUpdateAccount = useCallback(async (account: any, name: string) => {
    if (!name.trim()) return;
    try {
      await api.accounts.update(account.id, name.trim());
      setEditingAccount(null);
      setEditAccountName('');
      await loadData(currentAccountId);
      toast.success('更新账户成功');
    } catch (error: any) {
      toast.error(error.message || '更新账户失败');
    }
  }, [currentAccountId, loadData]);

  const handleDeleteAccount = useCallback(async (id: number) => {
    if (!confirm('确定要删除该账户及其所有数据吗？此操作不可撤销！')) return;
    try {
      await api.accounts.delete(id);
      if (currentAccountId === id) setCurrentAccountId(1);
      await loadData(1);
      toast.success('删除账户成功');
    } catch (error: any) {
      toast.error(error.message || '删除账户失败');
    }
  }, [currentAccountId, loadData, setCurrentAccountId]);

  // 加载资产历史（随账户切换刷新）
  useEffect(() => {
    const loadEquityHistory = async () => {
      try {
        const equityHistoryRes = await api.equityHistory.getAll();
        setEquityHistory(equityHistoryRes.history);
      } catch (error) {
        console.error('Failed to load equity history:', error);
      }
    };

    loadEquityHistory();
  }, [currentAccountId]);

  // 计算开仓金额
  useEffect(() => {
    const amount = (balance * position) / 100;
    setOpenAmount(amount);
  }, [balance, position]);

  // 添加资金记录
  const handleAddFund = useCallback(async (type: 'deposit' | 'withdraw', amount: number) => {
    if (!amount || amount <= 0) return;

    try {
      // 创建出入金记录（后端会自动更新余额）
      await api.fundRecords.create({
        type,
        amount,
        date: new Date().toISOString().split('T')[0],
        accountId: currentAccountId,
      });

      // 更新资产历史
      const newBalance = type === 'deposit' ? balance + amount : balance - amount;
      await api.equityHistory.create({
        date: new Date().toISOString(),
        value: newBalance,
      });

      // 重新加载数据以同步最新状态
      await loadData(currentAccountId);

      setFundAmount('');
      if (type === 'deposit') {
        setIsDepositDialogOpen(false);
      } else {
        setIsWithdrawDialogOpen(false);
      }

      toast.success(type === 'deposit' ? '入金成功' : '出金成功');
    } catch (error) {
      console.error('Failed to add fund record:', error);
      toast.error(type === 'deposit' ? '添加入金记录失败' : '添加出金记录失败');
    }
  }, [balance, currentAccountId, loadData]);

  // 删除出入金记录
  const handleDeleteFundRecord = useCallback(async (id: string) => {
    try {
      const record = fundRecords.find(r => r.id === id);
      if (!record) return;

      // 删除记录（后端会自动还原余额）
      await api.fundRecords.delete(id, currentAccountId);

      // 更新资产历史
      const newBalance = record.type === 'deposit' ? balance - record.amount : balance + record.amount;
      await api.equityHistory.create({
        date: new Date().toISOString(),
        value: newBalance,
      });

      // 重新加载数据
      await loadData(currentAccountId);

      toast.success('删除出入金记录成功');
    } catch (error) {
      console.error('Failed to delete fund record:', error);
      toast.error('删除出入金记录失败');
    }
  }, [balance, fundRecords, currentAccountId, loadData]);

  // 添加交易记录
  const handleAddTrade = useCallback(async () => {
    if (!symbol || !profitLoss || !openDateTime) return;

    try {
      const pl = Number(profitLoss);

      // 将 openDateTime 拆分为 date 和 openTime
      const dateTime = new Date(openDateTime);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

      // 创建交易记录（后端会自动更新余额）
      await api.trades.create({
        symbol,
        strategy,
        position,
        openAmount,
        openTime: time,
        closeReason,
        remark: closeReason === 'other' ? remark : undefined,
        profitLoss: pl,
        date: date,
        isClosed,
        accountId: currentAccountId,
      });

      // 更新资产历史
      const newBalance = balance + pl;
      await api.equityHistory.create({
        date: new Date().toISOString(),
        value: newBalance,
      });

      // 重新加载数据
      await loadData(currentAccountId);

      // 重置表单
      setSymbol('');
      setStrategy('');
      setPosition(5);
      setCloseReason('profit');
      setRemark('');
      setProfitLoss('');
      setOpenDateTime(new Date().toISOString().slice(0, 16));
      setIsClosed(true);
      setIsTradeDialogOpen(false);

      toast.success('添加交易记录成功');
    } catch (error) {
      console.error('Failed to add trade:', error);
      toast.error('添加交易记录失败');
    }
  }, [symbol, profitLoss, openDateTime, strategy, position, openAmount, closeReason, remark, isClosed, balance, currentAccountId, loadData]);

  // 计算累计入金和出金
  const totalDeposit = useMemo(() => {
    return fundRecords.filter(r => r.type === 'deposit').reduce((sum, r) => sum + r.amount, 0);
  }, [fundRecords]);
  
  const totalWithdraw = useMemo(() => {
    return fundRecords.filter(r => r.type === 'withdraw').reduce((sum, r) => sum + r.amount, 0);
  }, [fundRecords]);

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

  // 将 date 和 openTime 合并为 datetime-local 格式
  const combineDateTime = useCallback((date: string, time: string) => {
    return `${date}T${time}`;
  }, []);

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
      const tradeToDelete = trades.find(t => t.id === tradeId);
      if (!tradeToDelete) return;

      // 删除交易记录（后端会自动还原余额）
      await api.trades.delete(tradeId, currentAccountId);

      // 更新资产历史
      const newBalance = balance - tradeToDelete.profitLoss;
      await api.equityHistory.create({
        date: new Date().toISOString(),
        value: newBalance,
      });

      // 重新加载数据
      await loadData(currentAccountId);

      toast.success('删除交易记录成功');
    } catch (error) {
      console.error('Failed to delete trade:', error);
      toast.error('删除交易记录失败');
    }
  }, [balance, trades, currentAccountId, loadData]);

  // 编辑交易记录
  const handleEditTrade = useCallback((trade: Trade) => {
    setEditingTrade(trade);
    setSymbol(trade.symbol);
    setStrategy(trade.strategy);
    setPosition(trade.position as PositionType);
    setOpenDateTime(combineDateTime(trade.date, trade.openTime));
    setCloseReason(trade.closeReason);
    setRemark(trade.remark || '');
    setProfitLoss(String(trade.profitLoss));
    setIsClosed(trade.isClosed);
    setIsEditDialogOpen(true);
  }, [combineDateTime]);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingTrade || !symbol || !profitLoss || !openDateTime) return;

    try {
      const oldProfitLoss = editingTrade.profitLoss;
      const newProfitLoss = Number(profitLoss);

      // 将 openDateTime 拆分为 date 和 openTime
      const dateTime = new Date(openDateTime);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

      // 更新交易记录（后端会自动调整余额差值）
      await api.trades.update(editingTrade.id, {
        symbol,
        strategy,
        position,
        openTime: time,
        closeReason,
        remark: closeReason === 'other' ? remark : undefined,
        profitLoss: newProfitLoss,
        date: date,
        isClosed,
        accountId: currentAccountId,
      });

      // 更新资产历史
      const newBalance = balance - oldProfitLoss + newProfitLoss;
      await api.equityHistory.create({
        date: new Date().toISOString(),
        value: newBalance,
      });

      // 重新加载数据
      await loadData(currentAccountId);

      // 关闭对话框
      setIsEditDialogOpen(false);
      setEditingTrade(null);

      toast.success('保存交易记录成功');
    } catch (error) {
      console.error('Failed to save trade:', error);
      toast.error('保存交易记录失败');
    }
  }, [editingTrade, symbol, profitLoss, openDateTime, strategy, position, closeReason, remark, isClosed, balance, currentAccountId, loadData]);

  // 计算净权益（扣除出金后的资产）
  const netEquity = useMemo(() => {
    return equityHistory.map((item) => {
      let totalWithdrawals = 0;
      for (const record of fundRecords) {
        if (record.type === 'withdraw' && new Date(record.date) <= new Date(item.date)) {
          totalWithdrawals += record.amount;
        }
      }
      return {
        date: new Date(item.date).toLocaleDateString('zh-CN'),
        value: item.value - totalWithdrawals,
      };
    });
  }, [equityHistory, fundRecords]);

  // 根据日期范围过滤交易
  const filteredTrades = useMemo(() => {
    if (!filterStartDate && !filterEndDate) return trades;
    
    return trades.filter(trade => {
      const tradeDate = new Date(trade.date);
      const start = filterStartDate ? new Date(filterStartDate) : null;
      const end = filterEndDate ? new Date(filterEndDate) : null;
      
      if (start && end) {
        return tradeDate >= start && tradeDate <= end;
      }
      if (start) {
        return tradeDate >= start;
      }
      if (end) {
        return tradeDate <= end;
      }
      return true;
    });
  }, [trades, filterStartDate, filterEndDate]);

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
                  onCreateAccount={handleCreateAccount}
                  onUpdateAccount={handleUpdateAccount}
                  onDeleteAccount={handleDeleteAccount}
                  editingAccount={editingAccount}
                  setEditingAccount={setEditingAccount}
                  editAccountName={editAccountName}
                  setEditAccountName={setEditAccountName}
                  newAccountName={newAccountName}
                  setNewAccountName={setNewAccountName}
                  isAccountDialogOpen={isAccountDialogOpen}
                  setIsAccountDialogOpen={setIsAccountDialogOpen}
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
              fundAmount={fundAmount}
              setFundAmount={setFundAmount}
              isDepositDialogOpen={isDepositDialogOpen}
              setIsDepositDialogOpen={setIsDepositDialogOpen}
              isWithdrawDialogOpen={isWithdrawDialogOpen}
              setIsWithdrawDialogOpen={setIsWithdrawDialogOpen}
            />

            {/* 资产走势图 */}
            <EquityChart netEquity={netEquity} />

            {/* 我的交易数据 */}
            <TradingStats
              trades={trades}
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
                <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="symbol" className="text-cyan-400">交易品种</Label>
                    <Input
                      id="symbol"
                      placeholder="例如：BTC/USDT"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="trade-date" className="text-cyan-400">开仓日期</Label>
                    <Input
                      id="trade-date"
                      type="datetime-local"
                      value={openDateTime}
                      onChange={(e) => setOpenDateTime(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="strategy" className="text-cyan-400">入场策略 *</Label>
                    <Input
                      id="strategy"
                      placeholder="请输入入场策略（必填）"
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="position" className="text-cyan-400">仓位 (%)</Label>
                    <Select value={String(position)} onValueChange={(value) => setPosition(Number(value) as PositionType)}>
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
                    <Label htmlFor="is-closed" className="text-cyan-400 font-semibold">
                      是否平仓
                    </Label>
                    <Switch
                      id="is-closed"
                      checked={isClosed}
                      onCheckedChange={setIsClosed}
                      className="data-[state=checked]:bg-cyan-500 h-6 w-11 scale-110"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="close-reason" className="text-cyan-400">平仓原因</Label>
                    <Select value={closeReason} onValueChange={(value) => setCloseReason(value as 'profit' | 'loss' | 'other')}>
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
                      <Label htmlFor="remark" className="text-cyan-400">备注</Label>
                      <Textarea
                        id="remark"
                        placeholder="请输入备注信息"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="profit-loss" className="text-cyan-400">盈亏金额</Label>
                    <Input
                      id="profit-loss"
                      type="number"
                      placeholder="正数为盈利，负数为亏损"
                      value={profitLoss}
                      onChange={(e) => setProfitLoss(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4 pt-4 border-t border-cyan-500/20">
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" onClick={handleAddTrade}>添加记录</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 编辑交易记录对话框 */}
            <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
              <DialogContent className="border-cyan-500/30 bg-gray-900 text-white max-w-md max-h-[90vh] flex flex-col">
                <DialogHeader>
                  <DialogTitle className="text-cyan-400">编辑交易记录</DialogTitle>
                  <DialogDescription className="text-cyan-500/60">修改交易信息</DialogDescription>
                </DialogHeader>
                <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
                  <div className="space-y-2">
                    <Label htmlFor="edit-symbol" className="text-cyan-400">交易品种</Label>
                    <Input
                      id="edit-symbol"
                      placeholder="例如：BTC/USDT"
                      value={symbol}
                      onChange={(e) => setSymbol(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-trade-date" className="text-cyan-400">开仓日期</Label>
                    <Input
                      id="edit-trade-date"
                      type="datetime-local"
                      value={openDateTime}
                      onChange={(e) => setOpenDateTime(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-strategy" className="text-cyan-400">入场策略</Label>
                    <Input
                      id="edit-strategy"
                      placeholder="请输入入场策略"
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-position" className="text-cyan-400">仓位 (%)</Label>
                    <Select value={String(position)} onValueChange={(value) => setPosition(Number(value) as PositionType)}>
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
                  </div>

                  <div className="flex items-center justify-between space-x-2 py-2">
                    <Label htmlFor="edit-is-closed" className="text-cyan-400 font-semibold">
                      是否平仓
                    </Label>
                    <Switch
                      id="edit-is-closed"
                      checked={isClosed}
                      onCheckedChange={setIsClosed}
                      className="data-[state=checked]:bg-cyan-500 h-6 w-11 scale-110"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="edit-close-reason" className="text-cyan-400">平仓原因</Label>
                    <Select value={closeReason} onValueChange={(value) => setCloseReason(value as 'profit' | 'loss' | 'other')}>
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
                      <Label htmlFor="edit-remark" className="text-cyan-400">备注</Label>
                      <Textarea
                        id="edit-remark"
                        placeholder="请输入备注信息"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-profit-loss" className="text-cyan-400">盈亏金额</Label>
                    <Input
                      id="edit-profit-loss"
                      type="number"
                      placeholder="正数为盈利，负数为亏损"
                      value={profitLoss}
                      onChange={(e) => setProfitLoss(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                    />
                  </div>
                </div>
                <DialogFooter className="mt-4 pt-4 border-t border-cyan-500/20">
                  <Button 
                    variant="outline"
                    className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10"
                    onClick={() => setIsEditDialogOpen(false)}
                  >
                    取消
                  </Button>
                  <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" onClick={handleSaveEdit}>保存修改</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>

            {/* 交易记录列表 */}
            <TradeTable
              trades={trades}
              onEditTrade={handleEditTrade}
              onDeleteTrade={handleDeleteTrade}
            />
          </div>
        )}
      </div>
    </div>
  );
}
