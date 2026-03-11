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
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Trash2, MoreVertical, ChevronDown, ChevronUp } from 'lucide-react';
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

interface Account {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export default function TradingApp() {
  // 账户状态
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<number>(1);
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);
  const [editAccountName, setEditAccountName] = useState<string>('');
  
  // 时间段统计卡片选择状态
  const [periodSelections, setPeriodSelections] = useState([
    { id: 0, days: 0 },      // 默认今天
    { id: 1, days: 2 },      // 默认三天
    { id: 2, days: 6 },      // 默认一周
    { id: 3, days: 29 },     // 默认一月
  ]);
  
  // 初始资产余额
  const [balance, setBalance] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fundRecords, setFundRecords] = useState<FundRecord[]>([]);
  
  // 资产走势图折叠状态
  const [isAssetChartOpen, setIsAssetChartOpen] = useState(false);

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

  // 交易分级系统状态
  const [volumeTrend, setVolumeTrend] = useState<'top_divergence' | 'bottom_divergence' | 'no_trend'>('no_trend');
  const [bollContraction, setBollContraction] = useState<'1h' | '2h' | '4h_plus'>('1h');
  const [bollWidth, setBollWidth] = useState<'converged' | 'not_converged'>('not_converged');
  const [pattern, setPattern] = useState<'head_shoulders' | 'double_top_bottom' | 'triple_top_bottom' | 'triangle' | 'cup_handle' | 'channel' | 'none'>('none');

  // 计算交易级别
  const calculateTradeLevel = (): { level: string; color: string; description: string; suggestion: string } => {
    // 1. 检查量能背离
    if (volumeTrend === 'no_trend') {
      return {
        level: 'C',
        color: 'text-gray-400',
        description: '无量能背离',
        suggestion: '不建议操作'
      };
    }

    // 有量能背离，继续判断
    const isLongTermContraction = bollContraction === '4h_plus';
    const isConverged = bollWidth === 'converged';
    const hasPattern = pattern !== 'none';

    if (isLongTermContraction) {
      // A级路径：4小时及以上收缩
      if (isConverged) {
        if (hasPattern) {
          return {
            level: 'A+',
            color: 'text-yellow-400',
            description: '卓越交易机会（形态确认）',
            suggestion: '强烈建议操作'
          };
        } else {
          return {
            level: 'A',
            color: 'text-green-400',
            description: '优秀交易机会',
            suggestion: '强烈建议操作'
          };
        }
      } else {
        return {
          level: 'A-',
          color: 'text-cyan-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]',
          description: '优秀但布林带未粘合',
          suggestion: '建议谨慎操作'
        };
      }
    } else {
      // B级路径：1-2小时收缩
      if (isConverged) {
        if (hasPattern) {
          return {
            level: 'B+',
            color: 'text-blue-400',
            description: '良好交易机会（形态确认）',
            suggestion: '可以操作'
          };
        } else {
          return {
            level: 'B',
            color: 'text-indigo-400',
            description: '良好交易机会',
            suggestion: '可以操作'
          };
        }
      } else {
        return {
          level: 'B-',
          color: 'text-purple-400',
          description: '一般交易机会',
          suggestion: '建议谨慎操作'
        };
      }
    }
  };

  // 获取交易级别信息
  const tradeLevel = calculateTradeLevel();

  // 日期筛选状态
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // 快捷日期选择处理函数
  const handleQuickDateFilter = (type: 'week' | 'month' | '3month' | 'halfYear' | 'year') => {
    const today = new Date();
    const formatDate = (date: Date) => date.toISOString().split('T')[0];

    switch (type) {
      case 'week':
        const weekAgo = new Date(today);
        weekAgo.setDate(today.getDate() - 7);
        setFilterStartDate(formatDate(weekAgo));
        setFilterEndDate(formatDate(today));
        break;
      case 'month':
        const monthAgo = new Date(today);
        monthAgo.setDate(today.getDate() - 30);
        setFilterStartDate(formatDate(monthAgo));
        setFilterEndDate(formatDate(today));
        break;
      case '3month':
        const threeMonthAgo = new Date(today);
        threeMonthAgo.setDate(today.getDate() - 90);
        setFilterStartDate(formatDate(threeMonthAgo));
        setFilterEndDate(formatDate(today));
        break;
      case 'halfYear':
        const halfYearAgo = new Date(today);
        halfYearAgo.setDate(today.getDate() - 180);
        setFilterStartDate(formatDate(halfYearAgo));
        setFilterEndDate(formatDate(today));
        break;
      case 'year':
        const yearAgo = new Date(today);
        yearAgo.setDate(today.getDate() - 365);
        setFilterStartDate(formatDate(yearAgo));
        setFilterEndDate(formatDate(today));
        break;
    }
  };

  // 编辑相关状态
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 从数据库加载数据
  // 加载账户列表
  useEffect(() => {
    const loadAccounts = async () => {
      try {
        const accountsRes = await api.accounts.getAll();
        setAccounts(accountsRes.accounts);
      } catch (error) {
        console.error('Failed to load accounts:', error);
      }
    };
    loadAccounts();
  }, []);

  // 当账户切换时加载数据
  useEffect(() => {
    const loadData = async () => {
      try {
        // 加载余额
        const balanceRes = await api.balance.get(currentAccountId);
        setBalance(balanceRes.balance);

        // 加载交易记录
        const tradesRes = await api.trades.getAll({ accountId: currentAccountId });
        setTrades(tradesRes.trades);

        // 加载出入金记录（获取所有记录用于资产走势图）
        const fundRecordsRes = await api.fundRecords.getAll(1000, currentAccountId);
        setFundRecords(fundRecordsRes.records);
      } catch (error) {
        console.error('Failed to load data:', error);
      }
    };

    loadData();
  }, [currentAccountId]);


  // 计算开仓金额
  useEffect(() => {
    const amount = (balance * position) / 100;
    setOpenAmount(amount);
  }, [balance, position]);

  // 账户管理函数
  const handleCreateAccount = async () => {
    if (!newAccountName.trim()) {
      alert('请输入账户名称');
      return;
    }
    try {
      const res = await api.accounts.create(newAccountName.trim());
      setAccounts([...accounts, res.account]);
      setNewAccountName('');
      setIsAccountDialogOpen(false);
      // 切换到新创建的账户
      setCurrentAccountId(res.account.id);
    } catch (error: any) {
      alert(error.message || '创建账户失败');
    }
  };

  const handleUpdateAccount = async () => {
    if (!editingAccount || !editAccountName.trim()) {
      alert('请输入账户名称');
      return;
    }
    try {
      const res = await api.accounts.update(editingAccount.id, editAccountName.trim());
      setAccounts(accounts.map(a => a.id === res.account.id ? res.account : a));
      setEditingAccount(null);
      setEditAccountName('');
    } catch (error: any) {
      alert(error.message || '更新账户失败');
    }
  };

  const handleDeleteAccount = async (id: number) => {
    if (id === 1) {
      alert('不能删除默认账户');
      return;
    }
    if (!confirm('确定要删除此账户吗？该账户下的所有交易记录和出入金记录都会被删除。')) {
      return;
    }
    try {
      await api.accounts.delete(id);
      setAccounts(accounts.filter(a => a.id !== id));
      // 如果删除的是当前账户，切换到默认账户
      if (currentAccountId === id) {
        setCurrentAccountId(1);
      }
    } catch (error: any) {
      alert(error.message || '删除账户失败');
    }
  };

  const currentAccount = accounts.find(a => a.id === currentAccountId);

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
        accountId: currentAccountId,
      });

      // 从响应中获取更新后的余额
      const updatedBalance = recordRes.balance || (type === 'deposit' ? balance + amount : balance - amount);

      // 更新余额状态
      setBalance(updatedBalance);

      // 更新出入金记录列表
      setFundRecords([recordRes.record, ...fundRecords]);

      // 更新资产历史
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
      const deleteRes = await api.fundRecords.delete(id, currentAccountId);

      // 使用后端返回的余额值
      const updatedBalance = deleteRes.balance ?? newBalance;
      setBalance(updatedBalance);

      // 删除记录
      setFundRecords(fundRecords.filter(r => r.id !== id));
    } catch (error: any) {
      console.error('Failed to delete fund record:', error);
      alert('删除出入金记录失败：' + (error?.message || '未知错误'));
    }
  };

  // 添加交易记录
  const handleAddTrade = async () => {
    // 验证必填字段
    if (!symbol || !openDateTime) {
      alert('请填写交易品种和开仓日期');
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
      // 构建策略字符串（基于分级系统）
      const parts: string[] = [tradeLevel.level];
      
      // 量能状态：只有顶背离或底背离才显示
      if (volumeTrend === 'top_divergence') {
        parts.push('顶背离');
      } else if (volumeTrend === 'bottom_divergence') {
        parts.push('底背离');
      }
      
      // BOLL收缩时长
      const bollContractionText = {
        '1h': '1h收缩',
        '2h': '2h收缩',
        '4h_plus': '4h+收缩'
      }[bollContraction];
      parts.push(bollContractionText);
      
      // 布林带宽度
      const bollWidthText = {
        'converged': '粘合',
        'not_converged': '未粘合'
      }[bollWidth];
      parts.push(bollWidthText);
      
      // 形态：只有有形态才显示
      if (pattern !== 'none') {
        const patternText = {
          'head_shoulders': '头肩顶底',
          'double_top_bottom': '双顶底',
          'triple_top_bottom': '三重顶底',
          'triangle': '三角',
          'cup_handle': '杯柄',
          'channel': '通道'
        }[pattern];
        parts.push(patternText);
      }

      const strategyText = parts.join('/');

      // 将 openDateTime 拆分为 date 和 openTime
      const dateTime = new Date(openDateTime);
      const date = dateTime.toISOString().split('T')[0];
      const time = dateTime.toTimeString().split(' ')[0].slice(0, 5);

      // 创建交易记录（后端会自动更新余额）
      const tradeRes = await api.trades.create({
        symbol,
        strategy: strategyText,
        position,
        openAmount,
        openTime: time,
        closeReason: isClosed ? closeReason : 'pending',
        remark: isClosed && closeReason === 'other' ? remark : undefined,
        profitLoss: isClosed ? pl : 0,
        date: date,
        isClosed,
        accountId: currentAccountId,
      });

      // 从响应中获取更新后的余额
      const updatedBalance = tradeRes.balance || (balance + pl);
      setBalance(updatedBalance);

      // 添加交易记录
      setTrades([tradeRes.trade, ...trades]);

      // 重置表单
      setSymbol('');
      setStrategy('');
      setPosition(5);
      setVolumeTrend('no_trend');
      setBollContraction('1h');
      setBollWidth('not_converged');
      setPattern('none');
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
      const deleteRes = await api.trades.delete(tradeId, currentAccountId);

      // 使用后端返回的余额值
      const updatedBalance = deleteRes.balance ?? newBalance;
      setBalance(updatedBalance);

      // 删除记录
      setTrades(trades.filter(t => t.id !== tradeId));
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
          accountId: currentAccountId,
        }
      );

      // 从响应中获取更新后的余额
      const updatedBalance = updatedTradeRes.balance ?? newBalance;
      setBalance(updatedBalance);

      // 更新交易列表
      setTrades(trades.map(t => t.id === editingTrade.id ? updatedTradeRes.trade : t));

      // 关闭对话框
      setIsEditDialogOpen(false);
      setEditingTrade(null);
    } catch (error: any) {
      console.error('Failed to save trade:', error);
      alert('保存交易记录失败：' + (error?.message || '未知错误'));
    }
  };

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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-zinc-950 to-black p-4 md:p-8 relative overflow-hidden">
      {/* 背景 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(234,179,8,0.02)_1px,transparent_1px),linear-gradient(90deg,rgba(234,179,8,0.02)_1px,transparent_1px)] bg-[size:50px_50px] pointer-events-none" />
      
      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        {/* 标题和下载按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:flex-1 rounded-xl border border-amber-500/30 bg-gray-900/90 p-4 sm:p-6 text-center shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-sm">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-amber-400 via-yellow-500 to-orange-500 bg-clip-text text-transparent">交易记录系统</h1>
            <p className="mt-2 text-sm sm:text-base text-amber-500/60">管理您的交易记录和资产</p>
          </div>
          <div className="w-full sm:w-auto sm:ml-4">
            <Button 
              onClick={handleDownloadData}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold shadow-[0_0_20px_rgba(234,179,8,0.3)]"
            >
              下载数据
            </Button>
          </div>
        </div>

        {/* 资产余额卡片 */}
        <Card className="border-amber-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-sm">
          <CardHeader className="border-b border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">资产余额</CardTitle>
                <CardDescription className="text-amber-500/60">当前账户总余额</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* 账户选择 */}
                <Select value={String(currentAccountId)} onValueChange={(value) => setCurrentAccountId(Number(value))}>
                  <SelectTrigger className="w-32 border-amber-500/30 bg-gray-800 text-white text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-amber-500/30 bg-gray-800">
                    {accounts.map((account) => (
                      <SelectItem key={account.id} value={String(account.id)} className="text-white hover:bg-gray-700">
                        {account.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {/* 账户管理按钮 */}
                <Dialog open={isAccountDialogOpen} onOpenChange={setIsAccountDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline" size="sm" className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10 hover:text-purple-300 h-8 px-2">
                      管理
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-purple-500/30 bg-gray-900 text-white max-w-md">
                    <DialogHeader>
                      <DialogTitle className="bg-gradient-to-r from-purple-400 to-pink-500 bg-clip-text text-transparent">账户管理</DialogTitle>
                      <DialogDescription className="text-purple-500/60">创建、编辑或删除账户</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                      {/* 添加新账户 */}
                      <div className="flex gap-2">
                        <Input
                          placeholder="新账户名称"
                          value={newAccountName}
                          onChange={(e) => setNewAccountName(e.target.value)}
                          className="border-purple-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-purple-500"
                          onKeyDown={(e) => e.key === 'Enter' && handleCreateAccount()}
                        />
                        <Button onClick={handleCreateAccount} className="bg-purple-500 hover:bg-purple-600 text-white font-semibold">
                          添加
                        </Button>
                      </div>
                      {/* 账户列表 */}
                      <div className="space-y-2 max-h-[300px] overflow-y-auto">
                        {accounts.map((account) => (
                          <div key={account.id} className="flex items-center justify-between p-2 rounded-lg border border-purple-500/20 bg-gray-800/50">
                            {editingAccount?.id === account.id ? (
                              <div className="flex items-center gap-2 flex-1">
                                <Input
                                  value={editAccountName}
                                  onChange={(e) => setEditAccountName(e.target.value)}
                                  className="border-purple-500/30 bg-gray-700 text-white h-8 text-sm"
                                  autoFocus
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleUpdateAccount();
                                    if (e.key === 'Escape') {
                                      setEditingAccount(null);
                                      setEditAccountName('');
                                    }
                                  }}
                                />
                                <Button size="sm" onClick={handleUpdateAccount} className="bg-emerald-600 hover:bg-emerald-700 h-8 px-2 text-xs">
                                  保存
                                </Button>
                                <Button size="sm" variant="ghost" onClick={() => { setEditingAccount(null); setEditAccountName(''); }} className="h-8 px-2 text-xs text-gray-400">
                                  取消
                                </Button>
                              </div>
                            ) : (
                              <>
                                <span className={`text-sm ${account.id === currentAccountId ? 'text-purple-400 font-semibold' : 'text-white'}`}>
                                  {account.name}
                                  {account.id === 1 && <span className="text-gray-500 text-xs ml-1">(默认)</span>}
                                </span>
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    className="h-7 w-7 p-0 text-purple-400 hover:bg-purple-500/10"
                                    onClick={() => {
                                      setEditingAccount(account);
                                      setEditAccountName(account.name);
                                    }}
                                  >
                                    ✏️
                                  </Button>
                                  {account.id !== 1 && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="h-7 w-7 p-0 text-red-400 hover:bg-red-500/10"
                                      onClick={() => handleDeleteAccount(account.id)}
                                    >
                                      🗑️
                                    </Button>
                                  )}
                                </div>
                              </>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent className="pt-4 sm:pt-6">
            <div className="mb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="text-3xl sm:text-4xl font-bold text-amber-400">${balance.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
              <div className="flex gap-2">
                <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-emerald-600 hover:bg-emerald-700 text-white">入金</Button>
                  </DialogTrigger>
                  <DialogContent className="border-amber-500/30 bg-gray-900 text-white">
                    <DialogHeader>
                      <DialogTitle className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">入金</DialogTitle>
                      <DialogDescription className="text-amber-500/60">请输入入金金额和日期</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="deposit-amount" className="text-amber-400">金额</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          placeholder="请输入金额"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deposit-date" className="text-amber-400">日期</Label>
                        <Input
                          id="deposit-date"
                          type="date"
                          value={fundDate}
                          onChange={(e) => setFundDate(e.target.value)}
                          className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold" onClick={() => handleAddFund('deposit')}>确认入金</Button>
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
              
              {/* 最近出入金记录 */}
              {fundRecords.length > 0 && (
                <div className="rounded border border-amber-500/30 bg-amber-500/5 p-2">
                  <div className="text-xs text-amber-400/70 mb-2">最近记录</div>
                  <div className="space-y-1 max-h-[72px] overflow-y-auto">
                    {fundRecords.map((record) => (
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

        {/* 账户资产走势图（可折叠） */}
        <Collapsible open={isAssetChartOpen} onOpenChange={setIsAssetChartOpen} className="mt-4">
          <Card className="border-amber-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-sm">
            <CollapsibleTrigger asChild>
              <CardHeader className="border-b border-amber-500/20 cursor-pointer hover:bg-amber-500/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
                      账户资产走势
                    </CardTitle>
                    <CardDescription className="text-amber-500/60">
                      资产余额走势 - 点击{isAssetChartOpen ? '收起' : '展开'}
                    </CardDescription>
                  </div>
                  <div className="flex items-center gap-2">
                    {isAssetChartOpen ? (
                      <ChevronUp className="h-5 w-5 text-amber-400" />
                    ) : (
                      <ChevronDown className="h-5 w-5 text-amber-400" />
                    )}
                  </div>
                </div>
              </CardHeader>
            </CollapsibleTrigger>
            <CollapsibleContent>
              <CardContent className="pt-4">
                {(() => {
                  // 计算资产走势数据
                  // 收集所有日期点
                  const allDates = new Set<string>();
                  trades.forEach(t => allDates.add(t.date));
                  fundRecords.forEach(r => allDates.add(r.date));
                  
                  if (allDates.size === 0) {
                    return (
                      <div className="text-center py-8 text-gray-400">
                        暂无数据，请先添加交易或出入金记录
                      </div>
                    );
                  }
                  
                  // 按日期排序
                  const sortedDates = Array.from(allDates).sort();
                  
                  // 计算每个日期的累计值
                  const chartData = sortedDates.map(date => {
                    // 累计入金到该日期
                    const depositToDate = fundRecords
                      .filter(r => r.type === 'deposit' && r.date <= date)
                      .reduce((sum, r) => sum + r.amount, 0);
                    
                    // 累计出金到该日期
                    const withdrawToDate = fundRecords
                      .filter(r => r.type === 'withdraw' && r.date <= date)
                      .reduce((sum, r) => sum + r.amount, 0);
                    
                    // 累计盈亏到该日期
                    const profitLossToDate = trades
                      .filter(t => t.date <= date)
                      .reduce((sum, t) => sum + t.profitLoss, 0);
                    
                    // 当时的余额 = 累计入金 - 累计出金 + 累计盈亏
                    const balanceAtDate = depositToDate - withdrawToDate + profitLossToDate;
                    
                    return {
                      date: date.slice(5), // 只显示 MM-DD
                      fullDate: date,
                      balance: balanceAtDate,
                    };
                  });
                  
                  // 计算统计数据
                  const totalDeposit = fundRecords
                    .filter(r => r.type === 'deposit')
                    .reduce((sum, r) => sum + r.amount, 0);
                  const totalWithdraw = fundRecords
                    .filter(r => r.type === 'withdraw')
                    .reduce((sum, r) => sum + r.amount, 0);
                  const totalProfitLoss = trades.reduce((sum, t) => sum + t.profitLoss, 0);
                  const returnRate = totalDeposit > 0 
                    ? (totalProfitLoss / totalDeposit * 100).toFixed(2)
                    : '0.00';
                  
                  return (
                    <>
                      {/* 统计信息 */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                        <div className="rounded-lg border border-amber-500/20 bg-gray-800/60 p-3 text-center">
                          <div className="text-xs text-gray-400 mb-1">当前余额</div>
                          <div className="text-lg font-semibold text-amber-400">
                            ${balance.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="rounded-lg border border-blue-500/20 bg-gray-800/60 p-3 text-center">
                          <div className="text-xs text-gray-400 mb-1">入金 / 出金</div>
                          <div className="text-base font-semibold">
                            <span className="text-green-400">${totalDeposit.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</span>
                            <span className="text-gray-500 mx-1">/</span>
                            <span className="text-red-400">${totalWithdraw.toLocaleString('zh-CN', { minimumFractionDigits: 0 })}</span>
                          </div>
                        </div>
                        <div className="rounded-lg border border-purple-500/20 bg-gray-800/60 p-3 text-center">
                          <div className="text-xs text-gray-400 mb-1">累计盈利</div>
                          <div className={`text-lg font-semibold ${totalProfitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {totalProfitLoss >= 0 ? '+' : ''}{totalProfitLoss.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}
                          </div>
                        </div>
                        <div className="rounded-lg border border-cyan-500/20 bg-gray-800/60 p-3 text-center">
                          <div className="text-xs text-gray-400 mb-1">盈利率</div>
                          <div className={`text-lg font-semibold ${Number(returnRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {Number(returnRate) >= 0 ? '+' : ''}{returnRate}%
                          </div>
                        </div>
                      </div>
                      
                      {/* 走势图 */}
                      <div className="h-64 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                            <XAxis 
                              dataKey="date" 
                              stroke="#9CA3AF" 
                              fontSize={12}
                              tickLine={false}
                            />
                            <YAxis 
                              stroke="#9CA3AF" 
                              fontSize={12}
                              tickLine={false}
                              tickFormatter={(value) => `$${value}`}
                            />
                            <Tooltip 
                              contentStyle={{ 
                                backgroundColor: '#1F2937', 
                                border: '1px solid rgba(245, 158, 11, 0.3)',
                                borderRadius: '8px',
                                color: '#F3F4F6'
                              }}
                              formatter={(value: number) => [
                                `$${value.toLocaleString('zh-CN', { minimumFractionDigits: 2 })}`,
                                '余额'
                              ]}
                              labelFormatter={(label: string) => label}
                            />
                            <Line 
                              type="monotone" 
                              dataKey="balance" 
                              stroke="#F59E0B" 
                              strokeWidth={2}
                              dot={{ fill: '#F59E0B', strokeWidth: 2, r: 3 }}
                              name="余额"
                            />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </>
                  );
                })()}
              </CardContent>
            </CollapsibleContent>
          </Card>
        </Collapsible>

        {/* 我的交易数据 */}
        <Card className="border-amber-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-sm">
          <CardHeader className="border-b border-amber-500/20">
            <CardTitle className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">我的交易数据</CardTitle>
            <CardDescription className="text-amber-500/60">交易统计信息</CardDescription>
          </CardHeader>
          <CardContent>
            {/* 时间段统计卡片 */}
            <div className="mb-6 grid grid-cols-2 sm:grid-cols-4 gap-3">
              {(() => {
                const getPeriodStats = (days: number) => {
                  const today = new Date();
                  const startDate = new Date(today);
                  startDate.setDate(today.getDate() - days);
                  const startDateStr = startDate.toISOString().split('T')[0];
                  const todayStr = today.toISOString().split('T')[0];
                  
                  const periodTrades = trades.filter(trade => {
                    return trade.date >= startDateStr && trade.date <= todayStr;
                  });
                  
                  const count = periodTrades.length;
                  const totalPL = periodTrades.reduce((sum, t) => sum + t.profitLoss, 0);
                  const wins = periodTrades.filter(t => t.profitLoss > 0).length;
                  const winRate = count > 0 ? Math.round((wins / count) * 100) : 0;
                  
                  return { count, totalPL, winRate };
                };
                
                // 每个卡片的选项
                const periodOptions = [
                  [
                    { label: '今天', days: 0 },
                    { label: '三天', days: 2 },
                    { label: '五天', days: 4 },
                  ],
                  [
                    { label: '三天', days: 2 },
                    { label: '七天', days: 6 },
                    { label: '十天', days: 9 },
                    { label: '十五天', days: 14 },
                  ],
                  [
                    { label: '一周', days: 6 },
                    { label: '两周', days: 13 },
                    { label: '三周', days: 20 },
                    { label: '四周', days: 27 },
                  ],
                  [
                    { label: '一月', days: 29 },
                    { label: '二月', days: 59 },
                    { label: '三月', days: 89 },
                  ],
                ];
                
                const getLabelByDays = (options: {label: string, days: number}[], days: number) => {
                  const found = options.find(o => o.days === days);
                  return found ? found.label : options[0].label;
                };
                
                return periodSelections.map((selection, index) => {
                  const options = periodOptions[index];
                  const label = getLabelByDays(options, selection.days);
                  const stats = getPeriodStats(selection.days);
                  
                  return (
                    <div 
                      key={index}
                      className="rounded-lg border border-amber-500/20 bg-gray-800/60 p-3 text-center"
                    >
                      <Select 
                        value={String(selection.days)} 
                        onValueChange={(value) => {
                          const newSelections = [...periodSelections];
                          newSelections[index] = { id: index, days: Number(value) };
                          setPeriodSelections(newSelections);
                        }}
                      >
                        <SelectTrigger className="w-full h-8 text-base font-semibold text-amber-400 border-0 bg-transparent p-0 justify-center hover:text-amber-300 focus:ring-0">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="border-amber-500/30 bg-gray-800">
                          {options.map((option) => (
                            <SelectItem key={option.days} value={String(option.days)} className="text-white hover:bg-gray-700">
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <div className="space-y-1.5 mt-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">次数:</span>
                          <span className="text-white font-medium">{stats.count}</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">盈亏:</span>
                          <span className={`font-medium ${stats.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {stats.totalPL >= 0 ? '+' : ''}{stats.totalPL.toFixed(2)}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-gray-400">胜率:</span>
                          <span className="text-white font-medium">{stats.winRate}%</span>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
            
            <div className="border-t border-amber-500/20 pt-4">
            <div className="mb-4 grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="filter-start-date" className="text-amber-400">开始日期</Label>
                <Input
                  id="filter-start-date"
                  type="date"
                  value={filterStartDate}
                  onChange={(e) => setFilterStartDate(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="filter-end-date" className="text-amber-400">结束日期</Label>
                <Input
                  id="filter-end-date"
                  type="date"
                  value={filterEndDate}
                  onChange={(e) => setFilterEndDate(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500"
                />
              </div>
            </div>

            {/* 快捷日期选择 */}
            <div className="mb-4 flex flex-wrap gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter('week')}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                一周
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter('month')}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                一月
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter('3month')}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                三月
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter('halfYear')}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                半年
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleQuickDateFilter('year')}
                className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300"
              >
                一年
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setFilterStartDate('');
                  setFilterEndDate('');
                }}
                className="text-gray-400 hover:text-gray-300 hover:bg-gray-700/50"
              >
                清除筛选
              </Button>
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
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-lg border border-amber-500/30 bg-gray-800/50 p-3 sm:p-4 text-center backdrop-blur-sm">
                <div className={`text-xl sm:text-2xl font-bold ${filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0) >= 0 ? '+' : ''}
                  ${filteredTrades.reduce((sum, trade) => sum + trade.profitLoss, 0).toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div className="text-xs sm:text-sm text-amber-500/60">总盈亏</div>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-gray-800/50 p-3 sm:p-4 text-center backdrop-blur-sm">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">{filteredTrades.length}</div>
                <div className="text-xs sm:text-sm text-amber-500/60">交易次数</div>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-gray-800/50 p-3 sm:p-4 text-center backdrop-blur-sm">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {filteredTrades.length > 0 ? Math.round((filteredTrades.filter(t => t.profitLoss > 0).length / filteredTrades.length) * 100) : 0}%
                </div>
                <div className="text-xs sm:text-sm text-amber-500/60">胜率</div>
              </div>
            </div>
            </div>
          </CardContent>
        </Card>

        {/* 添加交易记录 */}
        <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
          <DialogTrigger asChild>
            <Button className="w-full bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold shadow-[0_0_20px_rgba(234,179,8,0.3)]" size="lg">
              添加交易记录
            </Button>
          </DialogTrigger>
          <DialogContent className="border-amber-500/30 bg-gray-900 text-white max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-amber-400 to-blue-500 bg-clip-text text-transparent">添加交易记录</DialogTitle>
              <DialogDescription className="text-amber-500/60">填写交易信息</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="symbol" className="text-amber-400">交易品种</Label>
                <Input
                  id="symbol"
                  placeholder="例如：BTC/USDT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="trade-date" className="text-amber-400">开仓日期</Label>
                <Input
                  id="trade-date"
                  type="datetime-local"
                  value={openDateTime}
                  onChange={(e) => setOpenDateTime(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>

              {/* 交易分级系统 */}
              <div className="rounded-lg border border-amber-500/30 bg-gray-800/50 p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-500/20 pb-2">
                  <h3 className="text-lg font-semibold text-amber-400">交易分级系统</h3>
                  <div className={`px-3 py-1 rounded-full border ${tradeLevel.level === 'A+' ? 'border-yellow-500/50 bg-yellow-500/10' : tradeLevel.level.startsWith('A') ? 'border-green-500/50 bg-green-500/10' : tradeLevel.level.startsWith('B') ? 'border-blue-500/50 bg-blue-500/10' : 'border-gray-500/50 bg-gray-500/10'}`}>
                    <span className={`text-lg font-bold ${tradeLevel.color}`}>{tradeLevel.level}级</span>
                  </div>
                </div>
                <p className="text-sm text-gray-400">{tradeLevel.description}</p>
                <p className={`text-sm font-semibold ${tradeLevel.color}`}>建议：{tradeLevel.suggestion}</p>

                {/* 量能状态 */}
                <div className="space-y-2">
                  <Label className="text-amber-400">量能状态</Label>
                  <Select value={volumeTrend} onValueChange={(value) => setVolumeTrend(value as any)}>
                    <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-500/30 bg-gray-800">
                      <SelectItem value="top_divergence" className="text-white hover:bg-gray-700">🔴 顶背离（价格上涨但成交量减少）</SelectItem>
                      <SelectItem value="bottom_divergence" className="text-white hover:bg-gray-700">🟢 底背离（价格下跌但成交量减少）</SelectItem>
                      <SelectItem value="no_trend" className="text-white hover:bg-gray-700">⚪ 无趋势</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* BOLL收缩时长 */}
                <div className="space-y-2">
                  <Label className="text-amber-400">BOLL收缩时长</Label>
                  <Select value={bollContraction} onValueChange={(value) => setBollContraction(value as any)}>
                    <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-500/30 bg-gray-800">
                      <SelectItem value="1h" className="text-white hover:bg-gray-700">⏱️ 1小时及以下收缩</SelectItem>
                      <SelectItem value="2h" className="text-white hover:bg-gray-700">⏰ 2小时收缩</SelectItem>
                      <SelectItem value="4h_plus" className="text-white hover:bg-gray-700">⌛ 4小时及以上收缩</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 布林带宽度 */}
                <div className="space-y-2">
                  <Label className="text-amber-400">布林带宽度</Label>
                  <Select value={bollWidth} onValueChange={(value) => setBollWidth(value as any)}>
                    <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-500/30 bg-gray-800">
                      <SelectItem value="converged" className="text-white hover:bg-gray-700">✨ 粘合（上下轨靠得很近）</SelectItem>
                      <SelectItem value="not_converged" className="text-white hover:bg-gray-700">📊 未粘合（布林带较宽）</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* 形态 */}
                <div className="space-y-2">
                  <Label className="text-amber-400">形态</Label>
                  <Select value={pattern} onValueChange={(value) => setPattern(value as any)}>
                    <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="border-amber-500/30 bg-gray-800">
                      <SelectItem value="head_shoulders" className="text-white hover:bg-gray-700">🏔️ 头肩顶（底）</SelectItem>
                      <SelectItem value="double_top_bottom" className="text-white hover:bg-gray-700">👥 双顶底</SelectItem>
                      <SelectItem value="triple_top_bottom" className="text-white hover:bg-gray-700">⛰️ 三重顶（底）</SelectItem>
                      <SelectItem value="triangle" className="text-white hover:bg-gray-700">🔺 三角</SelectItem>
                      <SelectItem value="cup_handle" className="text-white hover:bg-gray-700">☕ 杯柄</SelectItem>
                      <SelectItem value="channel" className="text-white hover:bg-gray-700">📉 通道</SelectItem>
                      <SelectItem value="none" className="text-white hover:bg-gray-700">❌ 无</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="position" className="text-amber-400">仓位 (%)</Label>
                <Select value={String(position)} onValueChange={(value) => setPosition(Number(value) as PositionType)}>
                  <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-amber-500/30 bg-gray-800">
                    {POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)} className="text-white hover:bg-gray-700">
                        {opt}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-400">开仓金额</Label>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-lg font-semibold text-amber-400">
                  ${openAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <p className="text-sm text-amber-500/60">开仓金额 = 仓位 × 资产余额</p>
              </div>

              <div className="flex items-center justify-between space-x-2 py-2">
                <Label htmlFor="is-closed" className="text-amber-400 font-semibold">
                  是否平仓
                </Label>
                <Switch
                  id="is-closed"
                  checked={isClosed}
                  onCheckedChange={setIsClosed}
                  className="data-[state=checked]:bg-amber-500 h-6 w-11 scale-110"
                />
              </div>

              {isClosed && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="close-reason" className="text-amber-400">平仓原因</Label>
                    <Select value={closeReason} onValueChange={(value) => setCloseReason(value as 'profit' | 'loss' | 'other')}>
                      <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-amber-500/30 bg-gray-800">
                        <SelectItem value="profit" className="text-white hover:bg-gray-700">正常止盈</SelectItem>
                        <SelectItem value="loss" className="text-white hover:bg-gray-700">正常止损</SelectItem>
                        <SelectItem value="other" className="text-white hover:bg-gray-700">其他原因</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {closeReason === 'other' && (
                    <div className="space-y-2">
                      <Label htmlFor="remark" className="text-amber-400">备注</Label>
                      <Textarea
                        id="remark"
                        placeholder="请输入备注信息"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="profit-loss" className="text-amber-400">盈亏金额</Label>
                    <Input
                      id="profit-loss"
                      type="number"
                      placeholder="正数为盈利，负数为亏损"
                      value={profitLoss}
                      onChange={(e) => setProfitLoss(e.target.value)}
                      className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="mt-4 pt-4 border-t border-amber-500/20">
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold" onClick={handleAddTrade}>添加记录</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 编辑交易记录对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="border-amber-500/30 bg-gray-900 text-white max-w-md max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-amber-400 to-blue-500 bg-clip-text text-transparent">编辑交易记录</DialogTitle>
              <DialogDescription className="text-amber-500/60">修改交易信息</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-symbol" className="text-amber-400">交易品种</Label>
                <Input
                  id="edit-symbol"
                  placeholder="例如：BTC/USDT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-trade-date" className="text-amber-400">开仓日期</Label>
                <Input
                  id="edit-trade-date"
                  type="datetime-local"
                  value={openDateTime}
                  onChange={(e) => setOpenDateTime(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-strategy" className="text-amber-400">入场策略</Label>
                <Input
                  id="edit-strategy"
                  placeholder="请输入入场策略"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-position" className="text-amber-400">仓位 (%)</Label>
                <Select value={String(position)} onValueChange={(value) => setPosition(Number(value) as PositionType)}>
                  <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="border-amber-500/30 bg-gray-800">
                    {POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)} className="text-white hover:bg-gray-700">
                        {opt}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="text-amber-400">开仓金额</Label>
                <div className="rounded-md border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-lg font-semibold text-amber-400">
                  ${openAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2 py-2">
                <Label htmlFor="edit-is-closed" className="text-amber-400 font-semibold">
                  是否平仓
                </Label>
                <Switch
                  id="edit-is-closed"
                  checked={isClosed}
                  onCheckedChange={setIsClosed}
                  className="data-[state=checked]:bg-amber-500 h-6 w-11 scale-110"
                />
              </div>

              {isClosed && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-close-reason" className="text-amber-400">平仓原因</Label>
                    <Select value={closeReason} onValueChange={(value) => setCloseReason(value as 'profit' | 'loss' | 'other')}>
                      <SelectTrigger className="border-amber-500/30 bg-gray-800 text-white focus:border-amber-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="border-amber-500/30 bg-gray-800">
                        <SelectItem value="profit" className="text-white hover:bg-gray-700">正常止盈</SelectItem>
                        <SelectItem value="loss" className="text-white hover:bg-gray-700">正常止损</SelectItem>
                        <SelectItem value="other" className="text-white hover:bg-gray-700">其他原因</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  {closeReason === 'other' && (
                    <div className="space-y-2">
                      <Label htmlFor="edit-remark" className="text-amber-400">备注</Label>
                      <Textarea
                        id="edit-remark"
                        placeholder="请输入备注信息"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-profit-loss" className="text-amber-400">盈亏金额</Label>
                    <Input
                      id="edit-profit-loss"
                      type="number"
                      placeholder="正数为盈利，负数为亏损"
                      value={profitLoss}
                      onChange={(e) => setProfitLoss(e.target.value)}
                      className="border-amber-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-amber-500"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="mt-4 pt-4 border-t border-amber-500/20">
              <Button 
                variant="outline"
                className="border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
                onClick={() => setIsEditDialogOpen(false)}
              >
                取消
              </Button>
              <Button className="bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold" onClick={handleSaveEdit}>保存修改</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 交易记录列表 */}
        <Card className="border-amber-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(234,179,8,0.1)] backdrop-blur-sm">
          <CardHeader className="border-b border-amber-500/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">交易记录</CardTitle>
                <CardDescription className="text-amber-500/60">所有交易历史记录</CardDescription>
              </div>
              <Dialog>
                <DialogTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300"
                  >
                    其他原因总结
                  </Button>
                </DialogTrigger>
                <DialogContent className="border-blue-500/30 bg-gray-900 text-white max-w-md">
                  <DialogHeader>
                    <DialogTitle className="bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">其他原因交易总结</DialogTitle>
                    <DialogDescription className="text-blue-500/60">平仓原因为"其他原因"的交易记录</DialogDescription>
                  </DialogHeader>
                  <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
                    {(() => {
                      const otherReasonTrades = trades.filter(t => t.closeReason === 'other' && t.remark);
                      if (otherReasonTrades.length === 0) {
                        return <p className="text-center text-amber-500/50 py-4">暂无其他原因的交易记录</p>;
                      }
                      return otherReasonTrades.slice(0, 15).map((trade, index) => (
                        <div 
                          key={trade.id} 
                          className={`p-3 rounded-lg border border-amber-500/20 bg-gray-800/50 ${index < Math.min(otherReasonTrades.length, 15) - 1 ? 'mb-2' : ''}`}
                        >
                          <div className="flex justify-between items-start mb-2">
                            <span className="font-semibold text-white">{trade.symbol}</span>
                            <span className={`font-semibold ${trade.profitLoss >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {trade.profitLoss >= 0 ? '+' : ''}${trade.profitLoss.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                          </div>
                          <div className="text-sm text-gray-400 mb-1">
                            {(() => {
                              const [year, month, day] = trade.date.split('-');
                              return `${year.slice(-2)}/${parseInt(month, 10)}/${parseInt(day, 10)} ${trade.openTime}`;
                            })()}
                          </div>
                          <div className="text-sm">
                            <span className="text-gray-400">原因：</span>
                            <span className="bg-yellow-400 text-black font-semibold px-1 rounded">{trade.remark}</span>
                          </div>
                        </div>
                      ));
                    })()}
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`${trades.length > 15 ? 'max-h-[600px] overflow-y-auto' : ''} overflow-x-auto`}>
              <Table>
                <TableHeader className={trades.length > 15 ? 'sticky top-0 bg-gray-900 z-10' : ''}>
                  <TableRow>
                    <TableHead className="text-amber-400">交易品种</TableHead>
                    <TableHead className="text-amber-400">开仓日期</TableHead>
                    <TableHead className="text-amber-400">入场策略</TableHead>
                    <TableHead className="text-amber-400">仓位</TableHead>
                    <TableHead className="text-amber-400">开仓金额</TableHead>
                    <TableHead className="text-amber-400">盈亏金额</TableHead>
                    <TableHead className="text-amber-400">平仓状态</TableHead>
                    <TableHead className="text-amber-400">平仓原因</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {trades.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-amber-500/50">
                        暂无交易记录
                      </TableCell>
                    </TableRow>
                  ) : (
                    trades.map((trade) => {
                      // 格式化日期时间：年/月/日 时间（精简格式）
                      const formatDateTime = (date: string, time: string) => {
                        const [year, month, day] = date.split('-');
                        const shortYear = year.slice(-2); // 取后两位
                        const shortMonth = parseInt(month, 10).toString(); // 去掉前导零
                        const shortDay = parseInt(day, 10).toString(); // 去掉前导零
                        return `${shortYear}/${shortMonth}/${shortDay} ${time}`;
                      };
                      
                      return (
                        <TableRow 
                          key={trade.id} 
                          className="hover:bg-amber-500/5 border-amber-500/10"
                        >
                          <TableCell className="font-medium text-white">{trade.symbol}</TableCell>
                          <TableCell className="text-gray-300">{formatDateTime(trade.date, trade.openTime)}</TableCell>
                          <TableCell className="text-white">
                            {(() => {
                              const parts = trade.strategy.split('/');
                              const level = parts[0];
                              const rest = parts.slice(1).join('/');
                              
                              // 根据级别设置颜色
                              const getLevelColor = (lvl: string) => {
                                switch (lvl) {
                                  case 'A+': return 'text-yellow-400 font-bold drop-shadow-[0_0_8px_rgba(250,204,21,0.6)]';
                                  case 'A': return 'text-green-400 font-bold drop-shadow-[0_0_8px_rgba(74,222,128,0.6)]';
                                  case 'A-': return 'text-amber-400 font-bold drop-shadow-[0_0_8px_rgba(34,211,238,0.6)]';
                                  case 'B+': return 'text-blue-400 font-bold drop-shadow-[0_0_8px_rgba(96,165,250,0.6)]';
                                  case 'B': return 'text-indigo-400 font-bold drop-shadow-[0_0_8px_rgba(129,140,248,0.6)]';
                                  case 'B-': return 'text-purple-400 font-bold drop-shadow-[0_0_8px_rgba(192,132,252,0.6)]';
                                  case 'C': return 'text-gray-400 font-bold';
                                  default: return 'text-white font-bold';
                                }
                              };
                              
                              return (
                                <>
                                  <span className={getLevelColor(level)}>{level}</span>
                                  {rest && <span className="text-gray-300">/{rest}</span>}
                                </>
                              );
                            })()}
                          </TableCell>
                          <TableCell className="text-amber-300">{trade.position}%</TableCell>
                          <TableCell className="font-semibold text-amber-400">${trade.openAmount.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</TableCell>
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
                          <TableCell className="text-white">
                            <div className="flex items-center justify-between">
                              <span>{getCloseReasonComponent(trade.closeReason, trade.remark)}</span>
                              <Popover>
                                <PopoverTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 w-7 p-0 text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                                  >
                                    <MoreVertical className="h-4 w-4" />
                                  </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-32 p-2 bg-gray-900 border-amber-500/30" align="end">
                                  <div className="flex flex-col gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full justify-start text-amber-400 hover:bg-amber-500/10 hover:text-amber-300"
                                      onClick={() => handleEditTrade(trade)}
                                    >
                                      编辑
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300"
                                      onClick={() => handleDeleteTrade(trade.id)}
                                    >
                                      删除
                                    </Button>
                                  </div>
                                </PopoverContent>
                              </Popover>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })
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
