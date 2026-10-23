-- 003_quick_options.sql
-- 快捷配置（快捷标的 / 交易方向）按用户维度持久化 + trades 交易方向字段
-- 在 Supabase SQL Editor 中执行。001 已执行过的前提下再跑本脚本。

-- 1) 快捷配置表：一行 = 一个用户（uid 来自 httpOnly cookie tn_uid）
CREATE TABLE IF NOT EXISTS public.user_preferences (
  uid         text PRIMARY KEY,
  symbols     jsonb      NOT NULL DEFAULT '[]'::jsonb,
  directions  jsonb      NOT NULL DEFAULT '[]'::jsonb,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.user_preferences IS
  '快捷配置：按匿名 uid 维度保存的快捷标的与交易方向（界面偏好，不含敏感信息）';

-- 2) trades 增加交易方向列（已存在则跳过；NOT NULL + 默认空串，历史行自动填 ''）
ALTER TABLE public.trades
  ADD COLUMN IF NOT EXISTS direction text NOT NULL DEFAULT '';

COMMENT ON COLUMN public.trades.direction IS
  '交易方向（做多/做空/买入/卖出等），由用户自定义的快捷项填充，未填为空串';

-- 2b) 清掉 direction 列上残留的 CHECK 约束（可重复执行，无约束时什么都不做）
--
-- direction 是「用户自定义文本」，不是固定枚举：快捷方向可以随时增删改名。
-- 如果库里残留了 trades_direction_check 之类的枚举约束（常见于手动建列时在
-- Supabase 面板里勾了取值范围），任何不在名单里的方向都会被数据库拒绝：
--   ERROR: new row for relation "trades" violates check constraint "trades_direction_check"
-- 这里动态枚举该列上的全部 CHECK 约束并删除，不依赖具体约束名。
DO $$
DECLARE
  c record;
BEGIN
  FOR c IN
    SELECT conname
    FROM pg_constraint
    WHERE conrelid = 'public.trades'::regclass
      AND contype = 'c'
      AND pg_get_constraintdef(oid) ILIKE '%direction%'
  LOOP
    EXECUTE format('ALTER TABLE public.trades DROP CONSTRAINT %I', c.conname);
    RAISE NOTICE '已删除约束 %', c.conname;
  END LOOP;
END $$;

-- 3) 列表按日期倒序拉取，direction 不参与筛选，无需单独建索引。

-- ─────────────────────────────────────────────────────────────────────────────
-- 4) RLS（可选，按需启用）
--
-- 注意：本表的 uid 只来自 cookie，Postgres 侧无法校验，因此 RLS 无法真正按用户隔离。
-- 在接入 Supabase Auth 之前，启用 RLS 只会让功能不可用，建议保持关闭，
-- 并只把它当作「非敏感的界面偏好」使用。接入 Auth 后改成按 auth.uid() 过滤：
--
--   ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
--
--   CREATE POLICY user_preferences_self ON public.user_preferences
--     FOR ALL
--     USING (uid = auth.uid()::text)
--     WITH CHECK (uid = auth.uid()::text);
--
-- 若确实要在 anon key 下先挡一层，可只放开本表（效果等同不启用，仅作占位）：
--
--   ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;
--   CREATE POLICY user_preferences_anon ON public.user_preferences
--     FOR ALL TO anon USING (true) WITH CHECK (true);
-- ─────────────────────────────────────────────────────────────────────────────

-- 5) 自检：确认列与表已就位
SELECT
  (SELECT count(*) FROM public.user_preferences) AS preference_rows,
  (
    SELECT count(*) FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'trades'
      AND column_name = 'direction'
  ) AS trades_direction_column;
