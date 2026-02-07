'use client';

import { useEffect, useState } from 'react';
import { Plus, TrendingUp, TrendingDown, Activity, DollarSign, Smartphone, Calendar, Filter, X, Download, Wallet, Edit2, Cpu, Database, Shield, Zap } from 'lucide-react';
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
import CyberHeader from '@/components/CyberHeader';
import MechCard from '@/components/MechCard';

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
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setTrades(data);
      setFilteredTrades(data);
    } catch (error) {
      console.error('Error fetching trades:', error);
      setTrades([]);
      setFilteredTrades([]);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await fetch('/api/trades/stats');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setStats(data);
    } catch (error) {
      console.error('Error fetching stats:', error);
      setStats({
        totalTrades: 0,
        totalProfitLoss: '0',
        closedTrades: 0,
        openTrades: 0,
        winningTrades: 0,
        losingTrades: 0,
      });
    }
  };

  const fetchBalance = async () => {
    try {
      const response = await fetch('/api/balance');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setBalance(data.amount || '0');
      setWithdrawalAmount(data.withdrawalAmount || '0');
    } catch (error) {
      console.error('Error fetching balance:', error);
      setBalance('0');
      setWithdrawalAmount('0');
    }
  };

  const fetchCurrentBalance = async () => {
    try {
      const response = await fetch('/api/balance/history');
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setCurrentBalance(data.currentBalance?.toString() || '0');
    } catch (error) {
      console.error('Error fetching current balance:', error);
      setCurrentBalance('0');
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
    const loadAllData = async () => {
      try {
        await Promise.all([
          fetchTrades(),
          fetchStats(),
          fetchBalance(),
          fetchCurrentBalance(),
        ]);
      } catch (error) {
        console.error('Error loading data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAllData();
  }, []);

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
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background relative overflow-hidden">
        {/* 背景 */}
        <div className="absolute inset-0 opacity-10">
          <div className="w-full h-full" style={{
            backgroundImage: `
              linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
              linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
            `,
            backgroundSize: '50px 50px'
          }}></div>
        </div>

        {/* 扫描线 */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="w-full h-1 bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-30 animate-[scan_3s_linear_infinite]"></div>
        </div>

        <div className="relative z-10 text-center">
          <div className="relative inline-block mb-4">
            <Cpu className="w-16 h-16 mx-auto text-cyan-400 animate-pulse" />
            <div className="absolute inset-0 w-16 h-16 mx-auto bg-cyan-400/20 rounded-full blur-xl animate-pulse"></div>
          </div>
          <div className="text-cyan-400 text-lg font-mono tracking-wider">SYSTEM INITIALIZING...</div>
          <div className="mt-4 flex justify-center gap-1">
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
            <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
          </div>
        </div>

        <style jsx>{`
          @keyframes scan {
            0% { top: 0; opacity: 1; }
            100% { top: 100%; opacity: 0; }
          }
        `}</style>
      </div>
    );
  }

  const AddTradeButton = () => (
    <Button 
      onClick={() => { setEditingTrade(null); setIsDialogOpen(true); }} 
      className="gap-2 relative overflow-hidden group"
      style={{
        background: 'linear-gradient(135deg, rgba(6, 182, 212, 0.2) 0%, rgba(6, 182, 212, 0.1) 100%)',
        border: '1px solid rgba(6, 182, 212, 0.5)',
        color: '#06b6d4'
      }}
      size={isMobile ? 'default' : 'default'}
    >
      <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-500"></div>
      <Plus className="w-4 h-4 relative z-10" />
      <span className="relative z-10">{isMobile ? '添加' : '添加交易'}</span>
    </Button>
  );

  const FormContent = () => (
    <>
      <DialogHeader>
        <DialogTitle className="text-cyan-400">{editingTrade ? '编辑交易' : '添加新交易'}</DialogTitle>
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

  const filteredStats = {
    total: filteredTrades.length,
    profit: filteredTrades.reduce((sum, t) => sum + (parseFloat(t.profitLoss || '0')), 0),
    winning: filteredTrades.filter(t => t.profitLoss && parseFloat(t.profitLoss) > 0).length,
    losing: filteredTrades.filter(t => t.profitLoss && parseFloat(t.profitLoss) < 0).length,
  };

  return (
    <div className="min-h-screen bg-background pb-20 relative">
      {/* 背景网格 */}
      <div className="fixed inset-0 pointer-events-none opacity-5">
        <div className="w-full h-full" style={{
          backgroundImage: `
            linear-gradient(rgba(6, 182, 212, 0.3) 1px, transparent 1px),
            linear-gradient(90deg, rgba(6, 182, 212, 0.3) 1px, transparent 1px)
          `,
          backgroundSize: '50px 50px'
        }}></div>
      </div>

      <div className="container mx-auto px-4 py-4 md:py-8 relative z-10">
        {/* 机械风格头部 */}
        <CyberHeader />

        {/* 顶部操作栏 */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Activity className="w-3 h-3 text-green-400" />
            <span>LIVE</span>
            <Database className="w-3 h-3 text-cyan-400 ml-2" />
            <span>CONNECTED</span>
          </div>

          <Button
            variant="outline"
            size="icon"
            onClick={handleExport}
            title="导出数据"
            className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-400/10"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>

        {/* 移动端添加按钮 */}
        {isMobile && (
          <Sheet open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <SheetTrigger asChild>
              <div className="fixed bottom-24 right-4 z-50">
                <Button 
                  size="lg" 
                  className="h-14 w-14 rounded-full shadow-lg relative overflow-hidden"
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)',
                    border: '2px solid rgba(6, 182, 212, 0.5)',
                    boxShadow: '0 0 20px rgba(6, 182, 212, 0.5)'
                  }}
                >
                  <Plus className="w-6 h-6 text-white" />
                </Button>
              </div>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-2xl overflow-y-auto bg-slate-900/95 backdrop-blur-sm border-cyan-500/20">
              <SheetHeader>
                <SheetTitle className="text-cyan-400">{editingTrade ? '编辑交易' : '添加新交易'}</SheetTitle>
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
        )}

        {/* 日期筛选 */}
        <MechCard title="日期筛选" icon={<Calendar className="w-4 h-4" />} accent="purple" className="mb-6">
          <div className="flex flex-col sm:flex-row gap-3">
            <Popover open={showCalendar} onOpenChange={setShowCalendar}>
              <PopoverTrigger asChild>
                <Button
                  variant="outline"
                  className={cn(
                    "justify-start text-left font-normal border-cyan-500/30 text-cyan-400 hover:bg-cyan-400/10",
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
              <PopoverContent className="w-auto p-0 border-cyan-500/30 bg-slate-900/95 backdrop-blur-sm" align="start">
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
              <Button variant="ghost" size="sm" onClick={clearDateFilter} className="text-cyan-400 hover:bg-cyan-400/10">
                <X className="w-4 h-4 mr-2" />
                清除筛选
              </Button>
            )}
          </div>
          
          {dateRange.from && (
            <div className="mt-3 flex items-center gap-4 text-sm text-muted-foreground font-mono">
              <span>筛选期间：<strong className="text-cyan-400">{filteredStats.total}</strong> 笔</span>
              {filteredStats.total > 0 && (
                <>
                  <span>盈亏：<strong className={filteredStats.profit >= 0 ? 'text-green-400' : 'text-pink-400'}>{formatCurrency(filteredStats.profit.toString())}</strong></span>
                  <span>盈利：<strong className="text-green-400">{filteredStats.winning}</strong></span>
                  <span>亏损：<strong className="text-pink-400">{filteredStats.losing}</strong></span>
                </>
              )}
            </div>
          )}
        </MechCard>

        {/* 统计卡片 */}
        {stats && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6">
            <MechCard accent="cyan">
              <div className="flex items-center justify-between mb-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-xs text-muted-foreground font-mono">TOTAL</span>
              </div>
              <div className="text-2xl font-bold text-cyan-400">{stats.totalTrades}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.openTrades} 持仓 · {stats.closedTrades} 平仓
              </p>
            </MechCard>

            <MechCard accent="purple">
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-4 h-4 text-purple-400" />
                <span className="text-xs text-muted-foreground font-mono">P&L</span>
              </div>
              <div className={`text-2xl font-bold ${parseFloat(stats.totalProfitLoss) >= 0 ? 'text-green-400' : 'text-pink-400'}`}>
                {formatCurrency(stats.totalProfitLoss)}
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.winningTrades} 盈利 · {stats.losingTrades} 亏损
              </p>
            </MechCard>

            <MechCard accent="green">
              <div className="flex items-center justify-between mb-2">
                <TrendingUp className="w-4 h-4 text-green-400" />
                <span className="text-xs text-muted-foreground font-mono">WIN</span>
              </div>
              <div className="text-2xl font-bold text-green-400">{stats.winningTrades}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.closedTrades > 0 ? ((stats.winningTrades / stats.closedTrades) * 100).toFixed(1) : 0}% 胜率
              </p>
            </MechCard>

            <MechCard accent="pink">
              <div className="flex items-center justify-between mb-2">
                <TrendingDown className="w-4 h-4 text-pink-400" />
                <span className="text-xs text-muted-foreground font-mono">LOSS</span>
              </div>
              <div className="text-2xl font-bold text-pink-400">{stats.losingTrades}</div>
              <p className="text-xs text-muted-foreground mt-1">
                {stats.closedTrades > 0 ? ((stats.losingTrades / stats.closedTrades) * 100).toFixed(1) : 0}% 败率
              </p>
            </MechCard>
          </div>
        )}

        {/* 资产和图表 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <MechCard title="资产管理" icon={<Wallet className="w-4 h-4" />} accent="cyan">
            <div className="space-y-3">
              <div className="flex justify-between items-baseline">
                <span className="text-xs text-muted-foreground font-mono">交易后余额</span>
                <div className="text-sm text-cyan-400 font-mono">
                  ${(parseFloat(currentBalance) + parseFloat(withdrawalAmount)).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground font-mono">提现金额</span>
                <div className="flex items-center gap-2">
                  <div className="text-sm text-orange-400 font-mono">
                    ${parseFloat(withdrawalAmount).toLocaleString('en-US', {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-5 w-5 text-cyan-400 hover:bg-cyan-400/10"
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
              <div className="flex justify-between items-baseline pt-2 border-t border-cyan-500/20">
                <span className="text-xs text-muted-foreground font-mono">可用余额</span>
                <div className="text-xl font-bold text-green-400 font-mono">
                  ${parseFloat(currentBalance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t border-cyan-500/20">
                <span className="text-xs text-muted-foreground font-mono">本金</span>
                <div className="text-sm text-purple-400 font-mono">
                  ${parseFloat(balance).toLocaleString('en-US', {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </div>
              </div>
            </div>
          </MechCard>

          <MechCard title="资产走势" icon={<Activity className="w-4 h-4" />} accent="purple" className="overflow-hidden">
            <BalanceChart refreshTrigger={chartRefreshTrigger} />
          </MechCard>
        </div>

        {/* 交易列表 */}
        <MechCard title="交易列表" icon={<Activity className="w-4 h-4" />} accent="cyan">
          {filteredStats.total !== stats?.totalTrades && (
            <div className="text-sm text-muted-foreground mb-4 font-mono">
              已筛选 <span className="text-cyan-400">{filteredStats.total}</span> 笔交易
            </div>
          )}

          {filteredTrades.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
              <Filter className="w-12 h-12 mb-4 opacity-50 text-cyan-400" />
              <p className="text-cyan-400">没有符合条件的交易记录</p>
              <p className="text-sm mt-2">请调整日期筛选条件或添加新交易</p>
            </div>
          ) : isMobile ? (
            <div className="divide-y divide-cyan-500/20">
              {filteredTrades.slice(0, 15).map((trade) => (
                <div key={trade.id} className="p-3 md:p-4 hover:bg-cyan-400/5 transition-colors">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-sm text-cyan-400">{trade.symbol}</span>
                      <Badge variant={trade.isClosed ? 'outline' : 'default'} className="text-xs border-cyan-500/30 text-cyan-400">
                        {trade.isClosed ? '已平仓' : '持仓中'}
                      </Badge>
                    </div>
                    <span className={`text-sm font-semibold ${trade.profitLoss && parseFloat(trade.profitLoss) >= 0 ? 'text-green-400' : 'text-pink-400'}`}>
                      {formatCurrency(trade.profitLoss)}
                    </span>
                  </div>
                  
                  {trade.strategySummary && (
                    <div className="mb-2 p-2 bg-slate-800/50 rounded-lg border border-cyan-500/20">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">入场策略：</p>
                      <p className="text-sm text-foreground">{trade.strategySummary}</p>
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-2 text-xs text-muted-foreground mb-2 font-mono">
                    <div>
                      <span className="text-cyan-400">级别:</span> {(trade as any).tradeLevel || '-'}
                    </div>
                    <div>
                      <span className="text-cyan-400">仓位:</span> {(trade as any).positionSize || '-'}
                    </div>
                    <div>
                      <span className="text-cyan-400">开仓:</span> ${(
                        parseFloat(currentBalance) *
                        (parseFloat((trade as any).positionSize || '0%') / 100)
                      ).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 text-xs text-muted-foreground mb-2 font-mono">
                    <div>
                      <span className="text-cyan-400">时间:</span> {formatDate(trade.entryTime)}
                    </div>
                    {trade.isClosed && trade.exitReason && (
                      <div>
                        <span className="text-cyan-400">平仓:</span> {trade.exitReason}
                      </div>
                    )}
                  </div>
                  {trade.isClosed && trade.exitReason === '其他原因' && trade.notes && (
                    <div className="p-2 bg-orange-500/10 rounded-lg mb-2 border border-orange-500/30">
                      <p className="text-xs text-muted-foreground mb-1 font-mono">备注：</p>
                      <p className="text-sm text-orange-400">{trade.notes}</p>
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(trade)}
                      className="flex-1 text-xs border-cyan-500/30 text-cyan-400 hover:bg-cyan-400/10"
                    >
                      编辑
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(trade.id)}
                      className="flex-1 text-xs text-pink-400 border-pink-500/30 hover:bg-pink-400/10"
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
                  <TableHeader className="sticky top-0 bg-slate-900/95 backdrop-blur-sm z-10 border-b border-cyan-500/30">
                    <TableRow>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">品种</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">盈亏</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">入场策略</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">级别</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">仓位</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">开仓金额</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">开仓时间</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">状态</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">平仓原因</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">备注</TableHead>
                      <TableHead className="bg-slate-900/95 text-cyan-400 font-mono">操作</TableHead>
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
                        <TableRow key={trade.id} className="hover:bg-cyan-400/5 border-cyan-500/20">
                          <TableCell className="font-medium text-cyan-400">{trade.symbol}</TableCell>
                          <TableCell className={trade.profitLoss && parseFloat(trade.profitLoss) >= 0 ? 'text-green-400' : 'text-pink-400'}>
                            {formatCurrency(trade.profitLoss)}
                          </TableCell>
                          <TableCell className="max-w-xs text-muted-foreground">
                            <div className="truncate" title={trade.strategySummary}>
                              {trade.strategySummary}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-purple-400 font-mono">
                            {(trade as any).tradeLevel || '-'}
                          </TableCell>
                          <TableCell className="text-sm text-purple-400 font-mono">
                            {positionSize}
                          </TableCell>
                          <TableCell className="text-sm text-green-400 font-mono">
                            ${openAmount}
                          </TableCell>
                          <TableCell className="text-muted-foreground font-mono">{formatDate(trade.entryTime)}</TableCell>
                          <TableCell>
                            <Badge variant={trade.isClosed ? 'outline' : 'default'} className="border-cyan-500/30 text-cyan-400">
                              {trade.isClosed ? '已平仓' : '持仓中'}
                            </Badge>
                          </TableCell>
                          <TableCell className="max-w-xs text-muted-foreground">
                            <div className="truncate" title={trade.exitReason || '-'}>
                              {trade.exitReason || '-'}
                            </div>
                          </TableCell>
                          <TableCell className="max-w-xs text-muted-foreground">
                            {trade.exitReason === '其他原因' && trade.notes ? (
                              <div className="truncate text-orange-400" title={trade.notes}>
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
                                className="text-cyan-400 hover:bg-cyan-400/10"
                              >
                                编辑
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(trade.id)}
                                className="text-pink-400 hover:bg-pink-400/10"
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
        </MechCard>

        {/* 资产编辑对话框 */}
        <Dialog open={isBalanceDialogOpen} onOpenChange={setIsBalanceDialogOpen}>
          <DialogContent className="bg-slate-900/95 backdrop-blur-sm border-cyan-500/30">
            <DialogHeader>
              <DialogTitle className="text-cyan-400">编辑资产</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="balance" className="text-cyan-400">本金</Label>
                <Input
                  id="balance"
                  type="number"
                  step="any"
                  value={balanceInput}
                  onChange={(e) => setBalanceInput(e.target.value)}
                  placeholder="0.00"
                  className="border-cyan-500/30 text-cyan-400 focus:border-cyan-400"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="withdrawal" className="text-cyan-400">提现金额</Label>
                <Input
                  id="withdrawal"
                  type="number"
                  step="any"
                  value={withdrawalInput}
                  onChange={(e) => setWithdrawalInput(e.target.value)}
                  placeholder="0.00"
                  min="0"
                  className="border-cyan-500/30 text-cyan-400 focus:border-cyan-400"
                />
                <p className="text-xs text-muted-foreground font-mono">
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
                  className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-400/10"
                >
                  取消
                </Button>
                <Button 
                  onClick={handleBalanceSave}
                  style={{
                    background: 'linear-gradient(135deg, #06b6d4 0%, #7c3aed 100%)',
                    border: '1px solid rgba(6, 182, 212, 0.5)'
                  }}
                  className="text-white"
                >
                  保存
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* 桌面端添加交易按钮 */}
        {!isMobile && (
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <AddTradeButton />
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto bg-slate-900/95 backdrop-blur-sm border-cyan-500/30">
              <FormContent />
            </DialogContent>
          </Dialog>
        )}

        {/* 底部装饰 */}
        <div className="mt-8 flex items-center gap-2">
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-cyan-500/30 to-transparent"></div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground font-mono">
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>SECURE CONNECTION</span>
            <Zap className="w-3 h-3 text-purple-400" />
          </div>
          <div className="h-px flex-1 bg-gradient-to-r from-transparent via-purple-500/30 to-transparent"></div>
        </div>
      </div>

      <style jsx global>{`
        @keyframes scan {
          0% { top: 0; opacity: 1; }
          100% { top: 100%; opacity: 0; }
        }
      `}</style>
    </div>
  );
}
