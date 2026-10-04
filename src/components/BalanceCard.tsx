'use client';

import { useState } from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import type { Account, FundRecord, FundType } from '@/lib/schema';
import { AccountManager } from './AccountManager';
import { FundDialog } from './FundDialog';
import { CardHeading, Money, SectionLabel } from './primitives';

interface Props {
  balance: number;
  totalDeposit: number;
  totalWithdraw: number;
  fundRecords: FundRecord[];
  accounts: Account[];
  currentAccountId: number;
  onSelectAccount: (id: number) => void;
  onCreateAccount: (name: string) => Promise<void>;
  onUpdateAccount: (id: number, name: string) => Promise<void>;
  onDeleteAccount: (id: number) => Promise<void>;
  onSubmitFund: (type: FundType, amount: number, date: string) => Promise<void>;
  onDeleteFundRecord: (id: string) => Promise<void>;
}

export function BalanceCard({
  balance,
  totalDeposit,
  totalWithdraw,
  fundRecords,
  accounts,
  currentAccountId,
  onSelectAccount,
  onCreateAccount,
  onUpdateAccount,
  onDeleteAccount,
  onSubmitFund,
  onDeleteFundRecord,
}: Props) {
  const [fundType, setFundType] = useState<FundType | null>(null);

  return (
    <Card>
      <CardHeader className="gap-4">
        <CardHeading
          title="资产余额"
          hint="余额由出入金与交易盈亏实时结算"
          action={
            <AccountManager
              accounts={accounts}
              currentAccountId={currentAccountId}
              onSelect={onSelectAccount}
              onCreate={onCreateAccount}
              onUpdate={onUpdateAccount}
              onDelete={onDeleteAccount}
            />
          }
        />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <SectionLabel>当前余额</SectionLabel>
            <div className="mt-1 flex items-baseline gap-2">
              <Money value={balance} className="text-4xl font-medium tracking-tight" />
              <span className="text-sm text-muted-foreground">USD</span>
            </div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setFundType('deposit')}>
              入金
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="text-down"
              onClick={() => setFundType('withdraw')}
            >
              出金
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <div className="text-xs text-muted-foreground">累计入金</div>
            <Money value={totalDeposit} tone="up" className="mt-1 block text-lg font-medium" />
          </div>
          <div className="rounded-lg border border-border bg-muted/40 px-3 py-2.5">
            <div className="text-xs text-muted-foreground">累计出金</div>
            <Money value={totalWithdraw} tone="down" className="mt-1 block text-lg font-medium" />
          </div>
        </div>

        {fundRecords.length > 0 && (
          <div>
            <SectionLabel className="mb-2">最近流水</SectionLabel>
            <div className="max-h-[168px] space-y-1 overflow-y-auto">
              {fundRecords.slice(0, 8).map((record) => (
                <div
                  key={record.id}
                  className="flex items-center justify-between rounded-md border border-border/70 px-3 py-1.5"
                >
                  <div className="flex items-center gap-3 text-sm">
                    <span className={record.type === 'deposit' ? 'text-up' : 'text-down'}>
                      {record.type === 'deposit' ? '入金' : '出金'}
                    </span>
                    <Money value={record.amount} className="text-sm" />
                    <span className="num text-xs text-muted-foreground">{record.date}</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7 text-muted-foreground hover:text-down"
                    onClick={() => {
                      if (window.confirm(`删除这条${record.type === 'deposit' ? '入金' : '出金'}记录？`)) {
                        void onDeleteFundRecord(record.id);
                      }
                    }}
                    aria-label="删除记录"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>

      <FundDialog
        type={fundType ?? 'deposit'}
        open={fundType !== null}
        onOpenChange={(open) => !open && setFundType(null)}
        balance={balance}
        onSubmit={onSubmitFund}
      />
    </Card>
  );
}
