import { NextResponse } from 'next/server';
import { balanceManager } from '@/storage/database';

export async function GET() {
  try {
    const balance = await balanceManager.getBalance();
    return NextResponse.json({ balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json({ error: 'Failed to fetch balance' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { amount } = body;
    
    const result = await balanceManager.updateBalance({ amount });
    return NextResponse.json({ balance: Number(result.amount) });
  } catch (error) {
    console.error('Error updating balance:', error);
    return NextResponse.json({ error: 'Failed to update balance' }, { status: 500 });
  }
}
