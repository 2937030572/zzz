import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { getSupabase, toPublicError } from '@/lib/supabase';
import {
  normalizeQuickOptions,
  quickOptionsInputSchema,
} from '@/lib/quickOptions';

/**
 * 快捷配置（快捷标的 / 交易方向）的读写。
 *
 * 用户维度：httpOnly cookie `tn_uid` 中保存一个匿名、稳定的用户标识，
 * 首次访问时由服务端生成并下发。配置存在 public.user_preferences，按 uid 隔离。
 *
 * 注意：当前是「匿名 uid」而非登录态。接入 Supabase Auth 后应把 uid 换成 auth.uid()
 * 并配合 RLS，即可获得真正的多用户隔离。在此之前本表只存界面偏好，不要放敏感信息。
 */

const UID_COOKIE = 'tn_uid';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function randomId(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

/** 表尚未建（未执行迁移脚本）时给出可执行的提示，前端据此降级为本机存储 */
function isUndefinedTable(error: unknown): boolean {
  const e = error as { code?: string; message?: string } | null;
  if (!e) return false;
  const text = `${e.code ?? ''} ${e.message ?? ''}`.toLowerCase();
  return text.includes('42p01') || text.includes('does not exist');
}

function notReady() {
  return NextResponse.json(
    { error: '云端存储尚未初始化，请先执行迁移脚本 assets/migrations/003_quick_options.sql' },
    { status: 501 }
  );
}

function toPayload(row: { symbols: unknown; directions: unknown; updated_at: string }) {
  const { value } = normalizeQuickOptions({ symbols: row.symbols, directions: row.directions });
  return {
    symbols: value.symbols,
    directions: value.directions,
    updatedAt: Date.parse(row.updated_at) || 0,
  };
}

async function resolveUid(created: { value: boolean }): Promise<string> {
  const store = await cookies();
  const existing = store.get(UID_COOKIE)?.value;
  if (existing) return existing;

  const uid = randomId();
  store.set({
    name: UID_COOKIE,
    value: uid,
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  created.value = true;
  return uid;
}

export async function GET() {
  try {
    const created = { value: false };
    const uid = await resolveUid(created);

    const { data, error } = await getSupabase()
      .from('user_preferences')
      .select('symbols, directions, updated_at')
      .eq('uid', uid)
      .maybeSingle();

    if (error) {
      if (isUndefinedTable(error)) return notReady();
      return NextResponse.json(
        { error: toPublicError(error, 'Failed to load preferences') },
        { status: 500 }
      );
    }

    // 没有记录时返回空列表 + updatedAt=0，前端据此回退到系统默认
    if (!data) {
      return NextResponse.json({ symbols: [], directions: [], updatedAt: 0 });
    }

    return NextResponse.json(
      toPayload(data as { symbols: unknown; directions: unknown; updated_at: string })
    );
  } catch (error) {
    console.error('Error loading preferences:', error);
    return NextResponse.json(
      { error: toPublicError(error, 'Failed to load preferences') },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request) {
  try {
    const parsed = quickOptionsInputSchema.safeParse(await request.json());
    if (!parsed.success) {
      return NextResponse.json({ error: '请求参数不合法' }, { status: 400 });
    }

    // 内容层面的脏数据在服务端再收敛一次，不信任客户端
    const { value } = normalizeQuickOptions(parsed.data);

    const created = { value: false };
    const uid = await resolveUid(created);

    const { data, error } = await getSupabase()
      .from('user_preferences')
      .upsert(
        {
          uid,
          symbols: value.symbols,
          directions: value.directions,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'uid' }
      )
      .select('symbols, directions, updated_at')
      .single();

    if (error) {
      if (isUndefinedTable(error)) return notReady();
      return NextResponse.json(
        { error: toPublicError(error, 'Failed to save preferences') },
        { status: 500 }
      );
    }

    return NextResponse.json(
      toPayload(data as { symbols: unknown; directions: unknown; updated_at: string })
    );
  } catch (error) {
    console.error('Error saving preferences:', error);
    return NextResponse.json(
      { error: toPublicError(error, 'Failed to save preferences') },
      { status: 500 }
    );
  }
}
