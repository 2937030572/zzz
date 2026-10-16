import { z } from 'zod';

/**
 * 快捷配置（快捷标的 / 交易方向）的领域模型与纯函数。
 *
 * 设计要点：
 * - 这里只放纯函数与常量，不依赖 React / 浏览器 API，客户端与服务端共用同一套校验口径。
 * - 所有入口（用户输入、localStorage、服务端返回的 JSON）一律先过 normalizeQuickOptions，
 *   保证「空值、超长、重复、非法字符」在任何来源下都被收敛成合法数据。
 */

/** 单类快捷项的数量上限，防止无限膨胀拖慢渲染与请求体 */
export const QUICK_OPTION_LIMIT = 30;
/** 快捷标的最大字符数 */
export const SYMBOL_MAX_LEN = 24;
/** 交易方向最大字符数 */
export const DIRECTION_MAX_LEN = 12;

/** shadcn Select 不允许空字符串作为 value，「未指定」用哨兵值表达 */
export const NO_DIRECTION = '__none__';

export const DEFAULT_SYMBOLS = ['BTC', 'ETH', 'SOL'] as const;
export const DEFAULT_DIRECTIONS = ['做多', '做空'] as const;

export type QuickKind = 'symbols' | 'directions';

export interface QuickOptionsData {
  symbols: string[];
  directions: string[];
}

export function defaultQuickOptions(): QuickOptionsData {
  return { symbols: [...DEFAULT_SYMBOLS], directions: [...DEFAULT_DIRECTIONS] };
}

export function maxLenOf(kind: QuickKind): number {
  return kind === 'symbols' ? SYMBOL_MAX_LEN : DIRECTION_MAX_LEN;
}

export function titleOf(kind: QuickKind): string {
  return kind === 'symbols' ? '快捷标的' : '交易方向';
}

/** 去掉 ASCII 控制字符（含 DEL），避免脏字符混进数据或破坏渲染 */
function stripControlChars(input: string): string {
  let out = '';
  for (const ch of input) {
    const code = ch.codePointAt(0) ?? 0;
    if (code >= 0x20 && code !== 0x7f) out += ch;
  }
  return out;
}

/** 去掉控制字符、折叠连续空白、裁剪超长部分 */
export function sanitizeLabel(raw: string, maxLen: number = SYMBOL_MAX_LEN): string {
  return stripControlChars(raw)
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, maxLen);
}

export interface NormalizeResult {
  value: QuickOptionsData;
  /** 被忽略 / 被修正的原因，用于提示用户（已去重） */
  warnings: string[];
}

function normalizeList(raw: unknown, kind: QuickKind, warnings: string[]): string[] {
  const maxLen = maxLenOf(kind);
  const list = Array.isArray(raw) ? raw : [];
  const seen = new Set<string>();
  const out: string[] = [];

  for (const item of list) {
    if (typeof item !== 'string') continue;

    const original = item.trim();
    if (!original) {
      warnings.push('已忽略空名称');
      continue;
    }

    const clean = sanitizeLabel(original, maxLen);
    if (clean !== original) {
      warnings.push(
        original.length > maxLen
          ? `「${clean}」超过 ${maxLen} 个字符，已截断`
          : `「${original}」含多余空白或控制字符，已规范化`
      );
    }

    // 大小写不敏感去重：BTC 与 btc 视为同一项
    const key = clean.toLocaleLowerCase();
    if (seen.has(key)) {
      warnings.push(`「${clean}」重复，已忽略`);
      continue;
    }
    seen.add(key);
    out.push(clean);
  }

  if (out.length > QUICK_OPTION_LIMIT) {
    warnings.push(`最多 ${QUICK_OPTION_LIMIT} 项，多余项已忽略`);
    return out.slice(0, QUICK_OPTION_LIMIT);
  }
  return out;
}

/** 把任意来源的数据收敛成合法的快捷配置 */
export function normalizeQuickOptions(input: unknown): NormalizeResult {
  const warnings: string[] = [];
  const obj =
    input && typeof input === 'object' && !Array.isArray(input)
      ? (input as Record<string, unknown>)
      : {};

  return {
    value: {
      symbols: normalizeList(obj.symbols, 'symbols', warnings),
      directions: normalizeList(obj.directions, 'directions', warnings),
    },
    warnings: [...new Set(warnings)],
  };
}

/**
 * 新增单项时的即时校验，返回错误文案（null 表示通过）。
 * 重命名不在这里做即时校验，避免打字过程中被打断；统一在保存时 normalize 并提示。
 */
export function validateLabel(list: string[], kind: QuickKind, raw: string): string | null {
  const maxLen = maxLenOf(kind);
  const clean = sanitizeLabel(raw, maxLen);

  if (!clean) return '名称不能为空';
  if (raw.trim().length > maxLen) return `最多 ${maxLen} 个字符`;
  if (list.length >= QUICK_OPTION_LIMIT) return `最多 ${QUICK_OPTION_LIMIT} 项`;
  if (list.some((x) => x.toLocaleLowerCase() === clean.toLocaleLowerCase())) {
    return '已存在同名项';
  }
  return null;
}

// ── 服务端请求体 ────────────────────────────────────────────────────────────
// 刻意宽松：内容层面的问题交给 normalizeQuickOptions 收敛，而不是直接 400，
// 避免用户因为一个脏字符就整体保存失败。

export const quickOptionsInputSchema = z.object({
  symbols: z.array(z.string().max(200)).max(200).default([]),
  directions: z.array(z.string().max(200)).max(200).default([]),
});

// ── 本机缓存（离线可用 + 首屏零延迟）────────────────────────────────────────

const STORAGE_KEY = 'tn.quickOptions.v1';

export interface LocalQuickOptions {
  data: QuickOptionsData;
  /** 最近一次与服务端同步成功的时间戳（服务端时钟）；0 表示从未同步 */
  syncedAt: number;
  /** 本地有未成功写入云端的改动 */
  dirty: boolean;
}

export function readLocalQuickOptions(): LocalQuickOptions | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const { value } = normalizeQuickOptions(parsed.data);
    return {
      data: value,
      syncedAt: Number(parsed.syncedAt) || 0,
      dirty: Boolean(parsed.dirty),
    };
  } catch {
    return null;
  }
}

export function writeLocalQuickOptions(
  data: QuickOptionsData,
  syncedAt: number,
  dirty: boolean
): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify({ data, syncedAt, dirty }));
  } catch {
    /* 隐私模式或空间不足时静默降级为「仅本次会话生效」 */
  }
}
