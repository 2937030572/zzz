'use client';

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { CalendarIcon } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

const tradeFormSchema = z.object({
  symbol: z.string().min(1, '请输入交易品种'),
  strategySummary: z.string().min(1, '请输入策略总结'),
  tradeLevel: z.string().min(1, '请选择交易级别'),
  positionSize: z.string().min(1, '请选择仓位'),
  profitLoss: z.string().optional(),
  exitReason: z.string().optional(),
  notes: z.string().optional(),
  entryTime: z.date(),
  isClosed: z.boolean(),
});

type TradeFormData = z.infer<typeof tradeFormSchema>;

interface Trade {
  id: string;
  symbol: string;
  direction: string;
  entryPrice: string;
  exitPrice: string | null;
  quantity: number;
  strategySummary: string;
  profitLoss: string | null;
  exitReason: string | null;
  entryTime: string;
  exitTime: string | null;
  notes: string | null;
  isClosed: boolean;
  createdAt: string;
  updatedAt: string | null;
}

interface TradeFormProps {
  trade?: Trade | null;
  onSave: () => void;
  onCancel: () => void;
  currentBalance?: string;
}

export default function TradeForm({ trade, onSave, onCancel, currentBalance = '0' }: TradeFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [entryTimeOpen, setEntryTimeOpen] = useState(false);

  const form = useForm<TradeFormData>({
    resolver: zodResolver(tradeFormSchema),
    defaultValues: {
      symbol: '',
      strategySummary: '',
      tradeLevel: 'A',
      positionSize: '5%',
      profitLoss: '',
      exitReason: '',
      notes: '',
      entryTime: new Date(),
      isClosed: false,
    },
  });

  // 使用 watch 监控表单值，避免在渲染时多次调用
  const entryTime = form.watch('entryTime');
  const positionSize = form.watch('positionSize');
  const isClosed = form.watch('isClosed');
  const exitReason = form.watch('exitReason');

  useEffect(() => {
    if (trade) {
      form.reset({
        symbol: trade.symbol,
        strategySummary: trade.strategySummary,
        tradeLevel: (trade as any).tradeLevel || 'A',
        positionSize: (trade as any).positionSize || '5%',
        profitLoss: trade.profitLoss || '',
        exitReason: trade.exitReason || '',
        notes: trade.notes || '',
        entryTime: new Date(trade.entryTime),
        isClosed: trade.isClosed,
      });
    }
  }, [trade, form]);

  const onSubmit = async (data: TradeFormData) => {
    setIsSubmitting(true);
    try {
      const payload = {
        symbol: data.symbol,
        direction: '买入',
        entryPrice: '0',
        exitPrice: null,
        quantity: '1',
        strategySummary: data.strategySummary,
        tradeLevel: data.tradeLevel,
        positionSize: data.positionSize,
        profitLoss: data.profitLoss ? data.profitLoss.toString() : null,
        exitReason: data.exitReason || null,
        entryTime: data.entryTime.toISOString(),
        exitTime: null,
        notes: data.notes || null,
        isClosed: data.isClosed,
      };

      const url = trade ? `/api/trades/${trade.id}` : '/api/trades';
      const method = trade ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        throw new Error('Failed to save trade');
      }

      onSave();
    } catch (error) {
      console.error('Error saving trade:', error);
      alert('保存失败，请重试');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="symbol">交易品种 *</Label>
        <Input
          id="symbol"
          placeholder="例如：BTC/USDT"
          {...form.register('symbol')}
        />
        {form.formState.errors.symbol && (
          <p className="text-sm text-red-600">{form.formState.errors.symbol.message}</p>
        )}
      </div>

      <div className="space-y-2">
        <Label>开仓时间 *</Label>
        <Popover open={entryTimeOpen} onOpenChange={setEntryTimeOpen}>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              className={cn(
                'w-full justify-start text-left font-normal',
                !entryTime && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="mr-2 h-4 w-4" />
              {entryTime ? (
                format(entryTime, 'yyyy-MM-dd HH:mm')
              ) : (
                <span>选择日期和时间</span>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={entryTime}
              onSelect={(date) => {
                if (date) {
                  const newDate = new Date(date);
                  if (entryTime) {
                    newDate.setHours(entryTime.getHours());
                    newDate.setMinutes(entryTime.getMinutes());
                  }
                  form.setValue('entryTime', newDate);
                  setEntryTimeOpen(false);
                }
              }}
              initialFocus
            />
          </PopoverContent>
        </Popover>
        <Input
          type="time"
          className="mt-2"
          value={entryTime ? `${entryTime.getHours().toString().padStart(2, '0')}:${entryTime.getMinutes().toString().padStart(2, '0')}` : ''}
          onChange={(e) => {
            const [hours, minutes] = e.target.value.split(':').map(Number);
            const newDate = entryTime ? new Date(entryTime) : new Date();
            newDate.setHours(hours);
            newDate.setMinutes(minutes);
            form.setValue('entryTime', newDate);
          }}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="strategySummary">策略总结 *</Label>
        <Textarea
          id="strategySummary"
          placeholder="描述您的交易策略和分析..."
          className="min-h-[100px]"
          {...form.register('strategySummary')}
        />
        {form.formState.errors.strategySummary && (
          <p className="text-sm text-red-600">{form.formState.errors.strategySummary.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="tradeLevel">交易级别 *</Label>
          <Select
            onValueChange={(value) => form.setValue('tradeLevel', value)}
            defaultValue={form.watch('tradeLevel')}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择交易级别" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="A">A级</SelectItem>
              <SelectItem value="B">B级</SelectItem>
            </SelectContent>
          </Select>
          {form.formState.errors.tradeLevel && (
            <p className="text-sm text-red-600">{form.formState.errors.tradeLevel.message}</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="positionSize">仓位 *</Label>
          <Select
            onValueChange={(value) => form.setValue('positionSize', value)}
            defaultValue={form.watch('positionSize')}
          >
            <SelectTrigger>
              <SelectValue placeholder="请选择仓位" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => {
                const percentage = (i + 1) * 5;
                return (
                  <SelectItem key={percentage} value={`${percentage}%`}>
                    {percentage}%
                  </SelectItem>
                );
              })}
            </SelectContent>
          </Select>
          {form.formState.errors.positionSize && (
            <p className="text-sm text-red-600">{form.formState.errors.positionSize.message}</p>
          )}
        </div>
      </div>

      {/* 开仓金额显示 */}
      <Card className="bg-muted/50">
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-1">开仓金额</p>
              <p className="text-2xl font-bold">
                ${(
                  parseFloat(currentBalance) *
                  (parseFloat(positionSize) / 100)
                ).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-muted-foreground mb-1">计算公式</p>
              <p className="text-sm">
                ${parseFloat(currentBalance).toLocaleString('en-US', {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })} × {positionSize}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {isClosed && (
        <>
          <div className="space-y-2">
            <Label htmlFor="profitLoss">盈亏</Label>
            <Input
              id="profitLoss"
              type="number"
              step="any"
              placeholder="0.00"
              {...form.register('profitLoss')}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="exitReason">平仓原因</Label>
            <Select
              onValueChange={(value) => form.setValue('exitReason', value)}
              defaultValue={exitReason || ''}
            >
              <SelectTrigger>
                <SelectValue placeholder="请选择平仓原因" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="正常止盈">正常止盈</SelectItem>
                <SelectItem value="正常止损">正常止损</SelectItem>
                <SelectItem value="其他原因">其他原因</SelectItem>
              </SelectContent>
            </Select>
            {form.formState.errors.exitReason && (
              <p className="text-sm text-red-600">{form.formState.errors.exitReason.message}</p>
            )}
          </div>

          {exitReason === '其他原因' && (
            <div className="space-y-2">
              <Label htmlFor="notes">备注</Label>
              <Textarea
                id="notes"
                placeholder="请详细描述其他原因..."
                className="min-h-[80px]"
                {...form.register('notes')}
              />
            </div>
          )}
        </>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id="isClosed"
          checked={isClosed}
          onCheckedChange={(checked) => form.setValue('isClosed', checked)}
        />
        <Label htmlFor="isClosed">已平仓</Label>
      </div>

      <div className="flex justify-end gap-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          取消
        </Button>
        <Button type="submit" disabled={isSubmitting}>
          {isSubmitting ? '保存中...' : trade ? '更新' : '保存'}
        </Button>
      </div>
    </form>
  );
}
// reload
