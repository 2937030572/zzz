import { NextResponse, type NextRequest } from 'next/server';

/**
 * 可选的访问控制。
 *
 * 未设置 APP_PASSWORD 时全部放行（保持原有单机使用方式）。
 * 设置后，所有页面与 /api 请求都必须携带有效会话 cookie，否则跳转登录页或返回 401。
 * 这是轻量级防护；若需要多用户与行级隔离，应改用 Supabase Auth + RLS。
 */

const SESSION_COOKIE = 'tn_session';

async function sha256(text: string): Promise<string> {
  const data = new TextEncoder().encode(text);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

export default async function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD;
  if (!password) return NextResponse.next();

  const { pathname } = request.nextUrl;
  const expected = await sha256(password);
  const cookie = request.cookies.get(SESSION_COOKIE)?.value;

  if (cookie === expected) {
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url));
    }
    return NextResponse.next();
  }

  if (pathname === '/login' || pathname === '/api/login') {
    return NextResponse.next();
  }

  if (pathname.startsWith('/api/')) {
    return NextResponse.json({ error: '未授权' }, { status: 401 });
  }

  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', pathname);
  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.svg$|.*\\.png$).*)'],
};
