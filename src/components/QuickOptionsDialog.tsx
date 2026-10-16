'use client';

import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Plus, RotateCcw, Trash2 } from 'lucide-react';
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
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import {
  QUICK_OPTION_LIMIT,
  defaultQuickOptions,
  maxLenOf,
  titleOf,
  validateLabel,
  type QuickKind,
  type QuickOptionsData,
} from '@/lib/quickOptions';
import type { SaveQuickOptionsResult } from '@/hooks/useQuickOptions';

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: QuickOptionsData;
  /** 云端同步不可用时的提示（null 表示正常） */
  syncError: string | null;
  initialKind?: QuickKind;
  onSave: (next: QuickOptionsData) => Promise<SaveQuickOptionsResult>;
}

const TABS: { kind: QuickKind; label: string }[] = [
  { kind: 'symbols', label: '快捷标的' },
  { kind: 'directions', label: '交易方向' },
];

/**
 * 快捷配置编辑器：新增 / 重命名 / 排序 / 删除，两类共用一套交互。
 *
 * 约定：父组件只在 open 时挂载本组件，因此草稿状态每次打开都会重新初始化，
 * 不需要在 effect 里回写 state。
 */
export function QuickOptionsDialog({
  open,
  onOpenChange,
  data,
  syncError,
  initialKind = 'symbols',
  onSave,
}: Props) {
  const [kind, setKind] = useState<QuickKind>(initialKind);
  const [draft, setDraft] = useState<QuickOptionsData>(() => ({
    symbols: [...data.symbols],
    directions: [...data.directions],
  }));
  const [newItem, setNewItem] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const list = draft[kind];
  const maxLen = maxLenOf(kind);
  const defaults = useMemo(() => defaultQuickOptions(), []);

  const update = (next: string[]) => setDraft((prev) => ({ ...prev, [kind]: next }));

  const handleAdd = () => {
    const problem = validateLabel(list, kind, newItem);
    if (problem) {
      setError(problem);
      return;
    }
    update([...list, newItem.trim()]);
    setNewItem('');
    setError(null);
  };

  const handleRename = (index: number, value: string) => {
    update(list.map((item, i) => (i === index ? value : item)));
  };

  const handleMove = (index: number, delta: number) => {
    const target = index + delta;
    if (target < 0 || target >= list.length) return;
    const next = [...list];
    [next[index], next[target]] = [next[target], next[index]];
    update(next);
  };

  const handleRemove = (index: number) => update(list.filter((_, i) => i !== index));

  const handleSave = async () => {
    setSaving(true);
    try {
      const result = await onSave(draft);
      if (result.warnings.length > 0) toast.warning(result.warnings.join('；'));
      if (result.ok) {
        toast.success('快捷配置已保存');
      } else {
        toast.warning(`已保存到本机，云端同步失败：${result.error ?? '未知错误'}`);
      }
      onOpenChange(false);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : '保存失败');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[86vh] max-w-md overflow-y-auto">
        <DialogHeader>
          <DialogTitle>快捷配置</DialogTitle>
          <DialogDescription>
            自定义「记一笔」里标的与方向的可选项，按当前浏览器用户保存。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="flex gap-1 rounded-lg border border-border bg-muted/40 p-1">
            {TABS.map((tab) => (
              <button
                key={tab.kind}
                type="button"
                onClick={() => {
                  setKind(tab.kind);
                  setError(null);
                }}
                className={cn(
                  'flex-1 rounded-md px-3 py-1.5 text-sm transition-colors',
                  kind === tab.kind
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.label}
                <span className="num ml-1 text-xs text-muted-foreground">
                  {draft[tab.kind].length}
                </span>
              </button>
            ))}
          </div>

          <div className="space-y-2">
            {list.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                还没有{titleOf(kind)}，添加后会出现在「记一笔」里
              </p>
            ) : (
              list.map((item, index) => (
                <div key={index} className="flex items-center gap-1">
                  <Input
                    value={item}
                    maxLength={maxLen}
                    aria-label={`${titleOf(kind)} ${index + 1}`}
                    onChange={(e) => handleRename(index, e.target.value)}
                    className="h-8 flex-1"
                  />
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    disabled={index === 0}
                    aria-label="上移"
                    onClick={() => handleMove(index, -1)}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground"
                    disabled={index === list.length - 1}
                    aria-label="下移"
                    onClick={() => handleMove(index, 1)}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-down"
                    aria-label="删除"
                    onClick={() => handleRemove(index)}
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>

          <div className="space-y-1.5 border-t border-border pt-3">
            <div className="flex gap-2">
              <Input
                value={newItem}
                maxLength={maxLen}
                placeholder={kind === 'symbols' ? '例如 ETH2406C' : '例如 做多'}
                onChange={(e) => {
                  setNewItem(e.target.value);
                  setError(null);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleAdd();
                  }
                }}
                className="h-8"
              />
              <Button
                variant="secondary"
                className="h-8 shrink-0"
                disabled={!newItem.trim()}
                onClick={handleAdd}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                添加
              </Button>
            </div>
            {error ? (
              <p className="text-xs text-down">{error}</p>
            ) : (
              <p className="text-xs text-muted-foreground">
                最多 {QUICK_OPTION_LIMIT} 项，每项不超过 {maxLen} 个字符
              </p>
            )}
          </div>

          <div className="flex items-center justify-between border-t border-border pt-3">
            <Button
              variant="ghost"
              size="sm"
              className="text-muted-foreground"
              onClick={() => update([...defaults[kind]])}
            >
              <RotateCcw className="mr-1.5 h-3.5 w-3.5" />
              恢复默认
            </Button>
            {syncError && <span className="text-xs text-muted-foreground">云端未同步</span>}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button disabled={saving} onClick={() => void handleSave()}>
            保存
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
