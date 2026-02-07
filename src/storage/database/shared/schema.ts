import { pgTable, text, varchar, timestamp, boolean, integer, decimal, index } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

export const trades = pgTable(
  "trades",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    symbol: varchar("symbol", { length: 32 }).notNull(), // 交易品种/股票代码
    direction: varchar("direction", { length: 8 }).notNull(), // 买入/卖出
    entryPrice: decimal("entry_price", { precision: 18, scale: 8 }).notNull(), // 开仓价格
    exitPrice: decimal("exit_price", { precision: 18, scale: 8 }), // 平仓价格
    quantity: decimal("quantity", { precision: 18, scale: 8 }), // 交易数量
    strategySummary: text("strategy_summary").notNull(), // 策略总结
    tradeLevel: varchar("trade_level", { length: 1 }).notNull(), // 交易级别 A/B
    positionSize: varchar("position_size", { length: 10 }).notNull(), // 仓位百分比
    profitLoss: decimal("profit_loss", { precision: 18, scale: 8 }), // 盈亏
    exitReason: text("exit_reason"), // 平仓原因
    entryTime: timestamp("entry_time", { withTimezone: true }).notNull(), // 开仓时间
    exitTime: timestamp("exit_time", { withTimezone: true }), // 平仓时间
    notes: text("notes"), // 备注
    isClosed: boolean("is_closed").default(false).notNull(), // 是否已平仓
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }),
  },
  (table) => ({
    symbolIdx: index("trades_symbol_idx").on(table.symbol),
    entryTimeIdx: index("trades_entry_time_idx").on(table.entryTime),
  })
);

export const balance = pgTable(
  "balance",
  {
    id: varchar("id", { length: 36 })
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    amount: decimal("amount", { precision: 18, scale: 8 }).notNull(), // 初始资产余额（本金）
    withdrawalAmount: decimal("withdrawal_amount", { precision: 18, scale: 8 }).notNull().default("0"), // 提现金额
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  }
);

// 使用 createSchemaFactory 配置 date coercion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Zod schemas for validation
export const insertTradeSchema = createCoercedInsertSchema(trades).pick({
  symbol: true,
  direction: true,
  entryPrice: true,
  exitPrice: true,
  quantity: true,
  strategySummary: true,
  tradeLevel: true,
  positionSize: true,
  profitLoss: true,
  exitReason: true,
  entryTime: true,
  exitTime: true,
  notes: true,
  isClosed: true,
});

export const updateTradeSchema = createCoercedInsertSchema(trades)
  .pick({
    symbol: true,
    direction: true,
    entryPrice: true,
    exitPrice: true,
    quantity: true,
    strategySummary: true,
    tradeLevel: true,
    positionSize: true,
    profitLoss: true,
    exitReason: true,
    entryTime: true,
    exitTime: true,
    notes: true,
    isClosed: true,
  })
  .partial();

export const insertBalanceSchema = createCoercedInsertSchema(balance).pick({
  amount: true,
  withdrawalAmount: true,
});

export const updateBalanceSchema = createCoercedInsertSchema(balance)
  .pick({
    amount: true,
    withdrawalAmount: true,
  })
  .partial();

// TypeScript types
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = z.infer<typeof insertTradeSchema>;
export type UpdateTrade = z.infer<typeof updateTradeSchema>;
export type Balance = typeof balance.$inferSelect;
export type InsertBalance = z.infer<typeof insertBalanceSchema>;
export type UpdateBalance = z.infer<typeof updateBalanceSchema>;
