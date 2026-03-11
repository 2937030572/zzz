import { eq, and, SQL, sql } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { trades, insertTradeSchema, updateTradeSchema } from "./shared/schema";
import type { Trade, InsertTrade, UpdateTrade } from "./shared/schema";
import * as schema from "./shared/schema";

export class TradeManager {
  async createTrade(data: InsertTrade): Promise<Trade> {
    const db = await getDb(schema);

    // 使用明确类型的数据对象
    const values: {
      symbol: string;
      strategy: string;
      position: number;
      openAmount: string;
      openTime: string;
      date: string;
      isClosed: boolean;
      profitLoss: string;
      closeReason?: string;
      remark?: string;
    } = {
      symbol: data.symbol,
      strategy: data.strategy || '',
      position: data.position,
      openAmount: String(data.openAmount),
      openTime: data.openTime,
      date: data.date,
      isClosed: data.isClosed,
      profitLoss: data.profitLoss !== undefined && data.profitLoss !== null ? String(data.profitLoss) : '0',
    };

    // 只添加非 undefined 的可选字段
    if (data.closeReason !== undefined && data.closeReason !== null) {
      values.closeReason = data.closeReason;
    }
    if (data.remark !== undefined && data.remark !== null) {
      values.remark = data.remark;
    }

    const [trade] = await db.insert(trades).values(values).returning();

    return {
      ...trade,
      openAmount: Number(trade.openAmount),
      profitLoss: Number(trade.profitLoss),
    } as unknown as Trade;
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

    // 直接处理数据，不使用 schema 验证
    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    // 只添加非 undefined 的字段
    if (data.symbol !== undefined) updateData.symbol = data.symbol;
    if (data.strategy !== undefined) updateData.strategy = data.strategy;
    if (data.position !== undefined) updateData.position = data.position;
    if (data.openAmount !== undefined) updateData.openAmount = String(data.openAmount);
    if (data.openTime !== undefined) updateData.openTime = data.openTime;
    if (data.closeReason !== undefined) updateData.closeReason = data.closeReason;
    if (data.remark !== undefined) updateData.remark = data.remark;
    if (data.profitLoss !== undefined) updateData.profitLoss = String(data.profitLoss);
    if (data.date !== undefined) updateData.date = data.date;
    if (data.isClosed !== undefined) updateData.isClosed = data.isClosed;

    const [trade] = await db
      .update(trades)
      .set(updateData)
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
