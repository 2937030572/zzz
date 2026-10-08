'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import type { Account, Trade, FundRecord } from '@/lib/schema';
import { DEFAULT_ACCOUNT_ID } from '@/lib/schema';

/** 与服务端一致的排序：date 降序，同日的新记录插在最前（服务端再按 created_at 降序） */
function insertByDateDesc<T extends { date: string }>(list: T[], item: T): T[] {
  const index = list.findIndex((x) => x.date <= item.date);
  if (index === -1) return [...list, item];
  return [...list.slice(0, index), item, ...list.slice(index)];
}

export function useTradingData(initialAccountId: number = DEFAULT_ACCOUNT_ID) {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<number>(initialAccountId);
  const [balance, setBalance] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fundRecords, setFundRecords] = useState<FundRecord[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // 防止切换账户时旧请求覆盖新结果
  const requestSeq = useRef(0);

  const loadAccounts = useCallback(async (): Promise<Account[]> => {
    const res = await api.accounts.getAll();
    const list = res.accounts ?? [];
    setAccounts(list);
    return list;
  }, []);

  /** silent = true 时不触发全屏 loading，用于操作后的静默刷新 */
  const loadData = useCallback(async (accountId: number, silent = false): Promise<boolean> => {
    const seq = ++requestSeq.current;
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [balanceRes, tradesRes, fundRecordsRes] = await Promise.all([
        api.balance.get(accountId),
        api.trades.getAll({ accountId }),
        api.fundRecords.getAll(1000, accountId),
      ]);

      if (seq !== requestSeq.current) return false;

      setBalance(balanceRes.balance);
      setTrades(tradesRes.trades);
      setFundRecords(fundRecordsRes.records);
      return true;
    } catch (err) {
      if (seq !== requestSeq.current) return false;
      setError(err instanceof Error ? err.message : '加载数据失败');
      return false;
    } finally {
      if (seq === requestSeq.current && !silent) setLoading(false);
    }
  }, []);

  // 账户列表只在首次加载时拉取，后续由 refreshAccounts 显式刷新
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadAccounts().catch(() => {
      /* 错误由后续 loadData 统一呈现 */
    });
  }, [loadAccounts]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData(currentAccountId);
  }, [currentAccountId, loadData]);

  /** 账户增删后调用：刷新账户列表并同步当前账户 */
  const refreshAccounts = useCallback(async (): Promise<Account[]> => {
    const list = await loadAccounts();
    if (list.length > 0 && !list.some((a) => a.id === currentAccountId)) {
      setCurrentAccountId(list[0].id);
    }
    return list;
  }, [loadAccounts, currentAccountId]);

  // ── 写操作后的本地更新 ────────────────────────────────────────────────
  // 写接口已返回「权威记录 + 权威余额」，直接落到本地 state，
  // 省掉一次全量刷新（一次跨境往返 ≈ 600-800ms）。排序规则与服务端一致：
  // date 降序，同日新记录在前（服务端再按 created_at 降序）。

  const applyTradeSaved = useCallback((trade: Trade, balance: number) => {
    setBalance(balance);
    setTrades((prev) => insertByDateDesc(prev.filter((t) => t.id !== trade.id), trade));
  }, []);

  const applyTradeDeleted = useCallback((id: string, balance: number) => {
    setBalance(balance);
    setTrades((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const applyFundSaved = useCallback((record: FundRecord, balance: number) => {
    setBalance(balance);
    setFundRecords((prev) => insertByDateDesc(prev.filter((r) => r.id !== record.id), record));
  }, []);

  const applyFundDeleted = useCallback((id: string, balance: number) => {
    setBalance(balance);
    setFundRecords((prev) => prev.filter((r) => r.id !== id));
  }, []);

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
    loadData,
    refreshAccounts,
    applyTradeSaved,
    applyTradeDeleted,
    applyFundSaved,
    applyFundDeleted,
  };
}
