'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Switch } from '@/components/ui/switch';
import { Trash2 } from 'lucide-react';
import { api } from '@/lib/api';

// 仓位选项：5% 到 50%，每个增加 5%
const POSITION_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);

type PositionType = 5 | 10 | 15 | 20 | 25 | 30 | 35 | 40 | 45 | 50;

interface Trade {
  id: string;
  symbol: string; // 交易品种
  strategy: string; // 入场策略
  position: PositionType; // 仓位
  openAmount: number; // 开仓金额
  openTime: string; // 开仓时间
  closeReason: 'profit' | 'loss' | 'other'; // 平仓原因
  remark?: string; // 备注
  profitLoss: number; // 盈亏金额
  date: string; // 交易日期
  isClosed: boolean; // 是否已平仓
}

interface FundRecord {
  id: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  date: string;
}

export default function TradingApp() {
  // 初始资产余额
  const [balance, setBalance] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fundRecords, setFundRecords] = useState<FundRecord[]>([]);
  const [equityHistory, setEquityHistory] = useState<Array<{ date: string; value: number }>>([]);

  // 添加交易对话框状态
  const [isTradeDialogOpen, setIsTradeDialogOpen] = useState(false);
  const [isDepositDialogOpen, setIsDepositDialogOpen] = useState(false);
  const [isWithdrawDialogOpen, setIsWithdrawDialogOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState<string>('');
  const [fundDate, setFundDate] = useState<string>(new Date().toISOString().split('T')[0]);

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

  // 从数据库加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载余额
        const balanceRes = await api.balance.get();
        setBalance(balanceRes.balance);

        // 加载交易记录
        const tradesRes = await api.trades.getAll();
        setTrades(tradesRes.trades);

        // 加载出入金记录
        const fundRecordsRes = await api.fundRecords.getAll();
        setFundRecords(fundRecordsRes.records);

        // 加载资产历史
        const equityHistoryRes = await api.equityHistory.getAll();
        setEquityHistory(equityHistoryRes.history);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, []);


  // 计算开仓金额
  useEffect(() => {
    const amount = (balance * position) / 100;
    setOpenAmount(amount);
  }, [balance, position]);

  // 添加资金记录
  const handleAddFund = async (type: 'deposit' | 'withdraw') => {
    const amount = Number(fundAmount);
    if (!amount || amount <= 0) return;
    if (!fundDate) return;

    // 出金时检查余额是否足够
    if (type === 'withdraw' && amount > balance) {
      alert('余额不足，无法出金');
      return;
    }

    try {
      // 创建出入金记录（后端会自动更新余额）
      const recordRes = await api.fundRecords.create({
        type,
        amount,
        date: fundDate,
      });

      // 从响应中获取更新后的余额
      const updatedBalance = recordRes.balance || (type === 'deposit' ? balance + amount : balance - amount);

      // 更新余额状态
      setBalance(updatedBalance);

      // 更新出入金记录列表
      setFundRecords([recordRes.record, ...fundRecords]);

      // 更新资产历史
      const historyRes = await api.equityHistory.create({
        date: fundDate,
        value: updatedBalance,
      });
      setEquityHistory([...equityHistory, historyRes.record]);

      setFundAmount('');
      setFundDate(new Date().toISOString().split('T')[0]);
      if (type === 'deposit') {
        setIsDepositDialogOpen(false);
      } else {
        setIsWithdrawDialogOpen(false);
      }
    } catch (error: any) {
      console.error('Failed to add fund record:', error);
      alert('添加出入金记录失败：' + (error?.message || '未知错误'));
    }
  };

  // 删除出入金记录
  const handleDeleteFundRecord = async (id: string) => {
    try {
      const record = fundRecords.find(r => r.id === id);
      if (!record) return;

      // 检查删除后余额是否为负数
      const newBalance = record.type === 'deposit' ? balance - record.amount : balance + record.amount;
      if (record.type === 'deposit' && newBalance < 0) {
        alert('删除此入金记录会导致余额为负数，无法删除');
        return;
      }

      // 删除记录（后端会自动更新余额并返回新的余额）
      const deleteRes = await api.fundRecords.delete(id);

      // 使用后端返回的余额值
      const updatedBalance = deleteRes.balance ?? newBalance;
      setBalance(updatedBalance);

      // 删除记录
      setFundRecords(fundRecords.filter(r => r.id !== id));

      // 更新资产历史
      const historyRes = await api.equityHistory.create({
        date: new Date().toISOString(),
        value: updatedBalance,
      });
      setEquityHistory([...equityHistory, historyRes.record]);
    } catch (error: any) {
      console.error('Failed to delete fund record:', error);
      alert('删除出入金记录失败：' + (error?.message || '未知错误'));
    }
  };

  // 添加交易记录
  const handleAddTrade = async () => {
    // 验证必填字段：未平仓时，盈亏金额和关闭原因可以不填
    if (!symbol || !strategy || !openDateTime) {
      alert('请填写所有必填字段（交易品种、入场策略、开仓日期）');
      return;
    }

    // 如果已平仓，盈亏金额必填
    if (isClosed && !profitLoss) {
      alert('已平仓时，盈亏金额为必填项');
      return;
    }

    // 计算盈亏金额（如果填写了）
    let pl = 0;
    if (profitLoss) {
      pl = Number(profitLoss);
      if (isNaN(pl)) {
        alert('盈亏金额必须是有效数字');
        return;
      }

      // 检查亏损是否会导致余额为负数
      if (pl < 0 && balance + pl < 0) {
        alert('余额不足，无法添加此亏损交易');
        return;
      }
    }

    try {
      // 将 openDateTime 拆分为 date 和 openTime
      const dateTime = new Date(openDateTime);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

      // 创建交易记录（后端会自动更新余额）
      const tradeRes = await api.trades.create({
        symbol,
        strategy,
        position,
        openAmount,
        openTime: time,
        closeReason: isClosed ? closeReason : 'pending',
        remark: isClosed && closeReason === 'other' ? remark : undefined,
        profitLoss: isClosed ? pl : 0,
        date: date,
        isClosed,
      });

      // 从响应中获取更新后的余额
      const updatedBalance = tradeRes.balance || (balance + pl);
      setBalance(updatedBalance);

      // 添加交易记录
      setTrades([tradeRes.trade, ...trades]);

      // 更新资产历史（使用交易记录的日期）
      const historyRes = await api.equityHistory.create({
        date: date,
        value: updatedBalance,
      });
      setEquityHistory([...equityHistory, historyRes.record]);

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
    } catch (error: any) {
      console.error('Failed to add trade:', error);
      alert('添加交易记录失败：' + (error?.message || '未知错误'));
    }
  };

  // 计算累计入金和出金
  const totalDeposit = fundRecords.filter(r => r.type === 'deposit').reduce((sum, r) => sum + r.amount, 0);
  const totalWithdraw = fundRecords.filter(r => r.type === 'withdraw').reduce((sum, r) => sum + r.amount, 0);

  // 数据下载功能
  const handleDownloadData = () => {
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
  };

  // 删除交易记录
  const handleDeleteTrade = async (tradeId: string) => {
    if (!confirm('确定要删除这条交易记录吗？')) return;

    try {
      const tradeToDelete = trades.find(t => t.id === tradeId);
      if (!tradeToDelete) return;

      // 检查删除盈利交易后余额是否为负数
      const newBalance = balance - tradeToDelete.profitLoss;
      if (tradeToDelete.profitLoss > 0 && newBalance < 0) {
        alert('删除此盈利交易会导致余额为负数，无法删除');
        return;
      }

      // 删除交易记录（后端会自动更新余额并返回新的余额）
      const deleteRes = await api.trades.delete(tradeId);

      // 使用后端返回的余额值
      const updatedBalance = deleteRes.balance ?? newBalance;
      setBalance(updatedBalance);

      // 删除记录
      setTrades(trades.filter(t => t.id !== tradeId));

      // 更新资产历史（使用交易记录的日期）
      const historyRes = await api.equityHistory.create({
        date: tradeToDelete.date,
        value: updatedBalance,
      });
      setEquityHistory([...equityHistory, historyRes.record]);
    } catch (error: any) {
      console.error('Failed to delete trade:', error);
      alert('删除交易记录失败：' + (error?.message || '未知错误'));
    }
  };

  // 编辑交易记录
  const handleEditTrade = (trade: Trade) => {
    setEditingTrade(trade);
    setSymbol(trade.symbol);
    setStrategy(trade.strategy);
    setPosition(trade.position);
    setOpenDateTime(combineDateTime(trade.date, trade.openTime));
    setCloseReason(trade.closeReason);
    setRemark(trade.remark || '');
    setProfitLoss(String(trade.profitLoss));
    setIsClosed(trade.isClosed);
    setIsEditDialogOpen(true);
  };

  // 将 date 和 openTime 合并为 datetime-local 格式
  const combineDateTime = (date: string, time: string) => {
    return `${date}T${time}`;
  };

  // 保存编辑
  const handleSaveEdit = async () => {
    if (!editingTrade || !symbol || !openDateTime) return;

    // 如果已平仓，盈亏金额必填
    if (isClosed && !profitLoss) {
      alert('已平仓时，盈亏金额为必填项');
      return;
    }

    try {
      const oldProfitLoss = editingTrade.profitLoss;

      // 计算新盈亏（如果填写了）
      let newProfitLoss = oldProfitLoss;
      let newBalance = balance;

      if (profitLoss && isClosed) {
        newProfitLoss = Number(profitLoss);

        // 检查编辑后余额是否为负数
        newBalance = balance - oldProfitLoss + newProfitLoss;
        if (newBalance < 0) {
          alert('修改后的盈亏会导致余额为负数，无法保存');
          return;
        }
      }

      // 将 openDateTime 拆分为 date 和 openTime
      const dateTime = new Date(openDateTime);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

      // 更新交易记录（后端会自动更新余额）
      const updatedTradeRes = await api.trades.update(
        editingTrade.id,
        {
          symbol,
          strategy,
          position,
          openTime: time,
          closeReason: isClosed ? closeReason : 'pending',
          remark: isClosed && closeReason === 'other' ? remark : undefined,
          profitLoss: isClosed && profitLoss ? newProfitLoss : 0,
          date: date,
          isClosed,
        }
      );

      // 从响应中获取更新后的余额
      const updatedBalance = updatedTradeRes.balance ?? newBalance;
      setBalance(updatedBalance);

      // 更新交易列表
      setTrades(trades.map(t => t.id === editingTrade.id ? updatedTradeRes.trade : t));

      // 更新资产历史（使用交易记录的日期）
      const historyRes = await api.equityHistory.create({
        date: date,
        value: updatedBalance,
      });
      setEquityHistory([...equityHistory, historyRes.record]);

      // 关闭对话框
      setIsEditDialogOpen(false);
      setEditingTrade(null);
    } catch (error: any) {
      console.error('Failed to save trade:', error);
      alert('保存交易记录失败：' + (error?.message || '未知错误'));
    }
  };

  // 计算净权益（扣除出金后的资产）
  const netEquity = equityHistory.map((item, index) => {
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

  // 根据日期范围过滤交易
  const getFilteredTrades = () => {
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
  };

  const filteredTrades = getFilteredTrades();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-slate-950 to-gray-900 p-4 md:p-8 relative overflow-hidden">
      {/* 背景网格效果 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(6,182,212,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(6,182,212,0.03)_1px,transparent_1px)] bg-[size:50px_50px] [mask-image:radial-gradient(ellipse_at_center,black_40%,transparent_100%)] pointer-events-none" />
      
      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        {/* 标题和下载按钮 */}
        <div className="flex items-center justify-between">
          <div className="flex-1 rounded-xl border border-cyan-500/30 bg-gray-900/80 p-6 text-center shadow-[0_0_30px_rgba(6,182,212,0.2)] backdrop-blur-sm">
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_15px_rgba(6,182,212,0.8)]">交易记录系统</h1>
            <p className="mt-2 text-cyan-500/70 drop-shadow-[0_0_5px_rgba(6,182,212,0.5)]">管理您的交易记录和资产</p>
          </div>
          <div className="ml-4">
            <Button 
              onClick={handleDownloadData}
              className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-[0_0_20px_rgba(6,182,212,0.4)]"
            >
              下载数据
            </Button>
          </div>
        </div>

        {/* 资产余额卡片 */}
        <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">资产余额</CardTitle>
            <CardDescription className="text-cyan-500/60">当前账户总余额</CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <div className="mb-4 flex items-center justify-between">
              <div className="text-4xl font-bold text-cyan-400 drop-shadow-[0_0_10px_rgba(6,182,212,0.5)]">${balance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="flex gap-2">
                <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-blue-600 hover:bg-blue-700">入金</Button>
                  </DialogTrigger>
                  <DialogContent className="border-cyan-500/30 bg-gray-900 text-white">
                    <DialogHeader>
                      <DialogTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">入金</DialogTitle>
                      <DialogDescription className="text-cyan-500/60">请输入入金金额和日期</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="deposit-amount" className="text-cyan-400">金额</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          placeholder="请输入金额"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deposit-date" className="text-cyan-400">日期</Label>
                        <Input
                          id="deposit-date"
                          type="date"
                          value={fundDate}
                          onChange={(e) => setFundDate(e.target.value)}
                          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700" onClick={() => handleAddFund('deposit')}>确认入金</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700">出金</Button>
                  </DialogTrigger>
                  <DialogContent className="border-red-500/30 bg-gray-900 text-white">
                    <DialogHeader>
                      <DialogTitle className="bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent">出金</DialogTitle>
                      <DialogDescription className="text-red-500/60">请输入出金金额和日期</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdraw-amount" className="text-red-400">金额</Label>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          placeholder="请输入金额"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          className="border-red-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-red-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="withdraw-date" className="text-red-400">日期</Label>
                        <Input
                          id="withdraw-date"
                          type="date"
                          value={fundDate}
                          onChange={(e) => setFundDate(e.target.value)}
                          className="border-red-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-red-500"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button className="bg-gradient-to-r from-red-500 to-orange-600 hover:from-red-600 hover:to-orange-700" onClick={() => handleAddFund('withdraw')}>确认出金</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* 累计入金和出金 */}
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-center">
                  <div className="text-xs text-green-400/70">累计入金</div>
                  <div className="text-sm font-semibold text-green-400">${totalDeposit.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-center">
                  <div className="text-xs text-red-400/70">累计出金</div>
                  <div className="text-sm font-semibold text-red-400">${totalWithdraw.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
              </div>
              
              {/* 最近3条出入金记录 */}
              {fundRecords.length > 0 && (
                <div className="rounded border border-cyan-500/30 bg-cyan-500/5 p-2">
                  <div className="text-xs text-cyan-400/70 mb-2">最近记录（最新3条，滚动查看更多）</div>
                  <div className="space-y-1 max-h-24 overflow-y-auto">
                    {fundRecords.slice(0, 3).map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs ${record.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                            {record.type === 'deposit' ? '入金' : '出金'}
                          </span>
                          <span className="text-xs text-white">
                            ${record.amount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          <span className="text-xs text-gray-400">
                            {record.date}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => handleDeleteFundRecord(record.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* 资产走势图 */}
        <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="bg-gradient-to-r from-cyan-400 via-blue-500 to-purple-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">资产走势图</CardTitle>
            <CardDescription className="text-cyan-500/60">减去出金后的资产变化趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {netEquity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netEquity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.2)" />
                    <XAxis dataKey="date" stroke="#22d3ee" tick={{ fill: '#22d3ee', fontSize: 12 }} />
                    <YAxis stroke="#22d3ee" tick={{ fill: '#22d3ee', fontSize: 12 }} />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'rgba(17, 24, 39, 0.95)', 
                        borderColor: '#06b6d4', 
                        borderWidth: 2,
                        boxShadow: '0 0 20px rgba(6,182,212,0.3)'
                      }}
                      itemStyle={{ color: '#22d3ee', fontWeight: 'bold' }}
                      labelStyle={{ color: '#06b6d4' }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="value" 
                      stroke="#22d3ee" 
                      strokeWidth={3} 
                      dot={{ fill: '#22d3ee', r: 4, strokeWidth: 2 }} 
                      activeDot={{ r: 8, fill: '#06b6d4', stroke: '#22d3ee', strokeWidth: 3 }} 
                    />
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

        {/* 我的交易数据 */}
        <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">我的交易数据</CardTitle>
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
                    ${filteredTrades.filter(t => t.profitLoss > 0).reduce((sum, t) => sum + t.profitLoss, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                    ${filteredTrades.filter(t => t.profitLoss < 0).reduce((sum, t) => sum + t.profitLoss, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                <div className={`text-2xl font-bold ${filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) >= 0 ? '+' : ''}
                  ${filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-sm text-cyan-500/60">总盈亏</div>
              </div>
              <div className="rounded-lg border border-cyan-500/30 bg-gray-800/50 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-cyan-400">{filteredTrades.length}</div>
                <div className="text-sm text-cyan-500/60">交易次数</div>
              </div>
              <div className="rounded-lg border border-cyan-500/30 bg-gray-800/50 p-4 text-center backdrop-blur-sm">
                <div className="text-2xl font-bold text-cyan-400">
                  {filteredTrades.length > 0 ? Math.round((filteredTrades.filter(t => t.profitLoss > 0).length / filteredTrades.length) * 100) : 0}%
                </div>
                <div className="text-sm text-cyan-500/60">胜率</div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 添加交易记录 */}
        <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 shadow-[0_0_20px_rgba(6,182,212,0.4)]" size="lg">
              添加交易记录
            </Button>
          </DialogTrigger>
          <DialogContent className="border-cyan-500/30 bg-gray-900 text-white max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">添加交易记录</DialogTitle>
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
                  ${openAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
              <DialogTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">编辑交易记录</DialogTitle>
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
                  ${openAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
        <Card className="border-cyan-500/30 bg-gray-900/80 shadow-[0_0_30px_rgba(6,182,212,0.15)] backdrop-blur-sm">
          <CardHeader className="border-b border-cyan-500/20">
            <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]">交易记录</CardTitle>
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
                        <TableCell className="font-semibold text-cyan-400">${trade.openAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
                        <TableCell className="text-gray-400">{trade.date} {trade.openTime}</TableCell>
                        <TableCell className="text-white">{getCloseReasonComponent(trade.closeReason, trade.remark)}</TableCell>
                        <TableCell className={`font-semibold ${trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
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
                              onClick={() => handleEditTrade(trade)}
                            >
                              编辑
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="h-8 border-red-500/30 text-red-400 hover:bg-red-500/10"
                              onClick={() => handleDeleteTrade(trade.id)}
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
      </div>
    </div>
  );
}
