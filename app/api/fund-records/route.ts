import { NextResponse } from 'next/server';
import { fundRecordManager, balanceManager } from '@/storage/database';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type') as 'deposit' | 'withdraw' | null;
    const limit = parseInt(searchParams.get('limit') || '10');

    let records;
    if (type) {
      records = await fundRecordManager.getFundRecordsByType(type);
    } else {
      records = await fundRecordManager.getFundRecords(limit);
    }

    return NextResponse.json({ records });
  } catch (error) {
    console.error('Error fetching fund records:', error);
    return NextResponse.json({ error: 'Failed to fetch fund records' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { type, amount } = body;

    // 获取当前余额
    const currentBalance = await balanceManager.getBalance();

    // 计算新余额
    const newBalance = type === 'deposit' ? currentBalance + Number(amount) : currentBalance - Number(amount);

    // 余额不能为负数
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 创建出入金记录
    const record = await fundRecordManager.createFundRecord(body);

    // 更新余额
    await balanceManager.updateBalance({ amount: newBalance });

    return NextResponse.json({ record, balance: newBalance });
  } catch (error) {
    console.error('Error creating fund record:', error);
    return NextResponse.json({ error: 'Failed to create fund record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const expectedBalance = searchParams.get('expectedBalance');

    if (!id) {
      return NextResponse.json({ error: 'Fund record ID is required' }, { status: 400 });
    }

    // 获取要删除的记录
    const record = await fundRecordManager.getFundRecordById(id);
    if (!record) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    // 计算新余额
    const currentBalance = await balanceManager.getBalance();
    const newBalance = record.type === 'deposit'
      ? currentBalance - record.amount
      : currentBalance + record.amount;

    // 余额不能为负数
    if (newBalance < 0) {
      return NextResponse.json({ error: 'Insufficient balance' }, { status: 400 });
    }

    // 删除记录
    const success = await fundRecordManager.deleteFundRecord(id);
    if (!success) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    // 更新余额
    await balanceManager.updateBalance({ amount: newBalance });

    return NextResponse.json({ success: true, balance: newBalance });
  } catch (error) {
    console.error('Error deleting fund record:', error);
    return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
  }
}
