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
  closeReason: varchar("close_reason", { length: 50 }),
  remark: text("remark"),
  profitLoss: numeric("profit_loss").notNull().default("0"),
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
export const insertBalanceSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform(String),
});
export const updateBalanceSchema = z.object({
  amount: z.union([z.string(), z.number()]).transform(String),
}).partial();

// Trade Schemas
export const insertTradeSchema = z.object({
  symbol: z.string().min(1),
  strategy: z.string().default(''),
  position: z.number(),
  openAmount: z.union([z.string(), z.number()]),
  openTime: z.string().min(1),
  closeReason: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  date: z.string().min(1),
  isClosed: z.boolean().default(false),
  profitLoss: z.union([z.string(), z.number()]).nullable().optional(),
});
export const updateTradeSchema = z.object({
  symbol: z.string().min(1).optional(),
  strategy: z.string().optional(),
  position: z.number().optional(),
  openAmount: z.any().optional(),
  openTime: z.string().min(1).optional(),
  closeReason: z.string().nullable().optional(),
  remark: z.string().nullable().optional(),
  profitLoss: z.any().optional(),
  date: z.string().min(1).optional(),
  isClosed: z.boolean().optional(),
});

// FundRecord Schemas
export const insertFundRecordSchema = z.object({
  type: z.string().min(1),
  amount: z.union([z.string(), z.number()]).transform(String),
  date: z.string().min(1),
});

// EquityHistory Schemas
export const insertEquityHistorySchema = z.object({
  date: z.string().min(1),
  value: z.union([z.string(), z.number()]).transform(String),
});

// TypeScript Types
export type Balance = typeof balance.$inferSelect;
export type InsertBalance = Omit<z.infer<typeof insertBalanceSchema>, 'amount'> & { amount: number | string };
export type UpdateBalance = Omit<z.infer<typeof updateBalanceSchema>, 'amount'> & { amount: number | string };

export type Trade = Omit<typeof trades.$inferSelect, 'openAmount' | 'profitLoss'> & { openAmount: number; profitLoss: number };
export type InsertTrade = Omit<z.infer<typeof insertTradeSchema>, 'openAmount' | 'profitLoss'> & {
  openAmount: number | string;
  profitLoss?: number | string; // 允许不传
};
export type UpdateTrade = Omit<z.infer<typeof updateTradeSchema>, 'openAmount' | 'profitLoss'> & { openAmount: number | string; profitLoss: number | string };

export type FundRecord = Omit<typeof fundRecords.$inferSelect, 'amount'> & { amount: number };
export type InsertFundRecord = Omit<z.infer<typeof insertFundRecordSchema>, 'amount'> & { amount: number | string };

export type EquityHistory = Omit<typeof equityHistory.$inferSelect, 'value'> & { value: number };
export type InsertEquityHistory = Omit<z.infer<typeof insertEquityHistorySchema>, 'value'> & { value: number | string };





