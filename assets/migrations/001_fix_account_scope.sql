-- 修复多账户余额串账：回填历史 null 的 account_id，并加上约束与索引
--
-- 背景：早期写入的 trades / fund_records 行 account_id 为 null，
-- 导致余额计算无法按账户隔离，一度把全库总额写进单个账户的 balance 行。
-- 代码层面已把 null 视为"归属默认账户"，本脚本把这一约定固化到数据库中。
--
-- 执行前请先备份，然后在 Supabase SQL Editor 中依次执行。

-- 1) 确保默认账户存在
INSERT INTO public.accounts (id, name)
VALUES (1, '默认账户')
ON CONFLICT (id) DO NOTHING;

-- 2) 回填历史 null 数据
UPDATE public.trades       SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.fund_records SET account_id = 1 WHERE account_id IS NULL;
UPDATE public.balance      SET account_id = 1 WHERE account_id IS NULL;

-- 3) 补上 balance 表的唯一约束（每个账户只能有一行快照）
CREATE UNIQUE INDEX IF NOT EXISTS balance_account_id_key
  ON public.balance (account_id);

-- 4) 常用查询索引
CREATE INDEX IF NOT EXISTS trades_account_date_idx
  ON public.trades (account_id, date DESC);
CREATE INDEX IF NOT EXISTS fund_records_account_date_idx
  ON public.fund_records (account_id, date DESC);

-- 5) 修正被串账污染的余额快照（全量重算，覆盖 balance 表）
--    这一步会把每个账户的余额重新算一遍，覆盖可能已被写坏的快照值。
--    注意：fund_records.amount / trades.profit_loss 均为 text 列（应用在 JS 里 Number() 转换），
--    因此这里必须显式 ::numeric 转型；NULLIF(..., '') 用于防御历史空串。
UPDATE public.balance b
SET amount = (
  SELECT COALESCE(SUM(CASE WHEN f.type = 'withdraw'
                           THEN -NULLIF(f.amount, '')::numeric
                           ELSE  NULLIF(f.amount, '')::numeric END), 0)
       + COALESCE((SELECT SUM(NULLIF(t.profit_loss, '')::numeric)
                   FROM public.trades t WHERE t.account_id = b.account_id), 0)
  FROM public.fund_records f
  WHERE f.account_id = b.account_id
)::text;

-- 6) 为缺失余额快照的账户补行
INSERT INTO public.balance (account_id, amount)
SELECT a.id, '0'
FROM public.accounts a
WHERE NOT EXISTS (SELECT 1 FROM public.balance b WHERE b.account_id = a.id);

-- ─────────────────────────────────────────────────────────────────────────────
-- 7) 行级安全（强烈建议执行）
--    应用使用 anon key 直连，不开 RLS 等于数据完全公开。
--    下面给出"仅本机/单用户"场景的示例策略：拒绝所有匿名访问，
--    请配合 Supabase Auth 使用，或改为按 auth.uid() 过滤的策略。
--
-- ALTER TABLE public.accounts       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.trades         ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.fund_records   ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.balance        ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.equity_history ENABLE ROW LEVEL SECURITY;
--
-- 多用户示例（表中需有 user_id 列，默认取当前登录用户）：
-- CREATE POLICY "own rows" ON public.trades
--   FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
