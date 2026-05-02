'use client';

import { useState, useEffect, useMemo, useCallback } from 'react';
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
import { Trash2, MoreVertical, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { api } from '@/lib/api';
import {
  useTradingData,
  type Trade,
  type FundRecord,
  type PositionType,
  type VolumeTrend,
  type BollContraction,
  type BollWidth,
  type Pattern,
  type CloseReason,
  type BinanceOptionsStatus,
} from '@/hooks/useTradingData';
import { toast } from 'sonner';
import { fmt, fmtTick, formatTradeDateTime, getLevelColor, getCloseReasonText, todayStr, daysAgoStr } from '@/lib/utils';

// 仓位选项：5% 到 50%，每个增加 5%
const POSITION_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);

// BOLL收缩 / 形态文本映射（模块级常量，避免每次 render 重建对象）
const BOLL_CONTRACTION_TEXT: Record<string, string> = {
  '1h': '1h收缩',
  '2h': '2h收缩',
  '4h_plus': '4h+收缩',
};
const BOLL_WIDTH_TEXT: Record<string, string> = {
  'converged': '粘合',
  'not_converged': '未粘合',
};
const PATTERN_TEXT: Record<string, string> = {
  'head_shoulders': '头肩顶底',
  'double_top_bottom': '双顶底',
  'triple_top_bottom': '三重顶底',
  'triangle': '三角',
  'cup_handle': '杯柄',
  'channel': '通道',
};

/** 将 date + openTime 合并为 datetime-local 格式（模块级纯函数） */
function combineDateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

