'use client';

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
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { CloseReason, VolumeTrend, BollContraction, BollWidth, Pattern } from '@/lib/schema';
import { POSITION_OPTIONS } from '@/lib/tradeLevel';
import { NO_DIRECTION, type QuickKind } from '@/lib/quickOptions';
import type { DisciplineTag, Emotion } from '@/lib/review';
import { fmt, getLevelColor } from '@/lib/format';
import { formatTradeDateTime, splitDateTimeLocal } from '@/lib/date';
import { cn } from '@/lib/utils';
import { ReviewDetail, ReviewEditor } from '@/components/TradeReview';
import type { useTradeForm } from '@/hooks/useTradeForm';

type Form = ReturnType<typeof useTradeForm>;
type DialogMode = 'create' | 'edit' | 'view';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: DialogMode;
  form: Form;
  busy?: boolean;
  onSubmit: () => Promise<void>;
  /** 详情态下的「编辑」入口，由调用方切换到编辑模式 */
  onRequestEdit?: () => void;
  /** 用户自定义的快捷标的 */
  symbols: string[];
  /** 用户自定义的交易方向 */
  directions: string[];
  onManageQuickOptions: (kind: QuickKind) => void;
}

const VOLUME_OPTIONS: { value: VolumeTrend; label: string }[] = [
  { value: 'no_trend', label: '无量能背离' },
  { value: 'top_divergence', label: '顶背离' },
  { value: 'bottom_divergence', label: '底背离' },
];

const CONTRACTION_OPTIONS: { value: BollContraction; label: string }[] = [
  { value: '1h', label: '1 小时' },
  { value: '2h', label: '2 小时' },
  { value: '4h_plus', label: '4 小时及以上' },
];

const WIDTH_OPTIONS: { value: BollWidth; label: string }[] = [
  { value: 'converged', label: '粘合' },
  { value: 'not_converged', label: '未粘合' },
];

const PATTERN_OPTIONS: { value: Pattern; label: string }[] = [
  { value: 'none', label: '无形态' },
  { value: 'head_shoulders', label: '头肩顶/底' },
  { value: 'double_top_bottom', label: '双顶/双底' },
  { value: 'triple_top_bottom', label: '三顶/三底' },
  { value: 'triangle', label: '三角形' },
  { value: 'cup_handle', label: '杯柄形' },
  { value: 'channel', label: '通道' },
];

const CLOSE_REASON_OPTIONS: { value: CloseReason; label: string }[] = [
  { value: 'profit', label: '止盈' },
  { value: 'loss', label: '止损' },
  { value: 'other', label: '其他' },
];

const TITLES: Record<DialogMode, { title: string; desc: string }> = {
  create: { title: '新增交易', desc: '记录一笔交易，分级系统会生成入场策略' },
  edit: { title: '编辑交易', desc: '修改记录后余额会自动重新结算' },
  view: { title: '交易详情', desc: '完整字段一览，可直接切换为编辑' },
};

/** 详情只读态的数值展示，空值统一显示「未填写」 */
function ReadValue({ value }: { value: string }) {
  return (
    <div className="flex min-h-8 items-center text-sm">
      {value.trim() ? value : <span className="text-muted-foreground">未填写</span>}
    </div>
  );
}

