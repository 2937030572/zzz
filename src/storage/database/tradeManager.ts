import { eq, and, SQL, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { trades, insertTradeSchema, updateTradeSchema } from "./shared/schema";
import type { Trade, InsertTrade, UpdateTrade } from "./shared/schema";
import * as schema from "./shared/schema";

export class TradeManager {
  async createTrade(data: InsertTrade): Promise<Trade> {
    const db = await getDb(schema);
    const validated = insertTradeSchema.parse(data);
    const [trade] = await db.insert(trades).values(validated).returning();
    return { ...trade, openAmount: Number(trade.openAmount), profitLoss: Number(trade.profitLoss) } as unknown as Trade;
  }

  async getTrades(options: {
    skip?: number;
    limit?: number;
    filters?: Partial<Pick<Trade, 'isClosed' | 'date'>>
  } = {}): Promise<Trade[]> {
    const { skip = 0, limit = 100, filters = {} } = options;
    const db = await getDb(schema);

    const conditions: SQL[] = [];
    if (filters.isClosed !== undefined) {
      conditions.push(eq(trades.isClosed, filters.isClosed));
    }
    if (filters.date !== undefined) {
      conditions.push(eq(trades.date, filters.date));
    }

    const results = await db.query.trades.findMany({
      where: conditions.length > 0 ? and(...conditions) : undefined,
      limit,
      offset: skip,
    });

    // 在内存中按创建时间倒序排序
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(r => ({ ...r, openAmount: Number(r.openAmount), profitLoss: Number(r.profitLoss) })) as unknown as Trade[];
  }

  async getTradeById(id: string): Promise<Trade | null> {
    const db = await getDb(schema);
    const trade = await db.query.trades.findFirst({
      where: eq(trades.id, id),
    });
    if (!trade) return null;
    return { ...trade, openAmount: Number(trade.openAmount), profitLoss: Number(trade.profitLoss) } as unknown as Trade;
  }

  async updateTrade(id: string, data: UpdateTrade): Promise<Trade | null> {
    const db = await getDb(schema);
    const validated = updateTradeSchema.parse(data);
    const [trade] = await db
      .update(trades)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(trades.id, id))
      .returning();

    if (!trade) return null;
    return { ...trade, openAmount: Number(trade.openAmount), profitLoss: Number(trade.profitLoss) } as unknown as Trade;
  }

  async deleteTrade(id: string): Promise<boolean> {
    const db = await getDb(schema);
    const result = await db.delete(trades).where(eq(trades.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getTradesByDateRange(startDate: string, endDate: string): Promise<Trade[]> {
    const db = await getDb(schema);
    const results = await db.query.trades.findMany({
      where: and(
        eq(trades.isClosed, true),
        sql`${trades.date} >= ${startDate}`,
        sql`${trades.date} <= ${endDate}`
      ),
    });

    // 在内存中按创建时间倒序排序
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(r => ({ ...r, openAmount: Number(r.openAmount), profitLoss: Number(r.profitLoss) })) as unknown as Trade[];
  }
}

export const tradeManager = new TradeManager();
