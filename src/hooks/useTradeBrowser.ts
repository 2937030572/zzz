'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import type { Trade } from '@/lib/schema';

export type TradeStatusFilter = 'all' | 'open' | 'closed';

export interface TradeFilters {
  keyword: string;
  direction: string;
  strategy: string;
  status: TradeStatusFilter;
  startDate: string;
  endDate: string;
}

const PAGE_SIZE = 20;

const emptyFilters = (): TradeFilters => ({
  keyword: '',
  direction: '',
  strategy: '',
  status: 'all',
  startDate: '',
  endDate: '',
});

/**
 * 专供列表浏览的服务端筛选与分页。
 * 统计仍可使用独立数据源，避免翻页时把当前页误当成全部交易。
 */
export function useTradeBrowser(accountId: number) {
  const [filters, setFilters] = useState<TradeFilters>(emptyFilters);
  const [page, setPage] = useState(1);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestId = useRef(0);

  const refresh = useCallback(async () => {
    const id = ++requestId.current;
    setLoading(true);
    setError(null);
    try {
      const result = await api.trades.getAll({
        accountId,
        page,
        pageSize: PAGE_SIZE,
        keyword: filters.keyword,
        direction: filters.direction,
        strategy: filters.strategy,
        status: filters.status === 'all' ? undefined : filters.status,
        startDate: filters.startDate,
        endDate: filters.endDate,
      });
      if (id !== requestId.current) return;
      const nextTotal = result.total ?? 0;
      const lastPage = Math.max(1, Math.ceil(nextTotal / PAGE_SIZE));
      if (page > lastPage) {
        setPage(lastPage);
        return;
      }
      setTrades(result.trades);
      setTotal(nextTotal);
    } catch (err) {
      if (id !== requestId.current) return;
      setTrades([]);
      setTotal(0);
      setError(err instanceof Error ? err.message : '加载交易列表失败');
    } finally {
      if (id === requestId.current) setLoading(false);
    }
  }, [accountId, filters, page]);

  useEffect(() => {
    // 文本筛选等待用户暂停输入后再查询，翻页和下拉筛选也沿用同一请求收敛逻辑。
    const timer = window.setTimeout(() => void refresh(), 250);
    return () => window.clearTimeout(timer);
  }, [refresh]);

  const updateFilters = useCallback((patch: Partial<TradeFilters>) => {
    setFilters((prev) => ({ ...prev, ...patch }));
    setPage(1);
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(emptyFilters());
    setPage(1);
  }, []);

  return {
    filters,
    updateFilters,
    clearFilters,
    page,
    setPage,
    pageSize: PAGE_SIZE,
    trades,
    total,
    loading,
    error,
    refresh,
  };
}
