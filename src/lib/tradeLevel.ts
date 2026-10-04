import type { VolumeTrend, BollContraction, BollWidth, Pattern } from './schema';

export interface TradeLevel {
  level: string;
  description: string;
  suggestion: string;
}

const BOLL_CONTRACTION_TEXT: Record<BollContraction, string> = {
  '1h': '1h收缩',
  '2h': '2h收缩',
  '4h_plus': '4h+收缩',
};

const BOLL_WIDTH_TEXT: Record<BollWidth, string> = {
  converged: '粘合',
  not_converged: '未粘合',
};

const PATTERN_TEXT: Record<Pattern, string> = {
  head_shoulders: '头肩顶底',
  double_top_bottom: '双顶底',
  triple_top_bottom: '三重顶底',
  triangle: '三角',
  cup_handle: '杯柄',
  channel: '通道',
  none: '无形态',
};

const VOLUME_TEXT: Record<VolumeTrend, string> = {
  top_divergence: '顶背离',
  bottom_divergence: '底背离',
  no_trend: '',
};

/** 交易分级：量能背离 → 布林带收缩时长 → 是否粘合 → 是否有形态 */
export function calcTradeLevel(
  volumeTrend: VolumeTrend,
  bollContraction: BollContraction,
  bollWidth: BollWidth,
  pattern: Pattern
): TradeLevel {
  if (volumeTrend === 'no_trend') {
    return { level: 'C', description: '无量能背离', suggestion: '不建议操作' };
  }

  const isLongTerm = bollContraction === '4h_plus';
  const isConverged = bollWidth === 'converged';
  const hasPattern = pattern !== 'none';

  if (isLongTerm) {
    if (!isConverged) {
      return { level: 'A-', description: '优秀但布林带未粘合', suggestion: '建议谨慎操作' };
    }
    return hasPattern
      ? { level: 'A+', description: '卓越交易机会（形态确认）', suggestion: '强烈建议操作' }
      : { level: 'A', description: '优秀交易机会', suggestion: '强烈建议操作' };
  }

  if (!isConverged) {
    return { level: 'B-', description: '一般交易机会', suggestion: '建议谨慎操作' };
  }
  return hasPattern
    ? { level: 'B+', description: '良好交易机会（形态确认）', suggestion: '可以操作' }
    : { level: 'B', description: '良好交易机会', suggestion: '可以操作' };
}

/** 把分级选择拼成策略字符串，例如 "A-/底背离/4h+收缩/未粘合" */
export function buildStrategyText(
  volumeTrend: VolumeTrend,
  bollContraction: BollContraction,
  bollWidth: BollWidth,
  pattern: Pattern
): string {
  const parts: string[] = [calcTradeLevel(volumeTrend, bollContraction, bollWidth, pattern).level];

  if (VOLUME_TEXT[volumeTrend]) parts.push(VOLUME_TEXT[volumeTrend]);
  parts.push(BOLL_CONTRACTION_TEXT[bollContraction]);
  parts.push(BOLL_WIDTH_TEXT[bollWidth]);
  if (pattern !== 'none') parts.push(PATTERN_TEXT[pattern]);

  return parts.join('/');
}

export const POSITION_OPTIONS = Array.from({ length: 10 }, (_, i) => (i + 1) * 5);
