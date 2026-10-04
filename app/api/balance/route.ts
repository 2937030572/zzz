import { NextResponse } from 'next/server';
import { toPublicError } from '@/lib/supabase';
import { readBalance } from '@/lib/balance';
import { parseAccountIdParam } from '@/lib/schema';

/**
 * 余额只读接口。
 * 写操作已移除：余额一律由 fund_records + trades 重算派生（见 src/lib/balance.ts），
 * 不再允许前端直接覆盖，避免出现多套互相矛盾的余额口径。
 */
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const accountId = parseAccountIdParam(searchParams.get('accountId'));
    if (accountId === null) {
      return NextResponse.json({ error: 'accountId 不合法' }, { status: 400 });
    }

    const balance = await readBalance(accountId);
    return NextResponse.json({ balance });
  } catch (error) {
    console.error('Error fetching balance:', error);
    return NextResponse.json(
      { error: toPublicError(error, 'Failed to fetch balance') },
      { status: 500 }
    );
  }
}
