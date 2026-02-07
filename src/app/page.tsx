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

  // 从 localStorage 加载数据
  useEffect(() => {
    const savedBalance = localStorage.getItem('trading-balance');
    const savedTrades = localStorage.getItem('trading-trades');
    const savedFundRecords = localStorage.getItem('trading-fund-records');
    const savedEquityHistory = localStorage.getItem('trading-equity-history');

    if (savedBalance) setBalance(Number(savedBalance));
    if (savedTrades) setTrades(JSON.parse(savedTrades));
    if (savedFundRecords) setFundRecords(JSON.parse(savedFundRecords));
    if (savedEquityHistory) setEquityHistory(JSON.parse(savedEquityHistory));
  }, []);

  // 保存数据到 localStorage
  useEffect(() => {
    localStorage.setItem('trading-balance', String(balance));
  }, [balance]);

  useEffect(() => {
    localStorage.setItem('trading-trades', JSON.stringify(trades));
  }, [trades]);

  useEffect(() => {
    localStorage.setItem('trading-fund-records', JSON.stringify(fundRecords));
  }, [fundRecords]);

  useEffect(() => {
    localStorage.setItem('trading-equity-history', JSON.stringify(equityHistory));
  }, [equityHistory]);

  // 计算开仓金额
  useEffect(() => {
    const amount = (balance * position) / 100;
    setOpenAmount(amount);
  }, [balance, position]);

  // 添加资金记录
  const handleAddFund = (type: 'deposit' | 'withdraw') => {
    const amount = Number(fundAmount);
    if (!amount || amount <= 0) return;

    const record: FundRecord = {
      id: Date.now().toString(),
      type,
      amount,
      date: new Date().toISOString().split('T')[0],
    };

    if (type === 'deposit') {
      setBalance(balance + amount);
    } else {
      setBalance(balance - amount);
    }

    setFundRecords([record, ...fundRecords]);

    // 更新资产历史
    const newHistory = [...equityHistory, { date: new Date().toISOString(), value: balance }];
    setEquityHistory(newHistory);

    setFundAmount('');
    if (type === 'deposit') {
      setIsDepositDialogOpen(false);
    } else {
      setIsWithdrawDialogOpen(false);
    }
  };

  // 删除出入金记录
  const handleDeleteFundRecord = (id: string) => {
    const record = fundRecords.find(r => r.id === id);
    if (!record) return;

    // 如果是入金，减去金额；如果是出金，加上金额
    if (record.type === 'deposit') {
      setBalance(balance - record.amount);
    } else {
      setBalance(balance + record.amount);
    }

    // 删除记录
    setFundRecords(fundRecords.filter(r => r.id !== id));

    // 更新资产历史
    const newHistory = [...equityHistory, { date: new Date().toISOString(), value: balance }];
    setEquityHistory(newHistory);
  };

  // 添加交易记录
  const handleAddTrade = () => {
    if (!symbol || !profitLoss || !openDateTime) return;

    const pl = Number(profitLoss);

    // 将 openDateTime 拆分为 date 和 openTime
    const dateTime = new Date(openDateTime);
    const date = dateTime.toISOString().split('T')[0];
    const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

    const trade: Trade = {
      id: Date.now().toString(),
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
    };

    // 更新余额
    setBalance(balance + pl);

    // 添加交易记录
    setTrades([trade, ...trades]);

    // 更新资产历史
    const newHistory = [...equityHistory, { date: new Date().toISOString(), value: balance + pl }];
    setEquityHistory(newHistory);

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
  const handleDeleteTrade = (tradeId: string) => {
    if (!confirm('确定要删除这条交易记录吗？')) return;
    
    const tradeToDelete = trades.find(t => t.id === tradeId);
    if (tradeToDelete) {
      // 更新余额
      setBalance(balance - tradeToDelete.profitLoss);
      
      // 删除记录
      const newTrades = trades.filter(t => t.id !== tradeId);
      setTrades(newTrades);
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
  const handleSaveEdit = () => {
    if (!editingTrade || !symbol || !profitLoss || !openDateTime) return;

    const oldProfitLoss = editingTrade.profitLoss;
    const newProfitLoss = Number(profitLoss);

    // 将 openDateTime 拆分为 date 和 openTime
    const dateTime = new Date(openDateTime);
    const date = dateTime.toISOString().split('T')[0];
    const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

    const updatedTrade: Trade = {
      ...editingTrade,
      symbol,
      strategy,
      position,
      openTime: time,
      closeReason,
      remark: closeReason === 'other' ? remark : undefined,
      profitLoss: newProfitLoss,
      date: date,
      isClosed,
    };

    // 更新余额（新盈亏 - 旧盈亏）
    setBalance(balance - oldProfitLoss + newProfitLoss);

    // 更新交易列表
    const newTrades = trades.map(t => t.id === editingTrade.id ? updatedTrade : t);
    setTrades(newTrades);

    // 关闭对话框
    setIsEditDialogOpen(false);
    setEditingTrade(null);
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
            <h1 className="text-3xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">交易记录系统</h1>
            <p className="mt-2 text-cyan-500/70">管理您的交易记录和资产</p>
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
            <CardTitle className="text-cyan-400">资产余额</CardTitle>
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
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>入金</DialogTitle>
                      <DialogDescription>请输入入金金额</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="deposit-amount">金额</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          placeholder="请输入金额"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button className="bg-blue-600 hover:bg-blue-700" onClick={() => handleAddFund('deposit')}>确认入金</Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="bg-red-600 hover:bg-red-700">出金</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>出金</DialogTitle>
                      <DialogDescription>请输入出金金额</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdraw-amount">金额</Label>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          placeholder="请输入金额"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button variant="destructive" className="bg-red-600 hover:bg-red-700" onClick={() => handleAddFund('withdraw')}>确认出金</Button>
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
                  <div className="text-xs text-cyan-400/70 mb-2">最近记录（最新3条）</div>
                  <div className="space-y-1">
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
            <CardTitle className="text-cyan-400">资产走势图</CardTitle>
            <CardDescription className="text-cyan-500/60">减去出金后的资产变化趋势</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[300px] w-full">
              {netEquity.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={netEquity}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(6,182,212,0.1)" />
                    <XAxis dataKey="date" stroke="#06b6d4" />
                    <YAxis stroke="#06b6d4" />
                    <Tooltip 
                      contentStyle={{ backgroundColor: 'rgba(17, 24, 39, 0.9)', borderColor: '#06b6d4', borderWidth: 1 }}
                      itemStyle={{ color: '#06b6d4' }}
                    />
                    <Line type="monotone" dataKey="value" stroke="#06b6d4" strokeWidth={2} dot={{ fill: '#06b6d4' }} activeDot={{ r: 6, fill: '#22d3ee', stroke: '#06b6d4', strokeWidth: 2 }} />
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
