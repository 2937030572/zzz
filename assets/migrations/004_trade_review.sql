-- 004_trade_review.sql
-- 交易复盘字段：执行度 / 纪律标签 / 情绪状态
-- 在 Supabase SQL Editor 中执行。全部使用 IF NOT EXISTS，可重复执行。

-- 1) 执行度：0 = 未评分，1–5 为实际得分
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS execution_score smallint NOT NULL DEFAULT 0;

-- 2) 纪律标签：多选，存 text[]
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS discipline_tags text[] NOT NULL DEFAULT '{}';

-- 3) 情绪状态：单选，空串表示未记录
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS emotion text NOT NULL DEFAULT '';

-- 4) 执行度取值约束（先删后加，脚本可重复执行）
ALTER TABLE public.trades
  DROP CONSTRAINT IF EXISTS trades_execution_score_check;

ALTER TABLE public.trades
  ADD CONSTRAINT trades_execution_score_check
  CHECK (execution_score BETWEEN 0 AND 5);

COMMENT ON COLUMN public.trades.execution_score IS '执行度：0=未评分，1-5 为实际得分';
COMMENT ON COLUMN public.trades.discipline_tags IS '纪律标签（多选），取值由应用层枚举校验';
COMMENT ON COLUMN public.trades.emotion IS '情绪状态（单选），空串表示未记录';

-- 5) 自检：三列都应为 1
SELECT
  count(*) FILTER (WHERE column_name = 'execution_score') AS execution_score_col,
  count(*) FILTER (WHERE column_name = 'discipline_tags') AS discipline_tags_col,
  count(*) FILTER (WHERE column_name = 'emotion') AS emotion_col
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'trades';
