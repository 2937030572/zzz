import { NextResponse } from 'next/server';
import supabase from '@/lib/supabase';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || '1';

    const { data, error } = await supabase
      .from('equity_history')
      .select('*')
      .eq('account_id', accountId)
      .order('date', { ascending: true });

    if (error) throw error;

    const history = data
      .filter((row: any) => row.value != null && row.date != null)
      .map((row: any) => ({
        id: row.id,
        date: row.date,
        value: Number(row.value) || 0,
        accountId: row.account_id,
        createdAt: row.created_at,
      }));

    return NextResponse.json({ history });
  } catch (error) {
    console.error('Error fetching equity history:', error);
    return NextResponse.json({ error: 'Failed to fetch equity history' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const accountId = body.accountId || 1;

    const { data: record, error } = await supabase
      .from('equity_history')
      .insert({ date: body.date, value: String(body.value), account_id: accountId })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({
      record: {
        id: record.id,
        date: record.date,
        value: Number(record.value),
        accountId: record.account_id,
        createdAt: record.created_at,
      }
    });
  } catch (error) {
    console.error('Error creating equity history:', error);
    return NextResponse.json({ error: 'Failed to create equity history' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = searchParams.get('accountId') || '1';

    const { error } = await supabase
      .from('equity_history')
      .delete()
      .eq('account_id', accountId);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing equity history:', error);
    return NextResponse.json({ error: 'Failed to clear equity history' }, { status: 500 });
  }
}
