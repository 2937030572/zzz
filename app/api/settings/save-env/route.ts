import { NextResponse } from 'next/server';
import fs from 'node:fs';
import path from 'node:path';

const ENV_FILE = path.join(process.cwd(), '.env.local');

interface EnvVars {
  BINANCE_OPTIONS_API_KEY?: string;
  BINANCE_OPTIONS_API_SECRET?: string;
}

/**
 * POST /api/settings/save-env
 *
 * 将 Binance API 凭证写入 .env.local 文件。
 * 会保留文件中其他已有的环境变量。
 */
export async function POST(request: Request) {
  try {
    const body: EnvVars = await request.json();
    const { BINANCE_OPTIONS_API_KEY, BINANCE_OPTIONS_API_SECRET } = body;

    if (typeof BINANCE_OPTIONS_API_KEY !== 'string' || typeof BINANCE_OPTIONS_API_SECRET !== 'string') {
      return NextResponse.json(
        { error: 'Invalid request body: API key and secret must be strings' },
        { status: 400 },
      );
    }

    // 读取现有 .env.local 内容
    let existingContent = '';
    if (fs.existsSync(ENV_FILE)) {
      existingContent = fs.readFileSync(ENV_FILE, 'utf-8');
    }

    // 解析现有内容为 key-value map
    const lines = existingContent.split('\n');
    const envMap = new Map<string, string>();

    for (const line of lines) {
      const trimmed = line.trim();
      // 跳过空行和注释
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        envMap.set(key, value);
      }
    }

    // 更新币安相关变量
    if (BINANCE_OPTIONS_API_KEY !== undefined) {
      envMap.set('BINANCE_OPTIONS_API_KEY', BINANCE_OPTIONS_API_KEY);
    }
    if (BINANCE_OPTIONS_API_SECRET !== undefined) {
      envMap.set('BINANCE_OPTIONS_API_SECRET', BINANCE_OPTIONS_API_SECRET);
    }

    // 重建文件内容
    // 按类别分组：Supabase 相关、Binance 相关、其他
    const supabaseKeys = ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'];
    const binanceKeys = ['BINANCE_OPTIONS_API_KEY', 'BINANCE_OPTIONS_API_SECRET', 'BINANCE_OPTIONS_BASE_URL', 'BINANCE_OPTIONS_USE_TESTNET', 'BINANCE_OPTIONS_LOOKBACK_DAYS', 'BINANCE_OPTIONS_LIMIT', 'BINANCE_OPTIONS_ACCOUNT_ID'];
    const otherKeys = Array.from(envMap.keys()).filter(k => !supabaseKeys.includes(k) && !binanceKeys.includes(k));

    const outputLines: string[] = [];

    // Supabase
    outputLines.push('# Supabase');
    for (const key of supabaseKeys) {
      if (envMap.has(key)) {
        outputLines.push(`${key}=${envMap.get(key)}`);
      }
    }
    outputLines.push('');

    // Binance
    outputLines.push('# Binance Options API credentials');
    for (const key of binanceKeys) {
      if (envMap.has(key)) {
        outputLines.push(`${key}=${envMap.get(key)}`);
      }
    }
    outputLines.push('');

    // 其他
    if (otherKeys.length > 0) {
      outputLines.push('# Other variables');
      for (const key of otherKeys) {
        outputLines.push(`${key}=${envMap.get(key)}`);
      }
      outputLines.push('');
    }

    const newContent = outputLines.join('\n');
    fs.writeFileSync(ENV_FILE, newContent, 'utf-8');

    return NextResponse.json({
      success: true,
      message: 'Environment variables saved. Please restart the server to apply changes.',
    });
  } catch (error) {
    console.error('Error saving environment variables:', error);
    return NextResponse.json(
      { error: 'Failed to save environment variables' },
      { status: 500 },
    );
  }
}

/**
 * GET /api/settings/save-env
 *
 * 读取当前 .env.local 中的 Binance API 配置状态。
 * 不会返回密钥内容，只返回是否已配置。
 */
export async function GET() {
  try {
    if (!fs.existsSync(ENV_FILE)) {
      return NextResponse.json({ configured: false, hasApiKey: false, hasApiSecret: false });
    }

    const content = fs.readFileSync(ENV_FILE, 'utf-8');
    const lines = content.split('\n');
    let hasApiKey = false;
    let hasApiSecret = false;

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;
      const eqIndex = trimmed.indexOf('=');
      if (eqIndex > 0) {
        const key = trimmed.slice(0, eqIndex);
        const value = trimmed.slice(eqIndex + 1);
        if (key === 'BINANCE_OPTIONS_API_KEY' && value.length > 0) hasApiKey = true;
        if (key === 'BINANCE_OPTIONS_API_SECRET' && value.length > 0) hasApiSecret = true;
      }
    }

    return NextResponse.json({ configured: hasApiKey && hasApiSecret, hasApiKey, hasApiSecret });
  } catch (error) {
    console.error('Error reading environment variables:', error);
    return NextResponse.json({ configured: false, hasApiKey: false, hasApiSecret: false });
  }
}
