'use client';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import type { Trade } from '@/lib/schema';
import { getCloseReasonText } from '@/lib/format';
import { formatTradeDateTime } from '@/lib/date';
import { Money, toneOf } from './primitives';

export function OtherReasonDialog({ trades }: { trades: Trade[] }) {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="h-8">
          复盘备注
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>其他原因复盘</DialogTitle>
          <DialogDescription>最近 15 条标记为「其他」的平仓记录</DialogDescription>
        </DialogHeader>

        <div className="max-h-[400px] space-y-2 overflow-y-auto py-2">
          {trades.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">暂无记录</p>
          ) : (
            trades.map((trade) => {
              const pl = Number(trade.profitLoss) || 0;
              return (
                <div key={trade.id} className="rounded-lg border border-border px-3 py-2.5">
                  <div className="flex items-start justify-between gap-3">
                    <span className="text-sm font-medium">{trade.symbol}</span>
                    <Money value={pl} tone={toneOf(pl)} signed className="text-sm" />
                  </div>
                  <div className="num mt-1 text-xs text-muted-foreground">
                    {formatTradeDateTime(trade.date, trade.openTime)}
                  </div>
                  <p className="mt-1.5 text-sm text-muted-foreground">
                    {getCloseReasonText(trade.closeReason, trade.remark)}
                  </p>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
