'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '@/lib/api';
import {
  DEFAULT_DIRECTIONS,
  DEFAULT_SYMBOLS,
  normalizeQuickOptions,
  readLocalQuickOptions,
  writeLocalQuickOptions,
  type QuickOptionsData,
} from '@/lib/quickOptions';

export interface SaveQuickOptionsResult {
  /** 是否已写入云端；false 表示只落了本机（后续会自动补推） */
  ok: boolean;
  /** 保存时被自动忽略 / 修正的内容 */
  warnings: string[];
  error?: string;
}

/**
 * 快捷配置的读取与持久化。
 *
 * 读取顺序：本机缓存（同步、零延迟）→ 云端（异步、按 uid 隔离）。
 * 冲突处理：两端都使用「服务端时钟」的时间戳比较，不依赖本地时钟，避免时钟漂移误判。
 * 云端不可用时（迁移未执行 / 网络异常）自动降级为本机存储，功能不中断。
 */
export function useQuickOptions() {
  const [data, setData] = useState<QuickOptionsData>(() => ({
    symbols: [...DEFAULT_SYMBOLS],
    directions: [...DEFAULT_DIRECTIONS],
  }));
  /** 用户是否做过配置。false 时对外回退到系统默认列表 */
  const [configured, setConfigured] = useState(false);
  const [syncError, setSyncError] = useState<string | null>(null);

  // 最近一次云端同步时间戳（服务端时钟）。不参与渲染，用 ref 承载以避免多余的依赖。
  const syncedAtRef = useRef(0);
  const applySyncedAt = useCallback((value: number) => {
    syncedAtRef.current = value;
  }, []);

  useEffect(() => {
    let cancelled = false;

    const sync = async () => {
      const local = readLocalQuickOptions();
      if (local) {
        if (cancelled) return;
        setData(local.data);
        setConfigured(true);
        applySyncedAt(local.syncedAt);
      }

      try {
        const remote = await api.preferences.get();
        if (cancelled) return;

        const remoteExists = remote.updatedAt > 0;
        const dirty = local?.dirty ?? false;

        if (dirty && local) {
          // 上次保存没写进云端，补推本地结果
          const saved = await api.preferences.save(local.data);
          if (cancelled) return;
          const next = { symbols: saved.symbols, directions: saved.directions };
          setData(next);
          setConfigured(true);
          applySyncedAt(saved.updatedAt);
          writeLocalQuickOptions(next, saved.updatedAt, false);
        } else if (remoteExists && (!local || remote.updatedAt > local.syncedAt)) {
          // 云端较新（或本机从未保存过）：以云端为准
          const next = { symbols: remote.symbols, directions: remote.directions };
          setData(next);
          setConfigured(true);
          applySyncedAt(remote.updatedAt);
          writeLocalQuickOptions(next, remote.updatedAt, false);
        }

        if (!cancelled) setSyncError(null);
      } catch (error) {
        if (cancelled) return;
        setSyncError(error instanceof Error ? error.message : '云端同步不可用');
      }
    };

    void sync();
    return () => {
      cancelled = true;
    };
  }, [applySyncedAt]);

  const save = useCallback(
    async (next: QuickOptionsData): Promise<SaveQuickOptionsResult> => {
      const { value, warnings } = normalizeQuickOptions(next);

      // 先落本机：即使云端失败，本次会话与下次启动仍然生效
      setData(value);
      setConfigured(true);
      writeLocalQuickOptions(value, syncedAtRef.current, true);

      try {
        const saved = await api.preferences.save(value);
        const savedData = { symbols: saved.symbols, directions: saved.directions };
        setData(savedData);
        applySyncedAt(saved.updatedAt);
        setSyncError(null);
        writeLocalQuickOptions(savedData, saved.updatedAt, false);
        return { ok: true, warnings };
      } catch (error) {
        const message = error instanceof Error ? error.message : '云端同步失败';
        setSyncError(message);
        return { ok: false, warnings, error: message };
      }
    },
    [applySyncedAt]
  );

  return {
    /** 对外暴露的快捷项：未配置时回退到系统默认列表 */
    symbols: configured ? data.symbols : [...DEFAULT_SYMBOLS],
    directions: configured ? data.directions : [...DEFAULT_DIRECTIONS],
    raw: data,
    configured,
    syncError,
    save,
  };
}
