import { eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { fundRecords, insertFundRecordSchema } from "./shared/schema";
import type { FundRecord, InsertFundRecord } from "./shared/schema";
import * as schema from "./shared/schema";

export class FundRecordManager {
  async createFundRecord(data: InsertFundRecord): Promise<FundRecord> {
    const db = await getDb(schema);
    const validated = insertFundRecordSchema.parse(data);

    // 使用明确类型的数据对象
    const values: {
      type: string;
      amount: string;
      date: string;
    } = {
      type: validated.type,
      amount: validated.amount,
      date: validated.date,
    };

    const [record] = await db.insert(fundRecords).values(values).returning();
    return { ...record, amount: Number(record.amount) } as unknown as FundRecord;
  }

  async getFundRecords(limit: number = 10): Promise<FundRecord[]> {
    const db = await getDb(schema);
    const results = await db.query.fundRecords.findMany({
      limit,
    });

    // 在内存中按创建时间倒序排序
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(r => ({ ...r, amount: Number(r.amount) })) as unknown as FundRecord[];
  }

  async getFundRecordsByType(type: 'deposit' | 'withdraw'): Promise<FundRecord[]> {
    const db = await getDb(schema);
    const results = await db.query.fundRecords.findMany({
      where: eq(fundRecords.type, type),
    });

    // 在内存中按创建时间倒序排序
    return results
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
      .map(r => ({ ...r, amount: Number(r.amount) })) as unknown as FundRecord[];
  }

  async deleteFundRecord(id: string): Promise<boolean> {
    const db = await getDb(schema);
    const result = await db.delete(fundRecords).where(eq(fundRecords.id, id));
    return (result.rowCount ?? 0) > 0;
  }

  async getFundRecordById(id: string): Promise<FundRecord | null> {
    const db = await getDb(schema);
    const record = await db.query.fundRecords.findFirst({
      where: eq(fundRecords.id, id),
    });
    if (!record) return null;
    return { ...record, amount: Number(record.amount) } as unknown as FundRecord;
  }

  async getTotalDeposit(): Promise<number> {
    const records = await this.getFundRecordsByType('deposit');
    return records.reduce((sum, r) => sum + r.amount, 0);
  }

  async getTotalWithdraw(): Promise<number> {
    const records = await this.getFundRecordsByType('withdraw');
    return records.reduce((sum, r) => sum + r.amount, 0);
  }
}

export const fundRecordManager = new FundRecordManager();
