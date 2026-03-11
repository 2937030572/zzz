import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// 创建 Supabase 客户端
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY!
);

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('equity_history')
      .select('*')
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching equity history:', error);
      return NextResponse.json({ error: 'Failed to fetch equity history' }, { status: 500 });
    }

    const history = data.map((row: any) => ({
      id: row.id,
      date: row.date,
      value: Number(row.value),
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

    const { data: record, error } = await supabase
      .from('equity_history')
      .insert({
        date: body.date,
        value: Number(body.value)
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating equity history:', error);
      return NextResponse.json({ error: 'Failed to create equity history' }, { status: 500 });
    }

    return NextResponse.json({
      record: {
        id: record.id,
        date: record.date,
        value: Number(record.value),
        createdAt: record.created_at,
      }
    });
  } catch (error) {
    console.error('Error creating equity history:', error);
    return NextResponse.json({ error: 'Failed to create equity history' }, { status: 500 });
  }
}

export async function DELETE() {
  try {
    const { error } = await supabase
      .from('equity_history')
      .delete();

    if (error) {
      console.error('Error clearing equity history:', error);
      return NextResponse.json({ error: 'Failed to clear equity history' }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error clearing equity history:', error);
    return NextResponse.json({ error: 'Failed to clear equity history' }, { status: 500 });
  }
}
