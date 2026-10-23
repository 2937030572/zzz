'use client';

import { useCallback, useState } from 'react';
import { Activity, Download, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Toaster, toast } from 'sonner';
import { api } from '@/lib/api';
import type { Account, FundType, Trade } from '@/lib/schema';
import { DEFAULT_ACCOUNT_ID } from '@/lib/schema';
import { useTradingData } from '@/hooks/useTradingData';
import { useTradeBrowser } from '@/hooks/useTradeBrowser';
import { useTradeForm } from '@/hooks/useTradeForm';
import { useTradeStats } from '@/hooks/useTradeStats';
import { useQuickOptions } from '@/hooks/useQuickOptions';
import type { QuickKind } from '@/lib/quickOptions';
import { getCloseReasonText } from '@/lib/format';
import { disciplineLabel, emotionLabel, executionLabel } from '@/lib/review';
import { daysAgoStr, todayStr } from '@/lib/date';
import { BalanceCard } from '@/components/BalanceCard';
import { EquityChart } from '@/components/EquityChart';
import { OtherReasonDialog } from '@/components/OtherReasonDialog';
import { QuickOptionsDialog } from '@/components/QuickOptionsDialog';
import { StatsPanel } from '@/components/StatsPanel';
import { TradeDialog } from '@/components/TradeDialog';
import { TradeTable } from '@/components/TradeTable';

type DialogMode = 'create' | 'edit' | 'view' | null;

function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export default function TradingApp() {
  const data = useTradingData(DEFAULT_ACCOUNT_ID);
  const form = useTradeForm(data.balance);
  const stats = useTradeStats(data.trades, data.fundRecords);
  const quick = useQuickOptions();

  const [mode, setMode] = useState<DialogMode>(null);
  const [editing, setEditing] = useState<Trade | null>(null);
  const [busy, setBusy] = useState(false);
  const [quickKind, setQuickKind] = useState<QuickKind>('symbols');
  const [quickOpen, setQuickOpen] = useState(false);

  const { currentAccountId, loadData, refreshAccounts } = data;
  const browser = useTradeBrowser(currentAccountId);

  /** 页面刷新同时更新统计数据与当前筛选页，避免两处内容不同步。 */
  const refresh = useCallback(
    async () => {
      await Promise.all([loadData(currentAccountId, true), browser.refresh()]);
    },
    [browser, currentAccountId, loadData]
  );

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

  // ── 快捷配置 ──────────────────────────────────────────────────────────────

  const openQuickOptions = useCallback((kind: QuickKind) => {
    setQuickKind(kind);
    setQuickOpen(true);
  }, []);

  /** 新增交易时把用户的第一个方向作为默认值预填 */
  const openCreateTrade = useCallback(() => {
    form.reset({ direction: quick.directions[0] ?? '' });
    setEditing(null);
    setMode('create');
  }, [form, quick.directions]);

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

  /** 详情只读态：字段已载入表单，切换到编辑模式即可直接改 */
  const handleViewTrade = (trade: Trade) => {
    form.load(trade);
    setEditing(trade);
    setMode('view');
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
          await browser.refresh();
          toast.success('交易已更新');
        } else {
          const res = await api.trades.create(form.buildPayload('create', currentAccountId));
          data.applyTradeSaved(res.trade, res.balance);
          await browser.refresh();
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
        await browser.refresh();
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
        交易方向: t.direction || '未指定',
        入场策略: t.strategy,
        仓位: `${t.position}%`,
        开仓金额: t.openAmount,
        开仓时间: `${t.date} ${t.openTime}`,
        平仓原因: getCloseReasonText(t.closeReason, t.remark),
        盈亏金额: t.profitLoss,
        状态: t.isClosed ? '已平仓' : '持有中',
        执行度: executionLabel(t.executionScore),
        纪律标签: t.disciplineTags.map(disciplineLabel).join('、') || '无',
        情绪状态: emotionLabel(t.emotion),
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
    <main className="app-shell mx-auto max-w-5xl px-4 py-5 sm:px-6 sm:py-8">
      <Toaster position="top-center" richColors closeButton />
      <header className="app-header mb-6 flex flex-wrap items-end justify-between gap-4 px-5 py-5 sm:px-6">
        <div className="relative z-10">
          <p className="eyebrow"><Activity className="h-3.5 w-3.5 text-up" />Trading journal</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">交易笔记</h1>
          <p className="num mt-1.5 text-sm text-muted-foreground">{todayStr()} · 记录、复盘、迭代</p>
        </div>
        <div className="relative z-10 flex gap-2">
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
            trades={browser.trades}
            total={browser.total}
            page={browser.page}
            pageSize={browser.pageSize}
            filters={browser.filters}
            loading={browser.loading}
            error={browser.error}
            symbols={quick.symbols}
            directions={quick.directions}
            onFilterChange={browser.updateFilters}
            onClearFilters={browser.clearFilters}
            onPageChange={browser.setPage}
            onRetry={() => void browser.refresh()}
            onEdit={handleEditTrade}
            onView={handleViewTrade}
            onDelete={handleDeleteTrade}
            action={
              <div className="flex gap-2">
                <OtherReasonDialog trades={stats.otherReasonTrades} />
                <Button size="sm" onClick={openCreateTrade}>
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
        mode={mode ?? 'create'}
        form={form}
        busy={busy}
        onSubmit={handleSubmitTrade}
        onRequestEdit={() => setMode('edit')}
        symbols={quick.symbols}
        directions={quick.directions}
        onManageQuickOptions={openQuickOptions}
      />

      {quickOpen && (
        <QuickOptionsDialog
          open
          onOpenChange={setQuickOpen}
          data={quick.raw}
          syncError={quick.syncError}
          initialKind={quickKind}
          onSave={quick.save}
        />
      )}
    </main>
  );
}
