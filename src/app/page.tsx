'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Activity, DollarSign, Smartphone, Calendar, Filter, X, Download, Wallet, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { cn } from '@/lib/utils';
import TradeForm from '@/components/TradeForm';
import BalanceChart from '@/components/BalanceChart';

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: string;
  exitPrice: string | null;
  quantity: number;
  strategySummary: string;
  profitLoss: string | null;
  exitReason: string | null;
  entryTime: string;
  exitTime: string | null;
  notes: string | null;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface TradeStats {
  totalTrades: number;
  totalProfitLoss: string;
  closedTrades: number;
  openTrades: number;
  winningTrades: number;
  losingTrades: number;
}

export default function Home() {
  const [trades, setTrades] = useState<Trade[]>([]);
  const [filteredTrades, setFilteredTrades] = useState<Trade[]>([]);
  const [stats, setStats] = useState<TradeStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  
  // 日期范围选择
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: undefined,
    to: undefined,
  });
  const [showCalendar, setShowCalendar] = useState(false);
  const [balance, setBalance] = useState<string>('0');
  const [withdrawalAmount, setWithdrawalAmount] = useState<string>('0');
  const [currentBalance, setCurrentBalance] = useState<string>('0');
  const [isBalanceDialogOpen, setIsBalanceDialogOpen] = useState(false);
  const [balanceInput, setBalanceInput] = useState<string>('');
  const [withdrawalInput, setWithdrawalInput] = useState<string>('');
  const [chartRefreshTrigger, setChartRefreshTrigger] = useState(0);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const fetchTrades = async () => {
    try {
      const response = await fetch('/api/trades');
      const data = await response.json();
      setTrades(data);
      setFilteredTrades(data);
    } catch (error) {
      console.error('Error fetching trades:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/trades/stats');
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/balance');
      const data = await response.json();
      setBalance(data.amount || '0');
      setWithdrawalAmount(data.withdrawalAmount || '0');
    } catch (error) {
      console.error('Error fetching balance:', error);
    }
  };

  const fetchCurrentBalance = async () => {
    try {
      const response = await fetch('/api/balance/history');
      const data = await response.json();
      setCurrentBalance(data.currentBalance?.toString() || balance);
    } catch (error) {
      console.error('Error fetching current balance:', error);
      setCurrentBalance(balance);
    }
  };

  const handleBalanceSave = async () => {
    try {
      const response = await fetch('/api/balance', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          amount: balanceInput,
          withdrawalAmount: withdrawalInput,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to save balance');
      }

      await fetchBalance();
      await fetchCurrentBalance();
      setIsBalanceDialogOpen(false);
      setBalanceInput('');
      setWithdrawalInput('');
      setChartRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error saving balance:', error);
      alert('保存失败，请重试');
    }
  };

  useEffect(() => {
    fetchTrades();
    fetchStats();
    fetchBalance().finally(() => setLoading(false));
    fetchCurrentBalance();
  }, []);

  // 根据日期范围过滤交易
  useEffect(() => {
    if (!dateRange.from && !dateRange.to) {
      setFilteredTrades(trades);
      return;
    }

    const filtered = trades.filter((trade) => {
      const tradeDate = new Date(trade.entryTime);
      const from = dateRange.from;
      const to = dateRange.to;

      if (from && to) {
        return tradeDate >= from && tradeDate <= to;
      }
      if (from) {
        return tradeDate >= from;
      }
      if (to) {
        return tradeDate <= to;
      }
      return true;
    });

    setFilteredTrades(filtered);
  }, [dateRange, trades]);

  const handleTradeSaved = () => {
    fetchTrades();
    fetchStats();
    fetchCurrentBalance();
    setChartRefreshTrigger(prev => prev + 1);
    setIsDialogOpen(false);
    setEditingTrade(null);
  };

  const handleEdit = (trade: Trade) => {
    setEditingTrade(trade);
    setIsDialogOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('确定要删除这条交易记录吗？')) return;

    try {
      await fetch(`/api/trades/${id}`, {
        method: 'DELETE',
      });
      fetchTrades();
      fetchStats();
      fetchCurrentBalance();
      setChartRefreshTrigger(prev => prev + 1);
    } catch (error) {
      console.error('Error deleting trade:', error);
    }
  };

  const clearDateFilter = () => {
    setDateRange({ from: undefined, to: undefined });
  };

  const handleExport = async () => {
    try {
      const response = await fetch('/api/trades/export');
      if (!response.ok) throw new Error('导出失败');
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `交易记录_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('导出失败:', error);
    }
  };

  const formatDate = (date: Date | string) => {
    const d = date instanceof Date ? date : new Date(date);
    const now = new Date();
    const diff = now.getTime() - d.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    
    if (days === 0) {
      return d.toLocaleDateString('zh-CN', {
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    }
    return d.toLocaleDateString('zh-CN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  const formatCurrency = (value: string | null) => {
    if (value === null) return '-';
    const num = parseFloat(value);
    return `$${num.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <Smartphone className="w-12 h-12 mx-auto mb-4 text-muted-foreground animate-pulse" />
          <div className="text-muted-foreground">加载中...</div>
        </div>
      </div>
    );
  }

  const AddTradeButton = () => (
    <Button onClick={() => { setEditingTrade(null); setIsDialogOpen(true); }} className="gap-2" size={isMobile ? 'default' : 'default'}>
      <Plus className="w-4 h-4" />
      {isMobile ? '添加' : '添加交易'}
    </Button>
  );

  const FormContent = () => (
    <>
      <DialogHeader>
        <DialogTitle>{editingTrade ? '编辑交易' : '添加新交易'}</DialogTitle>
      </DialogHeader>
      <TradeForm
        trade={editingTrade}
        currentBalance={currentBalance}
        onSave={handleTradeSaved}
        onCancel={() => {
          setIsDialogOpen(false);
          setEditingTrade(null);
        }}
      />
    </>
  );

  // 计算筛选后的交易统计
  const filteredStats = {
    total: filteredTrades.length,
    profit: filteredTrades.reduce((sum, t) => sum + (parseFloat(t.profitLoss || '0')), 0),
    winning: filteredTrades.filter(t => t.profitLoss && parseFloat(t.profitLoss) > 0).length,
    losing: filteredTrades.filter(t => t.profitLoss && parseFloat(t.profitLoss) < 0).length,
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="container mx-auto px-4 py-4 md:py-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl md:text-3xl font-bold tracking-tight">交易记录</h1>
            <p className="text-sm text-muted-foreground mt-1">记录和分析您的每一次交易</p>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            title="导出数据"
          >
            <Download className="w-4 h-4" />
          </Button>

          {isMobile ? (
            <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <SheetTrigger asChild>
                <div className="fixed bottom-24 right-4 z-50">
                  <Button size="lg" className="h-14 w-14 rounded-full shadow-lg">
                    <Plus className="w-6 h-6" />
                  </Button>
                </div>
              </SheetTrigger>
              <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
                <SheetHeader>
                  <SheetTitle>{editingTrade ? '编辑交易' : '添加新交易'}</SheetTitle>
                </SheetHeader>
                <TradeForm
                  trade={editingTrade}
                  currentBalance={currentBalance}
                  onSave={handleTradeSaved}
                  onCancel={() => {
                    setIsDialogOpen(false);
                    setEditingTrade(null);
                  }}
                />
              </SheetContent>
            </Sheet>
          ) : (
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <AddTradeButton />
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <FormContent />
              </DialogContent>
            </Dialog>
          )}
        </div>

        {/* Date Filter */}
        <Card className="mb-6">
          <CardHeader className="pb-3">
            <CardTitle className="text-lg flex items-center gap-2">
              <Calendar className="w-4 h-4" />
              日期筛选
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3">
              <Popover open={showCalendar} onOpenChange={setShowCalendar}>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground",
                      "flex-1"
                    )}
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {dateRange.from ? (
                      dateRange.to ? (
                        <>
                          {dateRange.from.toLocaleDateString('zh-CN')} -{' '}
                          {dateRange.to.toLocaleDateString('zh-CN')}
                        </>
                      ) : (
                        dateRange.from.toLocaleDateString('zh-CN')
                      )
                    ) : (
                      <span>选择日期范围</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    mode="range"
                    selected={{ from: dateRange.from, to: dateRange.to }}
                    onSelect={(range) => {
                      if (range) {
                        setDateRange({ from: range.from, to: range.to });
                        setShowCalendar(false);
                      }
                    }}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
              
              {(dateRange.from || dateRange.to) && (
                <Button variant="ghost" size="sm" onClick={clearDateFilter}>
                  <X className="w-4 h-4 mr-2" />
                  清除筛选
                </Button>
              )}
            </div>
            
            {dateRange.from && (
              <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground">
                <span>筛选期间：<strong className="text-foreground">{filteredStats.total}</strong> 笔交易</span>
                {filteredStats.total > 0 && (
                  <>
                    <span>盈亏：<strong className={filteredStats.profit >= 0 ? 'text-green-600' : 'text-red-600'}>{formatCurrency(filteredStats.profit.toString())}</strong></span>
                    <span>盈利：<strong className="text-green-600">{filteredStats.winning}</strong></span>
                    <span>亏损：<strong className="text-red-600">{filteredStats.losing}</strong></span>
                  </>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Stats Cards */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium">总交易数</CardTitle>
                <Activity className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-bold">{stats.totalTrades}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.openTrades} 持仓中 · {stats.closedTrades} 已平仓
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium">总盈亏</CardTitle>
                <DollarSign className="w-3 h-3 md:w-4 md:h-4 text-muted-foreground" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className={`text-xl md:text-2xl font-bold ${parseFloat(stats.totalProfitLoss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(stats.totalProfitLoss)}
                </div>
                <p className="text-xs text-muted-foreground">
                  {stats.winningTrades} 盈利 · {stats.losingTrades} 亏损
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium">盈利交易</CardTitle>
                <TrendingUp className="w-3 h-3 md:w-4 md:h-4 text-green-600" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-bold text-green-600">{stats.winningTrades}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.closedTrades > 0 ? ((stats.winningTrades / stats.closedTrades) * 100).toFixed(1) : 0}% 胜率
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6">
                <CardTitle className="text-xs md:text-sm font-medium">亏损交易</CardTitle>
                <TrendingDown className="w-3 h-3 md:w-4 md:h-4 text-red-600" />
              </CardHeader>
              <CardContent className="p-3 md:p-6 pt-0">
                <div className="text-xl md:text-2xl font-bold text-red-600">{stats.losingTrades}</div>
                <p className="text-xs text-muted-foreground">
                  {stats.closedTrades > 0 ? ((stats.losingTrades / stats.closedTrades) * 100).toFixed(1) : 0}% 败率
                </p>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Balance Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 px-4 pt-4">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                <Wallet className="w-3 h-3" />
                资产
              </CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={() => {
                  setBalanceInput(balance);
                  setIsBalanceDialogOpen(true);
                }}
              >
                <Edit2 className="w-3 h-3" />
              </Button>
            </CardHeader>
            <CardContent className="px-4 pb-4 pt-2 space-y-2">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">交易后余额</span>
                <div className="text-sm text-muted-foreground">
                  ${(parseFloat(currentBalance) + parseFloat(withdrawalAmount)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">提现金额</span>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-orange-600">
                    ${parseFloat(withdrawalAmount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5"
                    onClick={() => {
                      setBalanceInput(balance);
                      setWithdrawalInput(withdrawalAmount);
                      setIsBalanceDialogOpen(true);
                    }}
                  >
                    <Edit2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground">可用余额</span>
                <div className="text-xl font-bold text-green-600">
                  ${parseFloat(currentBalance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex justify-between items-baseline border-t pt-2">
                <span className="text-xs text-muted-foreground">本金</span>
                <div className="text-sm text-muted-foreground">
                  ${parseFloat(balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </CardContent>
          </Card>

          <BalanceChart refreshTrigger={chartRefreshTrigger} />
        </div>

        {/* Trades List */}
        <Card>
          <CardHeader className="p-3 md:p-6">
            <CardTitle className="text-lg flex items-center gap-2">
              <Activity className="w-4 h-4" />
              交易列表
              {filteredStats.total !== stats?.totalTrades && (
                <span className="text-sm font-normal text-muted-foreground">
                  （已筛选 {filteredStats.total} 笔）
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {filteredTrades.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Filter className="w-12 h-12 mb-4 opacity-50" />
                <p>没有符合条件的交易记录</p>
                <p className="text-sm">请调整日期筛选条件或添加新交易</p>
              </div>
            ) : isMobile ? (
              <div className="divide-y">
                {filteredTrades.slice(0, 15).map((trade) => (
                  <div key={trade.id} className="p-3 md:p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm">{trade.symbol}</span>
                        <Badge variant={trade.isClosed ? 'outline' : 'default'} className="text-xs">
                          {trade.isClosed ? '已平仓' : '持仓中'}
                        </Badge>
                      </div>
                      <span className={`text-sm font-semibold ${trade.profitLoss && parseFloat(trade.profitLoss) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatCurrency(trade.profitLoss)}
                      </span>
                    </div>
                    
                    {/* 策略总结 */}
                    {trade.strategySummary && (
                      <div className="mb-2 p-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-1">入场策略：</p>
                        <p className="text-sm">{trade.strategySummary}</p>
                      </div>
                    )}

                    {/* 交易信息 */}
                    <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2">
                      <div>
                        <span className="text-foreground">级别:</span> {(trade as any).tradeLevel || '-'}
                      </div>
                      <div>
                        <span className="text-foreground">仓位:</span> {(trade as any).positionSize || '-'}
                      </div>
                      <div>
                        <span className="text-foreground">开仓:</span> ${(
                          parseFloat(currentBalance) *
                          (parseFloat((trade as any).positionSize || '0%') / 100)
                        ).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2">
                      <div>
                        <span className="text-foreground">时间:</span> {formatDate(trade.entryTime)}
                      </div>
                      {trade.isClosed && trade.exitReason && (
                        <div>
                          <span className="text-foreground">平仓原因:</span> {trade.exitReason}
                        </div>
                      )}
                    </div>
                    {trade.isClosed && trade.exitReason === '其他原因' && trade.notes && (
                      <div className="p-2 bg-orange-50 rounded-lg mb-2">
                        <p className="text-xs text-muted-foreground mb-1">备注：</p>
                        <p className="text-sm">{trade.notes}</p>
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEdit(trade)}
                        className="flex-1 text-xs"
                      >
                        编辑
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDelete(trade.id)}
                        className="flex-1 text-xs text-red-600 hover:text-red-700"
                      >
                        删除
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <div className="max-h-[600px] overflow-y-auto">
                  <Table className="text-xs">
                    <TableHeader className="sticky top-0 bg-background z-10">
                      <TableRow>
                        <TableHead className="bg-background">品种</TableHead>
                        <TableHead className="bg-background">盈亏</TableHead>
                        <TableHead className="bg-background">入场策略</TableHead>
                        <TableHead className="bg-background">级别</TableHead>
                        <TableHead className="bg-background">仓位</TableHead>
                        <TableHead className="bg-background">开仓金额</TableHead>
                        <TableHead className="bg-background">开仓时间</TableHead>
                        <TableHead className="bg-background">状态</TableHead>
                        <TableHead className="bg-background">平仓原因</TableHead>
                        <TableHead className="bg-background">备注</TableHead>
                        <TableHead className="bg-background">操作</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTrades.slice(0, 15).map((trade) => {
                      const positionSize = (trade as any).positionSize || '0%';
                      const positionValue = parseFloat(positionSize) || 0;
                      const openAmount = (parseFloat(currentBalance) * (positionValue / 100)).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      });

                      return (
                        <TableRow key={trade.id}>
                          <TableCell className="font-medium">{trade.symbol}</TableCell>
                          <TableCell className={trade.profitLoss && parseFloat(trade.profitLoss) >= 0 ? 'text-green-600' : 'text-red-600'}>
                            {formatCurrency(trade.profitLoss)}
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={trade.strategySummary}>
                              {trade.strategySummary}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {(trade as any).tradeLevel || '-'}
                          </TableCell>
                          <TableCell className="text-sm">
                            {positionSize}
                          </TableCell>
                          <TableCell className="text-sm">
                            ${openAmount}
                          </TableCell>
                          <TableCell>{formatDate(trade.entryTime)}</TableCell>
                          <TableCell>
                            <Badge variant={trade.isClosed ? 'outline' : 'default'}>
                              {trade.isClosed ? '已平仓' : '持仓中'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            <div className="truncate" title={trade.exitReason || '-'}>
                              {trade.exitReason || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs">
                            {trade.exitReason === '其他原因' && trade.notes ? (
                              <div className="truncate" title={trade.notes}>
                                {trade.notes}
                              </div>
                            ) : (
                              '-'
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(trade)}
                              >
                                编辑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(trade.id)}
                                className="text-red-600 hover:text-red-700"
                              >
                                删除
                              </Button>
                            </div>
                          </TableCell>
                      </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Balance Edit Dialog */}
        <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>编辑资产</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="balance">本金</Label>
                <Input
                  id="balance"
                  type="number"
                  step="any"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawal">提现金额</Label>
                <Input
                  id="withdrawal"
                  type="number"
                  step="any"
                  value={withdrawalInput}
                  onChange={(e) => setWithdrawalInput(e.target.value)}
                  placeholder="0.00"
                  min="0"
                />
                <p className="text-xs text-muted-foreground">
                  可用余额: ${(parseFloat(currentBalance) + parseFloat(withdrawalAmount) - parseFloat(withdrawalInput || '0')).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </p>
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  variant="outline"
                  onClick={() => {
                    setIsBalanceDialogOpen(false);
                    setBalanceInput('');
                    setWithdrawalInput('');
                  }}
                >
                  取消
                </Button>
                <Button onClick={handleBalanceSave}>
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
// trigger
