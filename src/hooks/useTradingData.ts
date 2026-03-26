import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

export const useTradingData = (initialAccountId: number = 1) => {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<number>(initialAccountId);
  const [balance, setBalance] = useState<number>(0);
  const [trades, setTrades] = useState<any[]>([]);
  const [fundRecords, setFundRecords] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 加载数据
  // silent=true 时不触发全屏 loading（操作后静默刷新用）
  const loadData = useCallback(async (accountId: number, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [accountsRes, balanceRes, tradesRes, fundRecordsRes] = await Promise.all([
        api.accounts.getAll(),
        api.balance.get(accountId),
        api.trades.getAll({ accountId }),
        api.fundRecords.getAll(1000, accountId)
      ]);
      
      setAccounts((accountsRes.accounts || []).filter(Boolean));
      setBalance(Number(balanceRes.balance) || 0);
      setTrades((tradesRes.trades || []).filter(Boolean).map((t: any) => ({
        ...t,
        profitLoss: t.profitLoss != null ? Number(t.profitLoss) : 0,
        openAmount: t.openAmount != null ? Number(t.openAmount) : 0,
        position: t.position != null ? Number(t.position) : 0,
        symbol: t.symbol || '',
        strategy: t.strategy || '',
        openTime: t.openTime || '',
        closeReason: t.closeReason || 'profit',
        remark: t.remark || '',
        date: t.date || '',
        isClosed: t.isClosed ?? true,
      })));
      setFundRecords((fundRecordsRes.records || []).filter(Boolean).map((r: any) => ({
        ...r,
        amount: r.amount != null ? Number(r.amount) : 0,
        date: r.date || '',
        type: r.type || 'deposit',
      })));
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Failed to load data:', err);
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

  // 初始加载和账户切换时加载数据
  useEffect(() => {
    loadData(currentAccountId);
  }, [currentAccountId, loadData]);

  return {
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
  };
};
