import { useState, useEffect, useCallback } from 'react';
import { api } from '@/lib/api';

// ── 共享类型定义（供 page.tsx 和 hook 复用）──────────────────────────────────

export type PositionType = number;
export type CloseReason = 'profit' | 'loss' | 'other' | 'pending';
export type FundType = 'deposit' | 'withdraw';
export type TradeSource = 'manual' | 'binance-options';
export type VolumeTrend = 'top_divergence' | 'bottom_divergence' | 'no_trend';
export type BollContraction = '1h' | '2h' | '4h_plus';
export type BollWidth = 'converged' | 'not_converged';
export type Pattern =
  | 'head_shoulders'
  | 'double_top_bottom'
  | 'triple_top_bottom'
  | 'triangle'
  | 'cup_handle'
  | 'channel'
  | 'none';

export interface Trade {
  id: string;
  symbol: string;
  strategy: string;
  position: PositionType;
  openAmount: number;
  openTime: string;
  closeReason: CloseReason;
  remark?: string;
  profitLoss: number;
  date: string;
  isClosed: boolean;
  accountId?: number;
  source?: TradeSource;
  exchange?: string;
  isReadOnly?: boolean;
  externalId?: string;
  orderId?: string;
  side?: string;
  quantity?: number;
  price?: number;
  fee?: number;
  executedAt?: string;
}

export interface FundRecord {
  id: string;
  type: FundType;
  amount: number;
  date: string;
  accountId?: number;
}

export interface Account {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface BinanceOptionsStatus {
  configured: boolean;
  enabled: boolean;
  count: number;
  error: string | null;
  lastSyncAt: string | null;
}

const DEFAULT_BINANCE_OPTIONS_STATUS: BinanceOptionsStatus = {
  configured: false,
  enabled: false,
  count: 0,
  error: null,
  lastSyncAt: null,
};

// ── Hook ────────────────────────────────────────────────────────────────────

export const useTradingData = (initialAccountId: number = 1) => {
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [currentAccountId, setCurrentAccountId] = useState<number>(initialAccountId);
  const [balance, setBalance] = useState<number>(0);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [fundRecords, setFundRecords] = useState<FundRecord[]>([]);
  const [binanceOptionsStatus, setBinanceOptionsStatus] = useState<BinanceOptionsStatus>(DEFAULT_BINANCE_OPTIONS_STATUS);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // silent=true 时不触发全屏 loading（操作后静默刷新用）
  const loadData = useCallback(async (accountId: number, silent = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const [accountsRes, balanceRes, tradesRes, fundRecordsRes] = await Promise.all([
        api.accounts.getAll(),
        api.balance.get(accountId),
        api.trades.getAll({ accountId }),
        api.fundRecords.getAll(1000, accountId),
      ]);

      setAccounts((accountsRes.accounts ?? []).filter(Boolean) as Account[]);
      setBalance(Number(balanceRes.balance) || 0);
      setBinanceOptionsStatus({
        ...DEFAULT_BINANCE_OPTIONS_STATUS,
        ...((tradesRes.sources?.binanceOptions ?? {}) as Partial<BinanceOptionsStatus>),
      });

      setTrades(
        ((tradesRes.trades ?? []) as Record<string, unknown>[])
          .filter(Boolean)
          .map((t) => ({
            id: String(t.id ?? ''),
            symbol: String(t.symbol ?? ''),
            strategy: String(t.strategy ?? ''),
            position: (t.position != null ? Number(t.position) : 0) as PositionType,
            openAmount: t.openAmount != null ? (Number(t.openAmount) || 0) : 0,
            openTime: String(t.openTime ?? ''),
            closeReason: (t.closeReason as CloseReason) ?? 'profit',
            remark: t.remark ? String(t.remark) : '',
            profitLoss: t.profitLoss != null ? (Number(t.profitLoss) || 0) : 0,
            date: String(t.date ?? ''),
            isClosed: (t.isClosed as boolean) ?? true,
            accountId: t.accountId != null ? Number(t.accountId) : undefined,
            source: (t.source as TradeSource) ?? 'manual',
            exchange: t.exchange ? String(t.exchange) : undefined,
            isReadOnly: Boolean(t.isReadOnly),
            externalId: t.externalId ? String(t.externalId) : undefined,
            orderId: t.orderId ? String(t.orderId) : undefined,
            side: t.side ? String(t.side) : undefined,
            quantity: t.quantity != null ? (Number(t.quantity) || 0) : undefined,
            price: t.price != null ? (Number(t.price) || 0) : undefined,
            fee: t.fee != null ? (Number(t.fee) || 0) : undefined,
            executedAt: t.executedAt ? String(t.executedAt) : undefined,
          }))
      );

      setFundRecords(
        ((fundRecordsRes.records ?? []) as Record<string, unknown>[])
          .filter(Boolean)
          .map((r) => ({
            id: String(r.id ?? ''),
            type: (r.type as FundType) ?? 'deposit',
            amount: r.amount != null ? (Number(r.amount) || 0) : 0,
            date: String(r.date ?? ''),
            accountId: r.accountId != null ? Number(r.accountId) : undefined,
          }))
      );
      return true;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to load data';
      setBinanceOptionsStatus(DEFAULT_BINANCE_OPTIONS_STATUS);
      setError(msg);
      console.error('Failed to load data:', err);
      return false;
    } finally {
      if (!silent) setLoading(false);
    }
  }, []);

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
    binanceOptionsStatus,
    loading,
    error,
    loadData,
  };
};
