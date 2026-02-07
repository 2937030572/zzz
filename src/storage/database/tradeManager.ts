import { eq, and, desc, SQL } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { trades, insertTradeSchema, updateTradeSchema } from "./shared/schema";
import type { Trade, InsertTrade, UpdateTrade } from "./shared/schema";
import * as schema from "./shared/schema";

export class TradeManager {
  async createTrade(data: InsertTrade): Promise<Trade> {
    const db = await getDb(schema);
    const validated = insertTradeSchema.parse(data);
    const [trade] = await db.insert(trades).values(validated).returning();
    return trade;
  }

  async getTrades(options: {
    skip?: number;
    limit?: number;
    symbol?: string;
    isClosed?: boolean;
  } = {}): Promise<Trade[]> {
    const { skip = 0, limit = 100, symbol, isClosed } = options;
    const db = await getDb(schema);

    const conditions: SQL[] = [];
    if (symbol !== undefined) {
      conditions.push(eq(trades.symbol, symbol));
    }
    if (isClosed !== undefined) {
      conditions.push(eq(trades.isClosed, isClosed));
    }

    if (conditions.length > 0) {
      return db.select().from(trades)
        .where(and(...conditions))
        .orderBy(desc(trades.entryTime))
        .limit(limit)
        .offset(skip);
    }

    return db.select().from(trades)
      .orderBy(desc(trades.entryTime))
      .limit(limit)
      .offset(skip);
  }

  async getTradeById(id: string): Promise<Trade | null> {
    const db = await getDb(schema);
    const [trade] = await db.select().from(trades).where(eq(trades.id, id));
    return trade || null;
  }

  async updateTrade(id: string, data: UpdateTrade): Promise<Trade | null> {
    const db = await getDb(schema);
    const validated = updateTradeSchema.parse(data);
    const [trade] = await db
      .update(trades)
      .set({ ...validated, updatedAt: new Date() })
      .where(eq(trades.id, id))
      .returning();
    return trade || null;
  }

  async deleteTrade(id: string): Promise<boolean> {
    const db = await getDb(schema);
    const result = await db.delete(trades).where(eq(trades.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getTradeStats(): Promise<{
    totalTrades: number;
    totalProfitLoss: string;
    closedTrades: number;
    openTrades: number;
    winningTrades: number;
    losingTrades: number;
  }> {
    const db = await getDb(schema);
    const allTrades = await db.select().from(trades);

    const totalTrades = allTrades.length;
    const closedTrades = allTrades.filter(t => t.isClosed).length;
    const openTrades = allTrades.filter(t => !t.isClosed).length;

    let totalProfitLoss = "0";
    let winningTrades = 0;
    let losingTrades = 0;

    allTrades.forEach(trade => {
      if (trade.profitLoss !== null) {
        const pl = parseFloat(trade.profitLoss);
        totalProfitLoss = (parseFloat(totalProfitLoss) + pl).toString();
        if (pl > 0) winningTrades++;
        if (pl < 0) losingTrades++;
      }
    });

    return {
      totalTrades,
      totalProfitLoss,
      closedTrades,
      openTrades,
      winningTrades,
      losingTrades,
    };
  }
}

export const tradeManager = new TradeManager();
