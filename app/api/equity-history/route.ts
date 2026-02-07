import { NextResponse } from 'next/server';
import { equityHistoryManager } from '@/storage/database';

export async function GET() {
  try {
    const history = await equityHistoryManager.getEquityHistory();
    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching equity history:', error);
    return NextResponse.json({ error: 'Failed to fetch equity history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const record = await equityHistoryManager.createEquityHistory(body);
    return NextResponse.json({ record });
  } catch (error) {
    console.error('Error creating equity history:', error);
    return NextResponse.json({ error: 'Failed to create equity history' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    await equityHistoryManager.clearEquityHistory();
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing equity history:', error);
    return NextResponse.json({ error: 'Failed to clear equity history' }, { status: 500 });
  }
}
