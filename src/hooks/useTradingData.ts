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
  const loadData = useCallback(async (accountId: number) => {
    setLoading(true);
    setError(null);
    try {
      const [accountsRes, balanceRes, tradesRes, fundRecordsRes] = await Promise.all([
        api.accounts.getAll(),
        api.balance.get(accountId),
        api.trades.getAll({ accountId }),
        api.fundRecords.getAll(1000, accountId)
      ]);
      
      setAccounts(accountsRes.accounts || []);
      setBalance(balanceRes.balance || 0);
      setTrades(tradesRes.trades || []);
      setFundRecords(fundRecordsRes.records || []);
    } catch (err: any) {
      setError(err.message || 'Failed to load data');
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
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
