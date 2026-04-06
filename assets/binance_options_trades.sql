-- 币安期权交易历史表
-- 用于存储从币安API同步的期权交易记录
-- 支持可编辑的备注字段

CREATE TABLE IF NOT EXISTS "public"."binance_options_trades" (
  -- 主键（使用币安成交ID作为唯一标识，一个orderId可能对应多笔成交）
  "id"              TEXT        PRIMARY KEY,          -- 币安 tradeId（成交ID，真正的唯一键）
  "order_id"        TEXT,                             -- 币安 orderId（订单ID，可重复）
  "trade_id"        TEXT        UNIQUE NOT NULL,      -- 同 id，冗余保留供查询

  -- 交易基本信息
  "symbol"          TEXT        NOT NULL,             -- 标的资产，如 ETH-240329-2200-C
  "underlying"      TEXT,                             -- 底层资产，如 ETH
  "strike_price"    NUMERIC(20,4),                    -- 行权价
  "expiry_date"     TEXT,                             -- 到期日，如 240329
  "option_type"     TEXT,                             -- 期权类型：CALL / PUT
  "side"            TEXT        NOT NULL,             -- 方向：BUY / SELL
  "quantity"        NUMERIC(20,8) NOT NULL,           -- 成交数量
  "price"           NUMERIC(20,8) NOT NULL,           -- 成交价格
  "total_cost"      NUMERIC(20,8),                    -- 总成本 = quantity * price
  "fee"             NUMERIC(20,8),                    -- 手续费
  "fee_asset"       TEXT,                             -- 手续费资产，如 USDT

  -- 盈亏信息（平仓时有值）
  "realized_pnl"    NUMERIC(20,8),                    -- 已实现盈亏

  -- 时间信息
  "trade_time"      BIGINT      NOT NULL,             -- 成交时间戳（毫秒）
  "trade_date"      DATE,                             -- 成交日期（派生）

  -- 可编辑备注
  "remark"          TEXT        DEFAULT '',           -- 用户备注（可随时编辑）

  -- 元数据
  "raw_data"        JSONB,                            -- 原始API响应（便于调试）
  "created_at"      TIMESTAMPTZ DEFAULT NOW(),
  "updated_at"      TIMESTAMPTZ DEFAULT NOW()
);

-- 索引
CREATE INDEX IF NOT EXISTS idx_bot_symbol      ON "public"."binance_options_trades" ("symbol");
CREATE INDEX IF NOT EXISTS idx_bot_order_id    ON "public"."binance_options_trades" ("order_id");
CREATE INDEX IF NOT EXISTS idx_bot_trade_date  ON "public"."binance_options_trades" ("trade_date" DESC);
CREATE INDEX IF NOT EXISTS idx_bot_trade_time  ON "public"."binance_options_trades" ("trade_time" DESC);
CREATE INDEX IF NOT EXISTS idx_bot_option_type ON "public"."binance_options_trades" ("option_type");

-- 自动更新 updated_at 触发器（PostgreSQL）
CREATE OR REPLACE FUNCTION update_bot_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_bot_updated_at ON "public"."binance_options_trades";
CREATE TRIGGER trg_bot_updated_at
  BEFORE UPDATE ON "public"."binance_options_trades"
  FOR EACH ROW EXECUTE FUNCTION update_bot_updated_at();
