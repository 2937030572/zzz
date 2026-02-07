-- 交易记录数据导入脚本
-- 生成时间: 2026-02-07T06:32:25.350070
-- 环境信息:
--   数据库: PostgreSQL
--   集成: coze-coding-dev-sdk

BEGIN;

-- 插入/更新资产余额
INSERT INTO balance (id, amount, withdrawal_amount, created_at, updated_at)
VALUES (
  'b1ddbb2d-4df1-463a-8112-a7917e530944',
  70.00000000,
  43.00000000,
  '2026-02-06T05:47:00.161Z',
  '2026-02-06T07:36:55.190Z'
)
ON CONFLICT (id) DO UPDATE SET
  amount = EXCLUDED.amount,
  withdrawal_amount = EXCLUDED.withdrawal_amount,
  updated_at = EXCLUDED.updated_at;

-- 插入交易记录
INSERT INTO trades (
  id, symbol, direction, entry_price, exit_price, quantity,
  strategy_summary, trade_level, position_size, profit_loss,
  exit_reason, entry_time, exit_time, notes, is_closed,
  created_at, updated_at
) VALUES (
  'c6c7ac49-7b60-4173-9993-1fbe6503a710',
  'ETH2325看跌期权',
  '买入',
  0.00000000,
  NULL,
  1.00000000,
  '下跌中继形态',
  'B',
  '10%',
  '-20.00000000',
  '其他原因',
  '2026-02-02T16:00:00.000Z',
  NULL,
  '自己没有坚定持有',
  true,
  '2026-02-06T07:35:59.152Z',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  direction = EXCLUDED.direction,
  entry_price = EXCLUDED.entry_price,
  exit_price = EXCLUDED.exit_price,
  quantity = EXCLUDED.quantity,
  strategy_summary = EXCLUDED.strategy_summary,
  trade_level = EXCLUDED.trade_level,
  position_size = EXCLUDED.position_size,
  profit_loss = EXCLUDED.profit_loss,
  exit_reason = EXCLUDED.exit_reason,
  entry_time = EXCLUDED.entry_time,
  exit_time = EXCLUDED.exit_time,
  notes = EXCLUDED.notes,
  is_closed = EXCLUDED.is_closed,
  updated_at = EXCLUDED.updated_at;
INSERT INTO trades (
  id, symbol, direction, entry_price, exit_price, quantity,
  strategy_summary, trade_level, position_size, profit_loss,
  exit_reason, entry_time, exit_time, notes, is_closed,
  created_at, updated_at
) VALUES (
  '7bb0cee2-e390-42ba-be2b-ba5d738b4162',
  'ETH2600看跌期权',
  '买入',
  0.00000000,
  NULL,
  1.00000000,
  'boll突破策略',
  'A',
  '15%',
  '60.00000000',
  '正常止盈',
  '2026-01-31T13:00:00.000Z',
  NULL,
  NULL,
  true,
  '2026-02-06T07:34:18.751Z',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  direction = EXCLUDED.direction,
  entry_price = EXCLUDED.entry_price,
  exit_price = EXCLUDED.exit_price,
  quantity = EXCLUDED.quantity,
  strategy_summary = EXCLUDED.strategy_summary,
  trade_level = EXCLUDED.trade_level,
  position_size = EXCLUDED.position_size,
  profit_loss = EXCLUDED.profit_loss,
  exit_reason = EXCLUDED.exit_reason,
  entry_time = EXCLUDED.entry_time,
  exit_time = EXCLUDED.exit_time,
  notes = EXCLUDED.notes,
  is_closed = EXCLUDED.is_closed,
  updated_at = EXCLUDED.updated_at;
INSERT INTO trades (
  id, symbol, direction, entry_price, exit_price, quantity,
  strategy_summary, trade_level, position_size, profit_loss,
  exit_reason, entry_time, exit_time, notes, is_closed,
  created_at, updated_at
) VALUES (
  '43af50db-259d-4154-8b48-a054f9b2520e',
  'ETH2750看涨期权',
  '买入',
  0.00000000,
  NULL,
  1.00000000,
  '下跌趋势，量能底背离，以为反弹',
  'B',
  '20%',
  '-30.00000000',
  '其他原因',
  '2026-01-30T07:30:00.000Z',
  NULL,
  '不该在下跌趋势去做多，也并不符合我的交易策略，还重仓交易了',
  true,
  '2026-02-06T07:31:54.091Z',
  '2026-02-06T12:24:21.215Z'
)
ON CONFLICT (id) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  direction = EXCLUDED.direction,
  entry_price = EXCLUDED.entry_price,
  exit_price = EXCLUDED.exit_price,
  quantity = EXCLUDED.quantity,
  strategy_summary = EXCLUDED.strategy_summary,
  trade_level = EXCLUDED.trade_level,
  position_size = EXCLUDED.position_size,
  profit_loss = EXCLUDED.profit_loss,
  exit_reason = EXCLUDED.exit_reason,
  entry_time = EXCLUDED.entry_time,
  exit_time = EXCLUDED.exit_time,
  notes = EXCLUDED.notes,
  is_closed = EXCLUDED.is_closed,
  updated_at = EXCLUDED.updated_at;
INSERT INTO trades (
  id, symbol, direction, entry_price, exit_price, quantity,
  strategy_summary, trade_level, position_size, profit_loss,
  exit_reason, entry_time, exit_time, notes, is_closed,
  created_at, updated_at
) VALUES (
  '4ad36ce0-0fbd-43eb-88e7-b68b356462ed',
  'ETH2900看跌期权',
  '买入',
  0.00000000,
  NULL,
  1.00000000,
  'boll收缩突破策略',
  'A',
  '20%',
  '63.00000000',
  '正常止盈',
  '2026-01-29T08:00:00.000Z',
  NULL,
  NULL,
  true,
  '2026-02-06T07:29:52.013Z',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  direction = EXCLUDED.direction,
  entry_price = EXCLUDED.entry_price,
  exit_price = EXCLUDED.exit_price,
  quantity = EXCLUDED.quantity,
  strategy_summary = EXCLUDED.strategy_summary,
  trade_level = EXCLUDED.trade_level,
  position_size = EXCLUDED.position_size,
  profit_loss = EXCLUDED.profit_loss,
  exit_reason = EXCLUDED.exit_reason,
  entry_time = EXCLUDED.entry_time,
  exit_time = EXCLUDED.exit_time,
  notes = EXCLUDED.notes,
  is_closed = EXCLUDED.is_closed,
  updated_at = EXCLUDED.updated_at;
INSERT INTO trades (
  id, symbol, direction, entry_price, exit_price, quantity,
  strategy_summary, trade_level, position_size, profit_loss,
  exit_reason, entry_time, exit_time, notes, is_closed,
  created_at, updated_at
) VALUES (
  'a89ca950-418c-4bf6-8170-5a417b951912',
  'ETH3025看涨期权',
  '买入',
  0.00000000,
  NULL,
  1.00000000,
  '符合boll策略',
  'A',
  '20%',
  '-20.00000000',
  '其他原因',
  '2026-01-28T15:00:00.000Z',
  NULL,
  '没盯盘导致错过止盈',
  true,
  '2026-02-06T07:28:01.977Z',
  NULL
)
ON CONFLICT (id) DO UPDATE SET
  symbol = EXCLUDED.symbol,
  direction = EXCLUDED.direction,
  entry_price = EXCLUDED.entry_price,
  exit_price = EXCLUDED.exit_price,
  quantity = EXCLUDED.quantity,
  strategy_summary = EXCLUDED.strategy_summary,
  trade_level = EXCLUDED.trade_level,
  position_size = EXCLUDED.position_size,
  profit_loss = EXCLUDED.profit_loss,
  exit_reason = EXCLUDED.exit_reason,
  entry_time = EXCLUDED.entry_time,
  exit_time = EXCLUDED.exit_time,
  notes = EXCLUDED.notes,
  is_closed = EXCLUDED.is_closed,
  updated_at = EXCLUDED.updated_at;

COMMIT;

-- 导入完成验证
SELECT COUNT(*) as total_trades FROM trades;
SELECT COUNT(*) as total_balance FROM balance;