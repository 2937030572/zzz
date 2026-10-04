'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { FundType } from '@/lib/schema';
import { todayStr } from '@/lib/date';

interface Props {
  type: FundType;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  balance: number;
  onSubmit: (type: FundType, amount: number, date: string) => Promise<void>;
}

export function FundDialog({ type, open, onOpenChange, balance, onSubmit }: Props) {
  const [amount, setAmount] = useState('');
  const [date, setDate] = useState(todayStr());
  const [busy, setBusy] = useState(false);

  const isDeposit = type === 'deposit';
  const value = Number(amount);

  const submit = async () => {
    if (!Number.isFinite(value) || value <= 0) return;
    if (!isDeposit && value > balance) return;
    setBusy(true);
    try {
      await onSubmit(type, value, date);
      setAmount('');
      setDate(todayStr());
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  const insufficient = !isDeposit && Number.isFinite(value) && value > 0 && value > balance;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{isDeposit ? '入金' : '出金'}</DialogTitle>
          <DialogDescription>
            当前余额 <span className="num">${balance.toLocaleString('zh-CN')}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="fund-amount">金额</Label>
            <Input
              id="fund-amount"
              type="number"
              inputMode="decimal"
              placeholder="0.00"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && void submit()}
              className="num"
            />
            {insufficient && <p className="text-xs text-down">出金金额超出当前余额</p>}
          </div>
          <div className="space-y-2">
            <Label htmlFor="fund-date">日期</Label>
            <Input
              id="fund-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="num"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button
            onClick={() => void submit()}
            disabled={busy || !Number.isFinite(value) || value <= 0 || insufficient}
          >
            {isDeposit ? '确认入金' : '确认出金'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
