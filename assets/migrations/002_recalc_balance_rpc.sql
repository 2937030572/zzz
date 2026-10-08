-- 性能优化：把「重算余额 + 写快照」下沉为一次数据库调用
--
-- 背景：应用层原来需要「查出入金 + 查交易 + 查快照 + 写快照」共 3-4 次串行往返，
-- 跨境访问 Supabase 每次往返约 600-800ms，一次写操作仅重算就要 2 秒以上。
-- 本函数在数据库内部一次完成，应用只需 1 次 RPC 往返。
--
-- 依赖：001_fix_account_scope.sql 中的 balance_account_id_key 唯一索引（ON CONFLICT 需要）。
-- 应用代码已做降级处理：未执行本脚本时自动回退到旧的多次查询路径，功能不受影响。

CREATE OR REPLACE FUNCTION public.recalc_balance(p_account_id integer)
RETURNS numeric
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  v_balance numeric;
BEGIN
  -- 默认账户（id=1）额外包含 account_id 为 null 的历史数据，与应用层 accountScope 口径一致
  SELECT COALESCE(SUM(CASE WHEN f.type = 'withdraw'
                           THEN -NULLIF(f.amount, '')::numeric
                           ELSE  NULLIF(f.amount, '')::numeric END), 0)
       + COALESCE((SELECT SUM(NULLIF(t.profit_loss, '')::numeric)
                   FROM public.trades t
                   WHERE t.account_id = p_account_id
                      OR (p_account_id = 1 AND t.account_id IS NULL)), 0)
    INTO v_balance
  FROM public.fund_records f
  WHERE f.account_id = p_account_id
     OR (p_account_id = 1 AND f.account_id IS NULL);

  v_balance := round(v_balance, 2);

  INSERT INTO public.balance (account_id, amount)
  VALUES (p_account_id, v_balance::text)
  ON CONFLICT (account_id) DO UPDATE SET amount = EXCLUDED.amount;

  RETURN v_balance;
END;
$$;
