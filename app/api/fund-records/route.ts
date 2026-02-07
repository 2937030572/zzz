import { NextResponse } from 'next/server';
import { fundRecordManager } from '@/storage/database';

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
    const record = await fundRecordManager.createFundRecord(body);
    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error creating fund record:', error);
    return NextResponse.json({ error: 'Failed to create fund record' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Fund record ID is required' }, { status: 400 });
    }

    const success = await fundRecordManager.deleteFundRecord(id);
    if (!success) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fund record:', error);
    return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json({ error: 'Fund record ID is required' }, { status: 400 });
    }

    const record = await fundRecordManager.getFundRecordById(id);
    if (!record) {
      return NextResponse.json({ error: 'Fund record not found' }, { status: 404 });
    }

    // 根据记录类型调整余额
    const currentBalance = await fetch('http://localhost:5000/api/balance').then(r => r.json());
    const newBalance = currentBalance.balance + (record.type === 'deposit' ? -record.amount : record.amount);

    await fetch('http://localhost:5000/api/balance', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ amount: newBalance }),
    });

    const success = await fundRecordManager.deleteFundRecord(id);
    if (!success) {
      return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting fund record:', error);
    return NextResponse.json({ error: 'Failed to delete fund record' }, { status: 500 });
  }
}
