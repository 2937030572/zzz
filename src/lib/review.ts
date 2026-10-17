import { z } from 'zod';

/**
 * 复盘字段（执行度 / 纪律标签 / 情绪状态）的领域定义。
 *
 * 与 quickOptions 的区别：这几项是固定枚举，不是用户自定义项 ——
 * 因为统计口径要稳定，允许用户随便改名会让历史数据无法横向比较。
 */

/** 执行度：0 = 未评分，1–5 为实际得分 */
export const EXECUTION_UNSET = 0;
export const EXECUTION_MIN = 1;
export const EXECUTION_MAX = 5;

export const disciplineTagSchema = z.enum([
  'plan_followed',
  'sized_ok',
  'chasing_high',
  'fomo',
  'early_stop',
  'late_stop',
  'overtrade',
  'oversized',
  'averaging_down',
  'revenge',
]);
export type DisciplineTag = z.infer<typeof disciplineTagSchema>;

export const emotionSchema = z.enum([
  'calm',
  'confident',
  'anxious',
  'hesitant',
  'greedy',
  'fearful',
  'impatient',
  'regretful',
]);
export type EmotionValue = z.infer<typeof emotionSchema>;
/** 空串表示未记录 */
export type Emotion = EmotionValue | '';

/** shadcn Select 不接受空字符串 value，「未选择」用哨兵值表达 */
export const EMPTY_SELECT = '__none__';

export interface ReviewOption<T extends string> {
  value: T;
  label: string;
  /** true 为正向标签（遵守计划、仓位合理），仅用于视觉强弱，不参与涨跌配色 */
  good?: boolean;
}

export const DISCIPLINE_TAG_OPTIONS: ReviewOption<DisciplineTag>[] = [
  { value: 'plan_followed', label: '遵守计划', good: true },
  { value: 'sized_ok', label: '仓位合理', good: true },
  { value: 'chasing_high', label: '追高' },
  { value: 'fomo', label: 'FOMO 入场' },
  { value: 'early_stop', label: '提前止损' },
  { value: 'late_stop', label: '拖延止损' },
  { value: 'overtrade', label: '频繁交易' },
  { value: 'oversized', label: '仓位过大' },
  { value: 'averaging_down', label: '逆势加仓' },
  { value: 'revenge', label: '报复性交易' },
];

export const EMOTION_OPTIONS: ReviewOption<EmotionValue>[] = [
  { value: 'calm', label: '冷静' },
  { value: 'confident', label: '自信' },
  { value: 'anxious', label: '焦虑' },
  { value: 'hesitant', label: '犹豫' },
  { value: 'greedy', label: '贪婪' },
  { value: 'fearful', label: '恐惧' },
  { value: 'impatient', label: '急躁' },
  { value: 'regretful', label: '懊悔' },
];

const DISCIPLINE_LABEL = new Map(DISCIPLINE_TAG_OPTIONS.map((o) => [o.value, o.label]));
const EMOTION_LABEL = new Map(EMOTION_OPTIONS.map((o) => [o.value, o.label]));

/** 把任意输入收敛成合法的 0–5 执行度 */
export function clampExecutionScore(value: unknown): number {
  const n = Number(value);
  if (!Number.isFinite(n)) return EXECUTION_UNSET;
  const rounded = Math.round(n);
  if (rounded < EXECUTION_MIN || rounded > EXECUTION_MAX) return EXECUTION_UNSET;
  return rounded;
}

/** 只保留合法且去重的标签，顺序按系统定义顺序排列，保证展示稳定 */
export function parseDisciplineTags(raw: unknown): DisciplineTag[] {
  if (!Array.isArray(raw)) return [];
  const picked = new Set<DisciplineTag>();
  for (const item of raw) {
    const parsed = disciplineTagSchema.safeParse(item);
    if (parsed.success) picked.add(parsed.data);
  }
  return DISCIPLINE_TAG_OPTIONS.map((o) => o.value).filter((v) => picked.has(v));
}

/** 只接受合法情绪，其余（含空串 / 脏值）统一回落为未记录 */
export function parseEmotion(raw: unknown): Emotion {
  if (raw == null || raw === '') return '';
  const parsed = emotionSchema.safeParse(raw);
  return parsed.success ? parsed.data : '';
}

export function executionLabel(score: unknown): string {
  const n = clampExecutionScore(score);
  return n === EXECUTION_UNSET ? '未评分' : `${n}/${EXECUTION_MAX}`;
}

export function disciplineLabel(value: DisciplineTag): string {
  return DISCIPLINE_LABEL.get(value) ?? value;
}

export function emotionLabel(value: unknown): string {
  const emotion = parseEmotion(value);
  return emotion === '' ? '未记录' : (EMOTION_LABEL.get(emotion) ?? emotion);
}

/** 列表预览里是否没有任何复盘内容 */
export function hasReview(score: unknown, emotion: unknown, tags: unknown): boolean {
  return (
    clampExecutionScore(score) !== EXECUTION_UNSET ||
    parseEmotion(emotion) !== '' ||
    parseDisciplineTags(tags).length > 0
  );
}
