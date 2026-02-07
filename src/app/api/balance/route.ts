import { NextRequest, NextResponse } from "next/server";
import { getDb } from "coze-coding-dev-sdk";
import { balance } from "@/storage/database/shared/schema";
import { eq } from "drizzle-orm";
import * as schema from "@/storage/database/shared/schema";

// GET /api/balance - 获取当前资产余额
export async function GET() {
  try {
    const db = await getDb(schema);
    const result = await db.select().from(balance).limit(1);

    if (result.length === 0) {
      // 如果没有资产余额记录，返回默认值
      return NextResponse.json({
        id: null,
        amount: "0",
        withdrawalAmount: "0",
        createdAt: null,
        updatedAt: null,
      });
    }

    const currentBalance = result[0];
    return NextResponse.json({
      id: currentBalance.id,
      amount: currentBalance.amount.toString(),
      withdrawalAmount: currentBalance.withdrawalAmount?.toString() || "0",
      createdAt: currentBalance.createdAt,
      updatedAt: currentBalance.updatedAt,
    });
  } catch (error) {
    console.error("Error fetching balance:", error);
    return NextResponse.json(
      { error: "Failed to fetch balance" },
      { status: 500 }
    );
  }
}

// POST /api/balance - 创建或更新资产余额
export async function POST(request: NextRequest) {
  try {
    const db = await getDb(schema);
    const body = await request.json();
    const { amount, withdrawalAmount } = body;

    if (amount === undefined || amount === null || amount === "") {
      return NextResponse.json(
        { error: "Amount is required" },
        { status: 400 }
      );
    }

    const amountNum = parseFloat(amount);
    if (isNaN(amountNum)) {
      return NextResponse.json(
        { error: "Invalid amount" },
        { status: 400 }
      );
    }

    // 检查是否已存在资产余额记录
    const existing = await db.select().from(balance).limit(1);

    let result;
    if (existing.length > 0) {
      // 更新现有记录
      const updateData: any = {
        amount: amountNum.toString(),
        updatedAt: new Date(),
      };

      // 如果提供了提现金额，也更新提现金额
      if (withdrawalAmount !== undefined && withdrawalAmount !== null && withdrawalAmount !== "") {
        const withdrawalNum = parseFloat(withdrawalAmount);
        if (!isNaN(withdrawalNum)) {
          updateData.withdrawalAmount = withdrawalNum.toString();
        }
      }

      result = await db
        .update(balance)
        .set(updateData)
        .where(eq(balance.id, existing[0].id))
        .returning();
    } else {
      // 创建新记录
      const createData: any = {
        amount: amountNum.toString(),
      };

      // 如果提供了提现金额，设置提现金额
      if (withdrawalAmount !== undefined && withdrawalAmount !== null && withdrawalAmount !== "") {
        const withdrawalNum = parseFloat(withdrawalAmount);
        if (!isNaN(withdrawalNum)) {
          createData.withdrawalAmount = withdrawalNum.toString();
        }
      }

      result = await db
        .insert(balance)
        .values(createData)
        .returning();
    }

    return NextResponse.json({
      id: result[0].id,
      amount: result[0].amount.toString(),
      withdrawalAmount: result[0].withdrawalAmount?.toString() || "0",
      createdAt: result[0].createdAt,
      updatedAt: result[0].updatedAt,
    });
  } catch (error) {
    console.error("Error saving balance:", error);
    return NextResponse.json(
      { error: "Failed to save balance" },
      { status: 500 }
    );
  }
}
