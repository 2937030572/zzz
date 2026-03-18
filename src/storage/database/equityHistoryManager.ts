import { getDb } from "coze-coding-dev-sdk";
import { equityHistory, insertEquityHistorySchema } from "./shared/schema";
import type { EquityHistory, InsertEquityHistory } from "./shared/schema";
import * as schema from "./shared/schema";

export class EquityHistoryManager {
  async createEquityHistory(data: InsertEquityHistory): Promise<EquityHistory> {
    const db = await getDb(schema);
    const validated = insertEquityHistorySchema.parse(data);
    const [record] = await db.insert(equityHistory).values(validated).returning();
    return { ...record, value: Number(record.value) } as unknown as EquityHistory;
  }

  async getEquityHistory(): Promise<EquityHistory[]> {
    const db = await getDb(schema);
    const results = await db.query.equityHistory.findMany();

    // 在内存中按创建时间正序排序
    return results
      .sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
      .map(r => ({ ...r, value: Number(r.value) })) as unknown as EquityHistory[];
  }

  async clearEquityHistory(): Promise<void> {
    const db = await getDb(schema);
    await db.delete(equityHistory);
  }

  async initializeEquityHistory(initialValue: number): Promise<void> {
    await this.clearEquityHistory();
    await this.createEquityHistory({
      date: new Date().toISOString(),
      value: initialValue,
    });
  }
}

export const equityHistoryManager = new EquityHistoryManager();
