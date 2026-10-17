'use client';

import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  DISCIPLINE_TAG_OPTIONS,
  EMOTION_OPTIONS,
  EMPTY_SELECT,
  EXECUTION_MAX,
  EXECUTION_MIN,
  clampExecutionScore,
  disciplineLabel,
  emotionLabel,
  hasReview,
  parseDisciplineTags,
  parseEmotion,
  type DisciplineTag,
  type Emotion,
} from '@/lib/review';

/**
 * 复盘字段的展示与编辑。
 * 列表预览、详情弹窗、编辑表单三处都复用这里的组件，保证口径与文案一致。
 */

/** 执行度：五个实心/空心点 */
export function ExecutionDots({ score, className }: { score: unknown; className?: string }) {
  const value = clampExecutionScore(score);
  return (
    <span className={cn('inline-flex items-center gap-1 align-middle', className)} title={`执行度 ${emotionLabelSafe(value)}`}>
      {Array.from({ length: EXECUTION_MAX }, (_, i) => (
        <span
          key={i}
          className={cn(
            'h-1.5 w-1.5 rounded-full',
            i < value ? 'bg-foreground' : 'bg-foreground/20'
          )}
        />
      ))}
    </span>
  );
}

function emotionLabelSafe(score: number): string {
  return score === 0 ? '未评分' : `${score}/${EXECUTION_MAX}`;
}

export function EmotionChip({ emotion }: { emotion: unknown }) {
  const value = parseEmotion(emotion);
  if (value === '') return null;
  return (
    <span className="rounded border border-border px-1.5 py-0.5 text-[11px] text-muted-foreground">
      {emotionLabel(value)}
    </span>
  );
}

export function DisciplineChips({
  tags,
  max,
  className,
}: {
  tags: unknown;
  /** 列表预览里最多显示几个，超出折叠为 +N */
  max?: number;
  className?: string;
}) {
  const list = parseDisciplineTags(tags);
  if (list.length === 0) return null;

  const shown = max ? list.slice(0, max) : list;
  const rest = list.length - shown.length;

  return (
    <span className={cn('inline-flex flex-wrap items-center gap-1', className)}>
      {shown.map((tag) => (
        <span
          key={tag}
          className={cn(
            'rounded border px-1.5 py-0.5 text-[11px]',
            DISCIPLINE_TAG_OPTIONS.find((o) => o.value === tag)?.good
              ? 'border-foreground/30 text-foreground'
              : 'border-border text-muted-foreground'
          )}
        >
          {disciplineLabel(tag)}
        </span>
      ))}
      {rest > 0 && <span className="text-[11px] text-muted-foreground">+{rest}</span>}
    </span>
  );
}

/** 列表预览用的紧凑摘要：执行度 + 情绪 + 标签，无内容时显示占位符 */
export function ReviewPreview({
  score,
  emotion,
  tags,
}: {
  score: unknown;
  emotion: unknown;
  tags: unknown;
}) {
  if (!hasReview(score, emotion, tags)) {
    return <span className="text-xs text-muted-foreground/60">—</span>;
  }
  return (
    <span className="flex items-center gap-1.5">
      <ExecutionDots score={score} />
      <EmotionChip emotion={emotion} />
      <DisciplineChips tags={tags} max={1} />
    </span>
  );
}

// ── 编辑态 ──────────────────────────────────────────────────────────────────

interface ReviewEditorProps {
  score: number;
  emotion: Emotion;
  tags: DisciplineTag[];
  onChange: (patch: { executionScore?: number; emotion?: Emotion; disciplineTags?: DisciplineTag[] }) => void;
}

export function ReviewEditor({ score, emotion, tags, onChange }: ReviewEditorProps) {
  const value = clampExecutionScore(score);

  const toggleTag = (tag: DisciplineTag) => {
    const next = tags.includes(tag) ? tags.filter((t) => t !== tag) : [...tags, tag];
    onChange({ disciplineTags: parseDisciplineTags(next) });
  };

  return (
    <div className="space-y-3 rounded-lg border border-border bg-muted/30 p-3">
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-sm">执行度</span>
          <span className="num text-xs text-muted-foreground">
            {value === 0 ? '未评分' : `${value}/${EXECUTION_MAX}`}
          </span>
        </div>
        <div className="flex gap-1">
          {Array.from({ length: EXECUTION_MAX }, (_, i) => i + EXECUTION_MIN).map((n) => (
            <button
              key={n}
              type="button"
              onClick={() => onChange({ executionScore: value === n ? 0 : n })}
              className={cn(
                'num h-8 flex-1 rounded-md border text-sm transition-colors',
                value === n
                  ? 'border-foreground/40 bg-foreground/5 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground'
              )}
            >
              {n}
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">再次点击可取消评分</p>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <span className="text-sm">情绪状态</span>
        <Select
          value={emotion || EMPTY_SELECT}
          onValueChange={(v) => onChange({ emotion: v === EMPTY_SELECT ? '' : (v as Emotion) })}
        >
          <SelectTrigger className="h-8">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={EMPTY_SELECT}>未记录</SelectItem>
            {EMOTION_OPTIONS.map((o) => (
              <SelectItem key={o.value} value={o.value}>
                {o.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2 border-t border-border pt-3">
        <div className="flex items-center justify-between">
          <span className="text-sm">纪律标签</span>
          <span className="num text-xs text-muted-foreground">{tags.length} 项</span>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {DISCIPLINE_TAG_OPTIONS.map((o) => {
            const active = tags.includes(o.value);
            return (
              <button
                key={o.value}
                type="button"
                onClick={() => toggleTag(o.value)}
                className={cn(
                  'rounded-full border px-2.5 py-1 text-xs transition-colors',
                  active
                    ? 'border-foreground/40 bg-foreground/5 text-foreground'
                    : 'border-border text-muted-foreground hover:text-foreground'
                )}
              >
                {o.label}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/** 详情只读态：与编辑态字段一一对应，空值统一显示「未填写」 */
export function ReviewDetail({ score, emotion, tags }: { score: unknown; emotion: unknown; tags: unknown }) {
  const list = parseDisciplineTags(tags);
  const value = clampExecutionScore(score);

  return (
    <div className="space-y-2 rounded-lg border border-border bg-muted/30 p-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">执行度</span>
        {value === 0 ? (
          <span className="text-sm text-muted-foreground">未评分</span>
        ) : (
          <span className="flex items-center gap-1.5">
            <ExecutionDots score={value} />
            <span className="num text-sm">{value}/{EXECUTION_MAX}</span>
          </span>
        )}
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-muted-foreground">情绪状态</span>
        <span className="text-sm">
          {emotionLabel(emotion) === '未记录' ? (
            <span className="text-muted-foreground">未记录</span>
          ) : (
            emotionLabel(emotion)
          )}
        </span>
      </div>

      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0 text-xs text-muted-foreground">纪律标签</span>
        {list.length === 0 ? (
          <span className="text-sm text-muted-foreground">无</span>
        ) : (
          <DisciplineChips tags={list} />
        )}
      </div>
    </div>
  );
}
