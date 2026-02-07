import { eq } from "drizzle-orm";
import { getDb } from "coze-coding-dev-sdk";
import { balance, insertBalanceSchema, updateBalanceSchema } from "./shared/schema";
import type { Balance, InsertBalance, UpdateBalance } from "./shared/schema";
import * as schema from "./shared/schema";

export class BalanceManager {
  async getBalance(): Promise<number> {
    const db = await getDb(schema);
    const record = await db.query.balance.findFirst();
    return Number(record?.amount || 0);
  }

  async updateBalance(data: UpdateBalance): Promise<Balance> {
    const db = await getDb(schema);
    const validated = updateBalanceSchema.parse(data);
    
    // 检查是否存在记录，不存在则创建
    const existing = await db.query.balance.findFirst();
    if (!existing) {
      const [newRecord] = await db
        .insert(balance)
        .values({
          amount: String(data.amount),
          updatedAt: new Date(),
        })
        .returning();
      return { ...newRecord, amount: Number(newRecord.amount) } as unknown as Balance;
    }

    const [updated] = await db
      .update(balance)
      .set({
        amount: String(data.amount),
        updatedAt: new Date(),
      })
      .where(eq(balance.id, existing.id))
      .returning();

    return { ...updated, amount: Number(updated.amount) } as unknown as Balance;
  }

  async addProfitLoss(profitLoss: number): Promise<number> {
    const db = await getDb(schema);
    const currentBalance = await this.getBalance();
    const newBalance = currentBalance + profitLoss;
    await this.updateBalance({ amount: newBalance });
    return newBalance;
  }
}

export const balanceManager = new BalanceManager();
