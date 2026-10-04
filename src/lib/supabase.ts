import { createClient, type SupabaseClient } from '@supabase/supabase-js';

/**
 * 服务端 Supabase 客户端（惰性创建）。
 * 仅在 API Route 内使用，禁止在客户端组件中 import。
 */

let cached: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (cached) return cached;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error(
      '缺少 Supabase 配置：请在 .env.local 中设置 NEXT_PUBLIC_SUPABASE_URL 与 NEXT_PUBLIC_SUPABASE_ANON_KEY'
    );
  }

  cached = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}

/** 统一错误响应，避免把数据库细节泄漏给客户端 */
export function toPublicError(error: unknown, fallback: string): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = String((error as { message?: unknown }).message ?? '');
    // 只暴露可读的业务错误，其他一律兜底
    if (msg && msg.length < 200 && !/password|token|key|secret/i.test(msg)) {
      return msg;
    }
  }
  return fallback;
}
