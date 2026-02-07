import { sql } from "drizzle-orm";
import { pgTable, varchar, text, integer, numeric, boolean, timestamp } from "drizzle-orm/pg-core";
import { createSchemaFactory } from "drizzle-zod";
import { z } from "zod";

// 资产余额表
export const balance = pgTable("balance", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  amount: numeric("amount").notNull().default("0"),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 交易记录表
export const trades = pgTable("trades", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  symbol: varchar("symbol", { length: 255 }).notNull(),
  strategy: text("strategy").notNull(),
  position: integer("position").notNull(),
  openAmount: numeric("open_amount").notNull(),
  openTime: text("open_time").notNull(),
  closeReason: varchar("close_reason", { length: 50 }).notNull(),
  remark: text("remark"),
  profitLoss: numeric("profit_loss").notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  isClosed: boolean("is_closed").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }),
});

// 出入金记录表
export const fundRecords = pgTable("fund_records", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  type: varchar("type", { length: 20 }).notNull(), // 'deposit' | 'withdraw'
  amount: numeric("amount").notNull(),
  date: varchar("date", { length: 50 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 资产历史表
export const equityHistory = pgTable("equity_history", {
  id: varchar("id", { length: 36 })
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  date: varchar("date", { length: 50 }).notNull(),
  value: numeric("value").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

// 使用 createSchemaFactory 配置 date coercion
const { createInsertSchema: createCoercedInsertSchema } = createSchemaFactory({
  coerce: { date: true },
});

// Balance Schemas
export const insertBalanceSchema = createCoercedInsertSchema(balance).pick({
  amount: true,
});
export const updateBalanceSchema = createCoercedInsertSchema(balance)
  .pick({
    amount: true,
  })
  .partial()
  .extend({
    amount: z.union([z.string(), z.number()]).transform(String),
  });

// Trade Schemas
export const insertTradeSchema = createCoercedInsertSchema(trades)
  .pick({
    symbol: true,
    strategy: true,
    position: true,
    openAmount: true,
    openTime: true,
    closeReason: true,
    remark: true,
    profitLoss: true,
    date: true,
    isClosed: true,
  })
  .extend({
    openAmount: z.union([z.string(), z.number()]).transform(String),
    profitLoss: z.union([z.string(), z.number()]).transform(String),
  });
export const updateTradeSchema = createCoercedInsertSchema(trades)
  .pick({
    symbol: true,
    strategy: true,
    position: true,
    openAmount: true,
    openTime: true,
    closeReason: true,
    remark: true,
    profitLoss: true,
    date: true,
    isClosed: true,
  })
  .partial()
  .extend({
    openAmount: z.union([z.string(), z.number()]).transform(String),
    profitLoss: z.union([z.string(), z.number()]).transform(String),
  });

// FundRecord Schemas
export const insertFundRecordSchema = createCoercedInsertSchema(fundRecords)
  .pick({
    type: true,
    amount: true,
    date: true,
  })
  .extend({
    amount: z.union([z.string(), z.number()]).transform(String),
  });

// EquityHistory Schemas
export const insertEquityHistorySchema = createCoercedInsertSchema(equityHistory)
  .pick({
    date: true,
    value: true,
  })
  .extend({
    value: z.union([z.string(), z.number()]).transform(String),
  });

// TypeScript Types
export type Balance = typeof balance.$inferSelect;
export type InsertBalance = Omit<z.infer<typeof insertBalanceSchema>, 'amount'> & { amount: number | string };
export type UpdateBalance = Omit<z.infer<typeof updateBalanceSchema>, 'amount'> & { amount: number | string };

export type Trade = Omit<typeof trades.$inferSelect, 'openAmount' | 'profitLoss'> & { openAmount: number; profitLoss: number };
export type InsertTrade = Omit<z.infer<typeof insertTradeSchema>, 'openAmount' | 'profitLoss'> & { openAmount: number | string; profitLoss: number | string };
export type UpdateTrade = Omit<z.infer<typeof updateTradeSchema>, 'openAmount' | 'profitLoss'> & { openAmount: number | string; profitLoss: number | string };

export type FundRecord = Omit<typeof fundRecords.$inferSelect, 'amount'> & { amount: number };
export type InsertFundRecord = Omit<z.infer<typeof insertFundRecordSchema>, 'amount'> & { amount: number | string };

export type EquityHistory = Omit<typeof equityHistory.$inferSelect, 'value'> & { value: number };
export type InsertEquityHistory = Omit<z.infer<typeof insertEquityHistorySchema>, 'value'> & { value: number | string };