export function TradeDialog({
  open,
  onOpenChange,
  mode,
  form,
  busy,
  onSubmit,
  onRequestEdit,
  symbols,
  directions,
  onManageQuickOptions,
}: Props) {
  const { values, set, openAmount, level } = form;
  const readOnly = mode === 'view';
  const isCreate = mode === 'create';

  // 编辑历史记录时，若其方向不在当前快捷项里，临时补进下拉，避免显示成空白
  const directionOptions =
    values.direction && !directions.includes(values.direction)
      ? [values.direction, ...directions]
      : directions;

  const setReview = (patch: {
    executionScore?: number;
    emotion?: Emotion;
    disciplineTags?: DisciplineTag[];
  }) => {
    if (patch.executionScore !== undefined) set('executionScore', patch.executionScore);
    if (patch.emotion !== undefined) set('emotion', patch.emotion);
    if (patch.disciplineTags !== undefined) set('disciplineTags', patch.disciplineTags);
  };

  const openTimeText = (() => {
    const { date, time } = splitDateTimeLocal(values.openDateTime);
    return formatTradeDateTime(date, time);
  })();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{TITLES[mode].title}</DialogTitle>
          <DialogDescription>{TITLES[mode].desc}</DialogDescription>
        </DialogHeader>

        <div className="space-y-5 py-2">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="trade-symbol">交易品种</Label>
              {!readOnly && (
                <button
                  type="button"
                  className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                  onClick={() => onManageQuickOptions('symbols')}
                >
                  管理快捷项
                </button>
              )}
            </div>
            {readOnly ? (
              <ReadValue value={values.symbol} />
            ) : (
              <>
                <Input
                  id="trade-symbol"
                  placeholder="例如 ETH2406C"
                  value={values.symbol}
                  onChange={(e) => set('symbol', e.target.value)}
                />
                {symbols.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5">
                    {symbols.map((item) => (
                      <button
                        key={item}
                        type="button"
                        onClick={() => set('symbol', item)}
                        className={cn(
                          'rounded-full border px-2.5 py-1 text-xs transition-colors',
                          values.symbol === item
                            ? 'border-foreground/40 bg-foreground/5 text-foreground'
                            : 'border-border text-muted-foreground hover:text-foreground'
                        )}
                      >
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label htmlFor="trade-direction">交易方向</Label>
                {!readOnly && (
                  <button
                    type="button"
                    className="text-xs text-muted-foreground underline-offset-2 hover:text-foreground hover:underline"
                    onClick={() => onManageQuickOptions('directions')}
                  >
                    管理
                  </button>
                )}
              </div>
              {readOnly ? (
                <ReadValue value={values.direction} />
              ) : (
                <Select
                  value={values.direction || NO_DIRECTION}
                  onValueChange={(v) => set('direction', v === NO_DIRECTION ? '' : v)}
                >
                  <SelectTrigger id="trade-direction">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_DIRECTION}>未指定</SelectItem>
                    {directionOptions.map((item) => (
                      <SelectItem key={item} value={item}>
                        {item}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="trade-open-time">开仓时间</Label>
              {readOnly ? (
                <ReadValue value={openTimeText} />
              ) : (
                <Input
                  id="trade-open-time"
                  type="datetime-local"
                  value={values.openDateTime}
                  onChange={(e) => set('openDateTime', e.target.value)}
                  className="num"
                />
              )}
            </div>
          </div>

          {isCreate ? (
            <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
              <Label>交易分级</Label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                <Select
                  value={values.volumeTrend}
                  onValueChange={(v) => set('volumeTrend', v as VolumeTrend)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {VOLUME_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={values.bollContraction}
                  onValueChange={(v) => set('bollContraction', v as BollContraction)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CONTRACTION_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select
                  value={values.bollWidth}
                  onValueChange={(v) => set('bollWidth', v as BollWidth)}
                >
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WIDTH_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={values.pattern} onValueChange={(v) => set('pattern', v as Pattern)}>
                  <SelectTrigger className="h-8 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PATTERN_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>
                        {o.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-baseline gap-2 border-t border-border pt-2">
                <span className={`text-xl font-medium ${getLevelColor(level.level)}`}>
                  {level.level}
                </span>
                <span className="text-xs text-muted-foreground">
                  {level.description} · {level.suggestion}
                </span>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              <Label htmlFor="trade-strategy">入场策略</Label>
              {readOnly ? (
                <ReadValue value={values.strategy} />
              ) : (
                <Input
                  id="trade-strategy"
                  placeholder="例如 A-/底背离/4h+收缩/未粘合"
                  value={values.strategy}
                  onChange={(e) => set('strategy', e.target.value)}
                />
              )}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="trade-position">仓位</Label>
              {readOnly ? (
                <ReadValue value={`${values.position}%`} />
              ) : (
                <Select
                  value={String(values.position)}
                  onValueChange={(v) => set('position', Number(v))}
                >
                  <SelectTrigger id="trade-position" className="num">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {POSITION_OPTIONS.map((opt) => (
                      <SelectItem key={opt} value={String(opt)}>
                        {opt}%
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>
            <div className="space-y-2">
              <Label>开仓金额</Label>
              <div className="num flex h-9 items-center rounded-md border border-border bg-muted/40 px-3 text-sm">
                {fmt(openAmount)}
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2.5">
            <Label htmlFor="trade-closed" className="text-sm">
              是否已平仓
            </Label>
            {readOnly ? (
              <span className="text-sm">{values.isClosed ? '已平仓' : '持有中'}</span>
            ) : (
              <Switch
                id="trade-closed"
                checked={values.isClosed}
                onCheckedChange={(v) => set('isClosed', v)}
              />
            )}
          </div>

          {values.isClosed && (
            <div className="space-y-4 border-t border-border pt-4">
              <div className="space-y-2">
                <Label htmlFor="trade-close-reason">平仓原因</Label>
                {readOnly ? (
                  <ReadValue
                    value={
                      CLOSE_REASON_OPTIONS.find((o) => o.value === values.closeReason)?.label ?? ''
                    }
                  />
                ) : (
                  <Select
                    value={values.closeReason}
                    onValueChange={(v) => set('closeReason', v as CloseReason)}
                  >
                    <SelectTrigger id="trade-close-reason">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CLOSE_REASON_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              </div>

              {(values.closeReason === 'other' || readOnly) && (
                <div className="space-y-2">
                  <Label htmlFor="trade-remark">备注</Label>
                  {readOnly ? (
                    <div className="whitespace-pre-wrap break-words text-sm">
                      {values.remark.trim() ? (
                        values.remark
                      ) : (
                        <span className="text-muted-foreground">未填写</span>
                      )}
                    </div>
                  ) : (
                    <Textarea
                      id="trade-remark"
                      placeholder="写下这次的问题或经验"
                      value={values.remark}
                      onChange={(e) => set('remark', e.target.value)}
                      rows={3}
                    />
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="trade-pl">盈亏金额</Label>
                {readOnly ? (
                  <div className="num text-sm">{fmt(values.profitLoss)}</div>
                ) : (
                  <Input
                    id="trade-pl"
                    type="number"
                    inputMode="decimal"
                    step="0.01"
                    placeholder="盈利为正，亏损为负"
                    value={values.profitLoss}
                    onChange={(e) => set('profitLoss', e.target.value)}
                    className="num"
                  />
                )}
              </div>
            </div>
          )}

          <div className="space-y-2 border-t border-border pt-4">
            <Label>复盘</Label>
            {readOnly ? (
              <ReviewDetail
                score={values.executionScore}
                emotion={values.emotion}
                tags={values.disciplineTags}
              />
            ) : (
              <ReviewEditor
                score={values.executionScore}
                emotion={values.emotion}
                tags={values.disciplineTags}
                onChange={setReview}
              />
            )}
          </div>
        </div>

        <DialogFooter>
          {readOnly ? (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                关闭
              </Button>
              {onRequestEdit && <Button onClick={onRequestEdit}>编辑</Button>}
            </>
          ) : (
            <>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                取消
              </Button>
              <Button disabled={busy} onClick={() => void onSubmit()}>
                {isCreate ? '添加' : '保存'}
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