export default function TradingApp() {
  // 使用自定义 hook 管理交易数据
  const {
    accounts,
    currentAccountId,
    setCurrentAccountId,
    balance,
    setBalance,
    trades,
    setTrades,
    fundRecords,
    setFundRecords,
    binanceOptionsStatus,
    loading,
    error,
    loadData
  } = useTradingData();

  // 账户管理状态
  const [isAccountDialogOpen, setIsAccountDialogOpen] = useState(false);
  const [newAccountName, setNewAccountName] = useState<string>('');
  const [editingAccount, setEditingAccount] = useState<{ id: number; name: string } | null>(null);
  const [editAccountName, setEditAccountName] = useState<string>('');
  
  // 时间段统计卡片选择状态
  const [periodSelections, setPeriodSelections] = useState([
    { id: 0, days: 0 },      // 默认今天
    { id: 1, days: 2 },      // 默认三天
    { id: 2, days: 6 },      // 默认一周
    { id: 3, days: 29 },     // 默认一月
  ]);
  
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
  // openAmount 是纯派生值，用 useMemo 而非 state
  const openAmount = useMemo(() => (Number(balance) * position) / 100, [balance, position]);
  const [openDateTime, setOpenDateTime] = useState<string>(new Date().toISOString().slice(0, 16));
  const [closeReason, setCloseReason] = useState<CloseReason>('profit');
  const [remark, setRemark] = useState<string>('');
  const [profitLoss, setProfitLoss] = useState<string>('');
  const [isClosed, setIsClosed] = useState<boolean>(true);

  // 交易分级系统状态
  const [volumeTrend, setVolumeTrend] = useState<VolumeTrend>('no_trend');
  const [bollContraction, setBollContraction] = useState<BollContraction>('1h');
  const [bollWidth, setBollWidth] = useState<BollWidth>('not_converged');
  const [pattern, setPattern] = useState<Pattern>('none');

  // 日期筛选状态
  const [filterStartDate, setFilterStartDate] = useState<string>('');
  const [filterEndDate, setFilterEndDate] = useState<string>('');

  // 编辑相关状态
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

  // 设置对话框状态
  const [isSettingsDialogOpen, setIsSettingsDialogOpen] = useState(false);
  const [settingsApiKey, setSettingsApiKey] = useState('');
  const [settingsApiSecret, setSettingsApiSecret] = useState('');
  const [isSavingSettings, setIsSavingSettings] = useState(false);

  // 交易来源切换状态
  type TradeSourceTab = 'manual' | 'binance';
  const [tradeSourceTab, setTradeSourceTab] = useState<TradeSourceTab>('manual');

  // 计算交易级别（useMemo，只在相关 state 变化时重算）
  const tradeLevel = useMemo((): { level: string; color: string; description: string; suggestion: string } => {
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
  }, [volumeTrend, bollContraction, bollWidth, pattern]);

  // 快捷日期选择处理函数
  const handleQuickDateFilter = useCallback((type: 'week' | 'month' | '3month' | 'halfYear' | 'year') => {
    const daysMap = { week: 7, month: 30, '3month': 90, halfYear: 180, year: 365 } as const;
    setFilterStartDate(daysAgoStr(daysMap[type]));
    setFilterEndDate(todayStr());
  }, []);

  // 账户管理函数
  const handleCreateAccount = useCallback(async () => {
    if (!newAccountName.trim()) {
      toast.error('请输入账户名称');
      return;
    }
    try {
      const res = await api.accounts.create(newAccountName.trim());
      loadData(res.account.id);
      setNewAccountName('');
      setIsAccountDialogOpen(false);
      // 切换到新创建的账户
      setCurrentAccountId(res.account.id);
      toast.success('账户创建成功');
    } catch (error: any) {
      toast.error(error.message || '创建账户失败');
    }
  }, [newAccountName, loadData]);

  const handleUpdateAccount = useCallback(async () => {
    if (!editingAccount || !editAccountName.trim()) {
      toast.error('请输入账户名称');
      return;
    }
    try {
      const res = await api.accounts.update(editingAccount.id, editAccountName.trim());
      loadData(currentAccountId);
      setEditingAccount(null);
      setEditAccountName('');
      toast.success('账户更新成功');
    } catch (error: any) {
      toast.error(error.message || '更新账户失败');
    }
  }, [editingAccount, editAccountName, currentAccountId, loadData]);

  const handleDeleteAccount = useCallback(async (id: number) => {
    if (id === 1) {
      toast.error('不能删除默认账户');
      return;
    }
    if (!confirm('确定要删除此账户吗？该账户下的所有交易记录和出入金记录都会被删除。')) {
      return;
    }
    try {
      await api.accounts.delete(id);
      // 如果删除的是当前账户，切换到默认账户
      if (currentAccountId === id) {
        setCurrentAccountId(1);
        loadData(1);
      } else {
        loadData(currentAccountId);
      }
      toast.success('账户删除成功');
    } catch (error: any) {
      toast.error(error.message || '删除账户失败');
    }
  }, [currentAccountId, loadData]);

  const currentAccount = accounts.find(a => a.id === currentAccountId);

  // 币安期权连接状态标签
  const binanceStatusLabel = binanceOptionsStatus.error
    ? 'Binance options sync error'
    : binanceOptionsStatus.configured
      ? 'Binance options connected'
      : 'Binance options not configured';
  const binanceStatusClassName = binanceOptionsStatus.error
    ? 'border-red-500/30 bg-red-500/10 text-red-300'
    : binanceOptionsStatus.configured
      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
      : 'border-amber-500/30 bg-amber-500/10 text-amber-300';

  // 刷新交易列表（静默刷新，不触发全屏 loading）
  const handleRefreshTradeList = useCallback(async () => {
    const ok = await loadData(currentAccountId, true);
    if (!ok) {
      toast.error('Refresh failed, please try again later');
      return;
    }
    toast.success('List refreshed');
  }, [currentAccountId, loadData]);

  // 计算累计入金和出金
  const { totalDeposit, totalWithdraw } = useMemo(() => {
    const deposit = fundRecords.filter(r => r.type === 'deposit').reduce((sum, r) => sum + (r.amount || 0), 0);
    const withdraw = fundRecords.filter(r => r.type === 'withdraw').reduce((sum, r) => sum + (r.amount || 0), 0);
    return { totalDeposit: deposit, totalWithdraw: withdraw };
  }, [fundRecords]);

  // 添加资金记录
  const handleAddFund = useCallback(async (type: 'deposit' | 'withdraw') => {
    const amount = Number(fundAmount);
    if (!amount || amount <= 0) return;
    if (!fundDate) return;

    // Number() 强转防止 balance 是 string
    const currentBalance = Number(balance) || 0;

    // 出金时检查余额是否足够
    if (type === 'withdraw' && amount > currentBalance) {
      toast.error('余额不足，无法出金');
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
      const fallbackBalance = type === 'deposit' ? currentBalance + amount : currentBalance - amount;
      const updatedBalance = recordRes.balance ?? fallbackBalance;

      setBalance(Number(updatedBalance) || 0);

      // 更新出入金记录列表
      setFundRecords(prev => [recordRes.record, ...prev]);

      setFundAmount('');
      setFundDate(new Date().toISOString().split('T')[0]);
      if (type === 'deposit') {
        setIsDepositDialogOpen(false);
      } else {
        setIsWithdrawDialogOpen(false);
      }
      toast.success(type === 'deposit' ? '入金成功' : '出金成功');
    } catch (error: any) {
      console.error('Failed to add fund record:', error);
      const msg = error?.message || '未知错误';
      if (msg.includes('Insufficient balance')) {
        toast.error('余额不足，无法出金');
      } else {
        toast.error('添加出入金记录失败：' + msg);
      }
    }
  }, [fundAmount, fundDate, balance, currentAccountId]);

  // 删除出入金记录
  const handleDeleteFundRecord = useCallback(async (id: string) => {
    try {
      const record = fundRecords.find(r => r.id === id);
      if (!record) { alert('前端找不到该记录，id=' + id); return; }

      console.log('[handleDeleteFundRecord] 开始删除', id, 'balance=', balance, 'record=', record);

      // 删除记录（后端会实时重算余额并返回）
      const deleteRes = await api.fundRecords.delete(id, currentAccountId);
      console.log('[handleDeleteFundRecord] 后端响应:', deleteRes);

      // 使用后端返回的余额值
      setBalance(Number(deleteRes.balance) || 0);
      setFundRecords(prev => prev.filter(r => r.id !== id));
      toast.success('记录删除成功');
    } catch (error: any) {
      console.error('Failed to delete fund record:', error);
      const msg = error?.message || '未知错误';
      alert('删除出入金记录失败：' + msg);
      toast.error('删除出入金记录失败：' + msg);
    }
  }, [fundRecords, balance, currentAccountId]);

  // 添加交易记录
  const handleAddTrade = useCallback(async () => {
    // 验证必填字段
    if (!symbol || !openDateTime) {
      toast.error('请填写交易品种和开仓日期');
      return;
    }

    // 如果已平仓，盈亏金额必填
    if (isClosed && !profitLoss) {
      toast.error('已平仓时，盈亏金额为必填项');
      return;
    }

    // 计算盈亏金额（如果填写了）
    let pl = 0;
    if (profitLoss) {
      pl = Number(profitLoss);
      if (isNaN(pl)) {
        toast.error('盈亏金额必须是有效数字');
        return;
      }

      // 检查亏损是否会导致余额为负数
      if (pl < 0 && Number(balance) + pl < 0) {
        toast.error('余额不足，无法添加此亏损交易');
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
      
      // BOLL收缩时长 & 布林带宽度（使用模块级常量）
      parts.push(BOLL_CONTRACTION_TEXT[bollContraction] ?? bollContraction);
      parts.push(BOLL_WIDTH_TEXT[bollWidth] ?? bollWidth);
      
      // 形态：只有有形态才显示
      if (pattern !== 'none') {
        parts.push(PATTERN_TEXT[pattern] ?? pattern);
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

      // 从响应中获取更新后的余额（用 ?? 而非 ||，避免余额为 0 时取错值）
      const currentBalance = Number(balance) || 0;
      const updatedBalance = tradeRes.balance ?? (currentBalance + pl);
      setBalance(Number(updatedBalance) || 0);

      // 添加交易记录
      setTrades(prev => [tradeRes.trade, ...prev]);

      // 重置表单
      resetTradeForm();
      setIsTradeDialogOpen(false);
      toast.success('交易记录添加成功');
    } catch (error: any) {
      console.error('Failed to add trade:', error);
      toast.error('添加交易记录失败：' + (error?.message || '未知错误'));
    }
  }, [symbol, openDateTime, isClosed, profitLoss, balance, currentAccountId, tradeLevel.level, volumeTrend, bollContraction, bollWidth, pattern, position, openAmount, closeReason, remark]);

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

      // 币安期权来源的交易只读，不可删除
      if (tradeToDelete.source === 'binance-options' || tradeToDelete.isReadOnly) {
        toast.error('币安期权成交记录为只读，无法删除');
        return;
      }

      // Number() 强转防止 balance 是 string 时相减变 NaN
      const currentBalance = Number(balance) || 0;
      const pl = Number(tradeToDelete.profitLoss) || 0;
      const estimatedBalance = currentBalance - pl;

      if (pl > 0 && estimatedBalance < 0) {
        toast.error('删除此盈利交易会导致余额为负数，无法删除');
        return;
      }

      // 删除交易记录（后端会自动更新余额并返回新的余额）
      const deleteRes = await api.trades.delete(tradeId, currentAccountId);

      // 使用后端返回的余额值
      const updatedBalance = deleteRes.balance ?? estimatedBalance;
      setBalance(Number(updatedBalance) || 0);

      setTrades(prev => prev.filter(t => t.id !== tradeId));
      toast.success('交易记录删除成功');
    } catch (error: any) {
      console.error('Failed to delete trade:', error);
      const msg = error?.message || '未知错误';
      if (msg.includes('Insufficient balance')) {
        toast.error('删除此交易会导致余额为负数，无法删除');
      } else {
        toast.error('删除交易记录失败：' + msg);
      }
    }
  }, [trades, balance, currentAccountId]);

  // 编辑交易记录
  const handleEditTrade = useCallback((trade: Trade) => {
    // 币安期权来源的交易只读，不可编辑
    if (trade.source === 'binance-options' || trade.isReadOnly) {
      toast.error('币安期权成交记录为只读，无法编辑');
      return;
    }
    setEditingTrade(trade);
    setSymbol(trade.symbol);
    setStrategy(trade.strategy);
    setPosition(trade.position);
    setOpenDateTime(combineDateTime(trade.date, trade.openTime));
    setCloseReason(trade.closeReason);
    setRemark(trade.remark || '');
    setProfitLoss(String(trade.profitLoss || 0));
    setIsClosed(trade.isClosed);
    setIsEditDialogOpen(true);
  }, []);

  // 保存编辑
  const handleSaveEdit = useCallback(async () => {
    if (!editingTrade || !symbol || !openDateTime) return;

    // 如果已平仓，盈亏金额必填
    if (isClosed && !profitLoss) {
      toast.error('已平仓时，盈亏金额为必填项');
      return;
    }

    try {
      const oldProfitLoss = Number(editingTrade.profitLoss) || 0;
      const currentBalance = Number(balance) || 0;

      // 计算新盈亏（如果填写了）
      let newProfitLoss = oldProfitLoss;
      let estimatedBalance = currentBalance;

      if (profitLoss && isClosed) {
        newProfitLoss = Number(profitLoss);

        // 检查编辑后余额是否为负数
        estimatedBalance = currentBalance - oldProfitLoss + newProfitLoss;
        if (estimatedBalance < 0) {
          toast.error('修改后的盈亏会导致余额为负数，无法保存');
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
      const updatedBalance = updatedTradeRes.balance ?? estimatedBalance;
      setBalance(Number(updatedBalance) || 0);

      // 更新交易列表
      setTrades(prev => prev.map(t => t.id === editingTrade.id ? updatedTradeRes.trade : t));

      // 关闭对话框并重置表单（防止污染添加表单）
      setIsEditDialogOpen(false);
      setEditingTrade(null);
      resetTradeForm();
      toast.success('交易记录更新成功');
    } catch (error: any) {
      console.error('Failed to save trade:', error);
      const msg = error?.message || '未知错误';
      if (msg.includes('Insufficient balance')) {
        toast.error('修改后的盈亏会导致余额为负数，无法保存');
      } else {
        toast.error('保存交易记录失败：' + msg);
      }
    }
  }, [editingTrade, symbol, openDateTime, isClosed, profitLoss, balance, currentAccountId, closeReason, remark, position, strategy]);

  // 重置交易表单（添加和编辑共用）
  const resetTradeForm = useCallback(() => {
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
  }, []);

  // 平仓原因显示
  const getCloseReasonComponent = useCallback((reason: string, remark?: string) => {
    if (reason === 'other' && remark) {
      return (
        <span>
          其他原因 (<span className="text-yellow-400 font-semibold">{remark}</span>)
        </span>
      );
    }
    return <span>{getCloseReasonText(reason, remark)}</span>;
  }, []);

  // 根据日期范围和来源标签过滤交易
  const filteredTrades = useMemo(() => {
    let filtered = trades;

    // 来源过滤
    if (tradeSourceTab === 'manual') {
      filtered = filtered.filter(t => t.source !== 'binance-options');
    } else if (tradeSourceTab === 'binance') {
      filtered = filtered.filter(t => t.source === 'binance-options');
    }

    // 日期过滤
    if (filterStartDate || filterEndDate) {
      filtered = filtered.filter((trade) => {
        const tradeDate = trade.date;
        if (filterStartDate && filterEndDate) return tradeDate >= filterStartDate && tradeDate <= filterEndDate;
        if (filterStartDate) return tradeDate >= filterStartDate;
        if (filterEndDate) return tradeDate <= filterEndDate;
        return true;
      });
    }

    return filtered;
  }, [trades, filterStartDate, filterEndDate, tradeSourceTab]);

  // 单次遍历计算所有统计数据（避免 JSX 里多次 filter+reduce）
  const filteredStats = useMemo(() => {
    let tradeCount = 0, winTotal = 0, winCount = 0, lossTotal = 0, lossCount = 0;
    for (const t of filteredTrades) {
      if (t.source === 'binance-options') continue; // 不统计币安期权成交
      const pl = Number(t.profitLoss) || 0;
      tradeCount++;
      if (pl > 0) { winTotal += pl; winCount++; }
      else if (pl < 0) { lossTotal += pl; lossCount++; }
    }
    const total = winTotal + lossTotal;
    const winRate = tradeCount > 0
      ? Math.round((winCount / tradeCount) * 100)
      : 0;
    return { tradeCount, winTotal, winCount, lossTotal, lossCount, total, winRate };
  }, [filteredTrades]);

  // "其他原因总结"弹窗数据（useMemo，避免每次 render 重 filter）
  const otherReasonTrades = useMemo(
    () => trades.filter(t => t.source !== 'binance-options' && t.closeReason === 'other' && t.remark).slice(0, 15),
    [trades]
  );

  // 时间段统计卡片数据（useMemo，单次扫描，O(n)）
  const periodStats = useMemo(() => {
    return periodSelections.map(({ days }) => {
      const startStr = daysAgoStr(days);
      const endStr = todayStr();
      let count = 0, totalPL = 0, wins = 0;
      for (const t of trades) {
        if (t.source === 'binance-options') continue; // 不统计币安期权成交
        if (t.date >= startStr && t.date <= endStr) {
          const pl = Number(t.profitLoss) || 0;
          count++;
          totalPL += pl;
          if (pl > 0) wins++;
        }
      }
      return { count, totalPL, winRate: count > 0 ? Math.round((wins / count) * 100) : 0 };
    });
  }, [trades, periodSelections]);

  // 图表走势数据（useMemo，O(n) 前缀和，避免每个日期都重新 filter+reduce）
  const chartData = useMemo(() => {
    if (trades.length === 0 && fundRecords.length === 0) return null;

    type DayAcc = { dep: number; wit: number; pl: number };
    const dayMap = new Map<string, DayAcc>();

    const getOrCreate = (d: string): DayAcc => {
      let v = dayMap.get(d);
      if (!v) { v = { dep: 0, wit: 0, pl: 0 }; dayMap.set(d, v); }
      return v;
    };

    for (const r of fundRecords) {
      const acc = getOrCreate(r.date);
      if (r.type === 'deposit') acc.dep += Number(r.amount) || 0;
      else acc.wit += Number(r.amount) || 0;
    }
    for (const t of trades) {
      if (t.source === 'binance-options') continue; // 不计入资产走势图
      getOrCreate(t.date).pl += Number(t.profitLoss) || 0;
    }

    const sortedDates = Array.from(dayMap.keys()).sort();
    let cumDep = 0, cumWit = 0, cumPL = 0;
    const points = sortedDates.map(date => {
      const { dep, wit, pl } = dayMap.get(date)!;
      cumDep += dep; cumWit += wit; cumPL += pl;
      return { date: date.slice(5), fullDate: date, balance: cumDep - cumWit + cumPL };
    });

    const returnRate = cumDep > 0 ? (cumPL / cumDep * 100).toFixed(2) : '0.00';
    return { points, totalDep: cumDep, totalWit: cumWit, totalPL: cumPL, returnRate };
  }, [trades, fundRecords]);

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
            {/* 币安期权连接状态 */}
            <div className="mt-3 flex flex-wrap items-center justify-center gap-2 text-xs">
              <span className={`inline-flex items-center rounded-full border px-3 py-1 font-medium ${binanceStatusClassName}`}>
                {binanceStatusLabel}
              </span>
              <span className="text-amber-300/70">
                {binanceOptionsStatus.configured ? `已同步 ${binanceOptionsStatus.count} 笔成交` : '配置 Binance API 以显示期权成交'}
              </span>
              {binanceOptionsStatus.error && (
                <span className="text-red-300/80">{binanceOptionsStatus.error}</span>
              )}
            </div>
          </div>
          <div className="w-full sm:w-auto sm:ml-4 flex flex-col gap-2">
            <Button 
              onClick={handleDownloadData}
              className="w-full sm:w-auto bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-black font-semibold shadow-[0_0_20px_rgba(234,179,8,0.3)]"
            >
              下载数据
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshTradeList}
              className="w-full sm:w-auto border-amber-500/30 text-amber-400 hover:bg-amber-500/10"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              刷新列表
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSettingsApiKey('');
                setSettingsApiSecret('');
                setIsSettingsDialogOpen(true);
              }}
              className="w-full sm:w-auto border-blue-500/30 text-blue-400 hover:bg-blue-500/10"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/>
                <circle cx="12" cy="12" r="3"/>
              </svg>
              API 设置
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
              <div className="text-3xl sm:text-4xl font-bold text-amber-400">{fmt(balance)}</div>
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
                  <div className="text-sm font-semibold text-green-400">{fmt(totalDeposit)}</div>
                </div>
                <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-center">
                  <div className="text-xs text-red-400/70">累计出金</div>
                  <div className="text-sm font-semibold text-red-400">{fmt(totalWithdraw)}</div>
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
                            {fmt(record.amount)}
                          </span>
                          <span className="text-xs text-gray-400">
                            {record.date}
                          </span>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/10"
                          onClick={() => {
                            if (window.confirm(`确认删除这条${record.type === 'deposit' ? '入金' : '出金'}记录（${fmt(record.amount)}）？`)) {
                              handleDeleteFundRecord(record.id);
                            }
                          }}
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
                {!chartData ? (
                  <div className="text-center py-8 text-gray-400">
                    暂无数据，请先添加交易或出入金记录
                  </div>
                ) : (
                  <>
                    {/* 统计信息 */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
                      <div className="rounded-lg border border-amber-500/20 bg-gray-800/60 p-3 text-center">
                        <div className="text-xs text-gray-400 mb-1">当前余额</div>
                        <div className="text-lg font-semibold text-amber-400">
                          {fmt(balance)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-blue-500/20 bg-gray-800/60 p-3 text-center">
                        <div className="text-xs text-gray-400 mb-1">入金 / 出金</div>
                        <div className="text-base font-semibold">
                          <span className="text-green-400">{fmt(chartData.totalDep, { decimals: 0 })}</span>
                          <span className="text-gray-500 mx-1">/</span>
                          <span className="text-red-400">{fmt(chartData.totalWit, { decimals: 0 })}</span>
                        </div>
                      </div>
                      <div className="rounded-lg border border-purple-500/20 bg-gray-800/60 p-3 text-center">
                        <div className="text-xs text-gray-400 mb-1">累计盈利</div>
                        <div className={`text-lg font-semibold ${chartData.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {chartData.totalPL >= 0 ? '+' : ''}{fmt(chartData.totalPL)}
                        </div>
                      </div>
                      <div className="rounded-lg border border-cyan-500/20 bg-gray-800/60 p-3 text-center">
                        <div className="text-xs text-gray-400 mb-1">盈利率</div>
                        <div className={`text-lg font-semibold ${Number(chartData.returnRate) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {Number(chartData.returnRate) >= 0 ? '+' : ''}{chartData.returnRate}%
                        </div>
                      </div>
                    </div>

                    {/* 走势图 */}
                    <div className="h-64 w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={chartData.points}>
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
                            tickFormatter={fmtTick}
                          />
                          <Tooltip
                            contentStyle={{
                              backgroundColor: '#1F2937',
                              border: '1px solid rgba(245, 158, 11, 0.3)',
                              borderRadius: '8px',
                              color: '#F3F4F6'
                            }}
                            formatter={(value: unknown) => [fmt(value), '余额']}
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
                )}
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
                  const stats = periodStats[index];

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
                            {stats.totalPL >= 0 ? '+' : ''}{fmt(stats.totalPL)}
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

            {/* 手动交易统计（仅在手动交易标签页显示） */}
            {tradeSourceTab === 'manual' && (
              <>
            {/* 盈利统计 */}
            <div className="mb-4">
              <div className="mb-2 text-sm text-green-400">盈利统计</div>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {fmt(filteredStats.winTotal)}
                  </div>
                  <div className="text-sm text-green-400/70">盈利金额</div>
                </div>
                <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-green-400">
                    {filteredStats.winCount}
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
                    {fmt(filteredStats.lossTotal)}
                  </div>
                  <div className="text-sm text-red-400/70">亏损金额</div>
                </div>
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-4 text-center">
                  <div className="text-2xl font-bold text-red-400">
                    {filteredStats.lossCount}
                  </div>
                  <div className="text-sm text-red-400/70">亏损次数</div>
                </div>
              </div>
            </div>
              </>
            )}

            {/* Binance 期权信息提示 */}
            {tradeSourceTab === 'binance' && (
              <div className="mb-4 rounded-lg border border-blue-500/20 bg-blue-500/5 p-4">
                <div className="flex items-center gap-2 text-blue-400 mb-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 15h-2v-6h2v6zm0-8h-2V7h2v2zm4 8h-2v-6h2v6zm0-8h-2V7h2v2z"/>
                  </svg>
                  <span className="font-medium">Binance 期权成交记录</span>
                </div>
                <div className="text-sm text-blue-300/70 space-y-1">
                  <p>• 数据来自 Binance EAPI 期权账户，实时同步</p>
                  <p>• 点击右上角「API 设置」配置 Binance API 凭证</p>
                  <p>• 以下记录为只读数据，无法编辑或删除</p>
                  {binanceOptionsStatus.count > 0 && (
                    <p className="font-medium text-blue-300">当前显示 {filteredTrades.length} 笔成交记录</p>
                  )}
                </div>
              </div>
            )}

            {/* 总体统计 */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
              <div className="rounded-lg border border-amber-500/30 bg-gray-800/50 p-3 sm:p-4 text-center backdrop-blur-sm">
                <div className={`text-xl sm:text-2xl font-bold ${filteredStats.total >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {filteredStats.total >= 0 ? '+' : ''}{fmt(filteredStats.total)}
                </div>
                <div className="text-xs sm:text-sm text-amber-500/60">总盈亏</div>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-gray-800/50 p-3 sm:p-4 text-center backdrop-blur-sm">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">{filteredTrades.length}</div>
                <div className="text-xs sm:text-sm text-amber-500/60">交易次数</div>
              </div>
              <div className="rounded-lg border border-amber-500/30 bg-gray-800/50 p-3 sm:p-4 text-center backdrop-blur-sm">
                <div className="text-xl sm:text-2xl font-bold text-amber-400">
                  {filteredStats.winRate}%
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
                  {fmt(openAmount)}
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
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) { setEditingTrade(null); resetTradeForm(); }
        }}>
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
                  {fmt(openAmount)}
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
                onClick={() => { setIsEditDialogOpen(false); setEditingTrade(null); resetTradeForm(); }}
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
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">交易记录</CardTitle>
                <CardDescription className="text-amber-500/60">所有交易历史记录</CardDescription>
              </div>
              <div className="flex items-center gap-2">
                {/* 交易来源切换 */}
                <div className="inline-flex rounded-lg border border-amber-500/30 bg-gray-800 p-0.5">
                  <button
                    onClick={() => setTradeSourceTab('manual')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all ${
                      tradeSourceTab === 'manual'
                        ? 'bg-amber-500/20 text-amber-400 font-medium shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    手动交易
                  </button>
                  <button
                    onClick={() => setTradeSourceTab('binance')}
                    className={`px-3 py-1.5 text-sm rounded-md transition-all flex items-center gap-1.5 ${
                      tradeSourceTab === 'binance'
                        ? 'bg-blue-500/20 text-blue-400 font-medium shadow-sm'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    Binance 期权
                    {!binanceOptionsStatus.configured && (
                      <span className="text-xs text-gray-500">(未配置)</span>
                    )}
                  </button>
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
                      {otherReasonTrades.length === 0 ? (
                        <p className="text-center text-amber-500/50 py-4">暂无其他原因的交易记录</p>
                      ) : (
                        otherReasonTrades.map((trade, index) => (
                          <div key={trade.id}
                            className={`p-3 rounded-lg border border-amber-500/20 bg-gray-800/50 ${index < otherReasonTrades.length - 1 ? 'mb-2' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-white">{trade.symbol}</span>
                              <span className={`font-semibold ${(Number(trade.profitLoss) || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(Number(trade.profitLoss) || 0) >= 0 ? '+' : ''}{fmt(trade.profitLoss)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 mb-1">
                              {formatTradeDateTime(trade.date, trade.openTime)}
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-400">原因：</span>
                              <span className="bg-yellow-400 text-black font-semibold px-1 rounded">{trade.remark}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className={`${filteredTrades.length > 15 ? 'max-h-[600px] overflow-y-auto' : ''} overflow-x-auto`}>
              {/* 根据数据来源显示不同表格 */}
              {tradeSourceTab === 'binance' ? (
                /* Binance 期权专用表格 */
                <Table>
                  <TableHeader className={filteredTrades.length > 15 ? 'sticky top-0 bg-gray-900 z-10' : ''}>
                    <TableRow>
                      <TableHead className="text-blue-400">交易品种</TableHead>
                      <TableHead className="text-blue-400">成交时间</TableHead>
                      <TableHead className="text-blue-400">方向</TableHead>
                      <TableHead className="text-blue-400">类型</TableHead>
                      <TableHead className="text-blue-400">数量</TableHead>
                      <TableHead className="text-blue-400">价格</TableHead>
                      <TableHead className="text-blue-400">报价金额</TableHead>
                      <TableHead className="text-blue-400">手续费</TableHead>
                      <TableHead className="text-blue-400">已实现盈亏</TableHead>
                      <TableHead className="text-blue-400">订单号</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={10} className="text-center text-blue-500/50">
                          暂无 Binance 期权成交记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrades.map((trade) => {
                        const isBinance = trade.source === 'binance-options';
                        const sideColor = trade.side === 'BUY' ? 'text-green-400' : trade.side === 'SELL' ? 'text-red-400' : 'text-gray-400';
                        const sideText = trade.side === 'BUY' ? '买入 (Buy)' : trade.side === 'SELL' ? '卖出 (Sell)' : '-';
                        const contractTypeColor = trade.strategy?.includes('Call') ? 'text-green-400' : trade.strategy?.includes('Put') ? 'text-red-400' : 'text-gray-400';
                        const contractTypeText = trade.strategy?.includes('Call') ? 'Call (看涨)' : trade.strategy?.includes('Put') ? 'Put (看跌)' : '-';
                        const isMaker = trade.strategy?.includes('Maker');
                        
                        return (
                          <TableRow 
                            key={trade.id} 
                            className="hover:bg-blue-500/5 border-blue-500/10"
                          >
                            <TableCell className="font-medium text-white">
                              <div className="flex flex-col gap-0.5">
                                <span className="font-semibold">{trade.symbol}</span>
                                {isMaker && (
                                  <span className="inline-flex items-center rounded-full bg-purple-500/20 border border-purple-500/40 px-1.5 py-0.5 text-[10px] font-medium text-purple-400 w-fit">
                                    Maker
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300 text-sm">
                              {formatTradeDateTime(trade.date, trade.openTime)}
                            </TableCell>
                            <TableCell className={`font-semibold ${sideColor}`}>
                              {sideText}
                            </TableCell>
                            <TableCell className={`font-medium ${contractTypeColor}`}>
                              {contractTypeText}
                            </TableCell>
                            <TableCell className="text-amber-300">
                              {trade.quantity ? trade.quantity.toFixed(4) : '-'}
                            </TableCell>
                            <TableCell className="text-amber-300">
                              {trade.price ? `$${trade.price.toFixed(4)}` : '-'}
                            </TableCell>
                            <TableCell className="font-semibold text-amber-400">
                              ${trade.openAmount.toFixed(2)}
                            </TableCell>
                            <TableCell className="text-red-400 text-sm">
                              {trade.fee ? `-$${trade.fee.toFixed(4)}` : '-'}
                            </TableCell>
                            <TableCell className={`font-semibold ${(trade.profitLoss || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(trade.profitLoss || 0) >= 0 ? '+' : ''}{trade.profitLoss ? `$${trade.profitLoss.toFixed(2)}` : '-'}
                            </TableCell>
                            <TableCell className="text-gray-400 text-xs">
                              {trade.orderId ? (
                                <span className="font-mono bg-gray-800 px-1.5 py-0.5 rounded" title={trade.orderId}>
                                  {trade.orderId.slice(0, 8)}...
                                </span>
                              ) : '-'}
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              ) : (
                /* 手动交易表格 */
                <Table>
                  <TableHeader className={filteredTrades.length > 15 ? 'sticky top-0 bg-gray-900 z-10' : ''}>
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
                    {filteredTrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-amber-500/50">
                          暂无交易记录
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrades.map((trade) => {
                        const isBinance = trade.source === 'binance-options';
                        return (
                          <TableRow 
                            key={trade.id} 
                            className="hover:bg-amber-500/5 border-amber-500/10"
                          >
                            <TableCell className="font-medium text-white">
                              <div className="flex flex-col gap-0.5">
                                <span>{trade.symbol}</span>
                                {isBinance && (
                                  <span className="inline-flex items-center rounded-full bg-blue-500/20 border border-blue-500/40 px-1.5 py-0.5 text-[10px] font-medium text-blue-400 w-fit">
                                    Binance
                                  </span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell className="text-gray-300">{formatTradeDateTime(trade.date, trade.openTime)}</TableCell>
                            <TableCell className="text-white">
                              {isBinance ? (
                                <span className="text-gray-300">{trade.strategy}</span>
                              ) : (
                                (() => {
                                  const parts = trade.strategy.split('/');
                                  const level = parts[0];
                                  const rest = parts.slice(1).join('/');
                                  return (
                                    <>
                                      <span className={getLevelColor(level)}>{level}</span>
                                      {rest && <span className="text-gray-300">/{rest}</span>}
                                    </>
                                  );
                                })()
                              )}
                            </TableCell>
                            <TableCell className="text-amber-300">{isBinance ? '-' : `${trade.position}%`}</TableCell>
                            <TableCell className="font-semibold text-amber-400">{fmt(trade.openAmount)}</TableCell>
                            <TableCell className={`font-semibold ${(Number(trade.profitLoss) || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {(Number(trade.profitLoss) || 0) >= 0 ? '+' : ''}{fmt(trade.profitLoss)}
                            </TableCell>
                            <TableCell>
                              {isBinance ? (
                                <span className="inline-flex items-center rounded-full bg-blue-500/10 border border-blue-500/30 px-2.5 py-0.5 text-xs font-medium text-blue-400">
                                  成交
                                </span>
                              ) : trade.isClosed ? (
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
                                <span>
                                  {isBinance
                                    ? (() => {
                                        const parts = [
                                          trade.side === 'BUY' ? '买入' : trade.side === 'SELL' ? '卖出' : '',
                                          trade.quantity ? `${trade.quantity} 张` : '',
                                          trade.fee ? `手续费 $${(trade.fee).toFixed(4)}` : '',
                                        ].filter(Boolean);
                                        return <span className="text-blue-300 text-xs">{parts.join(' · ') || '币安期权成交'}</span>;
                                      })()
                                    : getCloseReasonComponent(trade.closeReason, trade.remark)
                                  }
                                </span>
                                {!isBinance && (
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
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Binance API 设置对话框 */}
        <Dialog open={isSettingsDialogOpen} onOpenChange={setIsSettingsDialogOpen}>
          <DialogContent className="border-blue-500/30 bg-gray-900 text-white max-w-md">
            <DialogHeader>
              <DialogTitle className="bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent flex items-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-blue-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                  <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
                </svg>
                Binance API 设置
              </DialogTitle>
              <DialogDescription className="text-blue-500/60">
                配置 Binance 期权 API 凭证以同步成交记录。凭证将安全保存到本地环境变量文件中。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="settings-api-key" className="text-blue-400">API Key</Label>
                <Input
                  id="settings-api-key"
                  placeholder="请输入 Binance API Key"
                  value={settingsApiKey}
                  onChange={(e) => setSettingsApiKey(e.target.value)}
                  className="border-blue-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="settings-api-secret" className="text-blue-400">API Secret</Label>
                <Input
                  id="settings-api-secret"
                  type="password"
                  placeholder="请输入 Binance API Secret"
                  value={settingsApiSecret}
                  onChange={(e) => setSettingsApiSecret(e.target.value)}
                  className="border-blue-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-blue-500"
                />
              </div>
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/5 p-3">
                <p className="text-xs text-blue-400/70">
                  <strong className="text-blue-300">提示：</strong>请确保您的 API Key 具有期权账户只读权限。建议创建独立的白名单密钥，仅授予读取权限，不要授予提币或交易权限。
                </p>
              </div>
              <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                <p className="text-xs text-amber-400/70">
                  <strong className="text-amber-300">注意：</strong>保存后需要刷新页面（或重启开发服务器）才能使新配置生效。
                </p>
              </div>
            </div>
            <DialogFooter className="gap-2">
              <Button
                variant="outline"
                onClick={() => setIsSettingsDialogOpen(false)}
                className="border-gray-600 text-gray-400 hover:bg-gray-800"
                disabled={isSavingSettings}
              >
                取消
              </Button>
              <Button
                onClick={async () => {
                  if (!settingsApiKey.trim() || !settingsApiSecret.trim()) {
                    toast.error('请填写完整的 API Key 和 Secret');
                    return;
                  }
                  setIsSavingSettings(true);
                  try {
                    const res = await fetch('/api/settings/save-env', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({
                        BINANCE_OPTIONS_API_KEY: settingsApiKey.trim(),
                        BINANCE_OPTIONS_API_SECRET: settingsApiSecret.trim(),
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) throw new Error(data.error || '保存失败');
                    toast.success('API 凭证已保存，页面将刷新...');
                    setIsSettingsDialogOpen(false);
                    // 短暂延迟后刷新页面，让用户看到成功提示
                    setTimeout(() => window.location.reload(), 1500);
                  } catch (err: any) {
                    toast.error('保存失败：' + (err.message || '未知错误'));
                  } finally {
                    setIsSavingSettings(false);
                  }
                }}
                disabled={isSavingSettings}
                className="bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 text-white font-semibold"
              >
                {isSavingSettings ? '保存中...' : '保存并刷新'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
