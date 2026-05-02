'use client';

import { Settings } from 'lucide-react';
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

// 可复用CSS类常量（提升可维护性）
const CYAN_INPUT_CLASSES = 'border-cyan-500/30 bg-gray-800 text-cyan-300 font-mono focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,245,255,0.2)]';
const CYAN_LABEL_CLASSES = 'text-cyan-400 font-mono text-xs tracking-wider';
const SECTION_TITLE_CLASSES = 'flex items-center gap-2 mb-3';
const SECTION_INDICATOR_CLASSES = 'w-1 h-4 bg-cyan-400 rounded-full';
const SECTION_TEXT_CLASSES = 'text-sm font-mono text-cyan-400/80';

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
  const [dateRangeError, setDateRangeError] = useState<boolean>(false);

  // 监听日期范围变化，验证并显示提示（使用防抖避免频繁提示）
  useEffect(() => {
    const timer = setTimeout(() => {
      if (filterStartDate && filterEndDate && filterStartDate > filterEndDate) {
        setDateRangeError(true);
        toast.error('开始日期不能晚于结束日期');
      } else {
        setDateRangeError(false);
      }
    }, 500); // 500ms防抖
    return () => clearTimeout(timer);
  }, [filterStartDate, filterEndDate]);

  // 编辑相关状态
  const [editingTrade, setEditingTrade] = useState<Trade | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);

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

    // 验证 openDateTime 是否有效
    const dateTime = new Date(openDateTime);
    if (isNaN(dateTime.getTime())) {
      toast.error('开仓日期时间格式无效');
      return;
    }

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
        // 添加 NaN 检查
        if (isNaN(newProfitLoss)) {
          toast.error('盈亏金额必须是有效数字');
          return;
        }

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

  // 根据日期范围过滤交易
  const filteredTrades = useMemo(() => {
    let filtered = trades;

    // 日期过滤
    if (filterStartDate || filterEndDate) {
      // 添加边界检查：如果开始日期晚于结束日期，返回空数组
      if (filterStartDate && filterEndDate && filterStartDate > filterEndDate) {
        return [];
      }
      
      filtered = filtered.filter((trade) => {
        const tradeDate = trade.date;
        if (filterStartDate && filterEndDate) return tradeDate >= filterStartDate && tradeDate <= filterEndDate;
        if (filterStartDate) return tradeDate >= filterStartDate;
        if (filterEndDate) return tradeDate <= filterEndDate;
        return true;
      });
    }

    return filtered;
  }, [trades, filterStartDate, filterEndDate]);

  // 单次遍历计算所有统计数据（避免 JSX 里多次 filter+reduce）
  const filteredStats = useMemo(() => {
    let tradeCount = 0, winTotal = 0, winCount = 0, lossTotal = 0, lossCount = 0;
    for (const t of filteredTrades) {
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
    () => trades.filter(t => t.closeReason === 'other' && t.remark).slice(0, 15),
    [trades]
  );

  // 时间段统计卡片数据（useMemo，单次扫描，O(n)）
  const periodStats = useMemo(() => {
    return periodSelections.map(({ days }) => {
      const startStr = daysAgoStr(days);
      const endStr = todayStr();
      let count = 0, totalPL = 0, wins = 0;
      for (const t of trades) {
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
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-zinc-950 to-black p-4 md:p-8 relative overflow-hidden circuit-bg">
      {/* 扫描线效果 */}
      <div className="scanline absolute inset-0 pointer-events-none" />
      
      {/* 背景网格 */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(0,245,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(0,245,255,0.03)_1px,transparent_1px)] bg-[size:30px_30px] pointer-events-none" />
      
      <div className="mx-auto max-w-6xl space-y-6 relative z-10">
        {/* 标题和下载按钮 */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="w-full sm:flex-1 rounded-xl border border-cyan-500/30 bg-gray-900/90 p-4 sm:p-6 text-center shadow-[0_0_30px_rgba(0,245,255,0.15)] backdrop-blur-sm data-panel relative">
            <h1 className="text-2xl sm:text-3xl font-bold bg-gradient-to-r from-cyan-400 via-blue-500 to-cyan-300 bg-clip-text text-transparent">⚙ 交易记录系统</h1>
            <p className="mt-2 text-sm sm:text-base text-cyan-500/60 font-mono">MECHANICAL TRADING SYSTEM v2.0</p>
          </div>
          <div className="w-full sm:w-auto sm:ml-4 flex flex-col gap-2">
            <Button 
              onClick={handleDownloadData}
              className="w-full sm:w-auto bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-[0_0_20px_rgba(0,245,255,0.3)] btn-mechanical"
            >
              ⬇ EXPORT.DATA
            </Button>
            <Button
              variant="outline"
              onClick={handleRefreshTradeList}
              className="w-full sm:w-auto border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 hover:shadow-[0_0_10px_rgba(0,245,255,0.2)] btn-mechanical"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              REFRESH
            </Button>
          </div>
        </div>

        {/* 资产余额卡片 */}
        <Card className="border-cyan-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(0,245,255,0.15)] backdrop-blur-sm data-panel">
          <CardHeader className="border-b border-cyan-500/20">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
                  ⚙ 资产余额
                </CardTitle>
                <CardDescription className="text-cyan-500/60 font-mono text-xs">ASSET BALANCE MONITOR</CardDescription>
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
              <div className="text-3xl sm:text-4xl font-bold text-white glow-cyan flex items-center gap-2">
                ⚙ {fmt(balance)}
                <span className="text-sm text-cyan-400 font-mono">USD</span>
              </div>
              <div className="flex gap-2">
                <Dialog open={isDepositDialogOpen} onOpenChange={setIsDepositDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-cyan-600 hover:bg-cyan-700 text-white font-mono glow-cyan btn-mechanical">
                      ⬇ DEPOSIT
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-cyan-500/30 bg-gray-900 text-white max-w-md data-panel">
                    <DialogHeader>
                      <DialogTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
                        ⚙ DEPOSIT
                      </DialogTitle>
                      <DialogDescription className="text-cyan-500/60 font-mono text-xs">
                        DEPOSIT FUNDS
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="deposit-amount" className="text-cyan-400 font-mono text-xs">[ AMOUNT ]</Label>
                        <Input
                          id="deposit-amount"
                          type="number"
                          placeholder="0.00"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500 font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="deposit-date" className="text-cyan-400 font-mono text-xs">[ DATE ]</Label>
                        <Input
                          id="deposit-date"
                          type="date"
                          value={fundDate}
                          onChange={(e) => setFundDate(e.target.value)}
                          className="border-cyan-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-cyan-500 font-mono"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        className="bg-gradient-to-r from-cyan-600 to-blue-700 hover:from-cyan-700 hover:to-blue-800 text-white font-semibold font-mono glow-cyan"
                        onClick={() => handleAddFund('deposit')}
                      >
                        ⚙ CONFIRM
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>

                <Dialog open={isWithdrawDialogOpen} onOpenChange={setIsWithdrawDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="destructive" className="bg-red-600/80 hover:bg-red-700/80 text-white font-mono glow-red btn-mechanical">
                      ⚠ WITHDRAW
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-red-500/30 bg-gray-900 text-white max-w-md data-panel">
                    <DialogHeader>
                      <DialogTitle className="bg-gradient-to-r from-red-400 to-orange-500 bg-clip-text text-transparent flex items-center gap-2">
                        ⚠ WITHDRAW
                      </DialogTitle>
                      <DialogDescription className="text-red-500/60 font-mono text-xs">
                        WITHDRAW FUNDS
                      </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                      <div className="space-y-2">
                        <Label htmlFor="withdraw-amount" className="text-red-400 font-mono text-xs">[ AMOUNT ]</Label>
                        <Input
                          id="withdraw-amount"
                          type="number"
                          placeholder="0.00"
                          value={fundAmount}
                          onChange={(e) => setFundAmount(e.target.value)}
                          className="border-red-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="withdraw-date" className="text-red-400 font-mono text-xs">[ DATE ]</Label>
                        <Input
                          id="withdraw-date"
                          type="date"
                          value={fundDate}
                          onChange={(e) => setFundDate(e.target.value)}
                          className="border-red-500/30 bg-gray-800 text-white placeholder:text-gray-500 focus:border-red-500 font-mono"
                        />
                      </div>
                    </div>
                    <DialogFooter>
                      <Button 
                        className="bg-gradient-to-r from-red-600 to-orange-700 hover:from-red-700 hover:to-orange-800 text-white font-semibold font-mono glow-red"
                        onClick={() => handleAddFund('withdraw')}
                      >
                        ⚠ CONFIRM
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </div>
            </div>
            
            {/* 累计入金和出金 */}
            <div className="mt-4 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded border border-green-500/30 bg-green-500/10 p-2 text-center data-panel relative">
                  <div className="text-xs text-green-400/70 font-mono">[ DEPOSIT ]</div>
                  <div className="text-sm font-semibold text-green-400">{fmt(totalDeposit)}</div>
                </div>
                <div className="rounded border border-red-500/30 bg-red-500/10 p-2 text-center data-panel relative">
                  <div className="text-xs text-red-400/70 font-mono">[ WITHDRAW ]</div>
                  <div className="text-sm font-semibold text-red-400">{fmt(totalWithdraw)}</div>
                </div>
              </div>
              
              {/* 最近出入金记录 */}
              {fundRecords.length > 0 && (
                <div className="rounded border border-cyan-500/20 bg-cyan-500/5 p-2 data-panel">
                  <div className="text-xs text-cyan-400/70 mb-2 font-mono">[ RECENT ]</div>
                  <div className="space-y-1 max-h-[72px] overflow-y-auto">
                    {fundRecords.map((record) => (
                      <div key={record.id} className="flex items-center justify-between rounded bg-gray-800/50 px-2 py-1">
                        <div className="flex items-center gap-2">
                          <span className={`text-xs font-mono ${record.type === 'deposit' ? 'text-green-400' : 'text-red-400'}`}>
                            {record.type === 'deposit' ? '⚙ +' : '⚠ -'}
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
          <Card className="border-cyan-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(0,245,255,0.1)] backdrop-blur-sm data-panel">
            <CollapsibleTrigger asChild>
              <CardHeader className="border-b border-cyan-500/20 cursor-pointer hover:bg-cyan-500/5 transition-colors">
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
                      ⚙ {isAssetChartOpen ? '资产走势' : '📊 资产走势'}
                    </CardTitle>
                    <CardDescription className="text-cyan-500/60 font-mono text-xs">
                      ASSET TREND {isAssetChartOpen ? '▼' : '▶'}
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

        {/* 交易统计面板 */}
        <Card className="border-cyan-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(0,245,255,0.1)] backdrop-blur-sm data-panel relative overflow-hidden">
          <CardHeader className="border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/10 to-transparent relative">
            <div className="absolute top-0 right-0 w-24 h-24 bg-cyan-500/5 rounded-full blur-3xl"></div>
            <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
              <span className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(0,245,255,0.8)]"></span>
              ⚙ 交易统计
            </CardTitle>
            <CardDescription className="text-cyan-500/60 font-mono text-xs">
              TRADING STATISTICS MONITOR
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* 时间段统计卡片 - 机械仪表盘风格 */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="w-1 h-4 bg-cyan-400 rounded-full"></span>
                <span className="text-sm font-mono text-cyan-400/80">[ PERIOD STATS ]</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {(() => {
                  const periodOptions = [
                    [
                      { label: 'TODAY', days: 0 },
                      { label: '3.DAY', days: 2 },
                      { label: '5.DAY', days: 4 },
                    ],
                    [
                      { label: '3.DAY', days: 2 },
                      { label: '7.DAY', days: 6 },
                      { label: '10.DAY', days: 9 },
                      { label: '15.DAY', days: 14 },
                    ],
                    [
                      { label: '1.WEEK', days: 6 },
                      { label: '2.WEEK', days: 13 },
                      { label: '3.WEEK', days: 20 },
                      { label: '4.WEEK', days: 27 },
                    ],
                    [
                      { label: '1.MONTH', days: 29 },
                      { label: '2.MONTH', days: 59 },
                      { label: '3.MONTH', days: 89 },
                    ],
                  ];

                  const getLabelByDays = (options: {label: string, days: number}[], days: number) => {
                    // 增强健壮性：检查空数组
                    if (!options || options.length === 0) return 'N/A';
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
                        className="relative rounded-lg border border-cyan-500/30 bg-gray-800/80 p-3 text-center data-panel hover:border-cyan-500/50 transition-all duration-300 hover:shadow-[0_0_15px_rgba(0,245,255,0.2)]"
                      >
                        {/* 装饰角标 */}
                        <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-cyan-500/40"></div>
                        <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-cyan-500/40"></div>
                        
                        <Select
                          value={String(selection.days)}
                          onValueChange={(value) => {
                            const newSelections = [...periodSelections];
                            newSelections[index] = { id: index, days: Number(value) };
                            setPeriodSelections(newSelections);
                          }}
                        >
                          <SelectTrigger className="w-full h-8 text-sm font-bold font-mono text-cyan-400 border-0 bg-transparent p-0 justify-center hover:text-cyan-300 focus:ring-0">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-cyan-500/30 bg-gray-800">
                            {options.map((option) => (
                              <SelectItem key={option.days} value={String(option.days)} className="text-white hover:bg-gray-700 font-mono text-xs">
                                {option.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="space-y-1.5 mt-3 border-t border-cyan-500/20 pt-2">
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-500">COUNT:</span>
                            <span className="text-white font-semibold">{stats.count}</span>
                          </div>
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-500">P/L:</span>
                            <span className={`font-bold ${stats.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              {stats.totalPL >= 0 ? '+' : ''}{fmt(stats.totalPL)}
                            </span>
                          </div>
                          <div className="flex justify-between text-xs font-mono">
                            <span className="text-gray-500">WIN:</span>
                            <span className="text-cyan-400 font-bold">{stats.winRate}%</span>
                          </div>
                        </div>
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            
            {/* 日期筛选区域 */}
            <div className="border-t border-cyan-500/20 pt-4">
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
                <span className="text-sm font-mono text-amber-400/80">[ DATE FILTER ]</span>
              </div>
              
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="space-y-2 relative">
                  <Label htmlFor="filter-start-date" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                    START.DATE
                  </Label>
                  <Input
                    id="filter-start-date"
                    type="date"
                    value={filterStartDate}
                    onChange={(e) => setFilterStartDate(e.target.value)}
                    aria-label="开始日期筛选"
                    className={CYAN_INPUT_CLASSES}
                  />
                </div>
                <div className="space-y-2 relative">
                  <Label htmlFor="filter-end-date" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                    <span className="w-1.5 h-1.5 bg-cyan-400 rounded-full"></span>
                    END.DATE
                  </Label>
                  <Input
                    id="filter-end-date"
                    type="date"
                    value={filterEndDate}
                    onChange={(e) => setFilterEndDate(e.target.value)}
                    aria-label="结束日期筛选"
                    className="border-cyan-500/30 bg-gray-800 text-cyan-300 font-mono focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,245,255,0.2)]"
                  />
                </div>
              </div>

              {/* 快捷日期选择 */}
              <div className="mb-6 flex flex-wrap gap-2">
                <span className="text-xs font-mono text-gray-500 self-center mr-2">QUICK:</span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('week')}
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-mono text-xs bg-emerald-500/5"
                >
                  1W
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('month')}
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-mono text-xs bg-emerald-500/5"
                >
                  1M
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('3month')}
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-mono text-xs bg-emerald-500/5"
                >
                  3M
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('halfYear')}
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-mono text-xs bg-emerald-500/5"
                >
                  6M
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleQuickDateFilter('year')}
                  className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:text-emerald-300 font-mono text-xs bg-emerald-500/5"
                >
                  1Y
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setFilterStartDate('');
                    setFilterEndDate('');
                  }}
                  className="text-gray-500 hover:text-gray-300 hover:bg-gray-700/50 font-mono text-xs"
                >
                  RESET
                </Button>
              </div>

              {/* 盈亏统计区域 */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-green-500 rounded-full"></span>
                <span className="text-sm font-mono text-green-400/80">[ WIN STATS ]</span>
              </div>
              
              {/* 盈利统计 */}
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="relative rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center data-panel overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-mono text-green-500/60 mb-1">[ AMOUNT ]</div>
                    <div className="text-2xl font-bold font-mono text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                      +{fmt(filteredStats.winTotal)}
                    </div>
                    <div className="text-xs font-mono text-green-500/60 mt-1">WIN.AMOUNT</div>
                  </div>
                </div>
                <div className="relative rounded-lg border border-green-500/30 bg-green-500/5 p-4 text-center data-panel overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-mono text-green-500/60 mb-1">[ COUNT ]</div>
                    <div className="text-2xl font-bold font-mono text-green-400 shadow-[0_0_10px_rgba(34,197,94,0.5)]">
                      {filteredStats.winCount}
                    </div>
                    <div className="text-xs font-mono text-green-500/60 mt-1">WIN.TIMES</div>
                  </div>
                </div>
              </div>

              {/* 亏损统计 */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-red-500 rounded-full"></span>
                <span className="text-sm font-mono text-red-400/80">[ LOSS STATS ]</span>
              </div>
              
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div className="relative rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center data-panel overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-mono text-red-500/60 mb-1">[ AMOUNT ]</div>
                    <div className="text-2xl font-bold font-mono text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      {fmt(filteredStats.lossTotal)}
                    </div>
                    <div className="text-xs font-mono text-red-500/60 mt-1">LOSS.AMOUNT</div>
                  </div>
                </div>
                <div className="relative rounded-lg border border-red-500/30 bg-red-500/5 p-4 text-center data-panel overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-mono text-red-500/60 mb-1">[ COUNT ]</div>
                    <div className="text-2xl font-bold font-mono text-red-400 shadow-[0_0_10px_rgba(239,68,68,0.5)]">
                      {filteredStats.lossCount}
                    </div>
                    <div className="text-xs font-mono text-red-500/60 mt-1">LOSS.TIMES</div>
                  </div>
                </div>
              </div>

              {/* 总体统计 */}
              <div className="flex items-center gap-2 mb-4">
                <span className="w-1 h-4 bg-amber-400 rounded-full"></span>
                <span className="text-sm font-mono text-amber-400/80">[ TOTAL STATS ]</span>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
                <div className="relative rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent p-4 text-center data-panel overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-mono text-cyan-500/60 mb-1">[ TOTAL P/L ]</div>
                    <div className={`text-2xl font-bold font-mono ${filteredStats.total >= 0 ? 'text-green-400' : 'text-red-400'} drop-shadow-[0_0_8px_currentColor]`}>
                      {filteredStats.total >= 0 ? '+' : ''}{fmt(filteredStats.total)}
                    </div>
                  </div>
                </div>
                <div className="relative rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent p-4 text-center data-panel overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-mono text-cyan-500/60 mb-1">[ TRADE COUNT ]</div>
                    <div className="text-2xl font-bold font-mono text-cyan-400 drop-shadow-[0_0_8px_rgba(0,245,255,0.5)]">
                      {filteredTrades.length}
                    </div>
                  </div>
                </div>
                <div className="relative rounded-lg border border-cyan-500/30 bg-gradient-to-br from-cyan-500/10 to-transparent p-4 text-center data-panel overflow-hidden">
                  <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-cyan-500/50 to-transparent"></div>
                  <div className="relative">
                    <div className="text-xs font-mono text-cyan-500/60 mb-1">[ WIN RATE ]</div>
                    <div className="text-2xl font-bold font-mono text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]">
                      {filteredStats.winRate}%
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 编辑交易记录对话框 */}
        <Dialog open={isEditDialogOpen} onOpenChange={(open) => {
          setIsEditDialogOpen(open);
          if (!open) { setEditingTrade(null); resetTradeForm(); }
        }}>
          <DialogContent className="border-cyan-500/40 bg-gray-900 text-white max-w-md max-h-[85vh] flex flex-col overflow-hidden data-panel">
            <DialogHeader>
              <DialogTitle className="font-mono text-lg tracking-widest text-cyan-400 flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-500" />
                <span className="bg-gradient-to-r from-cyan-400 to-cyan-300 bg-clip-text text-transparent">EDIT TRADE RECORD</span>
              </DialogTitle>
              <DialogDescription className="text-cyan-500/50 font-mono text-xs tracking-wider">// MODIFY TRADE PARAMETERS</DialogDescription>
            </DialogHeader>
            <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
              <div className="space-y-2">
                <Label htmlFor="edit-symbol" className="text-cyan-400 font-mono text-xs tracking-wider">[ SYMBOL ] 交易品种</Label>
                <Input
                  id="edit-symbol"
                  placeholder="例如：BTC/USDT"
                  value={symbol}
                  onChange={(e) => setSymbol(e.target.value)}
                  className="border-cyan-500/30 bg-gray-800 text-cyan-300 placeholder:text-gray-500 focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(0,245,255,0.15)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-trade-date" className="text-cyan-400 font-mono text-xs tracking-wider">[ OPEN TIME ] 开仓日期</Label>
                <Input
                  id="edit-trade-date"
                  type="datetime-local"
                  value={openDateTime}
                  onChange={(e) => setOpenDateTime(e.target.value)}
                  className="border-cyan-500/30 bg-gray-800 text-cyan-300 focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(0,245,255,0.15)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-strategy" className="text-cyan-400 font-mono text-xs tracking-wider">[ STRATEGY ] 入场策略</Label>
                <Input
                  id="edit-strategy"
                  placeholder="请输入入场策略"
                  value={strategy}
                  onChange={(e) => setStrategy(e.target.value)}
                  className="border-cyan-500/30 bg-gray-800 text-cyan-300 placeholder:text-gray-500 focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(0,245,255,0.15)]"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-position" className="text-cyan-400 font-mono text-xs tracking-wider">[ POSITION ] 仓位</Label>
                <Select value={String(position)} onValueChange={(value) => setPosition(Number(value) as PositionType)}>
                  <SelectTrigger className="border-cyan-500/30 bg-gray-800 text-cyan-300 focus:border-cyan-400">
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
                <Label className="text-cyan-400 font-mono text-xs tracking-wider">[ AMOUNT ] 开仓金额</Label>
                <div className="data-panel rounded-md border border-cyan-500/30 px-3 py-2 text-lg font-semibold text-cyan-400 bg-gradient-to-r from-cyan-500/10 via-transparent to-cyan-500/5 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-transparent pointer-events-none" />
                  {fmt(openAmount)}
                </div>
              </div>

              <div className="flex items-center justify-between space-x-2 py-2">
                <Label htmlFor="edit-is-closed" className="text-cyan-400 font-mono font-semibold text-xs tracking-wider">
                  [ CLOSED ] 是否平仓
                </Label>
                <Switch
                  id="edit-is-closed"
                  checked={isClosed}
                  onCheckedChange={setIsClosed}
                  className="data-[state=checked]:bg-cyan-500 h-6 w-11 scale-110"
                />
              </div>

              {isClosed && (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="edit-close-reason" className="text-cyan-400 font-mono text-xs tracking-wider">[ CLOSE REASON ] 平仓原因</Label>
                    <Select value={closeReason} onValueChange={(value) => setCloseReason(value as 'profit' | 'loss' | 'other')}>
                      <SelectTrigger className="border-cyan-500/30 bg-gray-800 text-cyan-300 focus:border-cyan-400">
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
                      <Label htmlFor="edit-remark" className="text-cyan-400 font-mono text-xs tracking-wider">[ REMARK ] 备注</Label>
                      <Textarea
                        id="edit-remark"
                        placeholder="请输入备注信息"
                        value={remark}
                        onChange={(e) => setRemark(e.target.value)}
                        className="border-cyan-500/30 bg-gray-800 text-cyan-300 placeholder:text-gray-500 focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(0,245,255,0.15)]"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <Label htmlFor="edit-profit-loss" className="text-cyan-400 font-mono text-xs tracking-wider">[ P&L ] 盈亏金额</Label>
                    <Input
                      id="edit-profit-loss"
                      type="number"
                      placeholder="正数为盈利，负数为亏损"
                      value={profitLoss}
                      onChange={(e) => setProfitLoss(e.target.value)}
                      className="border-cyan-500/30 bg-gray-800 text-cyan-300 placeholder:text-gray-500 focus:border-cyan-400 focus:shadow-[0_0_8px_rgba(0,245,255,0.15)]"
                    />
                  </div>
                </>
              )}
            </div>
            <DialogFooter className="mt-4 pt-4 border-t border-cyan-500/20 flex-row gap-2">
              <Button
                variant="outline"
                className="border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/10 font-mono"
                onClick={() => { setIsEditDialogOpen(false); setEditingTrade(null); resetTradeForm(); }}
              >
                取消
              </Button>
              <Button className="bg-gradient-to-r from-cyan-500 to-cyan-400 hover:from-cyan-600 hover:to-cyan-500 text-black font-semibold font-mono tracking-wider" onClick={handleSaveEdit}>SAVE</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 交易记录列表 */}
        <Card className="border-cyan-500/30 bg-gray-900/90 shadow-[0_0_30px_rgba(0,245,255,0.1)] backdrop-blur-sm data-panel relative">
          <CardHeader className="border-b border-cyan-500/20 bg-gradient-to-r from-cyan-500/5 to-transparent">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <CardTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent flex items-center gap-2">
                  ⚙ 交易记录
                </CardTitle>
                <CardDescription className="text-cyan-500/60 font-mono text-xs">
                  TRADING LOG
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Dialog open={isTradeDialogOpen} onOpenChange={setIsTradeDialogOpen}>
                  <DialogTrigger asChild>
                    <Button className="bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold shadow-[0_0_15px_rgba(0,245,255,0.3)] btn-mechanical">
                      <span className="flex items-center gap-2">
                        <span className="w-2 h-2 bg-cyan-300 rounded-full animate-pulse"></span>
                        ⚙ ADD TRADE
                      </span>
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-cyan-500/40 bg-gray-900 text-white max-h-[85vh] flex flex-col overflow-hidden data-panel relative">
                    <DialogHeader>
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-lg border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center">
                          <span className="text-xl">⚙</span>
                        </div>
                        <div>
                          <DialogTitle className="bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent font-mono">ADD TRADE RECORD</DialogTitle>
                          <DialogDescription className="text-cyan-500/60 font-mono text-xs">FILL IN TRADE INFORMATION</DialogDescription>
                        </div>
                      </div>
                    </DialogHeader>
                    <div className="flex-1 overflow-y-auto space-y-4 py-4 pr-2">
                      <div className="space-y-2">
                        <Label htmlFor="symbol" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                          [ SYMBOL ]
                        </Label>
                        <Input
                          id="symbol"
                          placeholder="BTC/USDT"
                          value={symbol}
                          onChange={(e) => setSymbol(e.target.value)}
                          className="border-cyan-500/30 bg-gray-800 text-cyan-300 placeholder:text-gray-500 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,245,255,0.2)] font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                          [ TRADE LEVEL ]
                        </Label>
                        <div className={`text-lg font-bold ${tradeLevel.color}`}>{tradeLevel.level}</div>
                        <div className="text-sm text-gray-400">{tradeLevel.description}</div>
                        <div className="text-xs text-amber-400/70">{tradeLevel.suggestion}</div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="open-date" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                          [ OPEN DATE ]
                        </Label>
                        <Input
                          id="open-date"
                          type="datetime-local"
                          value={openDateTime}
                          onChange={(e) => setOpenDateTime(e.target.value)}
                          className="border-cyan-500/30 bg-gray-800 text-cyan-300 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,245,255,0.2)] font-mono"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="position" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                          [ POSITION % ]
                        </Label>
                        <Select value={String(position)} onValueChange={(value) => setPosition(Number(value) as PositionType)}>
                          <SelectTrigger className="border-cyan-500/30 bg-gray-800 text-white focus:border-cyan-500 font-mono">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="border-cyan-500/30 bg-gray-800">
                            {POSITION_OPTIONS.map((opt) => (
                              <SelectItem key={opt} value={String(opt)} className="text-white hover:bg-gray-700 font-mono">
                                {opt}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <div className="text-sm text-gray-400">开仓金额: <span className="text-cyan-400 font-semibold">${openAmount.toFixed(2)}</span></div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="is-closed" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                          <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                          [ CLOSED ]
                        </Label>
                        <div className="flex items-center gap-2">
                          <Switch
                            id="is-closed"
                            checked={isClosed}
                            onCheckedChange={setIsClosed}
                            className="data-[state=checked]:bg-cyan-500 h-6 w-11 scale-110"
                          />
                          <Label htmlFor="is-closed" className="text-gray-400 text-sm font-mono">
                            {isClosed ? '已平仓' : '未平仓'}
                          </Label>
                        </div>
                      </div>
                      {isClosed && (
                        <>
                          <div className="space-y-2">
                            <Label htmlFor="close-reason" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                              <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                              [ CLOSE REASON ]
                            </Label>
                            <Select value={closeReason} onValueChange={(value) => setCloseReason(value as CloseReason)}>
                              <SelectTrigger className="border-cyan-500/30 bg-gray-800 text-white focus:border-cyan-500 font-mono">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="border-cyan-500/30 bg-gray-800">
                                <SelectItem value="profit" className="text-white hover:bg-gray-700 font-mono text-xs">TAKE PROFIT</SelectItem>
                                <SelectItem value="loss" className="text-white hover:bg-gray-700 font-mono text-xs">STOP LOSS</SelectItem>
                                <SelectItem value="other" className="text-white hover:bg-gray-700 font-mono text-xs">OTHER</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                          {closeReason === 'other' && (
                            <div className="space-y-2">
                              <Label htmlFor="remark" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                                <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                                [ REMARK ]
                              </Label>
                              <Textarea
                                id="remark"
                                placeholder="Enter remark..."
                                value={remark}
                                onChange={(e) => setRemark(e.target.value)}
                                className="border-cyan-500/30 bg-gray-800 text-cyan-300 placeholder:text-gray-500 focus:border-cyan-500 font-mono"
                              />
                            </div>
                          )}
                          <div className="space-y-2">
                            <Label htmlFor="profit-loss" className="text-cyan-400 font-mono text-xs flex items-center gap-1">
                              <span className="w-1 h-1 bg-cyan-400 rounded-full"></span>
                              [ P/L AMOUNT ]
                            </Label>
                            <Input
                              id="profit-loss"
                              type="number"
                              step="0.01"
                              placeholder="+ profit / - loss"
                              value={profitLoss}
                              onChange={(e) => setProfitLoss(e.target.value)}
                              aria-label="盈亏金额"
                              className="border-cyan-500/30 bg-gray-800 text-cyan-300 placeholder:text-gray-500 focus:border-cyan-500 focus:shadow-[0_0_10px_rgba(0,245,255,0.2)] font-mono"
                            />
                          </div>
                        </>
                      )}
                    </div>
                    <DialogFooter className="mt-4 pt-4 border-t border-cyan-500/20">
                      <Button className="w-full bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-600 hover:to-blue-700 text-white font-semibold font-mono shadow-[0_0_15px_rgba(0,245,255,0.3)]" onClick={handleAddTrade}>
                        <span className="flex items-center gap-2">
                          <span className="w-1.5 h-1.5 bg-cyan-300 rounded-full animate-pulse"></span>
                          ⚙ CONFIRM ADD
                        </span>
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
                <Dialog>
                  <DialogTrigger asChild>
                    <Button
                      variant="outline"
                      className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 hover:text-blue-300 font-mono text-xs"
                    >
                      OTHER.REASON
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="border-blue-500/30 bg-gray-900 text-white max-w-md data-panel">
                    <DialogHeader>
                      <DialogTitle className="bg-gradient-to-r from-blue-400 to-cyan-500 bg-clip-text text-transparent">其他原因交易总结</DialogTitle>
                      <DialogDescription className="text-blue-500/60 font-mono text-xs">OTHER REASON SUMMARY</DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-3 max-h-[400px] overflow-y-auto">
                      {otherReasonTrades.length === 0 ? (
                        <p className="text-center text-cyan-500/50 py-4 font-mono">NO DATA</p>
                      ) : (
                        otherReasonTrades.map((trade, index) => (
                          <div key={trade.id}
                            className={`p-3 rounded-lg border border-cyan-500/20 bg-gray-800/50 ${index < otherReasonTrades.length - 1 ? 'mb-2' : ''}`}
                          >
                            <div className="flex justify-between items-start mb-2">
                              <span className="font-semibold text-white font-mono">{trade.symbol}</span>
                              <span className={`font-semibold font-mono ${(Number(trade.profitLoss) || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {(Number(trade.profitLoss) || 0) >= 0 ? '+' : ''}{fmt(trade.profitLoss)}
                              </span>
                            </div>
                            <div className="text-sm text-gray-400 mb-1 font-mono">
                              {formatTradeDateTime(trade.date, trade.openTime)}
                            </div>
                            <div className="text-sm">
                              <span className="text-gray-400">原因：</span>
                              {trade.remark && (
                                <span className="bg-yellow-400 text-black font-semibold px-1 rounded font-mono">{trade.remark}</span>
                              )}
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
              {/* 交易记录表格 */}
              <Table className="font-mono text-sm">
                  <TableHeader className={filteredTrades.length > 15 ? 'sticky top-0 bg-gray-900 z-10' : ''}>
                    <TableRow className="border-cyan-500/30 bg-gradient-to-r from-cyan-500/10 to-transparent hover:bg-cyan-500/10">
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">品种.SYMBOL</TableHead>
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">开仓日期.DATE</TableHead>
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">入场策略.STRATEGY</TableHead>
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">仓位.POS</TableHead>
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">开仓金额.AMOUNT</TableHead>
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">盈亏.P/L</TableHead>
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">状态.STATUS</TableHead>
                      <TableHead className="text-cyan-400 font-semibold border-b border-cyan-500/30 py-3">操作.ACTION</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredTrades.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={8} className="text-center text-cyan-500/50 py-8">
                          <div className="flex flex-col items-center gap-2">
                            <span className="text-2xl">⚙</span>
                            <span className="font-mono">NO TRADING RECORDS</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredTrades.map((trade) => {
                        const parts = trade.strategy.split('/');
                        const level = parts[0];
                        const rest = parts.slice(1).join('/');
                        const pl = Number(trade.profitLoss) || 0;
                        return (
                          <TableRow 
                            key={trade.id} 
                            className="border-cyan-500/20 hover:bg-cyan-500/10 transition-all duration-200 hover:shadow-[0_0_10px_rgba(0,245,255,0.1)]"
                          >
                            <TableCell className="font-medium text-amber-400 py-3">
                              <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-400"></span>
                                {trade.symbol}
                              </span>
                            </TableCell>
                            <TableCell className="text-gray-300 py-3">{formatTradeDateTime(trade.date, trade.openTime)}</TableCell>
                            <TableCell className="text-white py-3">
                              <span className={getLevelColor(level)}>{level}</span>
                              {rest && <span className="text-gray-400">/{rest}</span>}
                            </TableCell>
                            <TableCell className="text-amber-300 py-3">{trade.position}%</TableCell>
                            <TableCell className="font-semibold text-amber-400 py-3">{fmt(trade.openAmount)}</TableCell>
                            <TableCell className={`font-semibold py-3 ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                              <span className={`flex items-center gap-1 ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                <span className={`text-xs ${pl >= 0 ? 'text-green-500' : 'text-red-500'}`}>{pl >= 0 ? '▲' : '▼'}</span>
                                {pl >= 0 ? '+' : ''}{fmt(pl)}
                              </span>
                            </TableCell>
                            <TableCell className="py-3">
                              {trade.isClosed ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-green-500/20 border border-green-500/40 px-2.5 py-0.5 text-xs font-medium text-green-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                                  CLOSED
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 rounded-full bg-gray-500/20 border border-gray-500/40 px-2.5 py-0.5 text-xs font-medium text-gray-400">
                                  <span className="w-1.5 h-1.5 rounded-full bg-gray-400"></span>
                                  PENDING
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="py-3">
                              <div className="flex items-center justify-between">
                                <span className="text-sm text-gray-400">
                                  {getCloseReasonComponent(trade.closeReason, trade.remark)}
                                </span>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-7 w-7 p-0 text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300"
                                    >
                                      <MoreVertical className="h-4 w-4" />
                                    </Button>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-32 p-2 bg-gray-900 border-cyan-500/30 data-panel" align="end">
                                    <div className="flex flex-col gap-1">
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start text-cyan-400 hover:bg-cyan-500/10 hover:text-cyan-300 font-mono text-xs"
                                        onClick={() => handleEditTrade(trade)}
                                      >
                                        ⚙ EDIT
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        className="w-full justify-start text-red-400 hover:bg-red-500/10 hover:text-red-300 font-mono text-xs"
                                        onClick={() => handleDeleteTrade(trade.id)}
                                      >
                                        ✕ DELETE
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
