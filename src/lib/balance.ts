import { getSupabase } from './supabase';
import { DEFAULT_ACCOUNT_ID } from './schema';

/**
 * 余额计算的唯一权威实现。
 *
 * 修复要点：
 * 1. 严格按 account_id 过滤，不再跨账户求和（原实现会把全库总额写进单个账户）。
 * 2. 历史数据中 account_id 为 null 的记录统一归属于默认账户。
 * 3. 所有写路径（增/改/删交易、增/删出入金）都调用本文件，保证口径一致。
 */

const round2 = (n: number) => Math.round((Number(n) || 0) * 100) / 100;

/** Supabase 的 or() 过滤串：默认账户额外包含 account_id 为 null 的历史数据 */
function accountScope(accountId: number): string {
  return accountId === DEFAULT_ACCOUNT_ID
    ? `account_id.eq.${accountId},account_id.is.null`
    : `account_id.eq.${accountId}`;
}

/** 按账户实时计算真实余额 = 累计入金 - 累计出金 + 累计盈亏 */
export async function calcAccountBalance(accountId: number): Promise<number> {
  const sb = getSupabase();
  const scope = accountScope(accountId);

  const [fundsRes, tradesRes] = await Promise.all([
    sb.from('fund_records').select('type, amount').or(scope),
    sb.from('trades').select('profit_loss').or(scope),
  ]);

  if (fundsRes.error) throw fundsRes.error;
  if (tradesRes.error) throw tradesRes.error;

  let balance = 0;
  for (const r of fundsRes.data ?? []) {
    const amt = Number(r.amount) || 0;
    balance += r.type === 'withdraw' ? -amt : amt;
  }
  for (const t of tradesRes.data ?? []) {
    balance += Number(t.profit_loss) || 0;
  }
  return round2(balance);
}

/** 把重算结果写回 balance 快照表（不存在则插入） */
export async function syncBalanceSnapshot(accountId: number, balance: number): Promise<void> {
  const sb = getSupabase();

  const { data: existing, error: findError } = await sb
    .from('balance')
    .select('id')
    .eq('account_id', accountId)
    .maybeSingle();

  if (findError) throw findError;

  if (existing) {
    const { error } = await sb
      .from('balance')
      .update({ amount: String(balance) })
      .eq('account_id', accountId);
    if (error) throw error;
  } else {
    const { error } = await sb
      .from('balance')
      .insert({ amount: String(balance), account_id: accountId });
    if (error) throw error;
  }
}

/** 写操作后统一调用：重算 + 落库，返回权威余额 */
export async function recalcAndPersistBalance(accountId: number): Promise<number> {
  const balance = await calcAccountBalance(accountId);
  await syncBalanceSnapshot(accountId, balance);
  return balance;
}

/** 读取余额快照；快照缺失时实时计算一次 */
export async function readBalance(accountId: number): Promise<number> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from('balance')
    .select('amount')
    .eq('account_id', accountId)
    .maybeSingle();

  if (error) throw error;
  if (!data) return calcAccountBalance(accountId);

  const n = Number(data.amount);
  return Number.isFinite(n) ? round2(n) : 0;
}
