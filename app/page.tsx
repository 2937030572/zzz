'use client';

import { useCallback, useState } from 'react';
import { Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api';
import type { Account, FundType, Trade } from '@/lib/schema';
import { DEFAULT_ACCOUNT_ID } from '@/lib/schema';
import { useTradingData } from '@/hooks/useTradingData';
import { useTradeForm } from '@/hooks/useTradeForm';
import { useTradeStats } from '@/hooks/useTradeStats';
import { getCloseReasonText } from '@/lib/format';
import { daysAgoStr, todayStr } from '@/lib/date';
import { BalanceCard } from '@/components/BalanceCard';
import { EquityChart } from '@/components/EquityChart';
import { OtherReasonDialog } from '@/components/OtherReasonDialog';
import { StatsPanel } from '@/components/StatsPanel';
import { TradeDialog } from '@/components/TradeDialog';
import { TradeTable } from '@/components/TradeTable';

type DialogMode = 'create' | 'edit' | null;

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function TradingApp() {
  const data = useTradingData(DEFAULT_ACCOUNT_ID);
  const form = useTradeForm(data.balance);
  const stats = useTradeStats(data.trades, data.fundRecords);

  const [mode, setMode] = useState<DialogMode>(null);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [busy, setBusy] = useState(false);

  const { currentAccountId, loadData, refreshAccounts } = data;

  /** 写操作后统一静默刷新，保证列表顺序与余额都来自服务端权威结果 */
  const refresh = useCallback(() => loadData(currentAccountId, true), [loadData, currentAccountId]);

  const run = useCallback(
    async (fn: () => Promise<void>) => {
      setBusy(true);
      try {
        await fn();
      } finally {
        setBusy(false);
      }
    },
    []
  );

  // ── 账户 ──────────────────────────────────────────────────────────────────

  const handleCreateAccount = async (name: string) => {
    await run(async () => {
      try {
        const res = await api.accounts.create(name);
        await refreshAccounts();
        data.setCurrentAccountId(res.account.id);
        toast.success('账户已创建');
      } catch (error) {
        toast.error(toMessage(error, '创建账户失败'));
        throw error; // 让调用方（AccountManager）知道失败，避免误清空输入
      }
    });
  };

  const handleUpdateAccount = async (id: number, name: string) => {
    await run(async () => {
      try {
        await api.accounts.update(id, name);
        await refreshAccounts();
        toast.success('账户已更新');
      } catch (error) {
        toast.error(toMessage(error, '更新账户失败'));
        throw error;
      }
    });
  };

  const handleDeleteAccount = async (id: number) => {
    await run(async () => {
      try {
        await api.accounts.delete(id);
        await refreshAccounts();
        toast.success('账户已删除');
      } catch (error) {
        toast.error(toMessage(error, '删除账户失败'));
        throw error;
      }
    });
  };

  // ── 出入金 ────────────────────────────────────────────────────────────────

  const handleSubmitFund = async (type: FundType, amount: number, date: string) => {
    await run(async () => {
      try {
        const res = await api.fundRecords.create({ type, amount, date, accountId: currentAccountId });
        data.applyFundSaved(res.record, res.balance);
        toast.success(type === 'deposit' ? '入金已记录' : '出金已记录');
      } catch (error) {
        toast.error(toMessage(error, '操作失败'));
      }
    });
  };

  const handleDeleteFundRecord = async (id: string) => {
    await run(async () => {
      try {
        const res = await api.fundRecords.delete(id, currentAccountId);
        data.applyFundDeleted(id, res.balance);
        toast.success('记录已删除');
      } catch (error) {
        toast.error(toMessage(error, '删除失败'));
      }
    });
  };

  // ── 交易 ──────────────────────────────────────────────────────────────────

  const handleEditTrade = (trade: Trade) => {
    form.load(trade);
    setEditing(trade);
    setMode('edit');
  };

  const handleSubmitTrade = async () => {
    if (!form.values.symbol.trim()) {
      toast.error('请填写交易品种');
      return;
    }
    if (form.values.isClosed && !form.values.profitLoss.trim()) {
      toast.error('已平仓时盈亏金额为必填项');
      return;
    }
    const pl = Number(form.values.profitLoss);
    if (form.values.isClosed && !Number.isFinite(pl)) {
      toast.error('盈亏金额必须是有效数字');
      return;
    }

    await run(async () => {
      try {
        if (mode === 'edit' && editing) {
          const res = await api.trades.update(editing.id, form.buildPayload('edit', currentAccountId));
          data.applyTradeSaved(res.trade, res.balance);
          toast.success('交易已更新');
        } else {
          const res = await api.trades.create(form.buildPayload('create', currentAccountId));
          data.applyTradeSaved(res.trade, res.balance);
          toast.success('交易已记录');
        }
        form.reset();
        setEditing(null);
        setMode(null);
      } catch (error) {
        toast.error(toMessage(error, '保存失败'));
      }
    });
  };

  const handleDeleteTrade = async (id: string) => {
    await run(async () => {
      try {
        const res = await api.trades.delete(id, currentAccountId);
        data.applyTradeDeleted(id, res.balance);
        toast.success('交易已删除');
      } catch (error) {
        toast.error(toMessage(error, '删除失败'));
      }
    });
  };

  // ── 其他 ──────────────────────────────────────────────────────────────────

  const handleQuickRange = useCallback((days: number) => {
    stats.setFilterStartDate(daysAgoStr(days - 1));
    stats.setFilterEndDate(todayStr());
  }, [stats]);

  const handleExport = () => {
    const payload = {
      exportedAt: new Date().toISOString(),
      accountId: currentAccountId,
      balance: data.balance,
      totalDeposit: stats.totalDeposit,
      totalWithdraw: stats.totalWithdraw,
      trades: data.trades.map((t) => ({
        交易品种: t.symbol,
        入场策略: t.strategy,
        仓位: `${t.position}%`,
        开仓金额: t.openAmount,
        开仓时间: `${t.date} ${t.openTime}`,
        平仓原因: getCloseReasonText(t.closeReason, t.remark),
        盈亏金额: t.profitLoss,
        状态: t.isClosed ? '已平仓' : '持有中',
        日期: t.date,
      })),
      fundRecords: data.fundRecords.map((r) => ({
        类型: r.type === 'deposit' ? '入金' : '出金',
        金额: r.amount,
        日期: r.date,
      })),
    };

    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `交易笔记_${todayStr()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const accounts: Account[] = data.accounts;

  return (
    <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
      <Toaster position="top-center" richColors closeButton />
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-xl font-medium tracking-tight">交易笔记</h1>
          <p className="num mt-1 text-sm text-muted-foreground">{todayStr()}</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => void refresh()} disabled={data.loading}>
            <RefreshCw className="mr-1.5 h-3.5 w-3.5" />
            刷新
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="mr-1.5 h-3.5 w-3.5" />
            导出
          </Button>
        </div>
      </header>

      {data.error && (
        <div className="mb-5 flex items-center justify-between gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm">
          <span className="text-destructive">{data.error}</span>
          <Button variant="outline" size="sm" onClick={() => void loadData(currentAccountId)}>
            重试
          </Button>
        </div>
      )}

      {data.loading ? (
        <div className="space-y-5">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-32 animate-pulse rounded-xl border border-border bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-5">
          <BalanceCard
            balance={data.balance}
            totalDeposit={stats.totalDeposit}
            totalWithdraw={stats.totalWithdraw}
            fundRecords={data.fundRecords}
            accounts={accounts}
            currentAccountId={currentAccountId}
            onSelectAccount={data.setCurrentAccountId}
            onCreateAccount={handleCreateAccount}
            onUpdateAccount={handleUpdateAccount}
            onDeleteAccount={handleDeleteAccount}
            onSubmitFund={handleSubmitFund}
            onDeleteFundRecord={handleDeleteFundRecord}
          />

          <EquityChart balance={data.balance} chartData={stats.chartData} />

          <StatsPanel
            periodSelections={stats.periodSelections}
            setPeriodSelections={stats.setPeriodSelections}
            periodStats={stats.periodStats}
            filterStartDate={stats.filterStartDate}
            filterEndDate={stats.filterEndDate}
            setFilterStartDate={stats.setFilterStartDate}
            setFilterEndDate={stats.setFilterEndDate}
            dateRangeInvalid={stats.dateRangeInvalid}
            onQuickRange={handleQuickRange}
            stats={stats.filteredStats}
            tradeCount={stats.filteredTrades.length}
            maxDrawdown={stats.maxDrawdown}
            streaks={stats.streaks}
          />

          <TradeTable
            trades={stats.filteredTrades}
            onEdit={handleEditTrade}
            onDelete={handleDeleteTrade}
            action={
              <div className="flex gap-2">
                <OtherReasonDialog trades={stats.otherReasonTrades} />
                <Button size="sm" onClick={() => setMode('create')}>
                  记一笔
                </Button>
              </div>
            }
          />
        </div>
      )}

      <TradeDialog
        open={mode !== null}
        onOpenChange={(open) => {
          if (!open) {
            setMode(null);
            setEditing(null);
            form.reset();
          }
        }}
        mode={mode === 'edit' ? 'edit' : 'create'}
        form={form}
        busy={busy}
        onSubmit={handleSubmitTrade}
      />
    </main>
  );
}
